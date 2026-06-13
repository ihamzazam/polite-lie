import { describe, it, expect } from "vitest";
import {
  decodeReportFromHash,
  encodeReportToHash,
  isGraded,
  shareHighlight,
  toShareableReport,
  type Report,
} from "@/lib/report";
import example from "@/lib/example-report.json";

const report = example as Report;

describe("share encoding", () => {
  it("round-trips scores and narrative prose through a URL fragment", () => {
    const decoded = decodeReportFromHash(encodeReportToHash(report));
    expect(decoded).not.toBeNull();
    expect(decoded!.scores.total).toBe(report.scores.total);
    expect(decoded!.scores.grade).toBe(report.scores.grade);
    expect(decoded!.narrative.verdict).toBe(report.narrative.verdict);
    expect(decoded!.narrative.best).toEqual(report.narrative.best);
    expect(decoded!.narrative.drills).toEqual(report.narrative.drills);
  });

  it("redacts missed facts (no preset spoilers in a shared link)", () => {
    expect(report.narrative.missed.length).toBeGreaterThan(0);
    const shareable = toShareableReport(report);
    expect("missed" in shareable.narrative).toBe(false);
    const decoded = decodeReportFromHash(encodeReportToHash(report));
    expect(decoded!.narrative.missed).toEqual([]);
  });

  it("survives unicode (em dashes, curly quotes) in the prose", () => {
    const tricky: Report = {
      ...report,
      narrative: { ...report.narrative, verdict: "You stalled — “politely” — and missed it." },
    };
    const decoded = decodeReportFromHash(encodeReportToHash(tricky));
    expect(decoded!.narrative.verdict).toBe("You stalled — “politely” — and missed it.");
  });

  it("returns null on garbage input", () => {
    expect(decodeReportFromHash("not-valid-base64!!")).toBeNull();
    expect(decodeReportFromHash("")).toBeNull();
  });
});

describe("shareHighlight", () => {
  it("produces a non-empty one-liner", () => {
    expect(shareHighlight(report).length).toBeGreaterThan(0);
  });
});

describe("isGraded", () => {
  it("distinguishes a report from an ungraded result", () => {
    expect(isGraded(report)).toBe(true);
    expect(isGraded({ gateMet: false, countedQuestions: 2, gateMin: 5 })).toBe(false);
  });
});
