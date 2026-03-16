"use client";

import { useMemo, useState } from "react";

import type { StudyTerm } from "@/features/study-modes/types";

export function TermsMode({ terms }: { terms: StudyTerm[] }) {
  const [query, setQuery] = useState("");
  const [openTermId, setOpenTermId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return terms;
    return terms.filter((term) => term.term.toLowerCase().includes(normalized) || term.definition.toLowerCase().includes(normalized));
  }, [terms, query]);

  if (terms.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
        Terms are not available yet. Run generation first.
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="card-surface p-4">
        <label className="block text-sm font-medium text-slate-700">
          Search terms
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
            placeholder="Cell membrane..."
          />
        </label>
      </div>

      <div className="space-y-2">
        {filtered.map((term) => {
          const expanded = openTermId === term.id;
          return (
            <button
              key={term.id}
              onClick={() => setOpenTermId(expanded ? null : term.id)}
              className="card-surface w-full p-4 text-left"
            >
              <p className="font-[var(--font-heading)] text-base font-semibold text-slate-900">{term.term}</p>
              {expanded ? (
                <div className="mt-2 space-y-2 text-sm text-slate-700">
                  <p>{term.definition}</p>
                  <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600">Example: {term.example}</p>
                </div>
              ) : (
                <p className="mt-1 text-xs text-slate-500">Tap to reveal definition and example.</p>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
