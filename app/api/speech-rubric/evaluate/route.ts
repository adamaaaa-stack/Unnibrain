import { getRouteUser } from "@/lib/auth/route-user";
import { buildSpeechRubricEvaluationPrompt } from "@/lib/ai/prompts/speech-rubric";
import { generateStructuredWithGemini } from "@/lib/ai/gemini";
import { buildSourceContext } from "@/lib/ai/pipeline/chunking";
import { getEntitlementsForUser, requireFeature } from "@/lib/billing/entitlements";
import { badRequest, forbidden, ok, unauthorized } from "@/lib/http/responses";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { type SpeechAudioMetrics, speechRubricEvaluateRequestSchema, speechRubricEvaluateResponseSchema } from "@/schemas/api/voice";
import { speechRubricEvaluationSchema } from "@/schemas/ai/voice";

export const runtime = "nodejs";
export const maxDuration = 90;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function bandScore(value: number, idealMin: number, idealMax: number, hardMin: number, hardMax: number) {
  if (value <= hardMin || value >= hardMax) {
    return 0;
  }
  if (value >= idealMin && value <= idealMax) {
    return 100;
  }
  if (value < idealMin) {
    return ((value - hardMin) / (idealMin - hardMin)) * 100;
  }
  return ((hardMax - value) / (hardMax - idealMax)) * 100;
}

function buildAudioInformedConfidence(params: {
  audioMetrics?: SpeechAudioMetrics;
  durationSeconds?: number;
  modelScore: number;
}): { score: number; rationale: string; confidenceNote: string } {
  const metrics = params.audioMetrics;
  if (!metrics) {
    return {
      score: 50,
      rationale: "Confidence is unavailable from transcript-only data. Record with microphone enabled for delivery confidence scoring.",
      confidenceNote:
        "Confidence score is fixed at 50 because no audio metrics were provided. Transcript text alone cannot reliably measure delivery confidence."
    };
  }

  const volumeScore = bandScore(metrics.avgRms, 0.03, 0.11, 0.008, 0.2);
  const peakPresenceScore = bandScore(metrics.peakRms, 0.07, 0.22, 0.02, 0.45);
  const pauseBalanceScore = bandScore(metrics.silenceRatio, 0.12, 0.38, 0.03, 0.7);
  const clippingControlScore = clamp(100 - metrics.clippingRatio * 900, 0, 100);
  const paceScore = metrics.estimatedWpm > 0 ? bandScore(metrics.estimatedWpm, 105, 180, 70, 240) : 55;
  const segmentRate =
    params.durationSeconds && params.durationSeconds > 0
      ? metrics.speakingSegments / (params.durationSeconds / 60)
      : metrics.speakingSegments;
  const segmentStabilityScore = bandScore(segmentRate, 20, 90, 4, 180);

  const heuristic = Math.round(
    volumeScore * 0.22 +
      peakPresenceScore * 0.12 +
      pauseBalanceScore * 0.2 +
      clippingControlScore * 0.16 +
      paceScore * 0.18 +
      segmentStabilityScore * 0.12
  );
  const blended = Math.round(heuristic * 0.8 + params.modelScore * 0.2);
  const score = clamp(blended, 0, 100);

  return {
    score,
    rationale: `Audio-informed confidence from loudness ${metrics.avgRms.toFixed(3)}, pauses ${(metrics.silenceRatio * 100).toFixed(1)}%, clipping ${(metrics.clippingRatio * 100).toFixed(1)}%, and pace ${metrics.estimatedWpm} WPM.`,
    confidenceNote:
      "Confidence is audio-informed (not transcript-only). This reflects delivery steadiness and vocal control proxies, not accent/pronunciation grading."
  };
}

export async function POST(request: Request) {
  const { user, supabase } = await getRouteUser();
  if (!user) {
    return unauthorized();
  }

  const entitlements = await getEntitlementsForUser(user.id);
  try {
    requireFeature(entitlements, "speechRubric");
  } catch (error) {
    return forbidden(error instanceof Error ? error.message : "Speech Rubric requires Pro.");
  }

  const json = await request.json().catch(() => null);
  const parsed = speechRubricEvaluateRequestSchema.safeParse(json);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const issuePath = firstIssue?.path?.join(".") || "payload";
    const issueMessage = firstIssue?.message || "Invalid payload.";
    return badRequest(`Invalid Speech Rubric payload: ${issuePath} ${issueMessage}`);
  }

  let courseId: string | null = null;
  let courseTitle: string | undefined;
  let courseContext: string | undefined;

  if (parsed.data.courseId) {
    const { data: course } = await supabase
      .from("courses")
      .select("id,user_id,title")
      .eq("id", parsed.data.courseId)
      .maybeSingle();

    if (!course || course.user_id !== user.id) {
      return forbidden("Course not found.");
    }

    courseId = course.id;
    courseTitle = String(course.title ?? "Untitled Course");

    const [{ data: sourceRows }, { data: summaryRow }] = await Promise.all([
      supabase
        .from("course_sources")
        .select("extracted_text,sequence_index")
        .eq("course_id", course.id)
        .order("sequence_index", { ascending: true }),
      supabase.from("course_summaries").select("content").eq("course_id", course.id).maybeSingle()
    ]);

    const sourceText = [
      ...(sourceRows ?? []).map((row) => String(row.extracted_text ?? "").trim()).filter(Boolean),
      String(summaryRow?.content ?? "").trim()
    ]
      .filter(Boolean)
      .join("\n\n");

    if (sourceText.length >= 120) {
      courseContext = buildSourceContext(sourceText);
    }
  }

  try {
    const prompt = buildSpeechRubricEvaluationPrompt({
      title: parsed.data.title,
      transcript: parsed.data.transcript,
      durationSeconds: parsed.data.durationSeconds,
      audioMetrics: parsed.data.audioMetrics,
      courseTitle,
      courseContext
    });

    const evaluation = await generateStructuredWithGemini(speechRubricEvaluationSchema, prompt, {
      temperature: 0.2,
      maxRetries: 2
    });
    const confidence = buildAudioInformedConfidence({
      audioMetrics: parsed.data.audioMetrics,
      durationSeconds: parsed.data.durationSeconds,
      modelScore: evaluation.confidence.score
    });
    evaluation.confidence.score = confidence.score;
    evaluation.confidence.rationale = confidence.rationale;
    evaluation.confidenceNote = confidence.confidenceNote;

    const admin = createSupabaseAdminClient();
    const feedback = [
      `Positives:\n${evaluation.positives.map((item) => `- ${item}`).join("\n")}`,
      `Improvements:\n${evaluation.improvements.map((item) => `- ${item}`).join("\n")}`,
      `Confidence note:\n${evaluation.confidenceNote}`
    ].join("\n\n");
    const suggestions = evaluation.suggestedChanges.map((item) => `- ${item}`).join("\n");

    const { data: session, error: sessionError } = await admin
      .from("speech_rubric_sessions")
      .insert({
        user_id: user.id,
        course_id: courseId,
        title: parsed.data.title?.trim() || courseTitle || null,
        transcript: parsed.data.transcript,
        content_score: evaluation.content.score,
        clarity_score: evaluation.clarity.score,
        structure_score: evaluation.structure.score,
        confidence_score: evaluation.confidence.score,
        pacing_score: evaluation.pacing?.score ?? null,
        filler_word_count: evaluation.fillerWordCount,
        filler_words_json: evaluation.fillerWords,
        feedback,
        suggestions
      })
      .select("id,created_at")
      .single();

    if (sessionError || !session) {
      return badRequest(sessionError?.message ?? "Could not save Speech Rubric session.");
    }

    return ok(
      speechRubricEvaluateResponseSchema.parse({
        sessionId: session.id,
        createdAt: session.created_at,
        evaluation
      })
    );
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Speech Rubric evaluation failed.");
  }
}
