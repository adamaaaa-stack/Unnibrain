import { z } from "zod";
import { speechRubricEvaluationSchema } from "@/schemas/ai/voice";

const transcriptSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.string().min(20).max(50_000)
);

const optionalCourseIdSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  },
  z.string().uuid().optional()
);

const optionalTitleSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  },
  z.string().max(160).optional()
);

const optionalDurationSecondsSchema = z.preprocess(
  (value) => {
    if (value == null) return undefined;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : value;
    }
    return value;
  },
  z.number().int().min(1).max(3600).optional()
);

const speechAudioMetricsSchema = z
  .object({
    avgRms: z.number().min(0).max(1),
    peakRms: z.number().min(0).max(1),
    silenceRatio: z.number().min(0).max(1),
    clippingRatio: z.number().min(0).max(1),
    speakingSegments: z.number().int().min(0).max(5000),
    estimatedWpm: z.number().int().min(0).max(500)
  })
  .strict();

export const brainDumpEvaluateRequestSchema = z
  .object({
    courseId: z.string().uuid(),
    transcript: transcriptSchema
  });

export const speechRubricEvaluateRequestSchema = z
  .object({
    courseId: optionalCourseIdSchema,
    title: optionalTitleSchema,
    transcript: transcriptSchema,
    durationSeconds: optionalDurationSecondsSchema,
    audioMetrics: speechAudioMetricsSchema.optional()
  });

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
export type SpeechAudioMetrics = z.infer<typeof speechAudioMetricsSchema>;
