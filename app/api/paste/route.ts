import { NextResponse } from "next/server";
import { z } from "zod";
import {
  NormalizedSchema,
  gradePaste,
  normalizeTranscript,
  toMessages,
} from "@/lib/paste";

/**
 * Paste-a-transcript mode (Phase 5b, SPEC §6). Two steps:
 * - normalize: messy text -> structured speakers + turns (the client then
 *   confirms which speaker is the interviewer).
 * - grade: classify + technique-only score /100 + a technique audit narrative.
 * Never extracts product insight — technique only.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const RequestSchema = z.discriminatedUnion("step", [
  z.object({ step: z.literal("normalize"), raw: z.string().min(20).max(50000) }),
  z.object({
    step: z.literal("grade"),
    normalized: NormalizedSchema,
    interviewer: z.string().min(1),
  }),
]);

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad("Malformed request body.");
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return bad("Invalid request shape.");

  try {
    if (parsed.data.step === "normalize") {
      const normalized = await normalizeTranscript(parsed.data.raw);
      if (!normalized) {
        return bad("We couldn't read that transcript. Try cleaning it up a little.", 422);
      }
      return NextResponse.json({ ok: true, normalized });
    }

    const messages = toMessages(parsed.data.normalized, parsed.data.interviewer);
    const result = await gradePaste(messages);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[paste] failed:", err);
    return bad("We couldn't process that transcript just now — try again in a moment.", 502);
  }
}
