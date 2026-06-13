import type { ScoreResult, TechniqueOnlyResult } from "@/lib/scoring";
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

/** Paste mode (SPEC §6): technique audit on a real transcript, no fact sheet,
 *  so no discovery and no "what you never found out". */
export interface PasteNarrative {
  verdict: string;
  worst: WorstQuestion[];
  best: BestQuestion | null;
  drills: string[];
}

export interface PasteReport {
  kind: "paste";
  scores: TechniqueOnlyResult;
  narrative: PasteNarrative;
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

export function isPasteGraded(r: PasteReport | UngradedResult): r is PasteReport {
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

// ── Share encoding (UTF-8-safe base64url) ───────────────────────────────────
// The finished report is encoded into a URL fragment so /report#<data> renders
// the exact scorecard with zero API calls (CLAUDE.md rule 11). The payload is
// the REDACTED report (no missed facts) so a shared link can't spoil a preset.

function b64urlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): string {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(padded);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeReportToHash(report: Report): string {
  return b64urlEncode(JSON.stringify(toShareableReport(report)));
}

/** Decode a shared report. Missed facts are re-added as empty (they're never
 *  encoded), so the result is a valid Report the ReportView can render. */
export function decodeReportFromHash(hash: string): Report | null {
  try {
    const obj = JSON.parse(b64urlDecode(hash)) as ShareableReport;
    if (!obj?.scores || !obj?.narrative) return null;
    return { ...obj, narrative: { ...obj.narrative, missed: [] } };
  } catch {
    return null;
  }
}

/** One short, savage highlight line for the share card. */
export function shareHighlight(report: Report): string {
  const best = report.narrative.best?.quote;
  if (report.narrative.missed.length > 0) {
    return `Scored ${report.scores.total}/100 but missed ${report.narrative.missed.length} fact${report.narrative.missed.length === 1 ? "" : "s"} that decide the deal.`;
  }
  if (best) return `Best question: “${best}”`;
  return `Scored ${report.scores.total}/100 on interview technique.`;
}
