import { z } from "zod";

export const generatedSummarySchema = z
  .object({
    title: z.string().min(3).max(140),
    summary: z.string().min(120).max(4000),
    keyTakeaways: z.array(z.string().min(3).max(240)).min(3).max(10),
  })
  .strict();

export const guideSectionSchema = z
  .object({
    title: z.string().min(3).max(140),
    summary: z.string().min(50).max(1200),
    bullets: z.array(z.string().min(3).max(280)).min(2).max(10),
  })
  .strict();

export const generatedGuideSchema = z
  .object({
    sections: z.array(guideSectionSchema).min(2).max(20),
  })
  .strict();

export const generatedTermSchema = z
  .object({
    term: z.string().min(1).max(120),
    definition: z.string().min(10).max(600),
    example: z.string().min(10).max(600),
    sectionTitle: z.string().min(1).max(140).optional(),
  })
  .strict();

export const generatedTermsSchema = z
  .object({
    terms: z.array(generatedTermSchema).min(8).max(120),
  })
  .strict();

export const generatedFlashcardSchema = z
  .object({
    front: z.string().min(3).max(220),
    back: z.string().min(3).max(600),
    hint: z.string().min(3).max(180).optional(),
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
    sectionTitle: z.string().min(1).max(140).optional(),
  })
  .strict();

export const generatedFlashcardsSchema = z
  .object({
    flashcards: z.array(generatedFlashcardSchema).min(12).max(200),
  })
  .strict();

export const generatedQuizQuestionSchema = z
  .object({
    question: z.string().min(12).max(360),
    optionA: z.string().min(1).max(220),
    optionB: z.string().min(1).max(220),
    optionC: z.string().min(1).max(220),
    optionD: z.string().min(1).max(220),
    correctOption: z.enum(["A", "B", "C", "D"]),
    explanation: z.string().min(10).max(700),
    sectionTitle: z.string().min(1).max(140).optional(),
  })
  .strict();

export const generatedQuizSchema = z
  .object({
    questions: z.array(generatedQuizQuestionSchema).min(8).max(80),
  })
  .strict();

export const generatedPracticeQuestionSchema = z
  .object({
    question: z.string().min(12).max(360),
    hint: z.string().min(6).max(260),
    sampleAnswer: z.string().min(20).max(1200),
    sectionTitle: z.string().min(1).max(140).optional(),
  })
  .strict();

export const generatedPracticeSchema = z
  .object({
    questions: z.array(generatedPracticeQuestionSchema).min(5).max(40),
  })
  .strict();

export const generatedStudyTipSchema = z
  .object({
    tip: z.string().min(12).max(320),
    reason: z.string().min(12).max(500).optional(),
  })
  .strict();

export const generatedStudyTipsSchema = z
  .object({
    tips: z.array(generatedStudyTipSchema).min(4).max(24),
  })
  .strict();

export type GeneratedSummary = z.infer<typeof generatedSummarySchema>;
export type GeneratedGuide = z.infer<typeof generatedGuideSchema>;
export type GeneratedTerms = z.infer<typeof generatedTermsSchema>;
export type GeneratedFlashcards = z.infer<typeof generatedFlashcardsSchema>;
export type GeneratedQuiz = z.infer<typeof generatedQuizSchema>;
export type GeneratedPractice = z.infer<typeof generatedPracticeSchema>;
export type GeneratedStudyTips = z.infer<typeof generatedStudyTipsSchema>;
