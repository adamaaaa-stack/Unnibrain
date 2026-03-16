import { z } from "zod";

const coverageItemSchema = z
  .object({
    concept: z.string().min(3).max(180),
    rationale: z.string().min(10).max(500),
    evidenceQuote: z.string().min(3).max(260).optional(),
  })
  .strict();

export const brainDumpEvaluationSchema = z
  .object({
    score: z.number().min(0).max(100),
    covered: z.array(coverageItemSchema).max(40),
    partial: z.array(coverageItemSchema).max(40),
    missed: z.array(coverageItemSchema).max(40),
    feedback: z.string().min(24).max(2500),
    nextRevisionTargets: z.array(z.string().min(3).max(220)).min(1).max(12),
    transcriptQuality: z.enum(["high", "medium", "low"]),
  })
  .strict();

const scoredCategorySchema = z
  .object({
    score: z.number().min(0).max(100),
    rationale: z.string().min(10).max(600),
  })
  .strict();

export const speechRubricEvaluationSchema = z
  .object({
    content: scoredCategorySchema,
    clarity: scoredCategorySchema,
    structure: scoredCategorySchema,
    confidence: scoredCategorySchema,
    pacing: scoredCategorySchema.optional(),
    fillerWordCount: z.number().int().min(0),
    fillerWords: z.record(z.string(), z.number().int().min(1)).default({}),
    positives: z.array(z.string().min(6).max(260)).min(1).max(12),
    improvements: z.array(z.string().min(6).max(260)).min(1).max(12),
    suggestedChanges: z.array(z.string().min(6).max(260)).min(1).max(12),
    confidenceNote: z
      .string()
      .min(12)
      .max(420)
      .describe("Explain uncertainty when rubric attributes are transcript-inferred."),
  })
  .strict();

export type BrainDumpEvaluation = z.infer<typeof brainDumpEvaluationSchema>;
export type SpeechRubricEvaluation = z.infer<typeof speechRubricEvaluationSchema>;
