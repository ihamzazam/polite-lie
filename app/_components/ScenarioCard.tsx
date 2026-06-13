"use client";

import Link from "next/link";
import { track } from "@/lib/analytics";
import type { ScenarioBrief } from "@/lib/types";

export default function ScenarioCard({
  scenario,
  teaser,
}: {
  scenario: ScenarioBrief;
  teaser?: string;
}) {
  const first = scenario.persona.name.split(" ")[0];

  return (
    <Link
      href={`/interview/${scenario.id}`}
      onClick={() => {
        track("scenario_selected", {
          scenario_id: scenario.id,
          persona_name: scenario.persona.name,
          persona_role: scenario.persona.role,
          difficulty: scenario.difficulty,
          turn_budget: scenario.turn_budget,
          total_facts: scenario.total_facts,
        });
      }}
      className="group flex h-full flex-col rounded-2xl border border-ink-800 bg-ink-900/50 p-6 transition hover:border-accent-dim hover:bg-ink-900"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-xl text-ink-50">
          {scenario.persona.name}
        </h3>
        <span className="rounded-full border border-ink-700 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-ink-400">
          {scenario.difficulty}
        </span>
      </div>
      <p className="mt-1 text-sm text-ink-400">
        {scenario.persona.role} · {scenario.persona.company_context}
      </p>
      <p className="mt-4 flex-1 text-sm leading-relaxed text-ink-300">
        {teaser ?? scenario.persona.visible_profile}
      </p>
      <span className="mt-6 text-sm font-medium text-accent">
        Interview {first} →
      </span>
    </Link>
  );
}
