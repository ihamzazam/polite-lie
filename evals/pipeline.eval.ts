import { beforeAll, describe, expect, it } from "vitest";
import { classifyTranscript, gradeSession } from "@/lib/grading";
import { computeScores, type ScoreResult } from "@/lib/scoring";
import type { AttributeFlag, ClassificationResult } from "@/lib/taxonomy";
import { isGraded, type GradeResult } from "@/lib/report";
import { getPreset } from "@/lib/presets";
import { CAPS } from "@/lib/models";
import type { ChatMessage } from "@/lib/types";
import { FIXTURES } from "./fixtures";

/**
 * Grading regression harness (docs/SPEC.md §7). Runs the full classify+score
 * pipeline on the fixtures and asserts ORDERING, score BANDS, and FLAG presence
 * — never exact scores. Must be green twice in a row before any prompt change
 * ships (CLAUDE.md rule 8). Narrative (Pass 3) is skipped here — the eval only
 * needs classifications and computed scores, which keeps the run cheap.
 */

const sheet = getPreset("dana-payouts")!;
const gateMin = CAPS.gateMinQuestions;

const wc = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

function scoreOf(messages: ChatMessage[], classification: ClassificationResult): ScoreResult {
  const traineeWords = messages
    .filter((m) => m.role === "user")
    .reduce((n, m) => n + wc(m.content), 0);
  const totalWords = messages.reduce((n, m) => n + wc(m.content), 0);
  return computeScores({ classification, sheet, traineeWords, totalWords, gateMin });
}

function flagCount(c: ClassificationResult, flag: AttributeFlag): number {
  return c.turns.filter((t) => t.flags.includes(flag)).length;
}

interface Graded {
  classification: ClassificationResult;
  scores: ScoreResult;
}

async function run(messages: ChatMessage[]): Promise<Graded> {
  const classification = await classifyTranscript(messages, sheet);
  return { classification, scores: scoreOf(messages, classification) };
}

let textbook: Graded;
let terrible: Graded;
let mixed: Graded;
let jailbreak: Graded;
let short: GradeResult;

beforeAll(async () => {
  [textbook, terrible, mixed, jailbreak] = await Promise.all([
    run(FIXTURES.TEXTBOOK.messages),
    run(FIXTURES.TERRIBLE.messages),
    run(FIXTURES.MIXED.messages),
    run(FIXTURES.JAILBREAK.messages),
  ]);
  short = await gradeSession(sheet, FIXTURES.SHORT.messages);
}, 120_000);

describe("score ordering", () => {
  it("textbook > mixed > terrible", () => {
    expect(textbook.scores.total).toBeGreaterThan(mixed.scores.total);
    expect(mixed.scores.total).toBeGreaterThan(terrible.scores.total);
  });
});

describe("score bands", () => {
  it("textbook lands high (A/B range)", () => {
    expect(textbook.scores.total).toBeGreaterThanOrEqual(68);
    expect(["A", "B"]).toContain(textbook.scores.grade);
  });
  it("terrible lands in the F range", () => {
    expect(terrible.scores.total).toBeLessThanOrEqual(30);
    expect(terrible.scores.grade).toBe("F");
  });
  it("mixed lands in the middle", () => {
    expect(mixed.scores.total).toBeGreaterThan(25);
    expect(mixed.scores.total).toBeLessThan(70);
  });
});

describe("technique signals", () => {
  it("textbook shows money courage on spend AND authority", () => {
    expect(textbook.scores.techniqueBreakdown.money_courage).toBe(5);
  });
  it("textbook took no pitch-discipline hit", () => {
    expect(textbook.scores.techniqueBreakdown.pitch_discipline).toBe(5);
  });
  it("terrible has at least two FALSE_SIGNAL_FOLLOWUP flags", () => {
    expect(flagCount(terrible.classification, "FALSE_SIGNAL_FOLLOWUP")).toBeGreaterThanOrEqual(2);
  });
  it("terrible took a pitch-discipline hit", () => {
    expect(terrible.scores.techniqueBreakdown.pitch_discipline).toBeLessThan(5);
  });
});

describe("jailbreak handling", () => {
  it("completes and flags the jailbreak attempt", () => {
    expect(flagCount(jailbreak.classification, "JAILBREAK_ATTEMPT")).toBeGreaterThanOrEqual(1);
    // It still graded (>= gate counted questions) rather than throwing.
    expect(jailbreak.scores.gateMet).toBe(true);
  });
});

describe("question gate", () => {
  it("a three-question session does not grade", () => {
    expect(isGraded(short)).toBe(false);
  });
});
