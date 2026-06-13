import Link from "next/link";
import TrackOnMount from "@/app/_components/TrackOnMount";

/**
 * Static example report — the judge fast-path (BUILD_PLAN Phase 4). MUST render
 * with zero API calls so it survives an Anthropic outage (CLAUDE.md rule 11).
 * Phase 0 placeholder; the real strong-fixture render lands in Phase 4.
 */
export default function ExampleReportPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-6 py-16 text-center">
      <TrackOnMount event="example_report_viewed" properties={{ source: "direct" }} />
      <p className="text-sm font-medium uppercase tracking-widest text-accent">
        Example report
      </p>
      <h1 className="mt-3 font-serif text-3xl text-ink-50">Coming together</h1>
      <p className="mt-3 text-ink-300">
        A full sample scorecard — built from a real practice session — will live
        here so you can see exactly what you get before asking a single question.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex w-fit self-center text-sm font-medium text-accent underline-offset-4 hover:underline"
      >
        ← Back home
      </Link>
    </main>
  );
}
