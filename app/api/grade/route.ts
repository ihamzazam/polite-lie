import { NextResponse } from "next/server";
import { z } from "zod";
import { getPreset, isPresetId } from "@/lib/presets";
import { gradeSession } from "@/lib/grading";
import { ChatMessageSchema } from "@/lib/interview";

/**
 * Grading pipeline (Phase 2): Pass 1 classify (LLM, strict JSON) -> Pass 2
 * score (pure code in lib/scoring) -> Pass 3 narrative (LLM). The LLM never
 * emits a numeric score (CLAUDE.md rule 3). Returns a full Report, or an
 * ungraded result when the question gate isn't met.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const GradeRequestSchema = z.object({
  scenario: z.string().min(1).max(4096),
  messages: z.array(ChatMessageSchema).min(1).max(80),
});

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

  const parsed = GradeRequestSchema.safeParse(body);
  if (!parsed.success) return bad("Invalid request shape.");
  const { scenario, messages } = parsed.data;

  if (!isPresetId(scenario)) return bad("Unknown or unsupported scenario.", 404);
  const sheet = getPreset(scenario)!;

  try {
    const result = await gradeSession(sheet, messages);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[grade] grading failed:", err);
    return bad(
      "We couldn't grade that session just now — give it another go in a moment.",
      502,
    );
  }
}
