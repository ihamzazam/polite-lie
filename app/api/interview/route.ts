import { NextResponse } from "next/server";

/**
 * Persona turn (Phase 1). Stateless: receives
 * { scenario, messages, revealedIds, canon }, rebuilds context server-side,
 * injects the fact sheet, calls PERSONA_MODEL, parses the ###META tail, and
 * returns ONLY the visible reply + revealed ids + canon additions.
 * The fact sheet must never appear in the response (CLAUDE.md rules 1 & 7).
 */
export const runtime = "nodejs";

export async function POST() {
  // TODO: after persona reply is generated and ###META is parsed, fire:
  //   trackServer("question_sent", { scenario_id, question_type, turn_number,
  //     turns_remaining, signals_captured, polite_lie_triggered, message_length })
  //   Import trackServer from "@/lib/analytics".

  return NextResponse.json(
    { error: "interview engine not implemented yet (Phase 1)" },
    { status: 501 },
  );
}
