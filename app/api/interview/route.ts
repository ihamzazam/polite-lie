import { NextResponse } from "next/server";
import { getPreset, isPresetId } from "@/lib/presets";
import { effectiveTurnBudget, runPersonaTurn } from "@/lib/persona";
import { CAPS } from "@/lib/models";
import {
  InterviewRequestSchema,
  buildInterviewResponse,
  countSubstantiveQuestions,
  countUserTurns,
  mergeCanon,
  mergeRevealed,
} from "@/lib/interview";

/**
 * Persona turn (Phase 1). Stateless: receives
 * { scenario, messages, revealedIds, canon }, rebuilds context server-side,
 * calls PERSONA_MODEL, parses the ###META tail, and returns ONLY the visible
 * reply + revealed ids + canon + counters. The fact sheet never appears in the
 * response (CLAUDE.md rules 1 & 7). All caps from rule 6 are enforced here.
 */
export const runtime = "nodejs";

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

  const parsed = InterviewRequestSchema.safeParse(body);
  if (!parsed.success) {
    return bad("Invalid request shape.");
  }
  const { scenario, messages, revealedIds, canon } = parsed.data;

  // Phase 1 serves presets only; sealed custom tokens arrive in Phase 5.
  if (!isPresetId(scenario)) {
    return bad("Unknown or unsupported scenario.", 404);
  }
  const sheet = getPreset(scenario)!;

  // The last message must be the new user question.
  const last = messages[messages.length - 1];
  if (last.role !== "user") {
    return bad("The last message must be a user question.");
  }
  if (last.content.trim().length === 0) {
    return bad("Empty question.");
  }
  if (last.content.length > CAPS.maxUserMessageChars) {
    return bad(
      `Questions are limited to ${CAPS.maxUserMessageChars} characters.`,
    );
  }

  const userTurns = countUserTurns(messages);
  const budget = effectiveTurnBudget(sheet);
  if (userTurns > budget) {
    return bad("This interview has reached its limit.", 409);
  }

  let result;
  try {
    result = await runPersonaTurn({
      sheet,
      messages,
      revealedIds,
      canon,
      questionsUsed: userTurns,
    });
  } catch (err) {
    // Never surface raw provider errors (CLAUDE.md rule 5).
    console.error("[interview] persona turn failed:", err);
    return bad(
      "The interviewee stepped away for a second — try sending that again.",
      502,
    );
  }

  const mergedRevealed = mergeRevealed(revealedIds, result.meta.facts_revealed);
  const mergedCanon = mergeCanon(canon, result.meta.canon_additions);
  const ended = userTurns >= budget;
  const canEnd = countSubstantiveQuestions(messages) >= CAPS.gateMinQuestions;

  const reply =
    result.reply.trim().length > 0
      ? result.reply
      : "sorry — could you say that again? bad signal for a second.";

  return NextResponse.json(
    buildInterviewResponse({
      reply,
      revealedIds: mergedRevealed,
      canon: mergedCanon,
      questionsUsed: userTurns,
      turnBudget: budget,
      ended,
      canEnd,
    }),
  );
}
