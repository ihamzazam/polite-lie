import "server-only";

import danaJson from "@/presets/dana-payouts.json";
import priyaJson from "@/presets/priya-dispatch.json";
import marcusJson from "@/presets/marcus-fitness.json";

import { FactSheetSchema, type FactSheet, type ScenarioBrief } from "@/lib/types";

/**
 * Hand-authored preset fact sheets, validated at module load so a malformed
 * sheet fails loudly at build/boot rather than mid-interview. These are the
 * full ground truth and must never be sent to the client — only the projection
 * from toScenarioBrief() is public. (CLAUDE.md hard rule 1.)
 *
 * Presets are imported statically (not read from disk) so they are bundled
 * into the server build and work in any runtime without filesystem access.
 */
const RAW_PRESETS = [danaJson, priyaJson, marcusJson];

const PRESETS: FactSheet[] = RAW_PRESETS.map((raw) => {
  const parsed = FactSheetSchema.safeParse(raw);
  if (!parsed.success) {
    const id = (raw as { id?: string }).id ?? "<unknown>";
    throw new Error(
      `Invalid preset fact sheet "${id}": ${parsed.error.message}`,
    );
  }
  return parsed.data;
});

const PRESETS_BY_ID = new Map(PRESETS.map((p) => [p.id, p]));

/** Full fact sheet for a preset id, or undefined if not a known preset. */
export function getPreset(id: string): FactSheet | undefined {
  return PRESETS_BY_ID.get(id);
}

export function isPresetId(id: string): boolean {
  return PRESETS_BY_ID.has(id);
}

/** Project a full fact sheet down to the public-safe brief (no facts leak). */
export function toScenarioBrief(sheet: FactSheet): ScenarioBrief {
  return {
    id: sheet.id,
    research_brief: sheet.research_brief,
    persona: {
      name: sheet.persona.name,
      age: sheet.persona.age,
      role: sheet.persona.role,
      company_context: sheet.persona.company_context,
      visible_profile: sheet.persona.visible_profile,
    },
    difficulty: sheet.params.difficulty,
    turn_budget: sheet.params.turn_budget,
    total_facts: sheet.facts.length,
  };
}

/** All preset briefs, for the landing-page scenario picker. */
export function listScenarioBriefs(): ScenarioBrief[] {
  return PRESETS.map(toScenarioBrief);
}
