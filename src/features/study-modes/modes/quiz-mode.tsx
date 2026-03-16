"use client";

import { useMemo, useState } from "react";

import type { StudyQuizQuestion } from "@/features/study-modes/types";

type QuizModeProps = {
  courseId: string;
  questions: StudyQuizQuestion[];
};

type AnswerRecord = {
  questionId: string;
  selectedOption: "A" | "B" | "C" | "D";
  correctOption: "A" | "B" | "C" | "D";
};

export function QuizMode({ courseId, questions }: QuizModeProps) {
  const [index, setIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = questions.length;
  const current = questions[index];
  const isLastQuestion = index === total - 1;
  const score = useMemo(() => {
    if (answers.length === 0) return 0;
    const correct = answers.filter((answer) => answer.selectedOption === answer.correctOption).length;
    return Math.round((correct / answers.length) * 100);
  }, [answers]);

  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
        Quiz questions are not available yet. Run generation first.
      </div>
    );
  }

  async function submitQuizAttempt(records: AnswerRecord[]) {
    setSubmitting(true);
    setError(null);
    try {
      const correct = records.filter((record) => record.selectedOption === record.correctOption).length;
      const response = await fetch("/api/study/quiz/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          courseId,
          score: Math.round((correct / records.length) * 100),
          totalQuestions: records.length,
          answers: records
        })
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not save quiz attempt.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unexpected error.");
    } finally {
      setSubmitting(false);
    }
  }

  function onSubmitAnswer() {
    if (!selectedOption) return;
    const nextRecord: AnswerRecord = {
      questionId: current.id,
      selectedOption,
      correctOption: current.correctOption
    };
    setAnswers((records) => [...records, nextRecord]);
    setShowResult(true);
  }

  async function onNext() {
    if (!showResult) return;
    if (isLastQuestion) {
      await submitQuizAttempt([...answers]);
      return;
    }

    setIndex((value) => value + 1);
    setSelectedOption(null);
    setShowResult(false);
  }

  if (showResult && isLastQuestion && answers.length === total) {
    return (
      <section className="card-surface p-5 sm:p-6">
        <h2 className="font-[var(--font-heading)] text-xl font-semibold text-slate-900">Quiz Complete</h2>
        <p className="mt-2 text-sm text-slate-700">
          Score: {score}% ({answers.filter((answer) => answer.selectedOption === answer.correctOption).length}/{total})
        </p>
        <button
          onClick={onNext}
          disabled={submitting}
          className="mt-4 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Save Result"}
        </button>
        {error ? <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="card-surface p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Question {index + 1}/{total}
        </p>
        <h2 className="mt-2 font-[var(--font-heading)] text-xl font-semibold text-slate-900">{current.question}</h2>
      </div>

      <div className="grid gap-2">
        {([
          ["A", current.optionA],
          ["B", current.optionB],
          ["C", current.optionC],
          ["D", current.optionD]
        ] as const).map(([option, label]) => {
          const selected = selectedOption === option;
          const isCorrect = showResult && current.correctOption === option;
          const isWrong = showResult && selected && current.correctOption !== option;

          return (
            <button
              key={option}
              onClick={() => !showResult && setSelectedOption(option)}
              className={`rounded-lg border px-3 py-3 text-left text-sm ${
                isCorrect
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : isWrong
                    ? "border-red-300 bg-red-50 text-red-700"
                    : selected
                      ? "border-[var(--brand)] bg-blue-50 text-slate-900"
                      : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              <span className="mr-2 font-semibold">{option}.</span>
              {label}
            </button>
          );
        })}
      </div>

      {!showResult ? (
        <button
          onClick={onSubmitAnswer}
          disabled={!selectedOption}
          className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Submit Answer
        </button>
      ) : (
        <div className="card-surface p-4">
          <p className="text-sm font-semibold text-slate-900">
            {selectedOption === current.correctOption ? "Correct" : `Incorrect. Correct answer: ${current.correctOption}`}
          </p>
          <p className="mt-2 text-sm text-slate-700">{current.explanation}</p>
          <button onClick={onNext} className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
            {isLastQuestion ? "Finish Quiz" : "Next Question"}
          </button>
        </div>
      )}
    </section>
  );
}
