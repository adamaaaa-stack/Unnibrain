import type { StudyTip } from "@/features/study-modes/types";

export function TipsMode({ tips }: { tips: StudyTip[] }) {
  if (tips.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
        Study tips are not available yet. Run generation first.
      </div>
    );
  }

  return (
    <section className="space-y-3">
      {tips.map((tip, index) => (
        <article key={tip.id} className="card-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tip {index + 1}</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{tip.tip}</p>
          {tip.reason ? <p className="mt-2 text-sm text-slate-600">{tip.reason}</p> : null}
        </article>
      ))}
    </section>
  );
}
