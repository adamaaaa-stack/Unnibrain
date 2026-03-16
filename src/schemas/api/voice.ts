import { z } from "zod";
import { speechRubricEvaluationSchema } from "@/schemas/ai/voice";

export const brainDumpEvaluateRequestSchema = z
  .object({
    courseId: z.string().uuid(),
    transcript: z.string().min(20).max(10000)
  })
  .strict();

export const speechRubricEvaluateRequestSchema = z
  .object({
    courseId: z.string().uuid().optional(),
    title: z.string().max(160).optional(),
    transcript: z.string().min(20).max(10000),
    durationSeconds: z.number().int().min(1).max(3600).optional()
  })
  .strict();

export const speechRubricEvaluateResponseSchema = z
  .object({
    sessionId: z.string().uuid(),
    createdAt: z.string().datetime({ offset: true }),
    evaluation: speechRubricEvaluationSchema
  })
  .strict();

export type BrainDumpEvaluateRequest = z.infer<typeof brainDumpEvaluateRequestSchema>;
export type SpeechRubricEvaluateRequest = z.infer<typeof speechRubricEvaluateRequestSchema>;
export type SpeechRubricEvaluateResponse = z.infer<typeof speechRubricEvaluateResponseSchema>;
