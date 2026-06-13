import "server-only";
import { z } from "zod";
import { completeJSONText, completeText } from "@/lib/llm";
import { MODELS, CAPS, TEMPERATURES } from "@/lib/models";
import { classifyTranscript } from "@/lib/grading";
import { computeTechniqueOnly } from "@/lib/scoring";
import type { ChatMessage, FactSheet } from "@/lib/types";
import type { PasteNarrative, PasteReport, UngradedResult } from "@/lib/report";

/**
 * Paste-a-transcript mode (SPEC §6). A real interview transcript graded for
 * TECHNIQUE only — no fact sheet, no discovery, no insight extraction (that's
 * momtest.io's lane, and staying out of it is deliberate positioning). A cheap
 * normalization pass accepts messy formats and labels speakers; the user
 * confirms who the interviewer is; then it's Pass 1 + technique scoring /100.
 */

// ── Normalization ───────────────────────────────────────────────────────────

export const NormalizedSchema = z.object({
  speakers: z.array(z.string()).min(1),
  turns: z
    .array(z.object({ speaker: z.string(), text: z.string() }))
    .min(1)
    .max(120),
});
export type Normalized = z.infer<typeof NormalizedSchema>;

const NORMALIZE_SYSTEM = `You clean up a messy interview transcript (Zoom export, Otter.ai, raw paste, copy-pasted chat) into structured turns. Identify the distinct speakers and attribute every line. Merge consecutive lines from the same speaker. Strip timestamps, "joined the meeting" noise, and filler markup. Do not invent or summarize content — keep the actual words.

Output JSON only:
{"speakers":["Name A","Name B"],"turns":[{"speaker":"Name A","text":"..."},{"speaker":"Name B","text":"..."}]}
Use the speaker labels exactly as they appear in the transcript (or "Speaker 1"/"Speaker 2" if unlabeled).`;

function tryParseJSON<T>(raw: string, schema: z.ZodType<T>): T | null {
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    const parsed = schema.safeParse(JSON.parse(raw.slice(start, end + 1)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function normalizeTranscript(raw: string): Promise<Normalized | null> {
  const call = (extra = "") =>
    completeJSONText({
      model: MODELS.classifier,
      system: NORMALIZE_SYSTEM + extra,
      user: `TRANSCRIPT:\n${raw}`,
      temperature: TEMPERATURES.classifier,
      maxTokens: CAPS.classifierMaxTokens,
      reasoningEffort: "low",
    });
  let result = tryParseJSON(await call(), NormalizedSchema);
  if (!result) {
    result = tryParseJSON(
      await call("\n\nReturn ONLY valid JSON matching the schema."),
      NormalizedSchema,
    );
  }
  return result;
}

/** Map normalized turns to chat messages: the interviewer is "user", everyone
 *  else is "assistant" (the interviewee side). */
export function toMessages(normalized: Normalized, interviewer: string): ChatMessage[] {
  return normalized.turns.map((t) => ({
    role: t.speaker === interviewer ? "user" : "assistant",
    content: t.text,
  }));
}

// ── Technique grading ───────────────────────────────────────────────────────

// An empty-facts sheet lets us reuse the classifier purely for turn
// classification — there's nothing to verify, so facts comes back empty and we
// ignore it.
const EMPTY_SHEET: FactSheet = {
  id: "paste",
  research_brief: "",
  persona: {
    name: "Interviewee",
    age: 0,
    role: "",
    company_context: "",
    visible_profile: "",
    disposition: "mild_interest",
    voice_notes: "",
  },
  facts: [],
  params: { tangent_rate: 0.3, turn_budget: 12, difficulty: "realistic" },
};

const PASTE_NARRATIVE_SYSTEM = `You write a TECHNIQUE audit for a real customer-interview transcript. This is a technique critique only — never extract or summarize product insights. Tone: direct, specific, never cruel, no hedging filler. You receive computed scores and classified questions; do NOT restate numeric scores.

Return JSON only:
{
 "verdict": "two sharp sentences on the interviewer's technique overall.",
 "worst": [{"quote":"verbatim question","failure":"one line on why it failed","rewrite":"a stronger version"}],
 "best": {"quote":"verbatim question","why":"one line"} or null,
 "drills": ["three short practice drills"]
}
Pick up to three worst real questions and the single best one. No markdown.`;

const PasteNarrativeSchema = z.object({
  verdict: z.string(),
  worst: z.array(z.object({ quote: z.string(), failure: z.string(), rewrite: z.string() })).max(3),
  best: z.object({ quote: z.string(), why: z.string() }).nullable(),
  drills: z.array(z.string()),
});

const wc = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export async function gradePaste(
  messages: ChatMessage[],
): Promise<PasteReport | UngradedResult> {
  const gateMin = CAPS.gateMinQuestions;
  const userTurns = messages.filter((m) => m.role === "user").length;
  if (userTurns < gateMin) {
    return { gateMet: false, countedQuestions: userTurns, gateMin };
  }

  const classification = await classifyTranscript(messages, EMPTY_SHEET);
  const traineeWords = messages
    .filter((m) => m.role === "user")
    .reduce((n, m) => n + wc(m.content), 0);
  const totalWords = messages.reduce((n, m) => n + wc(m.content), 0);

  const scores = computeTechniqueOnly(classification.turns, traineeWords, totalWords, gateMin);
  if (!scores.gateMet) {
    return { gateMet: false, countedQuestions: scores.countedQuestions, gateMin };
  }

  const turnsBlock = classification.turns
    .map((t) => `Q${t.turnIndex} [${t.type}${t.flags.length ? " " + t.flags.join(",") : ""}]: ${t.quote}`)
    .join("\n");
  const raw = await completeText({
    model: MODELS.narrative,
    system: PASTE_NARRATIVE_SYSTEM,
    messages: [
      {
        role: "user",
        content: `TECHNIQUE SCORE: ${scores.total}/100 (quality ${scores.techniqueBreakdown.question_quality}/20, probe ${scores.techniqueBreakdown.probe_depth}/10, talk ${scores.techniqueBreakdown.talk_ratio}/5, pitch ${scores.techniqueBreakdown.pitch_discipline}/5, money ${scores.techniqueBreakdown.money_courage}/5, validation ${scores.techniqueBreakdown.validation_hygiene}/5)\n\nCLASSIFIED QUESTIONS:\n${turnsBlock}\n\nWrite the technique audit JSON now.`,
      },
    ],
    temperature: TEMPERATURES.narrative,
    maxTokens: CAPS.narrativeMaxTokens,
  });

  const parsed = tryParseJSON(raw, PasteNarrativeSchema);
  const narrative: PasteNarrative = {
    verdict: parsed?.verdict ?? "",
    worst: parsed?.worst ?? [],
    best: parsed?.best ?? null,
    drills: parsed?.drills ?? [],
  };

  return { kind: "paste", scores, narrative };
}
