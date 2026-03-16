import { getRouteUser } from "@/lib/auth/route-user";
import { buildSpeechRubricEvaluationPrompt } from "@/lib/ai/prompts/speech-rubric";
import { generateStructuredWithGemini } from "@/lib/ai/gemini";
import { buildSourceContext } from "@/lib/ai/pipeline/chunking";
import { getEntitlementsForUser, requireFeature } from "@/lib/billing/entitlements";
import { badRequest, forbidden, ok, unauthorized } from "@/lib/http/responses";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { speechRubricEvaluateRequestSchema, speechRubricEvaluateResponseSchema } from "@/schemas/api/voice";
import { speechRubricEvaluationSchema } from "@/schemas/ai/voice";

export const runtime = "nodejs";
export const maxDuration = 90;

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
    return badRequest("Invalid Speech Rubric payload.");
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
      courseTitle,
      courseContext
    });

    const evaluation = await generateStructuredWithGemini(speechRubricEvaluationSchema, prompt, {
      temperature: 0.2,
      maxRetries: 2
    });

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
