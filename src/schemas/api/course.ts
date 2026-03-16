import { z } from "zod";

export const createCourseRequestSchema = z
  .object({
    title: z.string().min(3).max(140),
    sourceType: z.enum(["pasted_text", "pdf", "image", "text_file", "mixed"]),
    pastedText: z.string().max(200000).optional(),
    sourceFileUrls: z.array(z.string().url()).max(20).optional(),
    sourceImageCount: z.number().int().min(0).max(50).optional(),
  })
  .strict();

export const createCourseResponseSchema = z
  .object({
    courseId: z.string().uuid(),
    generationJobId: z.string().uuid(),
    status: z.enum(["queued", "running", "duplicate"]),
    duplicateOfCourseId: z.string().uuid().optional(),
  })
  .strict();

export const createCourseFormFieldsSchema = z
  .object({
    title: z.string().min(3).max(140),
    pastedText: z.string().max(200000).optional(),
    forceCreateDuplicate: z.boolean().default(false),
  })
  .strict();

export const runGenerationRequestSchema = z
  .object({
    courseId: z.string().uuid(),
    forceRegenerate: z.boolean().default(false),
    generationJobId: z.string().uuid().optional(),
  })
  .strict();

export type CreateCourseRequest = z.infer<typeof createCourseRequestSchema>;
export type CreateCourseResponse = z.infer<typeof createCourseResponseSchema>;
export type CreateCourseFormFields = z.infer<typeof createCourseFormFieldsSchema>;
export type RunGenerationRequest = z.infer<typeof runGenerationRequestSchema>;
