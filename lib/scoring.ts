/**
 * Pass 2 scoring — PURE functions, no LLM, no I/O. Implements the exact
 * formulas in docs/SPEC.md section 3 Pass 2. Unit-tested in scoring.test.ts,
 * including the edge-case guards (zero denominators, all-RAPPORT, single
 * question). The LLM never produces a numeric score (CLAUDE.md rule 3).
 *
 * Implemented in Phase 2; signatures fixed now.
 */
import type { ClassificationResult } from "@/lib/taxonomy";
import type { FactSheet } from "@/lib/types";

/** Inputs the pure scorer needs that aren't in the classification itself. */
export interface ScoringInput {
  classification: ClassificationResult;
  sheet: FactSheet;
  /** Word counts for talk_ratio. */
  traineeWords: number;
  totalWords: number;
}

export interface TechniqueBreakdown {
  question_quality: number; // /20
  probe_depth: number; // /10
  talk_ratio: number; // /5
  pitch_discipline: number; // /5
  money_courage: number; // /5
  validation_hygiene: number; // /5
}

export interface ScoreResult {
  /** True once >= gate question count of non-RAPPORT turns exist. */
  gateMet: boolean;
  discovery: number; // /50
  technique: number; // /50
  techniqueBreakdown: TechniqueBreakdown;
  total: number; // /100
  /** Letter band derived from total, for copy/eval bands. */
  grade: "A" | "B" | "C" | "D" | "F";
}

export function computeScores(_input: ScoringInput): ScoreResult {
  // TODO: when gateMet is false, fire:
  //   trackServer("gate_triggered", { scenario_id, questions_asked,
  //     rapport_questions, gate_min_questions: 5, turns_used })
  //   Import trackServer from "@/lib/analytics".

  throw new Error("Not implemented (Phase 2)");
}
