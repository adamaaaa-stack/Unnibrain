"use client";

import { useEffect, useRef, useState } from "react";

import type { BrainDumpEvaluation } from "@/schemas/ai/voice";

type BrainDumpSessionPreview = {
  id: string;
  createdAt: string;
  score: number;
  feedback: string;
};

type BrainDumpModeProps = {
  courseId: string;
  initialSessions: BrainDumpSessionPreview[];
};

type BrainDumpResponse = {
  sessionId: string;
  createdAt: string;
  evaluation: BrainDumpEvaluation;
};

export function BrainDumpMode({ courseId, initialSessions }: BrainDumpModeProps) {
  const recognitionRef = useRef<any>(null);
  const [supportsSpeech, setSupportsSpeech] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<BrainDumpEvaluation | null>(null);
  const [sessions, setSessions] = useState<BrainDumpSessionPreview[]>(initialSessions);

  useEffect(() => {
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setSupportsSpeech(false);
      return;
    }

    setSupportsSpeech(true);
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let combined = "";
      for (let i = 0; i < event.results.length; i += 1) {
        combined += `${event.results[i][0].transcript} `;
      }
      setTranscript(combined.trim());
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.onerror = () => {
      setIsRecording(false);
      setError("Speech capture failed. You can paste/type transcript manually.");
    };

    recognitionRef.current = recognition;
    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  function startRecording() {
    setError(null);
    if (!recognitionRef.current) {
      setError("Speech recognition is not available in this browser.");
      return;
    }
    recognitionRef.current.start();
    setIsRecording(true);
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }

  async function evaluateTranscript() {
    if (!transcript.trim()) {
      setError("Transcript is required.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/brain-dump/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          courseId,
          transcript
        })
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      } & Partial<BrainDumpResponse>;
      const evaluation = payload.evaluation;
      const sessionId = payload.sessionId;
      const createdAt = payload.createdAt;

      if (!response.ok || !evaluation || !sessionId || !createdAt) {
        throw new Error(payload.error ?? "Brain Dump evaluation failed.");
      }

      setEvaluation(evaluation);
      setSessions((current) => [
        {
          id: sessionId,
          createdAt,
          score: evaluation.score,
          feedback: evaluation.feedback
        },
        ...current
      ]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unexpected error.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="card-surface p-5">
        <h2 className="font-[var(--font-heading)] text-lg font-semibold text-slate-900">How Brain Dump Works</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Review your notes briefly.</li>
          <li>Close your notes.</li>
          <li>Speak everything you remember about the topic.</li>
          <li>Get scored feedback on covered, partial, and missed concepts.</li>
        </ol>
      </div>

      <div className="card-surface space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          {supportsSpeech ? (
            <>
              <button
                onClick={startRecording}
                disabled={isRecording}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
              >
                Start Recording
              </button>
              <button
                onClick={stopRecording}
                disabled={!isRecording}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
              >
                Stop
              </button>
            </>
          ) : (
            <p className="text-sm text-slate-600">Speech capture unavailable in this browser. Use transcript input below.</p>
          )}
          {isRecording ? <span className="text-xs font-semibold text-red-600">Recording...</span> : null}
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Transcript
          <textarea
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            className="mt-1 h-48 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--brand)]"
            placeholder="Speak or type your brain dump here..."
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={evaluateTranscript}
            disabled={isSubmitting || !transcript.trim()}
            className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isSubmitting ? "Evaluating..." : "Evaluate Brain Dump"}
          </button>
          <button
            onClick={() => setTranscript("")}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Clear
          </button>
        </div>

        {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      </div>

      {evaluation ? (
        <div className="card-surface space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-[var(--font-heading)] text-lg font-semibold text-slate-900">Results</h3>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">Score: {evaluation.score}/100</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              Transcript quality: {evaluation.transcriptQuality}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-semibold uppercase text-emerald-700">Covered</p>
              <ul className="mt-2 space-y-1 text-sm text-emerald-900">
                {evaluation.covered.slice(0, 6).map((item, index) => (
                  <li key={`${item.concept}-${index}`}>{item.concept}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold uppercase text-amber-700">Partial</p>
              <ul className="mt-2 space-y-1 text-sm text-amber-900">
                {evaluation.partial.slice(0, 6).map((item, index) => (
                  <li key={`${item.concept}-${index}`}>{item.concept}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-xs font-semibold uppercase text-red-700">Missed</p>
              <ul className="mt-2 space-y-1 text-sm text-red-900">
                {evaluation.missed.slice(0, 6).map((item, index) => (
                  <li key={`${item.concept}-${index}`}>{item.concept}</li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-sm text-slate-700">{evaluation.feedback}</p>

          <div>
            <p className="text-sm font-semibold text-slate-800">Next revision targets</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {evaluation.nextRevisionTargets.map((target, index) => (
                <li key={`${target}-${index}`}>{target}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {sessions.length > 0 ? (
        <div className="card-surface p-5">
          <h3 className="font-[var(--font-heading)] text-lg font-semibold text-slate-900">Recent Sessions</h3>
          <ul className="mt-3 space-y-2">
            {sessions.slice(0, 5).map((session) => (
              <li key={session.id} className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">Score: {session.score}/100</span>
                  <span className="text-xs text-slate-500">{new Date(session.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-2 line-clamp-2">{session.feedback}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
