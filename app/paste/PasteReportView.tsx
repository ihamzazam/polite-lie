import type { PasteReport } from "@/lib/report";
import type { Grade } from "@/lib/scoring";

const GRADE_TONE: Record<Grade, string> = {
  A: "text-emerald-400",
  B: "text-accent-bright",
  C: "text-accent",
  D: "text-orange-400",
  F: "text-red-400",
};

function Stat({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-ink-800 py-2">
      <span className="text-sm text-ink-300">{label}</span>
      <span className="text-sm tabular-nums text-ink-100">
        {value}
        <span className="text-ink-500">/{max}</span>
      </span>
    </div>
  );
}

export default function PasteReportView({ report }: { report: PasteReport }) {
  const { scores, narrative } = report;
  const b = scores.techniqueBreakdown;

  return (
    <article className="mx-auto w-full max-w-2xl px-6 py-12">
      <header className="border-b border-ink-800 pb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-500">
          Technique audit
        </p>
        <div className="mt-3 flex items-baseline gap-4">
          <span className={`font-serif text-7xl leading-none ${GRADE_TONE[scores.grade]}`}>
            {scores.grade}
          </span>
          <span className="font-serif text-3xl text-ink-200">
            {scores.total}
            <span className="text-ink-500">/100</span>
          </span>
        </div>
        <p className="mt-3 max-w-lg text-sm text-ink-400">
          Scored on technique only — how you asked, not what you found. We don&apos;t
          read your transcript for insights; that&apos;s your job.
        </p>
      </header>

      <p className="mt-8 font-serif text-2xl leading-snug text-ink-50">{narrative.verdict}</p>

      {narrative.best && (
        <section className="mt-12">
          <h2 className="font-serif text-xl text-ink-50">Your best question</h2>
          <blockquote className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5">
            <p className="text-ink-100">“{narrative.best.quote}”</p>
            <p className="mt-2 text-sm text-emerald-300/90">{narrative.best.why}</p>
          </blockquote>
        </section>
      )}

      {narrative.worst.length > 0 && (
        <section className="mt-12">
          <h2 className="font-serif text-xl text-ink-50">Where you lost the thread</h2>
          <ul className="mt-5 space-y-5">
            {narrative.worst.map((w, i) => (
              <li key={i} className="rounded-2xl border border-ink-800 p-5">
                <p className="text-ink-200">“{w.quote}”</p>
                <p className="mt-2 text-sm text-ink-400">{w.failure}</p>
                <p className="mt-3 border-l-2 border-accent-dim pl-3 text-sm text-ink-100">
                  <span className="text-ink-500">Try: </span>
                  {w.rewrite}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-12">
        <h2 className="font-serif text-xl text-ink-50">The breakdown</h2>
        <div className="mt-4 grid gap-x-8 sm:grid-cols-2">
          <Stat label="Question quality" value={b.question_quality} max={20} />
          <Stat label="Probe depth" value={b.probe_depth} max={10} />
          <Stat label="Talk ratio" value={b.talk_ratio} max={5} />
          <Stat label="Pitch discipline" value={b.pitch_discipline} max={5} />
          <Stat label="Money courage" value={b.money_courage} max={5} />
          <Stat label="Validation hygiene" value={b.validation_hygiene} max={5} />
        </div>
      </section>

      {narrative.drills.length > 0 && (
        <section className="mt-12">
          <h2 className="font-serif text-xl text-ink-50">Three drills for next time</h2>
          <ol className="mt-4 space-y-3">
            {narrative.drills.map((d, i) => (
              <li key={i} className="flex gap-3 text-ink-200">
                <span className="font-serif text-accent">{i + 1}</span>
                <span>{d}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </article>
  );
}
