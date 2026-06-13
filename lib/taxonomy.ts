import { z } from "zod";

/**
 * Question taxonomy, precedence, and attribute flags. Mirrors docs/SPEC.md
 * section 3 Pass 1. This is the contract the classifier LLM must emit and the
 * scoring code consumes — kept pure (no LLM, no server-only) so both the
 * classifier route and the scoring unit tests import it.
 */

/**
 * Question types in PRECEDENCE ORDER (first match wins). The classifier is
 * instructed to resolve overlaps top-down, so e.g. a leading-and-hypothetical
 * question classifies as LEADING.
 */
export const QUESTION_TYPES = [
  "PITCH",
  "LEADING",
  "HYPOTHETICAL",
  "OPINION_FISH",
  "COMPOUND",
  "CLOSED",
  "PAST_BEHAVIOR",
  "PROBE",
  "OPEN_EXPLORE",
  "RAPPORT",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Orthogonal attribute flags (a turn may carry several). */
export const ATTRIBUTE_FLAGS = [
  "MONEY_ASK",
  "FALSE_SIGNAL_FOLLOWUP",
  "JAILBREAK_ATTEMPT",
] as const;
export type AttributeFlag = (typeof ATTRIBUTE_FLAGS)[number];

/** RAPPORT is excluded from every scoring denominator. */
export const NON_COUNTED_TYPES: ReadonlySet<QuestionType> = new Set(["RAPPORT"]);

/** Quality buckets for the question_quality formula (SPEC §3 Pass 2). */
export const GOOD_TYPES: ReadonlySet<QuestionType> = new Set([
  "PAST_BEHAVIOR",
  "PROBE",
  "OPEN_EXPLORE",
]);
export const WEAK_TYPES: ReadonlySet<QuestionType> = new Set([
  "CLOSED",
  "COMPOUND",
]);
export const BAD_TYPES: ReadonlySet<QuestionType> = new Set([
  "PITCH",
  "LEADING",
  "HYPOTHETICAL",
  "OPINION_FISH",
]);

/** Whether a money ask targets spend vs. authority (money_courage scoring). */
export const MONEY_TARGETS = ["spend", "authority"] as const;
export type MoneyTarget = (typeof MONEY_TARGETS)[number];

export const FACT_STATUSES = ["revealed", "partial", "unrevealed"] as const;
export type FactVerificationStatus = (typeof FACT_STATUSES)[number];

/** One classified trainee turn (Pass 1 output, per turn). Zod-validated since
 *  it comes from the LLM. Callers strip nulls before validating (LLMs emit
 *  `null` for absent optionals); see stripNulls in lib/grading.ts. */
export const ClassifiedTurnSchema = z.object({
  /** 1-based index of the trainee question in the numbered transcript. */
  turnIndex: z.number().int(),
  type: z.enum(QUESTION_TYPES),
  /** For COMPOUND turns, the type of the first sub-question. */
  secondaryType: z.enum(QUESTION_TYPES).optional(),
  flags: z.array(z.enum(ATTRIBUTE_FLAGS)).default([]),
  /** Present when MONEY_ASK is set. */
  moneyTarget: z.enum(MONEY_TARGETS).optional(),
  /** The thread id this turn probes/continues, for probe-chain detection. */
  threadId: z.string().optional(),
  /** Verbatim trainee quote backing the classification. */
  quote: z.string(),
});
export type ClassifiedTurn = z.infer<typeof ClassifiedTurnSchema>;

/** Per-fact verification row (Pass 1 output). */
export const FactVerificationSchema = z.object({
  factId: z.string(),
  status: z.enum(FACT_STATUSES),
  /** Verbatim persona quote that discloses the fact, when revealed/partial. */
  quote: z.string().optional(),
});
export type FactVerification = z.infer<typeof FactVerificationSchema>;

export const ClassificationSchema = z.object({
  turns: z.array(ClassifiedTurnSchema),
  facts: z.array(FactVerificationSchema),
});
export type ClassificationResult = z.infer<typeof ClassificationSchema>;
