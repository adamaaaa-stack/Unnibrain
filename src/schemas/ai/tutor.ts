import { z } from "zod";

export const tutorGroundingSourceSchema = z
  .object({
    sourceType: z.enum(["summary", "guide", "term", "flashcard", "quiz", "practice", "source_excerpt"]),
    referenceId: z.string().uuid().optional(),
    excerpt: z.string().min(6).max(500),
  })
  .strict();

export const tutorResponseSchema = z
  .object({
    answer: z.string().min(20).max(4000),
    followUpQuestion: z.string().min(6).max(220).optional(),
    suggestedMode: z
      .enum(["summary", "guide", "terms", "flashcards", "learn", "write", "match", "quiz", "practice", "tips"])
      .optional(),
    grounding: z.array(tutorGroundingSourceSchema).min(1).max(8),
    confidence: z.enum(["high", "medium", "low"]),
  })
  .strict();

export type TutorResponse = z.infer<typeof tutorResponseSchema>;
export type TutorGroundingSource = z.infer<typeof tutorGroundingSourceSchema>;
