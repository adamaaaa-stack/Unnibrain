import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CourseStudyPackage, LearnProgressMap } from "@/features/study-modes/types";

export async function loadCourseStudyPackage(courseId: string): Promise<CourseStudyPackage> {
  const supabase = createSupabaseServerClient();

  const [
    { data: summaryRow },
    { data: sectionRows },
    { data: termRows },
    { data: flashcardRows },
    { data: quizRows },
    { data: practiceRows },
    { data: tipRows },
    { data: learnRows }
  ] = await Promise.all([
    supabase.from("course_summaries").select("content").eq("course_id", courseId).maybeSingle(),
    supabase.from("course_sections").select("id,title,summary,sequence_index").eq("course_id", courseId).order("sequence_index", { ascending: true }),
    supabase.from("course_terms").select("id,term,definition,example").eq("course_id", courseId).order("created_at", { ascending: true }),
    supabase.from("flashcards").select("id,front,back,hint,difficulty").eq("course_id", courseId).order("created_at", { ascending: true }),
    supabase
      .from("quiz_questions")
      .select("id,question,option_a,option_b,option_c,option_d,correct_option,explanation")
      .eq("course_id", courseId)
      .order("created_at", { ascending: true }),
    supabase.from("practice_questions").select("id,question,hint,sample_answer").eq("course_id", courseId).order("created_at", { ascending: true }),
    supabase.from("study_tips").select("id,tip,reason").eq("course_id", courseId).order("created_at", { ascending: true }),
    supabase
      .from("learn_progress")
      .select("flashcard_id,mastery_level,correct_streak,incorrect_count")
      .eq("course_id", courseId)
  ]);

  const progressMap: LearnProgressMap = {};
  for (const row of learnRows ?? []) {
    progressMap[String(row.flashcard_id)] = {
      masteryLevel: Number(row.mastery_level ?? 0),
      correctStreak: Number(row.correct_streak ?? 0),
      incorrectCount: Number(row.incorrect_count ?? 0)
    };
  }

  return {
    summary: summaryRow?.content ? { content: String(summaryRow.content) } : null,
    guideSections: (sectionRows ?? []).map((row) => ({
      id: String(row.id),
      title: String(row.title),
      summary: String(row.summary),
      sequenceIndex: Number(row.sequence_index ?? 0)
    })),
    terms: (termRows ?? []).map((row) => ({
      id: String(row.id),
      term: String(row.term),
      definition: String(row.definition),
      example: String(row.example)
    })),
    flashcards: (flashcardRows ?? []).map((row) => ({
      id: String(row.id),
      front: String(row.front),
      back: String(row.back),
      hint: row.hint ? String(row.hint) : null,
      difficulty: (row.difficulty as "easy" | "medium" | "hard" | null) ?? null
    })),
    quizQuestions: (quizRows ?? []).map((row) => ({
      id: String(row.id),
      question: String(row.question),
      optionA: String(row.option_a),
      optionB: String(row.option_b),
      optionC: String(row.option_c),
      optionD: String(row.option_d),
      correctOption: row.correct_option as "A" | "B" | "C" | "D",
      explanation: String(row.explanation)
    })),
    practiceQuestions: (practiceRows ?? []).map((row) => ({
      id: String(row.id),
      question: String(row.question),
      hint: String(row.hint),
      sampleAnswer: String(row.sample_answer)
    })),
    tips: (tipRows ?? []).map((row) => ({
      id: String(row.id),
      tip: String(row.tip),
      reason: row.reason ? String(row.reason) : null
    })),
    learnProgress: progressMap
  };
}
