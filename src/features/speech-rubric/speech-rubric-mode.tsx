"use client";

import { useEffect, useRef, useState } from "react";

import type { SpeechRubricEvaluateResponse } from "@/schemas/api/voice";
import type { SpeechRubricEvaluation } from "@/schemas/ai/voice";

type SpeechRubricSessionPreview = {
  id: string;
  title: string | null;
  createdAt: string;
  contentScore: number;
  clarityScore: number;
  structureScore: number;
  confidenceScore: number;
};

type SpeechRubricModeProps = {
  courseId: string;
  courseTitle: string;
  initialSessions: SpeechRubricSessionPreview[];
};

export function SpeechRubricMode({ courseId, courseTitle, initialSessions }: SpeechRubricModeProps) {
  const recognitionRef = useRef<any>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const [supportsSpeech, setSupportsSpeech] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [title, setTitle] = useState(courseTitle);
  const [transcript, setTranscript] = useState("");
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<SpeechRubricEvaluation | null>(null);
  const [sessions, setSessions] = useState<SpeechRubricSessionPreview[]>(initialSessions);

  function finalizeDuration() {
    if (!recordingStartedAtRef.current) {
      return;
    }
    const elapsedSeconds = Math.max(1, Math.round((Date.now() - recordingStartedAtRef.current) / 1000));
    setDurationSeconds(elapsedSeconds);
    recordingStartedAtRef.current = null;
  }

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
      finalizeDuration();
    };

    recognition.onerror = () => {
      setIsRecording(false);
      finalizeDuration();
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
    recordingStartedAtRef.current = Date.now();
    setDurationSeconds(null);
    recognitionRef.current.start();
    setIsRecording(true);
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    setIsRecording(false);
    finalizeDuration();
  }

  async function evaluateSpeech() {
    if (!transcript.trim()) {
      setError("Transcript is required.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/speech-rubric/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          courseId,
          title: title.trim() || undefined,
          transcript,
          durationSeconds: durationSeconds ?? undefined
        })
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string } & Partial<SpeechRubricEvaluateResponse>;
      const evaluation = payload.evaluation;
      const sessionId = payload.sessionId;
      const createdAt = payload.createdAt;

      if (!response.ok || !evaluation || !sessionId || !createdAt) {
        throw new Error(payload.error ?? "Speech Rubric evaluation failed.");
      }

      setEvaluation(evaluation);
      setSessions((current) => [
        {
          id: sessionId,
          title: title.trim() || courseTitle,
          createdAt,
          contentScore: evaluation.content.score,
          clarityScore: evaluation.clarity.score,
          structureScore: evaluation.structure.score,
          confidenceScore: evaluation.confidence.score
        },
        ...current
      ]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unexpected error.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const fillerWords = evaluation
    ? Object.entries(evaluation.fillerWords)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
    : [];

  return (
    <section className="space-y-4">
      <div className="card-surface p-5">
        <h2 className="font-[var(--font-heading)] text-lg font-semibold text-slate-900">How Speech Rubric Works</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Pick a clear topic or exam answer.</li>
          <li>Deliver your explanation out loud without reading.</li>
          <li>Submit transcript for rubric scoring.</li>
          <li>Use feedback to improve clarity, structure, and confidence.</li>
        </ol>
      </div>

      <div className="card-surface space-y-4 p-5">
        <label className="block text-sm font-medium text-slate-700">
          Topic title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={160}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--brand)]"
            placeholder="Topic or question you are presenting"
          />
        </label>

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
          {durationSeconds ? <span className="text-xs font-semibold text-slate-600">Duration: ~{durationSeconds}s</span> : null}
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Transcript
          <textarea
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            className="mt-1 h-48 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--brand)]"
            placeholder="Speak or type your presentation transcript..."
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={evaluateSpeech}
            disabled={isSubmitting || !transcript.trim()}
            className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isSubmitting ? "Evaluating..." : "Evaluate Speech"}
          </button>
          <button
            onClick={() => {
              setTranscript("");
              setDurationSeconds(null);
            }}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Clear
          </button>
        </div>

        {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      </div>

      {evaluation ? (
        <div className="card-surface space-y-4 p-5">
          <h3 className="font-[var(--font-heading)] text-lg font-semibold text-slate-900">Rubric Results</h3>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Content</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{evaluation.content.score}/100</p>
              <p className="mt-2 text-sm text-slate-700">{evaluation.content.rationale}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Clarity</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{evaluation.clarity.score}/100</p>
              <p className="mt-2 text-sm text-slate-700">{evaluation.clarity.rationale}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Structure</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{evaluation.structure.score}/100</p>
              <p className="mt-2 text-sm text-slate-700">{evaluation.structure.rationale}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Confidence</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{evaluation.confidence.score}/100</p>
              <p className="mt-2 text-sm text-slate-700">{evaluation.confidence.rationale}</p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-blue-50 p-3">
            <p className="text-xs font-semibold uppercase text-blue-700">Pacing</p>
            <p className="mt-1 text-sm text-blue-900">
              {evaluation.pacing ? `${evaluation.pacing.score}/100 — ${evaluation.pacing.rationale}` : "No confident pacing score from available timing data."}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold uppercase text-amber-700">Filler Words</p>
            <p className="mt-1 text-sm text-amber-900">Detected count: {evaluation.fillerWordCount}</p>
            {fillerWords.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {fillerWords.map(([word, count]) => (
                  <span key={word} className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-700">
                    {word}: {count}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-amber-900">No prominent filler words detected.</p>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-semibold uppercase text-emerald-700">Positives</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-emerald-900">
                {evaluation.positives.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold uppercase text-amber-700">Improve</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
                {evaluation.improvements.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs font-semibold uppercase text-blue-700">Suggested Changes</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-blue-900">
                {evaluation.suggestedChanges.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{evaluation.confidenceNote}</p>
        </div>
      ) : null}

      {sessions.length > 0 ? (
        <div className="card-surface p-5">
          <h3 className="font-[var(--font-heading)] text-lg font-semibold text-slate-900">Recent Sessions</h3>
          <ul className="mt-3 space-y-2">
            {sessions.slice(0, 5).map((session) => (
              <li key={session.id} className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{session.title ?? "Untitled speech"}</span>
                  <span className="text-xs text-slate-500">{new Date(session.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  Content {session.contentScore} | Clarity {session.clarityScore} | Structure {session.structureScore} | Confidence{" "}
                  {session.confidenceScore}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
