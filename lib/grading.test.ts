import { describe, it, expect } from "vitest";
import { NarrativeOutputSchema, stripNulls } from "@/lib/grading";
import { ClassificationSchema } from "@/lib/taxonomy";

/**
 * CLAUDE.md rule 3: the LLM never emits a numeric score. Pass 1 emits
 * classifications, Pass 3 emits prose; all numbers come from lib/scoring. We
 * assert the narrative schema structurally cannot carry a score into the report.
 */
describe("narrative output cannot carry scores", () => {
  it("strips any numeric score fields the LLM might emit", () => {
    const sneaky = {
      verdict: "Two sentences.",
      missed_questions: [{ factId: "F7", unlock_question: "who buys?" }],
      worst: [{ quote: "q", failure: "f", rewrite: "r" }],
      best: { quote: "q", why: "w" },
      drills: ["a", "b", "c"],
      // The model tries to inject scores — these must not survive parsing.
      total: 99,
      grade: "A",
      discovery: 50,
    };
    const parsed = NarrativeOutputSchema.parse(sneaky);
    expect(Object.keys(parsed).sort()).toEqual([
      "best",
      "drills",
      "missed_questions",
      "verdict",
      "worst",
    ]);
    expect("total" in parsed).toBe(false);
    expect("grade" in parsed).toBe(false);
    expect("discovery" in parsed).toBe(false);
  });

  it("allows a null best (no standout question)", () => {
    const parsed = NarrativeOutputSchema.parse({
      verdict: "v",
      missed_questions: [],
      worst: [],
      best: null,
      drills: [],
    });
    expect(parsed.best).toBeNull();
  });
});

describe("classifier null handling (regression)", () => {
  it("accepts model output with null optionals after stripNulls", () => {
    const modelOutput = {
      turns: [
        {
          turnIndex: 1,
          type: "OPEN_EXPLORE",
          secondaryType: null,
          flags: [],
          moneyTarget: null,
          threadId: "workflow",
          quote: "how does it work?",
        },
      ],
      facts: [{ factId: "F1", status: "revealed", quote: "we use a sheet" }],
    };
    const parsed = ClassificationSchema.safeParse(stripNulls(modelOutput));
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.turns[0].secondaryType).toBeUndefined();
      expect(parsed.data.turns[0].moneyTarget).toBeUndefined();
      expect(parsed.data.turns[0].type).toBe("OPEN_EXPLORE");
    }
  });

  it("rejects a flag used as a question type", () => {
    const bad = {
      turns: [{ turnIndex: 1, type: "MONEY_ASK", flags: [], quote: "who pays?" }],
      facts: [],
    };
    expect(ClassificationSchema.safeParse(stripNulls(bad)).success).toBe(false);
  });
});
