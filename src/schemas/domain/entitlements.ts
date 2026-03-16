import { z } from "zod";

export const entitlementSchema = z
  .object({
    plan: z.enum(["free", "pro"]),
    canGenerateCourse: z.boolean(),
    generationsUsedThisMonth: z.number().int().min(0),
    generationLimitThisMonth: z.number().int().min(0).nullable(),
    canUseBrainDump: z.boolean(),
    canUseSpeechRubric: z.boolean(),
    canUseTutor: z.boolean(),
    nextResetAt: z.string().datetime(),
  })
  .strict();

export type Entitlement = z.infer<typeof entitlementSchema>;
