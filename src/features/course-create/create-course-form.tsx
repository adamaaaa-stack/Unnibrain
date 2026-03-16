"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const ACCEPTED_TYPES = ".txt,.md,application/pdf,image/png,image/jpeg,image/webp,image/heic,image/heif";
const MAX_FILES = 10;

type Stage = "idle" | "validating" | "uploading" | "extracting" | "finalizing" | "generating";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CreateCourseForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [duplicateCourseId, setDuplicateCourseId] = useState<string | null>(null);
  const [allowDuplicate, setAllowDuplicate] = useState(false);

  const stageMessage = useMemo(() => {
    switch (stage) {
      case "validating":
        return "Validating your notes and files...";
      case "uploading":
        return "Uploading sources securely...";
      case "extracting":
        return "Extracting readable text...";
      case "finalizing":
        return "Finalizing course setup...";
      case "generating":
        return "Generating your study package...";
      default:
        return "";
    }
  }, [stage]);

  function applyFiles(incoming: FileList | File[]) {
    const next = [...files, ...Array.from(incoming)].slice(0, MAX_FILES);
    setFiles(next);
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setDuplicateCourseId(null);
    setIsSubmitting(true);
    setStage("validating");

    try {
      if (title.trim().length < 3) {
        throw new Error("Course title must be at least 3 characters.");
      }
      if (!pastedText.trim() && files.length === 0) {
        throw new Error("Add pasted notes or upload at least one file.");
      }

      const body = new FormData();
      body.append("title", title.trim());
      body.append("pastedText", pastedText);
      body.append("forceCreateDuplicate", allowDuplicate ? "true" : "false");
      files.forEach((file) => body.append("files", file));

      setStage("uploading");
      const response = await fetch("/api/courses/create", {
        method: "POST",
        body
      });

      setStage("extracting");
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        courseId?: string;
        generationJobId?: string;
        existingCourseId?: string;
      };
      setStage("finalizing");

      if (response.status === 409 && payload.existingCourseId) {
        setDuplicateCourseId(payload.existingCourseId);
        throw new Error(payload.error ?? "Looks like duplicate notes were uploaded.");
      }

      if (!response.ok || !payload.courseId) {
        throw new Error(payload.error ?? "Course creation failed.");
      }

      setStage("generating");
      const generationResponse = await fetch("/api/generation/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          courseId: payload.courseId,
          generationJobId: payload.generationJobId,
          forceRegenerate: false
        })
      });

      if (!generationResponse.ok) {
        const generationPayload = (await generationResponse.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(generationPayload.error ?? "Course created, but generation failed. Open the course and retry.");
      }

      router.push(`/courses/${payload.courseId}`);
    } catch (caught) {
      setStage("idle");
      setError(caught instanceof Error ? caught.message : "Unexpected error.");
      setIsSubmitting(false);
      return;
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="block text-sm font-medium text-slate-700">
        Course title
        <input
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={140}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--brand)]"
          placeholder="Biology Unit 3 - Cell Transport"
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Paste notes (optional if uploading files)
        <textarea
          value={pastedText}
          onChange={(event) => setPastedText(event.target.value)}
          maxLength={200000}
          className="mt-1 h-44 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--brand)]"
          placeholder="Paste your notes here..."
        />
      </label>

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">Upload files (PDF, images, text)</p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Select Files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={(event) => {
            if (event.target.files) {
              applyFiles(event.target.files);
              event.target.value = "";
            }
          }}
        />
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            if (event.dataTransfer.files) {
              applyFiles(event.dataTransfer.files);
            }
          }}
          className={`rounded-xl border-2 border-dashed p-5 text-sm ${
            isDragging ? "border-[var(--brand)] bg-blue-50" : "border-slate-300 bg-slate-50"
          }`}
        >
          Drag and drop files here. Up to {MAX_FILES} files.
        </div>
        {files.length > 0 ? (
          <ul className="space-y-2">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2">
                <span className="truncate text-sm text-slate-700">
                  {file.name} ({formatSize(file.size)})
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={allowDuplicate} onChange={(event) => setAllowDuplicate(event.target.checked)} />
        Allow duplicate course creation
      </label>

      {stageMessage && isSubmitting ? (
        <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">{stageMessage}</p>
      ) : null}

      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      {duplicateCourseId ? (
        <Link href={`/courses/${duplicateCourseId}`} className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
          Open existing course
        </Link>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isSubmitting ? "Processing..." : "Create Course"}
        </button>
        <Link href="/dashboard" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
          Cancel
        </Link>
      </div>
    </form>
  );
}
