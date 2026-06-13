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
  return NextResponse.json(
    { error: "interview engine not implemented yet (Phase 1)" },
    { status: 501 },
  );
}
