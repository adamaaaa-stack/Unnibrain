import { buildBrainDumpEvaluationPrompt } from "@/lib/ai/prompts/brain-dump";
import { generateStructuredWithGemini } from "@/lib/ai/gemini";
import { buildSourceContext } from "@/lib/ai/pipeline/chunking";
import { getRouteUser } from "@/lib/auth/route-user";
import { getEntitlementsForUser, requireFeature } from "@/lib/billing/entitlements";
import { badRequest, forbidden, ok, unauthorized } from "@/lib/http/responses";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { brainDumpEvaluateRequestSchema } from "@/schemas/api/voice";
import { brainDumpEvaluationSchema } from "@/schemas/ai/voice";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(request: Request) {
  const { user, supabase } = await getRouteUser();
  if (!user) {
    return unauthorized();
  }

  const entitlements = await getEntitlementsForUser(user.id);
  try {
    requireFeature(entitlements, "brainDump");
  } catch (error) {
    return forbidden(error instanceof Error ? error.message : "Brain Dump requires Pro.");
  }

  const json = await request.json().catch(() => null);
  const parsed = brainDumpEvaluateRequestSchema.safeParse(json);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const issuePath = firstIssue?.path?.join(".") || "payload";
    const issueMessage = firstIssue?.message || "Invalid payload.";
    return badRequest(`Invalid Brain Dump payload: ${issuePath} ${issueMessage}`);
  }

  const { data: course } = await supabase
    .from("courses")
    .select("id,user_id,title")
    .eq("id", parsed.data.courseId)
    .maybeSingle();

  if (!course || course.user_id !== user.id) {
    return forbidden("Course not found.");
  }

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

  if (sourceText.length < 120) {
    return badRequest("Course content is too limited for Brain Dump evaluation.");
  }

  try {
    const sourceContext = buildSourceContext(sourceText);
    const prompt = buildBrainDumpEvaluationPrompt({
      courseTitle: String(course.title ?? "Untitled Course"),
      sourceContext,
      transcript: parsed.data.transcript
    });

    const evaluation = await generateStructuredWithGemini(brainDumpEvaluationSchema, prompt, {
      temperature: 0.15,
      maxRetries: 2
    });

    const admin = createSupabaseAdminClient();
    const feedbackWithTargets = `${evaluation.feedback}\n\nNext revision targets:\n${evaluation.nextRevisionTargets
      .map((target) => `- ${target}`)
      .join("\n")}`;

    const { data: session, error: sessionError } = await admin
      .from("brain_dump_sessions")
      .insert({
        user_id: user.id,
        course_id: course.id,
        transcript: parsed.data.transcript,
        score: evaluation.score,
        covered_json: evaluation.covered,
        partial_json: evaluation.partial,
        missed_json: evaluation.missed,
        feedback: feedbackWithTargets
      })
      .select("id,created_at")
      .single();

    if (sessionError || !session) {
      return badRequest(sessionError?.message ?? "Could not save Brain Dump session.");
    }

    return ok({
      sessionId: session.id,
      createdAt: session.created_at,
      evaluation
    });
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Brain Dump evaluation failed.");
  }
}
