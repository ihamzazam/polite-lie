/**
 * Pass 2 scoring — PURE functions, no LLM, no I/O. Implements the exact
 * formulas in docs/SPEC.md section 3 Pass 2. Unit-tested in scoring.test.ts,
 * including the edge-case guards (zero denominators, all-RAPPORT, single
 * question). The LLM never produces a numeric score (CLAUDE.md rule 3).
 */
import {
  BAD_TYPES,
  GOOD_TYPES,
  NON_COUNTED_TYPES,
  WEAK_TYPES,
  type ClassificationResult,
  type ClassifiedTurn,
  type FactVerificationStatus,
} from "@/lib/taxonomy";
import type { FactSheet, Tier } from "@/lib/types";

export interface ScoringInput {
  classification: ClassificationResult;
  sheet: FactSheet;
  /** Word counts for talk_ratio. */
  traineeWords: number;
  totalWords: number;
  /** Counted-question threshold for the gate (SPEC §3). Default 5. */
  gateMin?: number;
}

export interface TechniqueBreakdown {
  question_quality: number; // /20
  probe_depth: number; // /10
  talk_ratio: number; // /5
  pitch_discipline: number; // /5
  money_courage: number; // /5
  validation_hygiene: number; // /5
}

export type Grade = "A" | "B" | "C" | "D" | "F";

export interface ScoreResult {
  /** True once >= gateMin non-RAPPORT turns exist. Below this, don't grade. */
  gateMet: boolean;
  countedQuestions: number;
  discovery: number; // /50
  technique: number; // /50
  techniqueBreakdown: TechniqueBreakdown;
  total: number; // /100
  grade: Grade;
}

const TIER_WEIGHT: Record<Tier, number> = { surface: 1, probe: 2, deep: 3 };
const STATUS_CREDIT: Record<FactVerificationStatus, number> = {
  revealed: 1,
  partial: 0.5,
  unrevealed: 0,
};
const DEFAULT_GATE_MIN = 5;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** DISCOVERY: 50 * sum(weight*credit revealed) / sum(weight all). */
export function computeDiscovery(input: ScoringInput): number {
  const statusById = new Map<string, FactVerificationStatus>(
    input.classification.facts.map((f) => [f.factId, f.status]),
  );
  let num = 0;
  let den = 0;
  for (const fact of input.sheet.facts) {
    const w = TIER_WEIGHT[fact.tier];
    den += w;
    const status = statusById.get(fact.id) ?? "unrevealed";
    num += w * STATUS_CREDIT[status];
  }
  if (den === 0) return 0; // no facts (shouldn't happen for valid sheets)
  return clamp(50 * (num / den), 0, 50);
}

function countedTurns(turns: ClassifiedTurn[]): ClassifiedTurn[] {
  return turns.filter((t) => !NON_COUNTED_TYPES.has(t.type));
}

/** question_quality (20): (good + 0.5*weak) / (good + weak + bad). */
export function computeQuestionQuality(turns: ClassifiedTurn[]): number {
  let good = 0;
  let weak = 0;
  let bad = 0;
  for (const t of turns) {
    if (GOOD_TYPES.has(t.type)) good++;
    else if (WEAK_TYPES.has(t.type)) weak++;
    else if (BAD_TYPES.has(t.type)) bad++;
  }
  const den = good + weak + bad;
  if (den === 0) return 0; // guard: all RAPPORT / no counted questions
  return clamp(20 * ((good + 0.5 * weak) / den), 0, 20);
}

/** probe_depth (10): longest consecutive PROBE chain on one thread. */
export function computeProbeDepth(turns: ClassifiedTurn[]): number {
  let max = 0;
  let run = 0;
  let runThread: string | undefined;
  for (const t of turns) {
    if (t.type !== "PROBE") {
      run = 0;
      runThread = undefined;
      continue;
    }
    if (run === 0) {
      run = 1;
      runThread = t.threadId;
    } else if (t.threadId !== undefined && t.threadId !== runThread) {
      // Thread switch breaks the chain; start a new one.
      run = 1;
      runThread = t.threadId;
    } else {
      run++;
      if (runThread === undefined) runThread = t.threadId;
    }
    if (run > max) max = run;
  }
  return clamp(10 * Math.min(max / 3, 1), 0, 10);
}

/** talk_ratio (5): 5 at <=40% trainee words, linear to 0 at >=70%. */
export function computeTalkRatio(traineeWords: number, totalWords: number): number {
  if (totalWords <= 0) return 5; // guard: no words -> no over-talking
  const ratio = traineeWords / totalWords;
  if (ratio <= 0.4) return 5;
  if (ratio >= 0.7) return 0;
  return clamp(5 * (1 - (ratio - 0.4) / 0.3), 0, 5);
}

export function computePitchDiscipline(turns: ClassifiedTurn[]): number {
  const pitches = turns.filter((t) => t.type === "PITCH").length;
  return Math.max(0, 5 - 2.5 * pitches);
}

export function computeMoneyCourage(turns: ClassifiedTurn[]): number {
  const money = turns.filter((t) => t.flags.includes("MONEY_ASK"));
  const spend = money.some((t) => t.moneyTarget === "spend") ? 2.5 : 0;
  const authority = money.some((t) => t.moneyTarget === "authority") ? 2.5 : 0;
  return spend + authority;
}

export function computeValidationHygiene(turns: ClassifiedTurn[]): number {
  const bad = turns.filter((t) =>
    t.flags.includes("FALSE_SIGNAL_FOLLOWUP"),
  ).length;
  return Math.max(0, 5 - 2.5 * bad);
}

const GRADE_BANDS: ReadonlyArray<[number, Grade]> = [
  [85, "A"],
  [70, "B"],
  [55, "C"],
  [40, "D"],
  [0, "F"],
];

export function gradeFromTotal(total: number): Grade {
  for (const [threshold, grade] of GRADE_BANDS) {
    if (total >= threshold) return grade;
  }
  return "F";
}

export interface TechniqueOnlyResult {
  gateMet: boolean;
  countedQuestions: number;
  techniqueBreakdown: TechniqueBreakdown;
  technique: number; // /50
  total: number; // technique rescaled to /100 (paste mode has no discovery)
  grade: Grade;
}

/**
 * Paste-mode scoring (SPEC §6): no fact sheet, so no discovery layer. Score the
 * six technique components out of 50 and rescale to 100. A pure technique audit.
 */
export function computeTechniqueOnly(
  turns: ClassifiedTurn[],
  traineeWords: number,
  totalWords: number,
  gateMin: number = DEFAULT_GATE_MIN,
): TechniqueOnlyResult {
  const counted = turns.filter((t) => !NON_COUNTED_TYPES.has(t.type));
  const breakdown: TechniqueBreakdown = {
    question_quality: computeQuestionQuality(counted),
    probe_depth: computeProbeDepth(counted),
    talk_ratio: computeTalkRatio(traineeWords, totalWords),
    pitch_discipline: computePitchDiscipline(counted),
    money_courage: computeMoneyCourage(counted),
    validation_hygiene: computeValidationHygiene(counted),
  };
  const technique =
    breakdown.question_quality +
    breakdown.probe_depth +
    breakdown.talk_ratio +
    breakdown.pitch_discipline +
    breakdown.money_courage +
    breakdown.validation_hygiene;
  const total = clamp(technique * 2, 0, 100);
  return {
    gateMet: counted.length >= gateMin,
    countedQuestions: counted.length,
    techniqueBreakdown: {
      question_quality: round1(breakdown.question_quality),
      probe_depth: round1(breakdown.probe_depth),
      talk_ratio: round1(breakdown.talk_ratio),
      pitch_discipline: round1(breakdown.pitch_discipline),
      money_courage: round1(breakdown.money_courage),
      validation_hygiene: round1(breakdown.validation_hygiene),
    },
    technique: round1(technique),
    total: round1(total),
    grade: gradeFromTotal(total),
  };
}

export function computeScores(input: ScoringInput): ScoreResult {
  const turns = input.classification.turns;
  const counted = countedTurns(turns);
  const gateMin = input.gateMin ?? DEFAULT_GATE_MIN;
  const gateMet = counted.length >= gateMin;

  const discovery = computeDiscovery(input);

  const breakdown: TechniqueBreakdown = {
    question_quality: computeQuestionQuality(counted),
    probe_depth: computeProbeDepth(counted),
    talk_ratio: computeTalkRatio(input.traineeWords, input.totalWords),
    pitch_discipline: computePitchDiscipline(counted),
    money_courage: computeMoneyCourage(counted),
    validation_hygiene: computeValidationHygiene(counted),
  };

  const technique =
    breakdown.question_quality +
    breakdown.probe_depth +
    breakdown.talk_ratio +
    breakdown.pitch_discipline +
    breakdown.money_courage +
    breakdown.validation_hygiene;

  const total = clamp(discovery + technique, 0, 100);

  return {
    gateMet,
    countedQuestions: counted.length,
    discovery: round1(discovery),
    technique: round1(technique),
    techniqueBreakdown: {
      question_quality: round1(breakdown.question_quality),
      probe_depth: round1(breakdown.probe_depth),
      talk_ratio: round1(breakdown.talk_ratio),
      pitch_discipline: round1(breakdown.pitch_discipline),
      money_courage: round1(breakdown.money_courage),
      validation_hygiene: round1(breakdown.validation_hygiene),
    },
    total: round1(total),
    grade: gradeFromTotal(total),
  };
}
