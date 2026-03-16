"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { TutorChatResponse } from "@/schemas/api/tutor";
import type { TutorGroundingSource } from "@/schemas/ai/tutor";

type TutorMessageSeed = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

type TutorModeProps = {
  courseId: string;
  initialMessages: TutorMessageSeed[];
};

type TutorMessage = TutorMessageSeed & {
  confidence?: TutorChatResponse["confidence"];
  followUpQuestion?: string;
  suggestedMode?: TutorChatResponse["suggestedMode"];
  grounding?: TutorGroundingSource[];
};

export function TutorMode({ courseId, initialMessages }: TutorModeProps) {
  const [messages, setMessages] = useState<TutorMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  async function sendMessage() {
    const message = input.trim();
    if (!message || isSending) {
      return;
    }

    setError(null);
    setInput("");
    setIsSending(true);

    const userMessage: TutorMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message,
      createdAt: new Date().toISOString()
    };

    setMessages((current) => [...current, userMessage]);

    try {
      const response = await fetch("/api/tutor/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          courseId,
          message,
          conversationLimit: 12
        })
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string } & Partial<TutorChatResponse>;
      const messageId = payload.messageId;
      const content = payload.content;
      const confidence = payload.confidence;
      if (!response.ok || !messageId || !content || !confidence) {
        throw new Error(payload.error ?? "Tutor request failed.");
      }

      setMessages((current) => [
        ...current,
        {
          id: messageId,
          role: "assistant",
          content,
          createdAt: new Date().toISOString(),
          confidence,
          followUpQuestion: payload.followUpQuestion,
          suggestedMode: payload.suggestedMode,
          grounding: payload.grounding
        }
      ]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unexpected tutor error.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="card-surface p-5">
        <h2 className="font-[var(--font-heading)] text-lg font-semibold text-slate-900">Course Tutor</h2>
        <p className="mt-2 text-sm text-slate-600">
          Ask for explanations, mnemonics, comparisons, quiz-style checks, or likely test focus areas. Replies stay grounded in this course.
        </p>
      </div>

      <div className="card-surface p-4">
        <div className="h-[420px] space-y-3 overflow-y-auto rounded-xl bg-slate-50 p-3">
          {messages.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
              Start with: Explain the hardest concept simply, Quiz me on chapter 2, or Give me a mnemonic for key terms.
            </div>
          ) : null}

          {messages.map((message) => {
            const isAssistant = message.role === "assistant";
            const bubbleClass = isAssistant
              ? "mr-8 border border-slate-200 bg-white text-slate-800"
              : "ml-8 border border-blue-200 bg-blue-50 text-slate-900";

            return (
              <article key={message.id} className={`rounded-xl p-3 text-sm ${bubbleClass}`}>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{isAssistant ? "Tutor" : "You"}</p>
                  <p className="text-[11px] text-slate-400">{new Date(message.createdAt).toLocaleTimeString()}</p>
                </div>
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>

                {isAssistant && message.confidence ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold">Confidence: {message.confidence}</span>
                    {message.suggestedMode ? (
                      <Link href={`/courses/${courseId}/${message.suggestedMode}`} className="rounded-full bg-blue-100 px-2 py-1 font-semibold text-blue-700">
                        Open {message.suggestedMode}
                      </Link>
                    ) : null}
                  </div>
                ) : null}

                {isAssistant && message.grounding && message.grounding.length > 0 ? (
                  <ul className="mt-2 space-y-1 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                    {message.grounding.map((item, index) => (
                      <li key={`${item.sourceType}-${index}`}>
                        <span className="font-semibold uppercase">{item.sourceType}:</span> {item.excerpt}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            );
          })}

          {isSending ? (
            <div className="mr-8 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">Tutor is thinking...</div>
          ) : null}
          <div ref={scrollAnchorRef} />
        </div>

        <div className="mt-3 space-y-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            placeholder="Ask a course-specific question..."
            className="h-28 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">Use Cmd/Ctrl + Enter to send.</p>
            <button
              onClick={() => void sendMessage()}
              disabled={isSending || !input.trim()}
              className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isSending ? "Sending..." : "Send"}
            </button>
          </div>

          {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        </div>
      </div>
    </section>
  );
}
