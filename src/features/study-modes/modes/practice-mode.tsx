"use client";

import { useState } from "react";

import type { StudyPracticeQuestion } from "@/features/study-modes/types";

type PracticeModeProps = {
  questions: StudyPracticeQuestion[];
};

export function PracticeMode({ questions }: PracticeModeProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState<Record<string, boolean>>({});
  const [showSample, setShowSample] = useState<Record<string, boolean>>({});
  const [selfScore, setSelfScore] = useState<Record<string, number>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});

  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
        Practice questions are not available yet. Run generation first.
      </div>
    );
  }

  return (
    <section className="space-y-3">
      {questions.map((question, index) => {
        const open = expandedId === question.id;
        return (
          <article key={question.id} className="card-surface p-4">
            <button onClick={() => setExpandedId(open ? null : question.id)} className="w-full text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Question {index + 1}</p>
              <h3 className="mt-1 font-[var(--font-heading)] text-lg font-semibold text-slate-900">{question.question}</h3>
            </button>

            {open ? (
              <div className="mt-4 space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  Your response
                  <textarea
                    value={answers[question.id] ?? ""}
                    onChange={(event) =>
                      setAnswers((state) => ({
                        ...state,
                        [question.id]: event.target.value
                      }))
                    }
                    className="mt-1 h-32 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--brand)]"
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      setShowHint((state) => ({
                        ...state,
                        [question.id]: !state[question.id]
                      }))
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    {showHint[question.id] ? "Hide Hint" : "Show Hint"}
                  </button>
                  <button
                    onClick={() =>
                      setShowSample((state) => ({
                        ...state,
                        [question.id]: !state[question.id]
                      }))
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    {showSample[question.id] ? "Hide Sample" : "Show Sample Answer"}
                  </button>
                </div>

                {showHint[question.id] ? (
                  <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                    <span className="font-semibold">Hint: </span>
                    {question.hint}
                  </p>
                ) : null}

                {showSample[question.id] ? (
                  <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                    <span className="font-semibold">Sample answer: </span>
                    {question.sampleAnswer}
                  </p>
                ) : null}

                <label className="block text-sm font-medium text-slate-700">
                  Self grade ({selfScore[question.id] ?? 0}/100)
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={selfScore[question.id] ?? 0}
                    onChange={(event) =>
                      setSelfScore((state) => ({
                        ...state,
                        [question.id]: Number(event.target.value)
                      }))
                    }
                    className="mt-2 w-full"
                  />
                </label>
              </div>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}
