import { describe, it, expect } from "vitest";
import {
  computeDiscovery,
  computeMoneyCourage,
  computePitchDiscipline,
  computeProbeDepth,
  computeQuestionQuality,
  computeScores,
  computeTalkRatio,
  computeValidationHygiene,
  gradeFromTotal,
  type ScoringInput,
} from "@/lib/scoring";
import type {
  AttributeFlag,
  ClassifiedTurn,
  FactVerification,
  MoneyTarget,
  QuestionType,
} from "@/lib/taxonomy";
import { getPreset } from "@/lib/presets";

const dana = getPreset("dana-payouts")!;
// Dana tiers: F1-F3 surface(1), F4-F6+F10 probe(2), F7-F9 deep(3).
// Total weight = 3*1 + 4*2 + 3*3 = 20.

function turn(
  type: QuestionType,
  opts: {
    flags?: AttributeFlag[];
    moneyTarget?: MoneyTarget;
    threadId?: string;
  } = {},
): ClassifiedTurn {
  return {
    turnIndex: 0,
    type,
    flags: opts.flags ?? [],
    moneyTarget: opts.moneyTarget,
    threadId: opts.threadId,
    quote: "q",
  };
}

function input(
  turns: ClassifiedTurn[],
  facts: FactVerification[] = [],
  extra: Partial<ScoringInput> = {},
): ScoringInput {
  return {
    classification: { turns, facts },
    sheet: dana,
    traineeWords: 40,
    totalWords: 100,
    ...extra,
  };
}

describe("computeDiscovery", () => {
  it("is 0 when nothing is revealed", () => {
    expect(computeDiscovery(input([]))).toBe(0);
  });
  it("is 50 when every fact is revealed", () => {
    const facts = dana.facts.map((f) => ({
      factId: f.id,
      status: "revealed" as const,
    }));
    expect(computeDiscovery(input([], facts))).toBe(50);
  });
  it("weights tiers and gives partial credit", () => {
    // F1 surface revealed (w1) + F7 deep partial (w3 * 0.5) = 1 + 1.5 = 2.5
    // discovery = 50 * 2.5 / 20 = 6.25
    const facts: FactVerification[] = [
      { factId: "F1", status: "revealed" },
      { factId: "F7", status: "partial" },
    ];
    expect(computeDiscovery(input([], facts))).toBeCloseTo(6.25, 5);
  });
});

describe("computeQuestionQuality", () => {
  it("is 20 when all questions are good", () => {
    expect(
      computeQuestionQuality([turn("PAST_BEHAVIOR"), turn("PROBE"), turn("OPEN_EXPLORE")]),
    ).toBe(20);
  });
  it("is 0 when all questions are bad", () => {
    expect(
      computeQuestionQuality([turn("PITCH"), turn("LEADING"), turn("HYPOTHETICAL")]),
    ).toBe(0);
  });
  it("counts weak questions at half", () => {
    // 1 good + 1 weak: (1 + 0.5) / 2 = 0.75 -> 15
    expect(computeQuestionQuality([turn("OPEN_EXPLORE"), turn("CLOSED")])).toBe(15);
  });
  it("guards an empty / all-RAPPORT set (no divide-by-zero)", () => {
    expect(computeQuestionQuality([])).toBe(0);
  });
});

describe("computeProbeDepth", () => {
  it("is 0 with no probes", () => {
    expect(computeProbeDepth([turn("OPEN_EXPLORE"), turn("CLOSED")])).toBe(0);
  });
  it("rewards a 3-deep chain on one thread with full points", () => {
    const t = (id: string) => turn("PROBE", { threadId: id });
    expect(computeProbeDepth([t("a"), t("a"), t("a")])).toBe(10);
  });
  it("scales a shorter chain", () => {
    expect(computeProbeDepth([turn("PROBE", { threadId: "a" })])).toBeCloseTo(10 / 3, 5);
  });
  it("breaks the chain on a thread switch", () => {
    const turns = [
      turn("PROBE", { threadId: "a" }),
      turn("PROBE", { threadId: "b" }), // switch -> run resets
      turn("PROBE", { threadId: "b" }),
    ];
    expect(computeProbeDepth(turns)).toBeCloseTo(10 * (2 / 3), 5);
  });
});

describe("computeTalkRatio", () => {
  it("is full at <=40%", () => {
    expect(computeTalkRatio(40, 100)).toBe(5);
    expect(computeTalkRatio(20, 100)).toBe(5);
  });
  it("is 0 at >=70%", () => {
    expect(computeTalkRatio(70, 100)).toBe(0);
    expect(computeTalkRatio(90, 100)).toBe(0);
  });
  it("is linear in between", () => {
    expect(computeTalkRatio(55, 100)).toBeCloseTo(2.5, 5);
  });
  it("guards zero total words", () => {
    expect(computeTalkRatio(0, 0)).toBe(5);
  });
});

describe("pitch / money / validation", () => {
  it("pitch_discipline floors at 0", () => {
    expect(computePitchDiscipline([])).toBe(5);
    expect(computePitchDiscipline([turn("PITCH")])).toBe(2.5);
    expect(computePitchDiscipline([turn("PITCH"), turn("PITCH"), turn("PITCH")])).toBe(0);
  });
  it("money_courage rewards spend and authority separately", () => {
    expect(computeMoneyCourage([])).toBe(0);
    expect(
      computeMoneyCourage([turn("CLOSED", { flags: ["MONEY_ASK"], moneyTarget: "spend" })]),
    ).toBe(2.5);
    expect(
      computeMoneyCourage([
        turn("CLOSED", { flags: ["MONEY_ASK"], moneyTarget: "spend" }),
        turn("CLOSED", { flags: ["MONEY_ASK"], moneyTarget: "authority" }),
      ]),
    ).toBe(5);
  });
  it("validation_hygiene floors at 0", () => {
    expect(computeValidationHygiene([])).toBe(5);
    expect(
      computeValidationHygiene([turn("LEADING", { flags: ["FALSE_SIGNAL_FOLLOWUP"] })]),
    ).toBe(2.5);
    expect(
      computeValidationHygiene([
        turn("LEADING", { flags: ["FALSE_SIGNAL_FOLLOWUP"] }),
        turn("LEADING", { flags: ["FALSE_SIGNAL_FOLLOWUP"] }),
      ]),
    ).toBe(0);
  });
});

describe("gradeFromTotal", () => {
  it("maps totals to bands", () => {
    expect(gradeFromTotal(92)).toBe("A");
    expect(gradeFromTotal(72)).toBe("B");
    expect(gradeFromTotal(60)).toBe("C");
    expect(gradeFromTotal(45)).toBe("D");
    expect(gradeFromTotal(20)).toBe("F");
  });
});

describe("computeScores gate + integration", () => {
  it("trips the gate below 5 counted questions (single question)", () => {
    const res = computeScores(input([turn("OPEN_EXPLORE")]));
    expect(res.gateMet).toBe(false);
    expect(res.countedQuestions).toBe(1);
    expect(Number.isNaN(res.total)).toBe(false);
  });
  it("excludes RAPPORT from the count and trips the gate on all-RAPPORT", () => {
    const res = computeScores(input([turn("RAPPORT"), turn("RAPPORT"), turn("RAPPORT")]));
    expect(res.gateMet).toBe(false);
    expect(res.countedQuestions).toBe(0);
    expect(res.technique).not.toBeNaN();
    expect(res.discovery).toBe(0);
  });
  it("meets the gate at 5 counted and produces sane totals", () => {
    const turns = [
      turn("OPEN_EXPLORE"),
      turn("PROBE", { threadId: "a" }),
      turn("PROBE", { threadId: "a" }),
      turn("PAST_BEHAVIOR"),
      turn("CLOSED", { flags: ["MONEY_ASK"], moneyTarget: "spend" }),
      turn("RAPPORT"), // excluded
    ];
    const facts: FactVerification[] = [
      { factId: "F1", status: "revealed" },
      { factId: "F4", status: "revealed" },
    ];
    const res = computeScores(input(turns, facts));
    expect(res.gateMet).toBe(true);
    expect(res.countedQuestions).toBe(5);
    expect(res.total).toBeGreaterThan(0);
    expect(res.total).toBeLessThanOrEqual(100);
    expect(res.technique).toBeLessThanOrEqual(50);
    expect(res.discovery).toBeLessThanOrEqual(50);
  });
});
