import { getRouteUser } from "@/lib/auth/route-user";
import { generateStructuredWithGemini } from "@/lib/ai/gemini";
import { buildSourceContext } from "@/lib/ai/pipeline/chunking";
import { buildTutorPrompt } from "@/lib/ai/prompts/tutor";
import { getEntitlementsForUser, requireFeature } from "@/lib/billing/entitlements";
import { badRequest, forbidden, ok, tooManyRequests, unauthorized } from "@/lib/http/responses";
import { tutorResponseSchema, type TutorResponse } from "@/schemas/ai/tutor";
import { tutorChatRequestSchema, tutorChatResponseSchema } from "@/schemas/api/tutor";

export const runtime = "nodejs";
export const maxDuration = 90;

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const MAX_USER_MESSAGES_PER_WINDOW = 18;

function normalizeSnippet(input: string, maxLength = 320): string {
  const compact = input.replace(/\s+/g, " ").trim();
  if (!compact) return "";
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 3)}...`;
}

function dedupeReferences(references: TutorResponse["grounding"]): TutorResponse["grounding"] {
  const seen = new Set<string>();
  const unique: TutorResponse["grounding"] = [];

  for (const item of references) {
    const key = `${item.sourceType}:${item.referenceId ?? "none"}:${item.excerpt.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  return unique;
}

export async function POST(request: Request) {
  const { user, supabase } = await getRouteUser();
  if (!user) {
    return unauthorized();
  }

  const json = await request.json().catch(() => null);
  const parsed = tutorChatRequestSchema.safeParse(json);
  if (!parsed.success) {
    return badRequest("Invalid tutor payload.");
  }

  const { data: course } = await supabase
    .from("courses")
    .select("id,user_id,title")
    .eq("id", parsed.data.courseId)
    .maybeSingle();

  if (!course || course.user_id !== user.id) {
    return forbidden("Course not found.");
  }

  const entitlements = await getEntitlementsForUser(user.id);
  try {
    requireFeature(entitlements, "tutor");
  } catch (error) {
    return forbidden(error instanceof Error ? error.message : "Tutor requires Pro.");
  }

  const windowStartIso = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const recentMessageCount = await supabase
    .from("tutor_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("course_id", course.id)
    .eq("role", "user")
    .gte("created_at", windowStartIso);

  if ((recentMessageCount.count ?? 0) >= MAX_USER_MESSAGES_PER_WINDOW) {
    return tooManyRequests("Tutor message limit reached. Please wait a few minutes before sending more.");
  }

  const { data: userMessage, error: userMsgError } = await supabase
    .from("tutor_messages")
    .insert({
      user_id: user.id,
      course_id: course.id,
      role: "user",
      content: parsed.data.message
    })
    .select("id")
    .single();

  if (userMsgError) {
    return badRequest(userMsgError.message);
  }

  const [historyResult, summaryResult, sectionResult, termResult, flashcardResult, quizResult, practiceResult, sourceResult] =
    await Promise.all([
      supabase
        .from("tutor_messages")
        .select("role,content,created_at")
        .eq("user_id", user.id)
        .eq("course_id", course.id)
        .order("created_at", { ascending: false })
        .limit(Math.min(parsed.data.conversationLimit * 2, 60)),
      supabase.from("course_summaries").select("id,content").eq("course_id", course.id).maybeSingle(),
      supabase
        .from("course_sections")
        .select("id,title,summary,sequence_index")
        .eq("course_id", course.id)
        .order("sequence_index", { ascending: true })
        .limit(8),
      supabase.from("course_terms").select("id,term,definition,example").eq("course_id", course.id).order("created_at", { ascending: true }).limit(12),
      supabase.from("flashcards").select("id,front,back,hint").eq("course_id", course.id).order("created_at", { ascending: true }).limit(16),
      supabase
        .from("quiz_questions")
        .select("id,question,correct_option,explanation")
        .eq("course_id", course.id)
        .order("created_at", { ascending: true })
        .limit(8),
      supabase
        .from("practice_questions")
        .select("id,question,hint,sample_answer")
        .eq("course_id", course.id)
        .order("created_at", { ascending: true })
        .limit(8),
      supabase
        .from("course_sources")
        .select("extracted_text,sequence_index")
        .eq("course_id", course.id)
        .order("sequence_index", { ascending: true })
        .limit(24)
    ]);

  const conversationHistory = (historyResult.data ?? [])
    .slice()
    .reverse()
    .map((row) => ({
      role: row.role as "user" | "assistant" | "system",
      content: normalizeSnippet(String(row.content ?? ""), 900)
    }))
    .filter((row) => row.content.length > 0);

  const references: TutorResponse["grounding"] = [];
  const summaryRow = summaryResult.data;
  if (summaryRow?.content) {
    references.push({
      sourceType: "summary",
      referenceId: String(summaryRow.id),
      excerpt: normalizeSnippet(String(summaryRow.content), 320)
    });
  }

  for (const row of sectionResult.data ?? []) {
    references.push({
      sourceType: "guide",
      referenceId: String(row.id),
      excerpt: normalizeSnippet(`${String(row.title)}: ${String(row.summary)}`, 320)
    });
  }

  for (const row of termResult.data ?? []) {
    references.push({
      sourceType: "term",
      referenceId: String(row.id),
      excerpt: normalizeSnippet(`${String(row.term)} - ${String(row.definition)} Example: ${String(row.example)}`, 320)
    });
  }

  for (const row of flashcardResult.data ?? []) {
    references.push({
      sourceType: "flashcard",
      referenceId: String(row.id),
      excerpt: normalizeSnippet(`Q: ${String(row.front)} A: ${String(row.back)}${row.hint ? ` Hint: ${String(row.hint)}` : ""}`, 320)
    });
  }

  for (const row of quizResult.data ?? []) {
    references.push({
      sourceType: "quiz",
      referenceId: String(row.id),
      excerpt: normalizeSnippet(
        `Question: ${String(row.question)} Correct option: ${String(row.correct_option)} Explanation: ${String(row.explanation)}`,
        320
      )
    });
  }

  for (const row of practiceResult.data ?? []) {
    references.push({
      sourceType: "practice",
      referenceId: String(row.id),
      excerpt: normalizeSnippet(`Question: ${String(row.question)} Hint: ${String(row.hint)} Sample: ${String(row.sample_answer)}`, 320)
    });
  }

  const sourceText = (sourceResult.data ?? [])
    .map((row) => String(row.extracted_text ?? "").trim())
    .filter(Boolean)
    .join("\n\n");
  if (sourceText.length >= 120) {
    const sourceContext = buildSourceContext(sourceText);
    const sourcePieces = sourceContext
      .split(/\n\n---\n\n|\n{2,}/)
      .map((piece) => normalizeSnippet(piece, 280))
      .filter((piece) => piece.length >= 40)
      .slice(0, 8);

    for (const piece of sourcePieces) {
      references.push({
        sourceType: "source_excerpt",
        excerpt: piece
      });
    }
  }

  const groundedReferences = dedupeReferences(references).slice(0, 40);
  if (groundedReferences.length === 0) {
    return badRequest("Tutor context is unavailable for this course. Run generation first.");
  }

  try {
    const prompt = buildTutorPrompt({
      courseTitle: course.title,
      learnerMessage: parsed.data.message,
      conversationHistory,
      references: groundedReferences
    });

    const tutorReply = await generateStructuredWithGemini(tutorResponseSchema, prompt, {
      temperature: 0.25,
      maxRetries: 2
    });

    const contentParts = [tutorReply.answer];
    if (tutorReply.followUpQuestion) {
      contentParts.push(`Follow-up question: ${tutorReply.followUpQuestion}`);
    }
    const assistantContent = contentParts.join("\n\n").trim();

    const { data: assistantMessage, error: assistantMsgError } = await supabase
      .from("tutor_messages")
      .insert({
        user_id: user.id,
        course_id: course.id,
        role: "assistant",
        content: assistantContent
      })
      .select("id,content")
      .single();

    if (assistantMsgError || !assistantMessage) {
      return badRequest(assistantMsgError?.message ?? "Could not persist tutor reply.");
    }

    return ok(
      tutorChatResponseSchema.parse({
        messageId: assistantMessage.id,
        role: "assistant",
        content: assistantMessage.content,
        confidence: tutorReply.confidence,
        followUpQuestion: tutorReply.followUpQuestion,
        suggestedMode: tutorReply.suggestedMode,
        grounding: tutorReply.grounding
      })
    );
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Tutor response failed.");
  }
}
