import "server-only";
import type { ChatMessage, FactSheet, Meta } from "@/lib/types";

/**
 * Persona runtime: system-prompt construction and ###META parsing.
 *
 * Implemented in Phase 1 against docs/SPEC.md sections 1 and 2. Signatures are
 * fixed now so the route and tests can be written against them.
 */

export interface PersonaTurnContext {
  sheet: FactSheet;
  /** Conversation so far (user + assistant turns), oldest first. */
  messages: ChatMessage[];
  /** Canon strings accumulated this session, injected each turn. */
  canon: string[];
  /** Questions the trainee has asked so far (drives wrap-up signaling). */
  questionsUsed: number;
}

/** Build the one-per-session persona system prompt from a fact sheet. */
export function buildPersonaSystemPrompt(_ctx: PersonaTurnContext): string {
  throw new Error("Not implemented (Phase 1)");
}

export interface ParsedPersonaReply {
  /** Everything before the ###META tail — the only text shown to the user. */
  reply: string;
  meta: Meta;
  /** True when META was missing/invalid and an empty META was synthesized. */
  metaSynthesized: boolean;
}

/**
 * Split a raw model completion into the visible reply and its ###META tail,
 * validating the JSON. On invalid/missing META the caller retries once, then
 * synthesizes empty META (CLAUDE.md rule 5).
 */
export function parsePersonaReply(_raw: string): ParsedPersonaReply {
  throw new Error("Not implemented (Phase 1)");
}
