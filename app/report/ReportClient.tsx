"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";
import {
  decodeReportFromHash,
  encodeReportToHash,
  isGraded,
  shareHighlight,
  type GradeResult,
  type Report,
} from "@/lib/report";
import ReportView from "./ReportView";

const STORAGE_KEY = "polite-lie:lastReport";

type State =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "result"; result: GradeResult; shared: boolean };

function ShareButton({ report }: { report: Report }) {
  const [copied, setCopied] = useState(false);
  function share() {
    const url =
      `${location.origin}/report` +
      `?g=${report.scores.grade}&s=${Math.round(report.scores.total)}` +
      `&l=${encodeURIComponent(shareHighlight(report))}` +
      `#${encodeReportToHash(report)}`;
    track("share_clicked", { scenario: report.scenarioId, grade: report.scores.grade });
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => undefined,
    );
  }
  return (
    <button
      onClick={share}
      className="rounded-full border border-ink-700 px-5 py-2.5 text-sm font-medium text-ink-200 transition hover:border-ink-500"
    >
      {copied ? "Link copied ✓" : "Share this report"}
    </button>
  );
}

export default function ReportClient() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    // A shared report rides in the URL fragment (no API call); a fresh session
    // sits in sessionStorage.
    let next: State = { kind: "empty" };
    try {
      const hash = window.location.hash.replace(/^#/, "");
      const fromHash = hash ? decodeReportFromHash(hash) : null;
      if (fromHash) {
        next = { kind: "result", result: fromHash, shared: true };
        track("report_viewed", { graded: true, grade: fromHash.scores.grade, shared: true });
      } else {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) {
          const result = JSON.parse(raw) as GradeResult;
          next = { kind: "result", result, shared: false };
          track("report_viewed", {
            graded: isGraded(result),
            grade: isGraded(result) ? result.scores.grade : undefined,
          });
        }
      }
    } catch {
      next = { kind: "empty" };
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot mount read
    setState(next);
  }, []);

  if (state.kind === "loading") {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6 text-ink-500">
        <p>Loading your report…</p>
      </main>
    );
  }

  if (state.kind === "empty") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-6 py-16 text-center">
        <h1 className="font-serif text-3xl text-ink-50">No report yet</h1>
        <p className="mt-3 text-ink-300">
          Run a practice interview and your scorecard lands here — what you
          found, what you missed, and the one question that would have cracked it
          open.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-accent-bright"
          >
            Start an interview
          </Link>
          <Link
            href="/report/example"
            className="text-sm text-ink-400 underline-offset-4 hover:text-ink-200 hover:underline"
          >
            See an example report instead
          </Link>
        </div>
      </main>
    );
  }

  const { result, shared } = state;

  if (!isGraded(result)) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-6 py-16 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-accent">
          Not enough to grade
        </p>
        <h1 className="mt-3 font-serif text-3xl text-ink-50">That was a short one</h1>
        <p className="mt-3 text-ink-300">
          You asked {result.countedQuestions} real question
          {result.countedQuestions === 1 ? "" : "s"}. A fair scorecard needs at
          least {result.gateMin}. Here&apos;s what a full report looks like — then
          give it a proper run.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <Link
            href="/report/example"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-accent-bright"
          >
            See an example report
          </Link>
          <Link
            href="/"
            className="text-sm text-ink-400 underline-offset-4 hover:text-ink-200 hover:underline"
          >
            Try another interview
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh">
      <ReportView report={result} />
      <div className="mx-auto max-w-2xl px-6 pb-16">
        <div className="flex flex-wrap gap-3 border-t border-ink-800 pt-8">
          {shared ? (
            <Link
              href="/#scenarios"
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-accent-bright"
            >
              Try it yourself
            </Link>
          ) : (
            <>
              <Link
                href={`/interview/${result.scenarioId}`}
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-accent-bright"
              >
                Run it again
              </Link>
              <ShareButton report={result} />
              <Link
                href="/"
                className="rounded-full border border-ink-700 px-5 py-2.5 text-sm font-medium text-ink-200 transition hover:border-ink-500"
              >
                Another customer
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
