import "server-only";

/**
 * Central model + cap configuration, read from env with the defaults from
 * CLAUDE.md. Keeping this in one place means prompt/temperature/cap changes are
 * a config edit, not a code hunt. Server-only: nothing here touches the client.
 */

export const MODELS = {
  /** Cheap, fast, temperature 0.9 — the in-character interviewee. */
  persona: process.env.PERSONA_MODEL ?? "claude-haiku-4-5-20251001",
  /** Temperature 0, strict JSON — Pass 1 classification. */
  classifier: process.env.CLASSIFIER_MODEL ?? "claude-sonnet-4-6",
  /** Writes the report prose — Pass 3. */
  narrative: process.env.NARRATIVE_MODEL ?? "claude-sonnet-4-6",
  /** Custom-scenario fact-sheet generation only. */
  generator: process.env.GENERATOR_MODEL ?? "claude-sonnet-4-6",
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
