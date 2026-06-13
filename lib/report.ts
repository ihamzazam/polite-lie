import type { ScoreResult } from "@/lib/scoring";
import type { Disposition } from "@/lib/types";

/**
 * The graded report shape (Pass 3 output + computed scores). Pure types so both
 * the grader (server) and the report page (client) share them.
 *
 * Two representations exist:
 * - Report: the full report the player sees after their own session, INCLUDING
 *   "what you never found out" (missed facts). Revealing missed facts here is
 *   the intended payoff — the session is over, so it isn't a cheat.
 * - ShareableReport (Phase 4): a redaction with the missed-facts section
 *   removed, safe to encode in a public URL / OG card without spoiling the
 *   preset for future players. Built via toShareableReport().
 */

export interface MissedFact {
  factId: string;
  /** The fact content the trainee never surfaced. */
  content: string;
  why_it_matters: string;
  /** The one question that would have unlocked it. */
  unlock_question: string;
  tier: "surface" | "probe" | "deep";
}

export interface WorstQuestion {
  quote: string;
  failure: string;
  rewrite: string;
}

export interface BestQuestion {
  quote: string;
  why: string;
}

export interface ReportNarrative {
  /** Two-sentence verdict; includes the disposition reveal when it matters. */
  verdict: string;
  missed: MissedFact[];
  worst: WorstQuestion[];
  best: BestQuestion | null;
  drills: string[];
}

export interface Report {
  scenarioId: string;
  personaName: string;
  disposition: Disposition;
  scores: ScoreResult;
  narrative: ReportNarrative;
}

/** Gate failure: too few counted questions to grade (SPEC §3). */
export interface UngradedResult {
  gateMet: false;
  countedQuestions: number;
  gateMin: number;
}

export type GradeResult = Report | UngradedResult;

export function isGraded(r: GradeResult): r is Report {
  return (r as UngradedResult).gateMet !== false;
}

/** Redaction for public sharing — drops the missed-facts section so a shared
 *  link can't spoil the preset for future players. Used in Phase 4. */
export type ShareableReport = Omit<Report, "narrative"> & {
  narrative: Omit<ReportNarrative, "missed">;
};

export function toShareableReport(report: Report): ShareableReport {
  const { missed: _missed, ...rest } = report.narrative;
  return { ...report, narrative: rest };
}
