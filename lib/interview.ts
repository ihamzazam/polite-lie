import { z } from "zod";
import type { ChatMessage, InterviewResponse } from "@/lib/types";

/**
 * Pure helpers for the interview turn — request validation, session-state
 * merging, and response assembly. No LLM, no server-only imports, so the
 * fact-leakage contract is unit-testable offline. The route layer supplies the
 * caps/budget; this module never reaches for env.
 */

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export const InterviewRequestSchema = z.object({
  // A preset id is short; a sealed custom-scenario token is several KB.
  scenario: z.string().min(1).max(20000),
  messages: z.array(ChatMessageSchema).min(1).max(80),
  revealedIds: z.array(z.string().max(8)).max(40).default([]),
  canon: z.array(z.string().max(400)).max(60).default([]),
});

export type ValidatedInterviewRequest = z.infer<typeof InterviewRequestSchema>;

export function countUserTurns(messages: ChatMessage[]): number {
  return messages.filter((m) => m.role === "user").length;
}

/** Cheap non-rapport heuristic for the live "end interview" gate: a user turn
 *  counts as substantive if it carries more than a greeting's worth of text.
 *  The real RAPPORT exclusion happens in grading (Pass 1). */
export function countSubstantiveQuestions(
  messages: ChatMessage[],
  minChars = 15,
): number {
  return messages.filter(
    (m) => m.role === "user" && m.content.trim().length >= minChars,
  ).length;
}

export function mergeRevealed(prev: string[], add: string[]): string[] {
  return Array.from(new Set([...prev, ...add]));
}

export function mergeCanon(prev: string[], add: string[]): string[] {
  const seen = new Set(prev.map((s) => s.trim()).filter(Boolean));
  const out = [...prev];
  for (const c of add) {
    const t = c.trim();
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

export interface InterviewResponseArgs {
  reply: string;
  revealedIds: string[];
  canon: string[];
  questionsUsed: number;
  turnBudget: number;
  ended: boolean;
  canEnd: boolean;
}

/**
 * Assemble the client-facing response. By construction it carries ONLY the
 * visible reply, revealed fact IDS (not contents), accumulated canon (strings
 * the persona already said), and counters — never the fact sheet, unlock
 * conditions, why_it_matters, disposition, or any unrevealed fact content.
 * (CLAUDE.md hard rule 1.)
 */
export function buildInterviewResponse(
  args: InterviewResponseArgs,
): InterviewResponse {
  return {
    reply: args.reply,
    revealedIds: args.revealedIds,
    canon: args.canon,
    signalsCaptured: args.revealedIds.length,
    questionsUsed: args.questionsUsed,
    turnBudget: args.turnBudget,
    ended: args.ended,
    canEnd: args.canEnd,
  };
}
