import { NextResponse } from "next/server";

/**
 * Custom scenario generator (Phase 5): calls GENERATOR_MODEL with the SPEC §5
 * constraints, validates against the fact-sheet schema (one repair retry),
 * falls back to the nearest preset on second failure, and returns a sealed
 * token (lib/seal). The plaintext fact sheet never reaches the client.
 */
export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "custom scenario generator not implemented yet (Phase 5)" },
    { status: 501 },
  );
}
