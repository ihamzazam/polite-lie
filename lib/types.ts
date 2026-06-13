import { z } from "zod";

/**
 * Shared types for the discovery-interview trainer.
 *
 * The single most important boundary in this file is between the FULL fact
 * sheet (server-only ground truth) and the ScenarioBrief (the public-safe
 * subset the client is allowed to see). See CLAUDE.md hard rule 1: the fact
 * sheet NEVER reaches the client.
 */

// ── Fact sheet schema (mirrors docs/SPEC.md section 1) ──────────────────────

export const TIERS = ["surface", "probe", "deep"] as const;
export const DISPOSITIONS = ["strong_need", "mild_interest", "dead_end"] as const;
export const DIFFICULTIES = ["easy", "realistic", "hard"] as const;

export const FACT_CATEGORIES = [
  "workflow",
  "pain_event",
  "spend",
  "authority",
  "frequency",
  "priority",
  "past_attempt",
  "deal_breaker",
  "emotional",
] as const;

export const FactSchema = z.object({
  id: z.string(), // e.g. "F1"
  tier: z.enum(TIERS),
  category: z.string(),
  content: z.string(),
  unlock: z.string(),
  why_it_matters: z.string(),
});

export const PersonaSchema = z.object({
  name: z.string(),
  age: z.number(),
  role: z.string(),
  company_context: z.string(),
  visible_profile: z.string(),
  disposition: z.enum(DISPOSITIONS),
  voice_notes: z.string(),
});

export const FactSheetParamsSchema = z.object({
  tangent_rate: z.number(),
  turn_budget: z.number(),
  difficulty: z.enum(DIFFICULTIES),
});

export const FactSheetSchema = z.object({
  id: z.string(),
  research_brief: z.string(),
  persona: PersonaSchema,
  facts: z.array(FactSchema),
  params: FactSheetParamsSchema,
});

export type Tier = (typeof TIERS)[number];
export type Disposition = (typeof DISPOSITIONS)[number];
export type Difficulty = (typeof DIFFICULTIES)[number];
export type Fact = z.infer<typeof FactSchema>;
export type Persona = z.infer<typeof PersonaSchema>;
export type FactSheetParams = z.infer<typeof FactSheetParamsSchema>;
export type FactSheet = z.infer<typeof FactSheetSchema>;

// ── Public-safe projection (what the client may receive) ────────────────────

/**
 * Everything the trainee is allowed to see before/during an interview.
 * Deliberately omits `facts` and the persona's `voice_notes` (which can leak
 * unlock hints). Built server-side via toScenarioBrief().
 */
export interface ScenarioBrief {
  id: string;
  research_brief: string;
  persona: {
    name: string;
    age: number;
    role: string;
    company_context: string;
    visible_profile: string;
  };
  difficulty: Difficulty;
  turn_budget: number;
  total_facts: number; // count only — never the contents
}

// ── Persona runtime ─────────────────────────────────────────────────────────

/** The ###META tail the persona appends to each reply. */
export const MetaSchema = z.object({
  facts_revealed: z.array(z.string()),
  canon_additions: z.array(z.string()),
  polite_lie: z.boolean(),
  complimented: z.boolean(),
});
export type Meta = z.infer<typeof MetaSchema>;

export const EMPTY_META: Meta = {
  facts_revealed: [],
  canon_additions: [],
  polite_lie: false,
  complimented: false,
};

export type ChatRole = "user" | "assistant";
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

// ── Interview API contract (stateless; see hard rule 7) ─────────────────────

export interface InterviewRequest {
  /** Preset id (e.g. "dana-payouts") or a sealed token for custom scenarios. */
  scenario: string;
  messages: ChatMessage[];
  /** Fact ids already revealed this session, e.g. ["F3"]. Ids only. */
  revealedIds: string[];
  /** Canon strings the persona has already said/implied this session. */
  canon: string[];
}

export interface InterviewResponse {
  reply: string;
  revealedIds: string[];
  canon: string[];
  /** Count of distinct facts revealed so far. Denominator is hidden by design. */
  signalsCaptured: number;
  questionsUsed: number;
  turnBudget: number;
  /** True once the persona has wrapped up or the turn budget is exhausted. */
  ended: boolean;
}
