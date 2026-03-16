export type StudySummary = {
  content: string;
};

export type StudyGuideSection = {
  id: string;
  title: string;
  summary: string;
  sequenceIndex: number;
};

export type StudyTerm = {
  id: string;
  term: string;
  definition: string;
  example: string;
};

export type StudyFlashcard = {
  id: string;
  front: string;
  back: string;
  hint: string | null;
  difficulty: "easy" | "medium" | "hard" | null;
};

export type StudyQuizQuestion = {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "A" | "B" | "C" | "D";
  explanation: string;
};

export type StudyPracticeQuestion = {
  id: string;
  question: string;
  hint: string;
  sampleAnswer: string;
};

export type StudyTip = {
  id: string;
  tip: string;
  reason: string | null;
};

export type LearnProgressMap = Record<
  string,
  {
    masteryLevel: number;
    correctStreak: number;
    incorrectCount: number;
  }
>;

export type CourseStudyPackage = {
  summary: StudySummary | null;
  guideSections: StudyGuideSection[];
  terms: StudyTerm[];
  flashcards: StudyFlashcard[];
  quizQuestions: StudyQuizQuestion[];
  practiceQuestions: StudyPracticeQuestion[];
  tips: StudyTip[];
  learnProgress: LearnProgressMap;
};
