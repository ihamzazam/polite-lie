import { NextResponse } from "next/server";

/**
 * Grading pipeline (Phase 2): Pass 1 classify (LLM, strict JSON) -> Pass 2
 * score (pure code in lib/scoring) -> Pass 3 narrative (LLM). The LLM never
 * emits a numeric score (CLAUDE.md rule 3).
 */
export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "grading pipeline not implemented yet (Phase 2)" },
    { status: 501 },
  );
}
