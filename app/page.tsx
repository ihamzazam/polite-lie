import Link from "next/link";
import { listScenarioBriefs } from "@/lib/presets";

/** One-line hooks per scenario. Derived only from public visible profiles —
 *  never hints at disposition or hidden facts. */
const TEASERS: Record<string, string> = {
  "dana-payouts":
    "Seventy drivers, one shared spreadsheet, and a payout dispute every few days. She’s on her phone after the evening dispatch wave.",
  "priya-dispatch":
    "Dispatch runs on a whiteboard someone photographs at 6:30 a.m. You’ve caught her between the morning rush and a vendor call.",
  "marcus-fitness":
    "Logs every run and every meal by hand, and reads gear reviews for fun. Happy to talk after his evening run.",
};

const MECHANIC = [
  {
    title: "It lies politely",
    body: "Ask “would you pay for this?” and you’ll get a warm, genuine-sounding yes that means absolutely nothing. Leading questions go nowhere here — exactly like real ones.",
  },
  {
    title: "Specifics earn specifics",
    body: "A vague question gets a vague answer. Anchor to a real moment — “when did this last blow up on you?” — and the detail comes pouring out, numbers and all.",
  },
  {
    title: "A grade you can defend",
    body: "Your score is arithmetic over the questions you asked, and every flag quotes you verbatim. Run the same interview twice and the number holds.",
  },
];

export default function Home() {
  const scenarios = listScenarioBriefs();

  return (
    <div className="mx-auto w-full max-w-5xl px-6">
      {/* Hero */}
      <header className="flex min-h-dvh flex-col justify-center py-20">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">
          Polite Lie · a discovery-interview trainer
        </p>
        <h1 className="mt-6 max-w-3xl font-serif text-5xl leading-[1.05] text-ink-50 sm:text-6xl">
          Your customers won’t tell you the truth.{" "}
          <span className="italic text-accent">Neither will this one.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-300">
          Every AI research tool points the model at your customers. Polite Lie
          points it at you — a synthetic customer with a hidden agenda who
          agrees with everything and reveals almost nothing, until you learn to
          ask the right way.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
          <Link
            href="#scenarios"
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-ink-950 transition hover:bg-accent-bright"
          >
            Start a practice interview
          </Link>
          <Link
            href="/report/example"
            className="text-sm font-medium text-ink-200 underline-offset-4 hover:text-accent hover:underline"
          >
            See an example report →
          </Link>
        </div>
      </header>

      {/* Mechanic */}
      <section className="border-t border-ink-800 py-20">
        <div className="grid gap-10 sm:grid-cols-3">
          {MECHANIC.map((m, i) => (
            <div key={m.title}>
              <span className="font-serif text-2xl text-ink-700">0{i + 1}</span>
              <h2 className="mt-3 text-lg font-semibold text-ink-50">
                {m.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">
                {m.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Scenarios */}
      <section
        id="scenarios"
        className="scroll-mt-12 border-t border-ink-800 py-20"
      >
        <h2 className="font-serif text-3xl text-ink-50">
          Pick someone to interview
        </h2>
        <p className="mt-2 max-w-xl text-ink-300">
          Three real-feeling customers, each with a hidden truth that changes
          whether their problem is worth building for. Your job is to find it.
        </p>

        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {scenarios.map((s) => {
            const first = s.persona.name.split(" ")[0];
            return (
              <li key={s.id}>
                <Link
                  href={`/interview/${s.id}`}
                  className="group flex h-full flex-col rounded-2xl border border-ink-800 bg-ink-900/50 p-6 transition hover:border-accent-dim hover:bg-ink-900"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-xl text-ink-50">
                      {s.persona.name}
                    </h3>
                    <span className="rounded-full border border-ink-700 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-ink-400">
                      {s.difficulty}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-400">
                    {s.persona.role} · {s.persona.company_context}
                  </p>
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-ink-300">
                    {TEASERS[s.id] ?? s.persona.visible_profile}
                  </p>
                  <span className="mt-6 text-sm font-medium text-accent">
                    Interview {first} →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <Link
          href="/custom"
          className="group mt-5 flex items-center justify-between gap-4 rounded-2xl border border-dashed border-ink-700 px-6 py-5 transition hover:border-accent-dim hover:bg-ink-900/40"
        >
          <span className="text-ink-200">
            <span className="font-medium text-ink-50">Or bring your own idea.</span>{" "}
            We&apos;ll build a customer from scratch — one who has never heard of it.
          </span>
          <span className="shrink-0 text-sm font-medium text-accent">
            Build one →
          </span>
        </Link>
      </section>

      {/* Scoring one-liner */}
      <section className="border-t border-ink-800 py-20">
        <p className="max-w-2xl font-serif text-2xl leading-snug text-ink-200">
          Scored out of 100 — half for what you uncovered, half for how you
          asked. Smalltalk never counts against you.{" "}
          <span className="text-ink-400">Pitching does.</span>
        </p>
      </section>

      <footer className="border-t border-ink-800 py-10 text-sm text-ink-500">
        <p>
          Built for World Product Day 2026. The best possible session ends with
          you walking away from a bad idea — and the report says so.
        </p>
      </footer>
    </div>
  );
}
