import Link from "next/link";
import type { Metadata } from "next";
import type { Report } from "@/lib/report";
import ReportView from "../ReportView";
import TrackView from "../../TrackView";
import exampleReport from "@/lib/example-report.json";

/**
 * Static example report — the judge fast-path (BUILD_PLAN Phase 4). Rendered
 * entirely from baked data with ZERO API calls, so it survives an Anthropic
 * outage (CLAUDE.md rule 11). Regenerate with scripts/gen-example.mjs.
 */
export const metadata: Metadata = {
  title: "Example report",
  description:
    "A real scorecard from a practice interview with Dana — what they found, what they missed, and the questions that would have cracked it open.",
};

const report = exampleReport as Report;

export default function ExampleReportPage() {
  return (
    <main className="min-h-dvh">
      <TrackView event="example_report_viewed" />

      <div className="mx-auto max-w-2xl px-6 pt-12">
        <Link
          href="/"
          className="text-xs text-ink-500 underline-offset-4 hover:text-ink-300 hover:underline"
        >
          ← Polite Lie
        </Link>
        <p className="mt-4 inline-block rounded-full border border-ink-700 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
          Example report
        </p>
        <p className="mt-3 max-w-xl text-ink-300">
          This is a real scorecard from a solid interview with Dana — strong
          enough to earn a B, but it still walked away without the two facts that
          decide whether her problem is buildable. That gap is the whole point.
        </p>
      </div>

      <ReportView report={report} />

      <div className="mx-auto max-w-2xl px-6 pb-16">
        <div className="flex flex-wrap gap-3 border-t border-ink-800 pt-8">
          <Link
            href="/#scenarios"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-accent-bright"
          >
            Try it yourself
          </Link>
          <Link
            href="/"
            className="rounded-full border border-ink-700 px-5 py-2.5 text-sm font-medium text-ink-200 transition hover:border-ink-500"
          >
            How it works
          </Link>
        </div>
      </div>
    </main>
  );
}
