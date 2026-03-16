"use client";

import { useMemo, useState } from "react";

import type { LearnProgressMap, StudyFlashcard } from "@/features/study-modes/types";

type LearnModeProps = {
  courseId: string;
  flashcards: StudyFlashcard[];
  initialProgress: LearnProgressMap;
};

export function LearnMode({ courseId, flashcards, initialProgress }: LearnModeProps) {
  const [progressMap, setProgressMap] = useState<LearnProgressMap>(initialProgress);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orderedCards = useMemo(() => {
    return [...flashcards]
      .map((card) => {
        const progress = progressMap[card.id];
        return {
          ...card,
          masteryLevel: progress?.masteryLevel ?? 0,
          incorrectCount: progress?.incorrectCount ?? 0
        };
      })
      .filter((card) => card.masteryLevel < 5)
      .sort((a, b) => a.masteryLevel - b.masteryLevel || b.incorrectCount - a.incorrectCount);
  }, [flashcards, progressMap]);

  if (flashcards.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
        Learn mode needs flashcards. Run generation first.
      </div>
    );
  }

  if (orderedCards.length === 0) {
    return (
      <div className="card-surface p-5 text-center">
        <h2 className="font-[var(--font-heading)] text-xl font-semibold text-slate-900">All cards mastered</h2>
        <p className="mt-2 text-sm text-slate-600">You can regenerate or revisit flashcards for revision.</p>
      </div>
    );
  }

  const current = orderedCards[Math.min(index, orderedCards.length - 1)];
  const masteredCount = flashcards.length - orderedCards.length;

  async function submitResult(result: "correct" | "incorrect") {
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/study/learn/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          courseId,
          flashcardId: current.id,
          result
        })
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string; masteryLevel?: number };
      if (!response.ok || payload.masteryLevel == null) {
        throw new Error(payload.error ?? "Could not update learn progress.");
      }

      setProgressMap((prev) => ({
        ...prev,
        [current.id]: {
          masteryLevel: payload.masteryLevel ?? prev[current.id]?.masteryLevel ?? 0,
          correctStreak: result === "correct" ? (prev[current.id]?.correctStreak ?? 0) + 1 : 0,
          incorrectCount:
            result === "incorrect" ? (prev[current.id]?.incorrectCount ?? 0) + 1 : prev[current.id]?.incorrectCount ?? 0
        }
      }));

      setIndex(0);
      setFlipped(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unexpected error.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="card-surface p-4 text-sm text-slate-600">
        <p>
          Mastered: {masteredCount}/{flashcards.length}
        </p>
      </div>

      <button onClick={() => setFlipped((value) => !value)} className="card-surface min-h-[220px] w-full p-6 text-left">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{flipped ? "Answer" : "Prompt"}</p>
        <p className="mt-3 font-[var(--font-heading)] text-2xl font-semibold text-slate-900">
          {flipped ? current.back : current.front}
        </p>
        <p className="mt-4 text-xs text-slate-500">Tap to flip.</p>
      </button>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => submitResult("incorrect")}
          disabled={pending}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
        >
          I missed it
        </button>
        <button
          onClick={() => submitResult("correct")}
          disabled={pending}
          className="rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          I got it
        </button>
      </div>

      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
