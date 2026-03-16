import { z } from "zod";

import { generateStructuredWithGemini } from "@/lib/ai/gemini";
import { buildSourceContext } from "@/lib/ai/pipeline/chunking";
import {
  markGenerationJobComplete,
  markGenerationJobFailed,
  markGenerationJobRunning
} from "@/lib/ai/pipeline/jobs";
import {
  buildFlashcardsPrompt,
  buildGuidePrompt,
  buildPracticePrompt,
  buildQuizPrompt,
  buildSummaryPrompt,
  buildTermsPrompt,
  buildTipsPrompt
} from "@/lib/ai/prompts/generation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { computeSourceHash } from "@/lib/ingestion/hash";
import {
  generatedFlashcardsSchema,
  generatedGuideSchema,
  generatedPracticeSchema,
  generatedQuizSchema,
  generatedStudyTipsSchema,
  generatedSummarySchema,
  generatedTermsSchema
} from "@/schemas/ai/generation";

type GenerationStage = "summary" | "guide" | "terms" | "flashcards" | "quiz" | "practice" | "tips";

type RunCourseGenerationParams = {
  userId: string;
  courseId: string;
  jobId: string;
  forceRegenerate?: boolean;
};

type RunCourseGenerationResult = {
  courseId: string;
  jobId: string;
  status: "completed";
  cached: boolean;
  metadata: Record<string, unknown>;
};

class StageError extends Error {
  stage: GenerationStage;

  constructor(stage: GenerationStage, message: string) {
    super(message);
    this.name = "StageError";
    this.stage = stage;
  }
}

function normalizeSectionTitle(value?: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

function buildSummaryContent(summary: z.infer<typeof generatedSummarySchema>) {
  return [
    summary.summary,
    "",
    "Key Takeaways:",
    ...summary.keyTakeaways.map((takeaway) => `- ${takeaway}`)
  ].join("\n");
}

async function countByCourse(tableName: string, courseId: string): Promise<number> {
  const admin = createSupabaseAdminClient();
  const { count, error } = await admin
    .from(tableName)
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);

  if (error) {
    throw new Error(`Failed reading ${tableName} count: ${error.message}`);
  }

  return count ?? 0;
}

async function hasReadyArtifacts(courseId: string): Promise<boolean> {
  const counts = await Promise.all([
    countByCourse("course_summaries", courseId),
    countByCourse("course_guides", courseId),
    countByCourse("course_sections", courseId),
    countByCourse("course_terms", courseId),
    countByCourse("flashcards", courseId),
    countByCourse("quiz_questions", courseId),
    countByCourse("practice_questions", courseId),
    countByCourse("study_tips", courseId)
  ]);

  return counts.every((count) => count > 0);
}

async function generateStage<T>(stage: GenerationStage, schema: z.ZodSchema<T>, prompt: string): Promise<T> {
  try {
    return await generateStructuredWithGemini(schema, prompt, {
      temperature: 0.2,
      maxRetries: 2,
      timeoutMs: 90_000,
      maxOutputTokens:
        stage === "summary"
          ? 1_500
          : stage === "guide"
            ? 3_500
            : stage === "terms"
              ? 2_500
              : stage === "flashcards"
                ? 3_500
                : stage === "quiz"
                  ? 3_500
                  : stage === "practice"
                    ? 3_000
                    : 1_500
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown AI generation error";
    throw new StageError(stage, message);
  }
}

async function generateTimedStage<T>(
  stage: GenerationStage,
  schema: z.ZodSchema<T>,
  prompt: string
): Promise<{ value: T; elapsedMs: number }> {
  const startedAt = Date.now();
  const value = await generateStage(stage, schema, prompt);
  return {
    value,
    elapsedMs: Date.now() - startedAt
  };
}

async function persistArtifacts(params: {
  courseId: string;
  summary: z.infer<typeof generatedSummarySchema>;
  guide: z.infer<typeof generatedGuideSchema>;
  terms: z.infer<typeof generatedTermsSchema>;
  flashcards: z.infer<typeof generatedFlashcardsSchema>;
  quiz: z.infer<typeof generatedQuizSchema>;
  practice: z.infer<typeof generatedPracticeSchema>;
  tips: z.infer<typeof generatedStudyTipsSchema>;
}) {
  const admin = createSupabaseAdminClient();
  const courseId = params.courseId;

  const summaryContent = buildSummaryContent(params.summary);
  const guideContent = {
    sections: params.guide.sections
  };

  const { error: summaryError } = await admin.from("course_summaries").upsert(
    {
      course_id: courseId,
      content: summaryContent
    },
    { onConflict: "course_id" }
  );
  if (summaryError) {
    throw new Error(`Failed persisting summary: ${summaryError.message}`);
  }

  const { error: guideError } = await admin.from("course_guides").upsert(
    {
      course_id: courseId,
      content_json: guideContent
    },
    { onConflict: "course_id" }
  );
  if (guideError) {
    throw new Error(`Failed persisting guide: ${guideError.message}`);
  }

  const deletionTables = ["course_terms", "flashcards", "quiz_questions", "practice_questions", "study_tips", "course_sections"];
  for (const tableName of deletionTables) {
    const { error } = await admin.from(tableName).delete().eq("course_id", courseId);
    if (error) {
      throw new Error(`Failed clearing ${tableName}: ${error.message}`);
    }
  }

  const sectionRows = params.guide.sections.map((section, index) => ({
    course_id: courseId,
    title: section.title,
    summary: section.summary,
    sequence_index: index
  }));
  const { data: insertedSections, error: sectionsError } = await admin
    .from("course_sections")
    .insert(sectionRows)
    .select("id,title");
  if (sectionsError) {
    throw new Error(`Failed persisting sections: ${sectionsError.message}`);
  }

  const sectionIdByTitle = new Map<string, string>();
  for (const section of insertedSections ?? []) {
    const key = normalizeSectionTitle(section.title as string);
    if (key) {
      sectionIdByTitle.set(key, section.id as string);
    }
  }

  const termRows = params.terms.terms.map((term) => ({
    course_id: courseId,
    term: term.term,
    definition: term.definition,
    example: term.example,
    section_id: sectionIdByTitle.get(normalizeSectionTitle(term.sectionTitle)) ?? null
  }));
  if (termRows.length > 0) {
    const { error } = await admin.from("course_terms").insert(termRows);
    if (error) {
      throw new Error(`Failed persisting terms: ${error.message}`);
    }
  }

  const flashcardRows = params.flashcards.flashcards.map((card) => ({
    course_id: courseId,
    front: card.front,
    back: card.back,
    hint: card.hint ?? null,
    difficulty: card.difficulty ?? null,
    section_id: sectionIdByTitle.get(normalizeSectionTitle(card.sectionTitle)) ?? null
  }));
  if (flashcardRows.length > 0) {
    const { error } = await admin.from("flashcards").insert(flashcardRows);
    if (error) {
      throw new Error(`Failed persisting flashcards: ${error.message}`);
    }
  }

  const quizRows = params.quiz.questions.map((question) => ({
    course_id: courseId,
    question: question.question,
    option_a: question.optionA,
    option_b: question.optionB,
    option_c: question.optionC,
    option_d: question.optionD,
    correct_option: question.correctOption,
    explanation: question.explanation,
    section_id: sectionIdByTitle.get(normalizeSectionTitle(question.sectionTitle)) ?? null
  }));
  if (quizRows.length > 0) {
    const { error } = await admin.from("quiz_questions").insert(quizRows);
    if (error) {
      throw new Error(`Failed persisting quiz questions: ${error.message}`);
    }
  }

  const practiceRows = params.practice.questions.map((question) => ({
    course_id: courseId,
    question: question.question,
    hint: question.hint,
    sample_answer: question.sampleAnswer,
    section_id: sectionIdByTitle.get(normalizeSectionTitle(question.sectionTitle)) ?? null
  }));
  if (practiceRows.length > 0) {
    const { error } = await admin.from("practice_questions").insert(practiceRows);
    if (error) {
      throw new Error(`Failed persisting practice questions: ${error.message}`);
    }
  }

  const tipRows = params.tips.tips.map((tip) => ({
    course_id: courseId,
    tip: tip.tip,
    reason: tip.reason ?? null
  }));
  if (tipRows.length > 0) {
    const { error } = await admin.from("study_tips").insert(tipRows);
    if (error) {
      throw new Error(`Failed persisting study tips: ${error.message}`);
    }
  }

  return {
    sectionCount: sectionRows.length,
    termCount: termRows.length,
    flashcardCount: flashcardRows.length,
    quizCount: quizRows.length,
    practiceCount: practiceRows.length,
    tipCount: tipRows.length
  };
}

export async function runCourseGenerationPipeline(params: RunCourseGenerationParams): Promise<RunCourseGenerationResult> {
  const admin = createSupabaseAdminClient();
  const startedAt = Date.now();
  const stageDurations: Partial<Record<GenerationStage, number>> = {};

  const { data: course, error: courseError } = await admin
    .from("courses")
    .select("id,user_id,title,source_raw_text,source_text_hash,status")
    .eq("id", params.courseId)
    .maybeSingle();

  if (courseError || !course || course.user_id !== params.userId) {
    throw new Error("Course not found.");
  }

  const { data: sourceRows, error: sourceError } = await admin
    .from("course_sources")
    .select("extracted_text,sequence_index")
    .eq("course_id", params.courseId)
    .order("sequence_index", { ascending: true });

  if (sourceError) {
    throw new Error(`Failed loading course sources: ${sourceError.message}`);
  }

  const extractedParts = (sourceRows ?? []).map((row) => String(row.extracted_text ?? "").trim()).filter(Boolean);
  const fallbackRaw = String(course.source_raw_text ?? "").trim();
  const sourceText = (extractedParts.length > 0 ? extractedParts : [fallbackRaw]).filter(Boolean).join("\n\n");

  if (!sourceText || sourceText.length < 120) {
    throw new Error("Not enough source text to generate course outputs.");
  }

  const currentInputHash = computeSourceHash(sourceText.toLowerCase());

  try {
    await markGenerationJobRunning(params.jobId, currentInputHash);
    await admin.from("courses").update({ status: "processing", generation_error: null }).eq("id", params.courseId);

    const canUseCache = !params.forceRegenerate;
    if (canUseCache && course.source_text_hash === currentInputHash) {
      const { data: completedJob } = await admin
        .from("generation_jobs")
        .select("id")
        .eq("course_id", params.courseId)
        .eq("job_type", "full_course")
        .eq("status", "completed")
        .eq("input_hash", currentInputHash)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (completedJob && (await hasReadyArtifacts(params.courseId))) {
        const metadata = {
          cached: true,
          cacheSourceJobId: completedJob.id,
          elapsedMs: Date.now() - startedAt
        };
        await markGenerationJobComplete(params.jobId, metadata);
        await admin.from("courses").update({ status: "ready", generation_error: null }).eq("id", params.courseId);
        return {
          courseId: params.courseId,
          jobId: params.jobId,
          status: "completed",
          cached: true,
          metadata
        };
      }
    }

    const sourceContext = buildSourceContext(sourceText);
    const promptParams = {
      courseTitle: String(course.title ?? "Untitled Course"),
      sourceContext
    };

    const [summaryTimed, guideTimed] = await Promise.all([
      generateTimedStage("summary", generatedSummarySchema, buildSummaryPrompt(promptParams)),
      generateTimedStage("guide", generatedGuideSchema, buildGuidePrompt(promptParams))
    ]);
    stageDurations.summary = summaryTimed.elapsedMs;
    stageDurations.guide = guideTimed.elapsedMs;

    const [termsTimed, flashcardsTimed] = await Promise.all([
      generateTimedStage("terms", generatedTermsSchema, buildTermsPrompt(promptParams)),
      generateTimedStage("flashcards", generatedFlashcardsSchema, buildFlashcardsPrompt(promptParams))
    ]);
    stageDurations.terms = termsTimed.elapsedMs;
    stageDurations.flashcards = flashcardsTimed.elapsedMs;

    const [quizTimed, practiceTimed, tipsTimed] = await Promise.all([
      generateTimedStage("quiz", generatedQuizSchema, buildQuizPrompt(promptParams)),
      generateTimedStage("practice", generatedPracticeSchema, buildPracticePrompt(promptParams)),
      generateTimedStage("tips", generatedStudyTipsSchema, buildTipsPrompt(promptParams))
    ]);
    stageDurations.quiz = quizTimed.elapsedMs;
    stageDurations.practice = practiceTimed.elapsedMs;
    stageDurations.tips = tipsTimed.elapsedMs;

    const persistedCounts = await persistArtifacts({
      courseId: params.courseId,
      summary: summaryTimed.value,
      guide: guideTimed.value,
      terms: termsTimed.value,
      flashcards: flashcardsTimed.value,
      quiz: quizTimed.value,
      practice: practiceTimed.value,
      tips: tipsTimed.value
    });

    const metadata = {
      cached: false,
      elapsedMs: Date.now() - startedAt,
      sourceChars: sourceText.length,
      contextChars: sourceContext.length,
      stageDurationsMs: stageDurations,
      ...persistedCounts
    };

    await markGenerationJobComplete(params.jobId, metadata);
    await admin
      .from("courses")
      .update({
        status: "ready",
        generation_error: null,
        source_text_hash: currentInputHash
      })
      .eq("id", params.courseId);

    return {
      courseId: params.courseId,
      jobId: params.jobId,
      status: "completed",
      cached: false,
      metadata
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation pipeline failed.";
    const stage = error instanceof StageError ? error.stage : "unknown";
    const failureMetadata = {
      stage,
      elapsedMs: Date.now() - startedAt,
      stageDurationsMs: stageDurations
    };

    await markGenerationJobFailed(params.jobId, message, failureMetadata);
    await admin
      .from("courses")
      .update({
        status: "failed",
        generation_error: `Generation failed at "${stage}" stage: ${message}`.slice(0, 1000),
        source_text_hash: currentInputHash
      })
      .eq("id", params.courseId);

    throw new Error(`Generation failed at "${stage}" stage: ${message}`);
  }
}
