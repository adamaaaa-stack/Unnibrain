"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type RunGenerationButtonProps = {
  courseId: string;
  disabled?: boolean;
};

export function RunGenerationButton({ courseId, disabled = false }: RunGenerationButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onRun(forceRegenerate: boolean) {
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/generation/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          courseId,
          forceRegenerate
        })
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Generation failed.");
      }

      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unexpected error.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <button
          onClick={() => onRun(false)}
          disabled={pending || disabled}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
        >
          {pending ? "Generating..." : "Generate Package"}
        </button>
        <button
          onClick={() => onRun(true)}
          disabled={pending || disabled}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
        >
          Regenerate
        </button>
      </div>
      {error ? <p className="max-w-xs text-right text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
