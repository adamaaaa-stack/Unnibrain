import type { StudyGuideSection } from "@/features/study-modes/types";

export function GuideMode({ sections }: { sections: StudyGuideSection[] }) {
  if (sections.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
        Guide is not available yet. Run generation first.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sections.map((section, index) => (
        <details key={section.id} open={index === 0} className="card-surface overflow-hidden">
          <summary className="cursor-pointer list-none border-b border-slate-200 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-[var(--font-heading)] text-base font-semibold text-slate-900">{section.title}</h3>
              <span className="text-xs text-slate-500">Section {index + 1}</span>
            </div>
          </summary>
          <div className="space-y-3 px-5 py-4">
            <p className="text-sm text-slate-700">{section.summary}</p>
          </div>
        </details>
      ))}
    </div>
  );
}
