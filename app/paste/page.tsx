"use client";

import { useState } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";
import { isPasteGraded, type PasteReport, type UngradedResult } from "@/lib/report";
import type { Normalized } from "@/lib/paste";
import PasteReportView from "./PasteReportView";

type Step =
  | { kind: "input" }
  | { kind: "busy"; label: string }
  | { kind: "confirm"; normalized: Normalized }
  | { kind: "report"; result: PasteReport | UngradedResult };

const LoadingDots = ({ label }: { label: string }) => (
  <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
    <div className="flex gap-1.5">
      <span className="size-2 animate-bounce rounded-full bg-accent [animation-delay:-0.3s]" />
      <span className="size-2 animate-bounce rounded-full bg-accent [animation-delay:-0.15s]" />
      <span className="size-2 animate-bounce rounded-full bg-accent" />
    </div>
    <p className="mt-5 font-serif text-xl text-ink-100">{label}</p>
  </main>
);

export default function PastePage() {
  const [step, setStep] = useState<Step>({ kind: "input" });
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function normalize() {
    if (raw.trim().length < 20) return;
    setError(null);
    setStep({ kind: "busy", label: "Reading your transcript…" });
    track("scenario_selected", { scenario: "paste" });
    try {
      const res = await fetch("/api/paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "normalize", raw: raw.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Couldn't read that. Try again.");
        setStep({ kind: "input" });
        return;
      }
      setStep({ kind: "confirm", normalized: data.normalized });
    } catch {
      setError("Network hiccup — try again.");
      setStep({ kind: "input" });
    }
  }

  async function grade(normalized: Normalized, interviewer: string) {
    setError(null);
    setStep({ kind: "busy", label: "Grading the interviewer…" });
    try {
      const res = await fetch("/api/paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "grade", normalized, interviewer }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Couldn't grade that. Try again.");
        setStep({ kind: "confirm", normalized });
        return;
      }
      track("interview_completed", { scenario: "paste", graded: isPasteGraded(data) });
      setStep({ kind: "report", result: data });
    } catch {
      setError("Network hiccup — try again.");
      setStep({ kind: "confirm", normalized });
    }
  }

  if (step.kind === "busy") return <LoadingDots label={step.label} />;

  if (step.kind === "confirm") {
    const { normalized } = step;
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-6 py-16">
        <Link href="/" className="text-xs text-ink-500 underline-offset-4 hover:text-ink-300 hover:underline">
          ← Polite Lie
        </Link>
        <h1 className="mt-4 font-serif text-3xl text-ink-50">Which one were you?</h1>
        <p className="mt-2 text-ink-300">
          We found {normalized.speakers.length} speakers. Pick the interviewer —
          the person asking the questions.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          {normalized.speakers.map((s) => (
            <button
              key={s}
              onClick={() => grade(normalized, s)}
              className="rounded-xl border border-ink-700 px-5 py-3 text-left text-ink-100 transition hover:border-accent-dim hover:bg-ink-900"
            >
              {s}
            </button>
          ))}
        </div>
        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </main>
    );
  }

  if (step.kind === "report") {
    if (!isPasteGraded(step.result)) {
      return (
        <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-6 py-16 text-center">
          <h1 className="font-serif text-3xl text-ink-50">Not enough to grade</h1>
          <p className="mt-3 text-ink-300">
            We counted {step.result.countedQuestions} real question
            {step.result.countedQuestions === 1 ? "" : "s"} from the interviewer.
            A fair audit needs at least {step.result.gateMin}.
          </p>
          <button
            onClick={() => setStep({ kind: "input" })}
            className="mt-8 self-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-ink-950 hover:bg-accent-bright"
          >
            Paste another
          </button>
        </main>
      );
    }
    return (
      <main className="min-h-dvh">
        <PasteReportView report={step.result} />
        <div className="mx-auto max-w-2xl px-6 pb-16">
          <div className="border-t border-ink-800 pt-8">
            <button
              onClick={() => {
                setRaw("");
                setStep({ kind: "input" });
              }}
              className="rounded-full border border-ink-700 px-5 py-2.5 text-sm font-medium text-ink-200 transition hover:border-ink-500"
            >
              Audit another transcript
            </button>
          </div>
        </div>
      </main>
    );
  }

  // input
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-6 py-16">
      <Link href="/" className="text-xs text-ink-500 underline-offset-4 hover:text-ink-300 hover:underline">
        ← Polite Lie
      </Link>
      <h1 className="mt-4 font-serif text-4xl text-ink-50">Audit a real interview</h1>
      <p className="mt-3 text-ink-300">
        Paste a transcript from a real customer conversation — Zoom, Otter, or
        raw notes. We grade the interviewer&apos;s technique out of 100. We never
        read it for insights; this is a technique audit, not a research tool.
      </p>
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={10}
        placeholder="Paste your transcript here. Speaker labels help but aren't required."
        className="mt-6 w-full resize-y rounded-xl border border-ink-700 bg-ink-900 px-4 py-3 text-sm text-ink-100 placeholder:text-ink-500 focus:border-accent-dim focus:outline-none"
      />
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      <button
        onClick={normalize}
        disabled={raw.trim().length < 20}
        className="mt-4 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-ink-950 transition hover:bg-accent-bright disabled:cursor-not-allowed disabled:opacity-40"
      >
        Analyze the transcript
      </button>
    </main>
  );
}
