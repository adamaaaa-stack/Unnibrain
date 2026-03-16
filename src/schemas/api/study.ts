import { z } from "zod";

export const submitQuizAttemptSchema = z
  .object({
    courseId: z.string().uuid(),
    score: z.number().min(0).max(100),
    totalQuestions: z.number().int().min(1).max(200),
    answers: z.array(
      z.object({
        questionId: z.string().uuid(),
        selectedOption: z.enum(["A", "B", "C", "D"]),
        correctOption: z.enum(["A", "B", "C", "D"])
      })
    )
  })
  .strict();

export const submitWriteAttemptSchema = z
  .object({
    courseId: z.string().uuid(),
    flashcardId: z.string().uuid(),
    prompt: z.string().min(1).max(300),
    answer: z.string().min(1).max(3000),
    correctAnswer: z.string().min(1).max(3000),
    selfScore: z.number().min(0).max(100).optional()
  })
  .strict();

export const submitMatchAttemptSchema = z
  .object({
    courseId: z.string().uuid(),
    timeSeconds: z.number().int().min(1).max(36000),
    mistakes: z.number().int().min(0).max(1000)
  })
  .strict();

export const upsertLearnProgressSchema = z
  .object({
    courseId: z.string().uuid(),
    flashcardId: z.string().uuid(),
    result: z.enum(["correct", "incorrect"])
  })
  .strict();
