"use client";

import { useState } from "react";
import Link from "next/link";

type PaywallModalProps = {
  featureName: string;
  ctaLabel?: string;
  buttonClassName?: string;
};

export function PaywallModal({ featureName, ctaLabel = "Unlock Pro", buttonClassName = "" }: PaywallModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 ${buttonClassName}`}
      >
        {ctaLabel}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="font-[var(--font-heading)] text-xl font-semibold text-slate-900">{featureName} is Pro-only</h3>
            <p className="mt-2 text-sm text-slate-600">
              Upgrade to UniBrain Pro to access {featureName}, unlimited course generations, and course-aware tutor help.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
              >
                Not now
              </button>
              <Link
                href="/billing"
                className="rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white hover:opacity-95"
              >
                Go to Billing
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
