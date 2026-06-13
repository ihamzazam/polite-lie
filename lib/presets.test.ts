import { describe, it, expect } from "vitest";
import {
  getPreset,
  isPresetId,
  listScenarioBriefs,
  toScenarioBrief,
} from "@/lib/presets";

/**
 * CLAUDE.md hard rule 1: the fact sheet never reaches the client. The public
 * brief projection is the only thing allowed out, so we assert here that it
 * cannot carry any hidden fact content. This guard predates the interview
 * engine on purpose — the invariant must hold from the first deploy.
 */
describe("preset loading", () => {
  it("loads three validated presets", () => {
    const briefs = listScenarioBriefs();
    expect(briefs).toHaveLength(3);
    expect(briefs.map((b) => b.id).sort()).toEqual([
      "dana-payouts",
      "marcus-fitness",
      "priya-dispatch",
    ]);
  });

  it("knows its own ids", () => {
    expect(isPresetId("dana-payouts")).toBe(true);
    expect(isPresetId("nope")).toBe(false);
  });
});

describe("fact-sheet leakage guard", () => {
  it("the scenario brief carries no hidden fact content", () => {
    for (const id of ["dana-payouts", "priya-dispatch", "marcus-fitness"]) {
      const sheet = getPreset(id)!;
      const briefJson = JSON.stringify(toScenarioBrief(sheet));

      for (const fact of sheet.facts) {
        expect(briefJson).not.toContain(fact.content);
        expect(briefJson).not.toContain(fact.unlock);
        expect(briefJson).not.toContain(fact.why_it_matters);
      }
      // The brief must not expose the raw facts array, disposition, or
      // voice notes (which can hint at unlocks).
      expect(briefJson).not.toContain("\"facts\"");
      expect(briefJson).not.toContain(sheet.persona.disposition);
      expect(briefJson).not.toContain(sheet.persona.voice_notes);
    }
  });

  it("the brief exposes only the public fields", () => {
    const brief = toScenarioBrief(getPreset("dana-payouts")!);
    expect(Object.keys(brief).sort()).toEqual([
      "difficulty",
      "id",
      "persona",
      "research_brief",
      "total_facts",
      "turn_budget",
    ]);
    expect(Object.keys(brief.persona).sort()).toEqual([
      "age",
      "company_context",
      "name",
      "role",
      "visible_profile",
    ]);
  });
});
