import { z } from "zod";
import { tutorGroundingSourceSchema } from "@/schemas/ai/tutor";

export const tutorChatRequestSchema = z
  .object({
    courseId: z.string().uuid(),
    message: z.string().min(1).max(2000),
    conversationLimit: z.number().int().min(1).max(30).default(12),
  })
  .strict();

export const tutorChatResponseSchema = z
  .object({
    messageId: z.string().uuid(),
    role: z.enum(["assistant"]),
    content: z.string().min(1),
    confidence: z.enum(["high", "medium", "low"]),
    followUpQuestion: z.string().min(6).max(220).optional(),
    suggestedMode: z
      .enum(["summary", "guide", "terms", "flashcards", "learn", "write", "match", "quiz", "practice", "tips"])
      .optional(),
    grounding: z.array(tutorGroundingSourceSchema).min(1).max(8).optional()
  })
  .strict();

export type TutorChatRequest = z.infer<typeof tutorChatRequestSchema>;
export type TutorChatResponse = z.infer<typeof tutorChatResponseSchema>;
