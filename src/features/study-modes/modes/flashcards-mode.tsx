"use client";

import { useEffect, useState } from "react";

import type { StudyFlashcard } from "@/features/study-modes/types";
import { shuffleArray } from "@/features/study-modes/lib/utils";

export function FlashcardsMode({ flashcards }: { flashcards: StudyFlashcard[] }) {
  const [cards, setCards] = useState(flashcards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight") {
        setIndex((current) => Math.min(current + 1, cards.length - 1));
        setFlipped(false);
      } else if (event.key === "ArrowLeft") {
        setIndex((current) => Math.max(current - 1, 0));
        setFlipped(false);
      } else if (event.key === " ") {
        event.preventDefault();
        setFlipped((value) => !value);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [cards.length]);

  useEffect(() => {
    setCards(flashcards);
    setIndex(0);
    setFlipped(false);
  }, [flashcards]);

  if (flashcards.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
        Flashcards are not available yet. Run generation first.
      </div>
    );
  }

  const currentCard = cards[index];
  const progressPct = Math.round(((index + 1) / cards.length) * 100);

  return (
    <section className="space-y-4">
      <div className="card-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
          <span>
            Card {index + 1}/{cards.length}
          </span>
          <span>{progressPct}% complete</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-slate-100">
          <div className="h-2 rounded-full bg-[var(--brand)]" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <button
        onClick={() => setFlipped((value) => !value)}
        onTouchStart={(event) => setTouchStartX(event.touches[0]?.clientX ?? null)}
        onTouchEnd={(event) => {
          if (touchStartX == null) return;
          const delta = (event.changedTouches[0]?.clientX ?? touchStartX) - touchStartX;
          if (delta < -45) {
            setIndex((current) => Math.min(current + 1, cards.length - 1));
            setFlipped(false);
          } else if (delta > 45) {
            setIndex((current) => Math.max(current - 1, 0));
            setFlipped(false);
          }
          setTouchStartX(null);
        }}
        className="card-surface min-h-[220px] w-full p-6 text-left"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{flipped ? "Back" : "Front"}</p>
        <p className="mt-3 font-[var(--font-heading)] text-2xl font-semibold text-slate-900">
          {flipped ? currentCard.back : currentCard.front}
        </p>
        {flipped && currentCard.hint ? <p className="mt-4 text-sm text-slate-500">Hint: {currentCard.hint}</p> : null}
        <p className="mt-5 text-xs text-slate-500">Tap to flip. Swipe or arrow keys to navigate.</p>
      </button>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            setIndex((current) => Math.max(0, current - 1));
            setFlipped(false);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
        >
          Prev
        </button>
        <button
          onClick={() => {
            setIndex((current) => Math.min(cards.length - 1, current + 1));
            setFlipped(false);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
        >
          Next
        </button>
        <button
          onClick={() => {
            setCards((current) => shuffleArray(current));
            setIndex(0);
            setFlipped(false);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
        >
          Shuffle
        </button>
      </div>
    </section>
  );
}
