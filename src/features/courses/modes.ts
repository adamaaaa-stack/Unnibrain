export const STUDY_MODE_ORDER = [
  "summary",
  "guide",
  "terms",
  "flashcards",
  "learn",
  "write",
  "match",
  "quiz",
  "practice",
  "tips"
] as const;

export type StudyModeSlug = (typeof STUDY_MODE_ORDER)[number];

export const STUDY_MODE_META: Record<
  StudyModeSlug,
  {
    label: string;
    shortDescription: string;
  }
> = {
  summary: {
    label: "Summary",
    shortDescription: "High-level overview of key ideas."
  },
  guide: {
    label: "Guide",
    shortDescription: "Structured sections for fast review."
  },
  terms: {
    label: "Terms",
    shortDescription: "Glossary of concepts and definitions."
  },
  flashcards: {
    label: "Flashcards",
    shortDescription: "Core recall cards from your notes."
  },
  learn: {
    label: "Learn",
    shortDescription: "Adaptive card flow for weak areas."
  },
  write: {
    label: "Write",
    shortDescription: "Type answers from memory."
  },
  match: {
    label: "Match",
    shortDescription: "Timed concept-to-definition matching."
  },
  quiz: {
    label: "Quiz",
    shortDescription: "Multiple choice with explanations."
  },
  practice: {
    label: "Practice",
    shortDescription: "Open-ended questions with hints."
  },
  tips: {
    label: "Tips",
    shortDescription: "Course-specific study strategy."
  }
};

export function isStudyModeSlug(value: string): value is StudyModeSlug {
  return STUDY_MODE_ORDER.includes(value as StudyModeSlug);
}
