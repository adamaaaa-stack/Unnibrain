import Link from "next/link";

import { STUDY_MODE_META, STUDY_MODE_ORDER, type StudyModeSlug } from "@/features/courses/modes";

export type ModeAvailabilityMap = Record<StudyModeSlug, boolean>;

export function StudyModeGrid(props: {
  courseId: string;
  availability: ModeAvailabilityMap;
  lastStudiedMode: StudyModeSlug | null;
}) {
  const { courseId, availability, lastStudiedMode } = props;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {STUDY_MODE_ORDER.map((slug) => {
        const meta = STUDY_MODE_META[slug];
        const enabled = availability[slug];
        const isLastStudied = lastStudiedMode === slug;

        return (
          <Link
            key={slug}
            href={`/courses/${courseId}/${slug}`}
            className={`rounded-xl border p-4 transition ${
              enabled
                ? "border-slate-200 bg-white hover:border-[var(--brand)] hover:shadow-sm"
                : "border-slate-200 bg-slate-50 opacity-80"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-[var(--font-heading)] text-base font-semibold text-slate-900">{meta.label}</h3>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${
                  enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                }`}
              >
                {enabled ? "Ready" : "Pending"}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{meta.shortDescription}</p>
            {isLastStudied ? (
              <p className="mt-3 inline-flex rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">
                Last studied
              </p>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
