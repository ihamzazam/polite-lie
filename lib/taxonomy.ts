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
export type MoneyTarget = "spend" | "authority";

export type FactVerificationStatus = "revealed" | "partial" | "unrevealed";

/** One classified trainee turn (Pass 1 output, per turn). */
export interface ClassifiedTurn {
  /** Index of the user turn in the transcript (RAPPORT included, 0-based). */
  turnIndex: number;
  type: QuestionType;
  /** For COMPOUND turns, the type of the first sub-question. */
  secondaryType?: QuestionType;
  flags: AttributeFlag[];
  /** Present when MONEY_ASK is set. */
  moneyTarget?: MoneyTarget;
  /** The thread id this turn probes/continues, for probe-chain detection. */
  threadId?: string;
  /** Verbatim trainee quote backing the classification. */
  quote: string;
}

/** Per-fact verification row (Pass 1 output). */
export interface FactVerification {
  factId: string;
  status: FactVerificationStatus;
  /** Verbatim persona quote that discloses the fact, when revealed/partial. */
  quote?: string;
}

export interface ClassificationResult {
  turns: ClassifiedTurn[];
  facts: FactVerification[];
}
