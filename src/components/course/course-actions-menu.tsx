"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type CourseActionsMenuProps = {
  courseId: string;
};

export function CourseActionsMenu({ courseId }: CourseActionsMenuProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!containerRef.current) return;
      if (event.target instanceof Node && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, []);

  async function runGeneration(forceRegenerate: boolean) {
    setPending(true);
    setMessage(null);
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

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Generation failed.");
      }
      setMessage(forceRegenerate ? "Regeneration completed." : "Generation completed.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setPending(false);
      setOpen(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setMessage("Course link copied.");
    } catch {
      setMessage("Could not copy link.");
    } finally {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
      >
        Actions
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <button
            onClick={() => runGeneration(false)}
            disabled={pending}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            Run generation
          </button>
          <button
            onClick={() => runGeneration(true)}
            disabled={pending}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            Regenerate package
          </button>
          <button
            onClick={() => router.refresh()}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
          >
            Refresh course data
          </button>
          <button onClick={copyLink} className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100">
            Copy course link
          </button>
        </div>
      ) : null}

      {message ? <p className="mt-2 max-w-xs text-right text-xs text-slate-600">{message}</p> : null}
    </div>
  );
}
