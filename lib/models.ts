import "server-only";

/**
 * Central provider + model + cap configuration, read from env. Keeping this in
 * one place means a provider/model/temperature/cap change is a config edit, not
 * a code hunt. Server-only: nothing here touches the client.
 *
 * The LLM provider is configurable (CLAUDE.md): OpenAI by default during
 * development, switchable to Anthropic with LLM_PROVIDER=anthropic. Each
 * provider has its own sensible model defaults; any model can be overridden
 * with the matching *_MODEL env var.
 */

export type LlmProvider = "openai" | "anthropic";

export const PROVIDER: LlmProvider =
  process.env.LLM_PROVIDER === "anthropic" ? "anthropic" : "openai";

interface ModelSet {
  persona: string;
  classifier: string;
  narrative: string;
  generator: string;
}

const DEFAULTS: Record<LlmProvider, ModelSet> = {
  // Persona uses a fast model that honors temperature 0.9 for human texture
  // (gpt-5.4-mini, ~1.3s/turn); grading uses the flagship for accuracy and
  // report quality. Note: gpt-5.5 / *-chat-latest only accept the default
  // temperature, which completeText() handles, but the persona wants real
  // sampling control so it runs on the mini.
  openai: {
    persona: "gpt-5.4-mini",
    classifier: "gpt-5.5",
    narrative: "gpt-5.5",
    generator: "gpt-5.5",
  },
  anthropic: {
    persona: "claude-haiku-4-5-20251001",
    classifier: "claude-sonnet-4-6",
    narrative: "claude-sonnet-4-6",
    generator: "claude-sonnet-4-6",
  },
};

export const MODELS = {
  persona: process.env.PERSONA_MODEL ?? DEFAULTS[PROVIDER].persona,
  classifier: process.env.CLASSIFIER_MODEL ?? DEFAULTS[PROVIDER].classifier,
  narrative: process.env.NARRATIVE_MODEL ?? DEFAULTS[PROVIDER].narrative,
  generator: process.env.GENERATOR_MODEL ?? DEFAULTS[PROVIDER].generator,
} as const;

/** Hard caps (CLAUDE.md rule 6). Numeric envs override the defaults. */
function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

export const CAPS = {
  /** Max user turns per session. */
  maxUserTurns: intEnv("MAX_USER_TURNS", 14),
  /** Max characters in a single user message. */
  maxUserMessageChars: intEnv("MAX_USER_MESSAGE_CHARS", 600),
  /** Per-IP sessions per day. */
  perIpDailySessions: intEnv("PER_IP_DAILY_SESSIONS", 15),
  /** Global LLM calls per day across all IPs — distributed-spike breaker. */
  globalDailyCallCap: intEnv("GLOBAL_DAILY_CALL_CAP", 5000),
  /** Questions required before grading unlocks (SPEC §3 gate). */
  gateMinQuestions: intEnv("GATE_MIN_QUESTIONS", 5),
  /** Output-token caps per call. */
  personaMaxTokens: intEnv("PERSONA_MAX_TOKENS", 400),
  classifierMaxTokens: intEnv("CLASSIFIER_MAX_TOKENS", 4000),
  narrativeMaxTokens: intEnv("NARRATIVE_MAX_TOKENS", 2000),
  generatorMaxTokens: intEnv("GENERATOR_MAX_TOKENS", 4000),
} as const;

export const TEMPERATURES = {
  persona: 0.9,
  classifier: 0,
  narrative: 0.4,
  generator: 0,
} as const;
