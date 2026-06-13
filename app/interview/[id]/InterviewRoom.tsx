"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { track } from "@/lib/analytics";
import type { ChatMessage, InterviewResponse, ScenarioBrief } from "@/lib/types";

const MAX_CHARS = 600;

interface Props {
  brief: ScenarioBrief;
}

export default function InterviewRoom({ brief }: Props) {
  const router = useRouter();
  const firstName = brief.persona.name.split(" ")[0];

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [revealedIds, setRevealedIds] = useState<string[]>([]);
  const [canon, setCanon] = useState<string[]>([]);
  const [signals, setSignals] = useState(0);
  const [questionsUsed, setQuestionsUsed] = useState(0);
  const [ended, setEnded] = useState(false);
  const [canEnd, setCanEnd] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const remaining = Math.max(0, brief.turn_budget - questionsUsed);

  useEffect(() => {
    track("scenario_selected", { scenario: brief.id });
  }, [brief.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  async function send() {
    const question = input.trim();
    if (!question || loading || ended) return;

    if (!startedRef.current) {
      startedRef.current = true;
      track("interview_started", { scenario: brief.id });
    }

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: question },
    ];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);
    track("question_sent", { scenario: brief.id, turn: questionsUsed + 1 });

    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: brief.id,
          messages: nextMessages,
          revealedIds,
          canon,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        // Roll back the optimistic question so it can be retried.
        setMessages(messages);
        setInput(question);
        setError(data?.error ?? "Something went wrong. Try again.");
        return;
      }

      const data = (await res.json()) as InterviewResponse;
      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
      setRevealedIds(data.revealedIds);
      setCanon(data.canon);
      setSignals(data.signalsCaptured);
      setQuestionsUsed(data.questionsUsed);
      setCanEnd(data.canEnd);
      if (data.ended) setEnded(true);
    } catch {
      setMessages(messages);
      setInput(question);
      setError("Network hiccup — try sending that again.");
    } finally {
      setLoading(false);
    }
  }

  async function endInterview(reason: "user_ended" | "budget") {
    if (grading) return;
    setGrading(true);
    setError(null);
    track("interview_completed", {
      scenario: brief.id,
      reason,
      signals,
      questions: questionsUsed,
    });
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: brief.id, messages }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "We couldn't grade that session. Try again.");
        setGrading(false);
        return;
      }
      const result = await res.json();
      sessionStorage.setItem("polite-lie:lastReport", JSON.stringify(result));
      router.push("/report");
    } catch {
      setError("Network hiccup while grading — try again.");
      setGrading(false);
    }
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-2xl flex-col px-4 sm:px-6">
      {grading && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink-950/90 px-6 text-center backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <div className="flex gap-1.5">
            <span className="size-2 animate-bounce rounded-full bg-accent [animation-delay:-0.3s]" />
            <span className="size-2 animate-bounce rounded-full bg-accent [animation-delay:-0.15s]" />
            <span className="size-2 animate-bounce rounded-full bg-accent" />
          </div>
          <p className="mt-5 font-serif text-xl text-ink-100">
            Grading your interview…
          </p>
          <p className="mt-2 max-w-sm text-sm text-ink-400">
            Re-reading every question and checking what {firstName} quietly let
            slip.
          </p>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between gap-4 border-b border-ink-800 py-4">
        <div className="min-w-0">
          <Link
            href="/"
            className="text-xs text-ink-500 underline-offset-4 hover:text-ink-300 hover:underline"
          >
            ← Leave
          </Link>
          <h1 className="truncate font-serif text-lg text-ink-50">
            {brief.persona.name}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-4 text-right">
          <div>
            <p className="text-sm font-semibold text-accent" aria-live="polite">
              {signals}
            </p>
            <p className="text-[11px] uppercase tracking-wider text-ink-500">
              signals
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-200">{remaining}</p>
            <p className="text-[11px] uppercase tracking-wider text-ink-500">
              left
            </p>
          </div>
        </div>
      </header>

      {/* Brief (compact, always visible) */}
      <details className="border-b border-ink-800 py-3 text-sm" open={messages.length === 0}>
        <summary className="cursor-pointer list-none text-ink-300 marker:hidden">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
            Briefing
          </span>{" "}
          <span className="text-ink-400">— {brief.research_brief}</span>
        </summary>
        <p className="mt-3 text-ink-300">{brief.persona.visible_profile}</p>
      </details>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto py-6"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-ink-500">
            {firstName} is waiting. Open with a question about how things
            actually work today — not about your idea.
          </p>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-accent/15 px-4 py-2.5 text-sm text-ink-100">
                {m.content}
              </p>
            </div>
          ) : (
            <div key={i} className="flex justify-start">
              <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-ink-900 px-4 py-2.5 text-sm text-ink-200">
                {m.content}
              </p>
            </div>
          ),
        )}

        {loading && (
          <div className="flex justify-start">
            <p className="rounded-2xl rounded-bl-sm bg-ink-900 px-4 py-3 text-sm text-ink-500">
              <span className="inline-flex gap-1">
                <span className="size-1.5 animate-bounce rounded-full bg-ink-500 [animation-delay:-0.3s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-ink-500 [animation-delay:-0.15s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-ink-500" />
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Composer / end states */}
      <div className="border-t border-ink-800 py-4">
        {error && (
          <p className="mb-2 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        {ended ? (
          <div className="text-center">
            <p className="text-sm text-ink-300">
              {firstName} had to run. That&apos;s the interview.
            </p>
            <button
              onClick={() => endInterview("budget")}
              disabled={grading}
              className="mt-3 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-accent-bright disabled:opacity-60"
            >
              {grading ? "Grading…" : "See how you did"}
            </button>
          </div>
        ) : (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
              className="flex items-end gap-2"
            >
              <label htmlFor="question" className="sr-only">
                Your question
              </label>
              <textarea
                id="question"
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                rows={1}
                placeholder={`Ask ${firstName} something…`}
                disabled={loading}
                className="max-h-32 min-h-[2.75rem] flex-1 resize-none rounded-xl border border-ink-700 bg-ink-900 px-4 py-3 text-sm text-ink-100 placeholder:text-ink-500 focus:border-accent-dim focus:outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={loading || input.trim().length === 0}
                className="h-11 shrink-0 rounded-xl bg-accent px-5 text-sm font-semibold text-ink-950 transition hover:bg-accent-bright disabled:cursor-not-allowed disabled:opacity-40"
              >
                Send
              </button>
            </form>
            <div className="mt-2 flex items-center justify-between text-[11px] text-ink-600">
              <span>
                {input.length > MAX_CHARS - 80
                  ? `${MAX_CHARS - input.length} characters left`
                  : "Shift+Enter for a new line"}
              </span>
              <button
                onClick={() => endInterview("user_ended")}
                disabled={!canEnd || grading}
                className="font-medium text-ink-400 underline-offset-4 hover:text-accent hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
                title={
                  canEnd
                    ? "End and see your report"
                    : "Ask a few real questions first"
                }
              >
                {grading ? "Grading…" : "End interview"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
