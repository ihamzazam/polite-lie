import { describe, it, expect } from "vitest";
import {
  InterviewRequestSchema,
  buildInterviewResponse,
  countSubstantiveQuestions,
  countUserTurns,
  mergeCanon,
  mergeRevealed,
} from "@/lib/interview";
import { getPreset } from "@/lib/presets";

describe("InterviewRequestSchema", () => {
  it("accepts a well-formed request and defaults arrays", () => {
    const parsed = InterviewRequestSchema.parse({
      scenario: "dana-payouts",
      messages: [{ role: "user", content: "hi" }],
    });
    expect(parsed.revealedIds).toEqual([]);
    expect(parsed.canon).toEqual([]);
  });

  it("rejects an empty message list and bad roles", () => {
    expect(
      InterviewRequestSchema.safeParse({ scenario: "x", messages: [] }).success,
    ).toBe(false);
    expect(
      InterviewRequestSchema.safeParse({
        scenario: "x",
        messages: [{ role: "system", content: "no" }],
      }).success,
    ).toBe(false);
  });
});

describe("session-state merging", () => {
  it("dedupes revealed ids", () => {
    expect(mergeRevealed(["F1", "F2"], ["F2", "F4"])).toEqual([
      "F1",
      "F2",
      "F4",
    ]);
  });

  it("dedupes and trims canon additions", () => {
    expect(mergeCanon(["a"], [" a ", "b", "  ", "b"])).toEqual(["a", "b"]);
  });

  it("counts user turns and substantive questions separately", () => {
    const messages = [
      { role: "user" as const, content: "hi" },
      { role: "assistant" as const, content: "hey" },
      { role: "user" as const, content: "how do payouts work today?" },
    ];
    expect(countUserTurns(messages)).toBe(2);
    expect(countSubstantiveQuestions(messages)).toBe(1); // "hi" is too short
  });
});

describe("interview response leakage guard", () => {
  it("carries only allowed fields", () => {
    const res = buildInterviewResponse({
      reply: "honestly yeah, sounds useful",
      revealedIds: ["F4"],
      canon: ["paid the difference out of the ops buffer"],
      questionsUsed: 3,
      turnBudget: 12,
      ended: false,
      canEnd: false,
    });
    expect(Object.keys(res).sort()).toEqual([
      "canEnd",
      "canon",
      "ended",
      "questionsUsed",
      "reply",
      "revealedIds",
      "signalsCaptured",
      "turnBudget",
    ]);
    expect(res.signalsCaptured).toBe(1);
  });

  it("cannot carry the fact sheet: no unlocks, rationale, or unrevealed facts", () => {
    const dana = getPreset("dana-payouts")!;
    // A response after revealing F4 — reply legitimately quotes F4's content.
    const res = buildInterviewResponse({
      reply: "ugh, three weeks ago a driver swore he did 14 runs",
      revealedIds: ["F4"],
      canon: [],
      questionsUsed: 4,
      turnBudget: 12,
      ended: false,
      canEnd: true,
    });
    const json = JSON.stringify(res);

    for (const fact of dana.facts) {
      // Unlock conditions and rationale must NEVER appear.
      expect(json).not.toContain(fact.unlock);
      expect(json).not.toContain(fact.why_it_matters);
      // Unrevealed fact contents must NEVER appear (F4 is the only reveal).
      if (fact.id !== "F4") {
        expect(json).not.toContain(fact.content);
      }
    }
    expect(json).not.toContain("\"facts\"");
    expect(json).not.toContain(dana.persona.disposition);
    expect(json).not.toContain(dana.persona.voice_notes);
  });
});
