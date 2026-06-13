import "server-only";
import { completeJSONText } from "@/lib/llm";
import { MODELS, CAPS, TEMPERATURES } from "@/lib/models";
import { FactSheetSchema, type Disposition, type FactSheet } from "@/lib/types";

/**
 * Custom-scenario generator (SPEC §5). One LLM call to the fact-sheet schema:
 * facts must be decision-relevant to the trainee's idea, the disposition is
 * rolled server-side for the real 30/45/25 distribution, and the persona never
 * learns the idea exists. Validated against the schema with one repair retry;
 * returns null on failure so the caller can fall back to a preset.
 */

function rollDisposition(): Disposition {
  const r = Math.random();
  if (r < 0.3) return "strong_need";
  if (r < 0.75) return "mild_interest";
  return "dead_end";
}

const DISPOSITION_BRIEF: Record<Disposition, string> = {
  strong_need:
    "pain is a top-3 priority, budget exists, and the current workaround is visibly collapsing",
  mild_interest:
    "real pain, but the wrong priority rank or no purchasing authority — the honest middle",
  dead_end:
    "polite person whose problem ranks low and whose current workaround is genuinely fine",
};

const GENERATOR_SYSTEM = `You hand-author the hidden ground truth for a discovery-interview training simulator. Given a trainee's product idea and a target customer, you invent ONE realistic customer and the fact sheet a great interviewer could uncover. You output JSON only.

HARD RULES:
- The customer is a real person being interviewed, and they ARE the target customer described — match their role, life, and context to that target (a consumer target gets a consumer persona, not a random corporate job). The fact sheet describes THEIR world (workflow, pains, spend, authority, priorities) — never your product. The persona must NOT know the trainee's idea exists.
- Every fact must be decision-relevant: if discovered, it materially updates whether the trainee should build or kill the idea.
- 8-12 facts: 3-4 "surface", 3-4 "probe", 2-4 "deep". Cover these categories across them: workflow, pain_event (specific past incidents with dates/consequences), spend (what workarounds cost in money or hours), authority (who actually buys), frequency, priority (where this ranks), past_attempt (tools tried and abandoned, why), deal_breaker, emotional (what they'd never volunteer).
- Money facts (spend, authority) are always "probe" or "deep", and the unlock must say they deflect once before revealing.
- TEXTURE: no round numbers, no generic phrasing. Use specifics ("$340/mo", "twice in March", "the Thursday before the board meeting"). Anything that reads like a case study is wrong.
- Disposition is FIXED (given below). The sheet must be internally consistent with it and contain at least one INCONVENIENT TRUTH consistent with it — a fact that, well-interviewed, should change the trainee's mind. A flawless interview uncovering that the idea is dead is a top outcome.

OUTPUT — exactly this JSON shape, no markdown:
{
 "id": "custom",
 "research_brief": "one or two sentences the trainee sees: the research area and that the person agreed to a short chat. NEVER name or pitch the trainee's specific idea.",
 "persona": {
   "name": "Full Name", "age": 0,
   "role": "who they are in the context of the idea — a job title for a professional target, or a life role (e.g. 'parent of two, weeknight cook') for a consumer target",
   "company_context": "one neutral line of fitting context — company size/stage/location for a professional, or household/life situation for a consumer",
   "visible_profile": "one paragraph the trainee sees before starting — who they are, their scale/situation, one neutral line of context. No pains, no spend, nothing discoverable.",
   "disposition": "<given>",
   "voice_notes": "how they talk: verbal tics, tone, when they warm up or get terse"
 },
 "facts": [
   {"id":"F1","tier":"surface","category":"workflow","content":"...","unlock":"the kind of question that reveals it","why_it_matters":"why it updates build/kill"}
 ],
 "params": {"tangent_rate":0.3,"turn_budget":12,"difficulty":"realistic"}
}`;

function buildGeneratorUser(
  idea: string,
  targetCustomer: string,
  disposition: Disposition,
): string {
  return `TRAINEE'S PRODUCT IDEA (seed only — the persona must never know this exists):
${idea}

TARGET CUSTOMER:
${targetCustomer}

FIXED DISPOSITION: "${disposition}" — ${DISPOSITION_BRIEF[disposition]}.

Author the fact sheet JSON now. Make every fact decision-relevant to THIS idea and consistent with the disposition, with at least one inconvenient truth.`;
}

function tryParseSheet(raw: string, disposition: Disposition): FactSheet | null {
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    const json = JSON.parse(raw.slice(start, end + 1));
    const parsed = FactSheetSchema.safeParse(json);
    if (!parsed.success) return null;
    // Enforce server-controlled fields regardless of what the model returned.
    return {
      ...parsed.data,
      id: "custom",
      persona: { ...parsed.data.persona, disposition },
      params: {
        tangent_rate: parsed.data.params?.tangent_rate ?? 0.3,
        turn_budget: parsed.data.params?.turn_budget ?? 12,
        difficulty: parsed.data.params?.difficulty ?? "realistic",
      },
    };
  } catch {
    return null;
  }
}

export async function generateScenario(
  idea: string,
  targetCustomer: string,
): Promise<FactSheet | null> {
  const disposition = rollDisposition();
  const call = (extra = "") =>
    completeJSONText({
      model: MODELS.generator,
      system: GENERATOR_SYSTEM + extra,
      user: buildGeneratorUser(idea, targetCustomer, disposition),
      temperature: TEMPERATURES.generator,
      maxTokens: CAPS.generatorMaxTokens,
      reasoningEffort: "low",
    });

  let sheet = tryParseSheet(await call(), disposition);
  if (!sheet) {
    sheet = tryParseSheet(
      await call(
        "\n\nYour previous output did not match the schema. Return ONLY the JSON object with all required fields.",
      ),
      disposition,
    );
  }
  return sheet;
}
