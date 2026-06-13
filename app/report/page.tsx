import Link from "next/link";

/**
 * Scorecard render. Phase 0 placeholder. In Phase 2 this renders a client-held
 * report JSON; in Phase 4 it also rebuilds a shared report from the URL
 * fragment with zero API calls (CLAUDE.md rule 11).
 */
export default function ReportPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-6 py-16 text-center">
      <h1 className="font-serif text-3xl text-ink-50">No report yet</h1>
      <p className="mt-3 text-ink-300">
        Run a practice interview and your scorecard lands here — what you found,
        what you missed, and the one question that would have cracked it open.
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
