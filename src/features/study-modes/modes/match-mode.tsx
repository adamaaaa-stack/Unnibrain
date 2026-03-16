"use client";

import { useEffect, useState } from "react";

import type { StudyFlashcard } from "@/features/study-modes/types";
import { shuffleArray } from "@/features/study-modes/lib/utils";

type MatchCard = {
  id: string;
  pairId: string;
  side: "front" | "back";
  content: string;
};

type MatchModeProps = {
  courseId: string;
  flashcards: StudyFlashcard[];
};

export function MatchMode({ courseId, flashcards }: MatchModeProps) {
  const [cards, setCards] = useState<MatchCard[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [mistakes, setMistakes] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timeSeconds = startTime ? Math.max(1, Math.floor((Date.now() - startTime) / 1000)) : 0;

  useEffect(() => {
    const limited = flashcards.slice(0, 8);
    const generatedCards = limited.flatMap((card) => [
      {
        id: `${card.id}-front`,
        pairId: card.id,
        side: "front" as const,
        content: card.front
      },
      {
        id: `${card.id}-back`,
        pairId: card.id,
        side: "back" as const,
        content: card.back
      }
    ]);

    setCards(shuffleArray(generatedCards));
    setSelected([]);
    setMatchedIds(new Set());
    setMistakes(0);
    setCompleted(false);
    setStartTime(null);
    setError(null);
  }, [flashcards]);

  if (flashcards.length < 2) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
        Match mode needs at least two flashcards.
      </div>
    );
  }

  async function saveAttempt(seconds: number, totalMistakes: number) {
    try {
      const response = await fetch("/api/study/match/attempt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          courseId,
          timeSeconds: seconds,
          mistakes: totalMistakes
        })
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not save match attempt.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unexpected error.");
    }
  }

  function resolveSelection(firstId: string, secondId: string) {
    const first = cards.find((card) => card.id === firstId);
    const second = cards.find((card) => card.id === secondId);
    if (!first || !second) {
      setSelected([]);
      return;
    }

    const isMatch = first.pairId === second.pairId && first.side !== second.side;
    if (isMatch) {
      setMatchedIds((current) => {
        const next = new Set(current);
        next.add(firstId);
        next.add(secondId);
        if (next.size === cards.length) {
          const elapsed = startTime ? Math.max(1, Math.floor((Date.now() - startTime) / 1000)) : 1;
          setCompleted(true);
          void saveAttempt(elapsed, mistakes);
        }
        return next;
      });
      setSelected([]);
      return;
    }

    setMistakes((value) => value + 1);
    setTimeout(() => setSelected([]), 450);
  }

  function onCardClick(cardId: string) {
    if (completed) return;
    if (matchedIds.has(cardId)) return;
    if (selected.includes(cardId)) return;
    if (!startTime) {
      setStartTime(Date.now());
    }

    if (selected.length === 0) {
      setSelected([cardId]);
      return;
    }

    const firstId = selected[0];
    const secondId = cardId;
    setSelected([firstId, secondId]);
    resolveSelection(firstId, secondId);
  }

  return (
    <section className="space-y-4">
      <div className="card-surface flex flex-wrap items-center justify-between gap-3 p-4 text-sm text-slate-700">
        <p>Matched pairs: {matchedIds.size / 2}</p>
        <p>Mistakes: {mistakes}</p>
        <p>Time: {timeSeconds}s</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {cards.map((card) => {
          const isMatched = matchedIds.has(card.id);
          const isSelected = selected.includes(card.id);
          return (
            <button
              key={card.id}
              onClick={() => onCardClick(card.id)}
              disabled={isMatched}
              className={`min-h-[96px] rounded-lg border p-3 text-left text-sm transition ${
                isMatched
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : isSelected
                    ? "border-[var(--brand)] bg-blue-50 text-slate-900"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              {card.content}
            </button>
          );
        })}
      </div>

      {completed ? (
        <div className="card-surface p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Completed</p>
          <p className="mt-1">
            Finished in {timeSeconds}s with {mistakes} mistakes.
          </p>
        </div>
      ) : null}

      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
