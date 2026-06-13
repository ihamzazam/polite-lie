import Link from "next/link";
import { notFound } from "next/navigation";
import { listScenarioBriefs } from "@/lib/presets";

/**
 * Interview chat UI. Phase 0: a server-rendered placeholder that proves the
 * scenario brief loads (and never leaks facts). The live chat loop is Phase 1.
 */
export default async function InterviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const brief = listScenarioBriefs().find((b) => b.id === id);
  if (!brief) notFound();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-widest text-accent">
        Briefing
      </p>
      <h1 className="mt-3 font-serif text-3xl text-ink-50">
        {brief.persona.name}
      </h1>
      <p className="mt-1 text-ink-300">
        {brief.persona.role} · {brief.persona.company_context}
      </p>

      <div className="mt-8 rounded-2xl border border-ink-800 bg-ink-900/60 p-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-400">
          Your assignment
        </h2>
        <p className="mt-2 text-ink-200">{brief.research_brief}</p>
        <h2 className="mt-6 text-xs font-semibold uppercase tracking-widest text-ink-400">
          What you know going in
        </h2>
        <p className="mt-2 text-ink-200">{brief.persona.visible_profile}</p>
      </div>

      <p className="mt-8 text-sm text-ink-400">
        The interview room opens here in the next build. You&apos;ll get{" "}
        {brief.turn_budget} questions before {brief.persona.name.split(" ")[0]}{" "}
        has to run.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex w-fit text-sm font-medium text-accent underline-offset-4 hover:underline"
      >
        ← Back to scenarios
      </Link>
    </main>
  );
}
