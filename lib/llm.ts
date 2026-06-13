import "server-only";
import { PROVIDER } from "@/lib/models";
import { getAnthropic } from "@/lib/anthropic";
import { getOpenAI } from "@/lib/openai";
import type { ChatMessage } from "@/lib/types";

/**
 * Provider-agnostic text completion. All persona/narrative LLM calls route
 * through here so swapping providers is a single env flip (LLM_PROVIDER), not a
 * code change. Structured-JSON grading helpers are added in Phase 2.
 */

export interface CompleteTextArgs {
  model: string;
  /** System / instruction prompt. */
  system: string;
  /** Conversation turns, oldest first. */
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
}

export async function completeText(args: CompleteTextArgs): Promise<string> {
  return PROVIDER === "anthropic"
    ? completeAnthropic(args)
    : completeOpenAI(args);
}

async function completeAnthropic({
  model,
  system,
  messages,
  temperature,
  maxTokens,
}: CompleteTextArgs): Promise<string> {
  const res = await getAnthropic().messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    system,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });
  return res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
}

/** Some newer OpenAI models only accept the default temperature; detect that
 *  one specific rejection and retry without the param rather than failing. */
function isTemperatureRejection(err: unknown): boolean {
  const msg =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: unknown }).message)
      : String(err);
  return /temperature/i.test(msg) && /unsupported|not support|only|default/i.test(msg);
}

async function completeOpenAI({
  model,
  system,
  messages,
  temperature,
  maxTokens,
}: CompleteTextArgs): Promise<string> {
  const client = getOpenAI();
  const payload = {
    model,
    messages: [
      { role: "system" as const, content: system },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    max_completion_tokens: maxTokens,
  };

  try {
    const res = await client.chat.completions.create({ ...payload, temperature });
    return res.choices[0]?.message?.content ?? "";
  } catch (err) {
    if (isTemperatureRejection(err)) {
      const res = await client.chat.completions.create(payload);
      return res.choices[0]?.message?.content ?? "";
    }
    throw err;
  }
}
