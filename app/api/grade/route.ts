import { NextResponse } from "next/server";

/**
 * Grading pipeline (Phase 2): Pass 1 classify (LLM, strict JSON) -> Pass 2
 * score (pure code in lib/scoring) -> Pass 3 narrative (LLM). The LLM never
 * emits a numeric score (CLAUDE.md rule 3).
 */
export const runtime = "nodejs";

export async function POST() {
  // TODO: after transcript normalization and technique-only scoring, fire:
  //   trackServer("transcript_analyzed", { transcript_word_count,
  //     speaker_count, technique_score, grade, question_count,
  //     transcript_source_format })
  //   Import trackServer from "@/lib/analytics".

  return NextResponse.json(
    { error: "grading pipeline not implemented yet (Phase 2)" },
    { status: 501 },
  );
}
