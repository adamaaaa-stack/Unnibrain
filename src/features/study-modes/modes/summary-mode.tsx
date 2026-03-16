import type { StudySummary } from "@/features/study-modes/types";

export function SummaryMode({ summary }: { summary: StudySummary | null }) {
  if (!summary) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
        Summary is not available yet. Run generation first.
      </div>
    );
  }

  const lines = summary.content.split("\n").filter((line) => line.trim().length > 0);

  return (
    <article className="card-surface p-5 sm:p-6">
      <h2 className="font-[var(--font-heading)] text-lg font-semibold text-slate-900">Course Summary</h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
        {lines.map((line, index) => (
          <p key={`${index}-${line.slice(0, 20)}`} className={line.startsWith("- ") ? "pl-3" : ""}>
            {line}
          </p>
        ))}
      </div>
    </article>
  );
}
