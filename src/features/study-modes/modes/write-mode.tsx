"use client";

import { useState } from "react";

import type { StudyFlashcard } from "@/features/study-modes/types";

type WriteModeProps = {
  courseId: string;
  flashcards: StudyFlashcard[];
};

export function WriteMode({ courseId, flashcards }: WriteModeProps) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (flashcards.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
        Write mode needs flashcards. Run generation first.
      </div>
    );
  }

  const card = flashcards[index];

  async function saveAttempt(selfScore?: number) {
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/study/write/attempt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          courseId,
          flashcardId: card.id,
          prompt: card.front,
          answer,
          correctAnswer: card.back,
          selfScore
        })
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not save write attempt.");
      }

      setAnswer("");
      setRevealed(false);
      setIndex((current) => (current + 1) % flashcards.length);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unexpected error.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="card-surface p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Card {index + 1}/{flashcards.length}
        </p>
        <p className="mt-2 font-[var(--font-heading)] text-xl font-semibold text-slate-900">{card.front}</p>
      </div>

      <div className="card-surface p-4">
        <label className="block text-sm font-medium text-slate-700">
          Your answer
          <textarea
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            className="mt-1 h-40 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--brand)]"
            placeholder="Type from memory..."
          />
        </label>
        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            disabled={!answer.trim()}
            className="mt-3 rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Reveal Correct Answer
          </button>
        ) : null}
      </div>

      {revealed ? (
        <div className="card-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Correct answer</p>
          <p className="mt-2 text-sm text-slate-700">{card.back}</p>
          <p className="mt-3 text-sm font-medium text-slate-700">How did you do?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() => saveAttempt(100)}
              disabled={pending}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
            >
              Perfect
            </button>
            <button
              onClick={() => saveAttempt(60)}
              disabled={pending}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
            >
              Partial
            </button>
            <button
              onClick={() => saveAttempt(20)}
              disabled={pending}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
            >
              Missed
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
