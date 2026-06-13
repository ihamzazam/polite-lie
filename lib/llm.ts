import "server-only";
import { PROVIDER } from "@/lib/models";
import { getAnthropic } from "@/lib/anthropic";
import { getOpenAI } from "@/lib/openai";
import type { ChatMessage } from "@/lib/types";

/**
 * Provider-agnostic LLM calls. Everything routes through here so swapping
 * providers is a single env flip (LLM_PROVIDER), not a code change.
 * - completeText: free-form text (persona turns, narrative report).
 * - completeJSONText: JSON-mode text for the classifier (caller validates with
 *   zod + repairs). Returns the raw JSON string.
 */

export interface CompleteTextArgs {
  model: string;
  system: string;
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
}

export async function completeText(args: CompleteTextArgs): Promise<string> {
  return PROVIDER === "anthropic"
    ? anthropicText(args.model, args.system, args.messages, args.temperature, args.maxTokens)
    : openaiChat({
        model: args.model,
        messages: toOpenAIMessages(args.system, args.messages),
        temperature: args.temperature,
        maxTokens: args.maxTokens,
      });
}

export interface CompleteJSONArgs {
  model: string;
  system: string;
  /** Single user message carrying the data + JSON instructions. */
  user: string;
  temperature: number;
  maxTokens: number;
}

/** Returns a raw JSON string (caller parses/validates/repairs). */
export async function completeJSONText(args: CompleteJSONArgs): Promise<string> {
  const messages: ChatMessage[] = [{ role: "user", content: args.user }];
  if (PROVIDER === "anthropic") {
    // Anthropic has no JSON mode; the prompt instructs strict JSON.
    return anthropicText(args.model, args.system, messages, args.temperature, args.maxTokens);
  }
  return openaiChat({
    model: args.model,
    messages: toOpenAIMessages(args.system, messages),
    temperature: args.temperature,
    maxTokens: args.maxTokens,
    jsonMode: true,
  });
}

// ── Anthropic ───────────────────────────────────────────────────────────────

async function anthropicText(
  model: string,
  system: string,
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number,
): Promise<string> {
  const res = await getAnthropic().messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    system,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });
  return res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
}

// ── OpenAI ──────────────────────────────────────────────────────────────────

function toOpenAIMessages(system: string, messages: ChatMessage[]) {
  return [
    { role: "system" as const, content: system },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];
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

interface OpenAIChatArgs {
  model: string;
  messages: ReturnType<typeof toOpenAIMessages>;
  temperature: number;
  maxTokens: number;
  jsonMode?: boolean;
}

async function openaiChat(args: OpenAIChatArgs): Promise<string> {
  const client = getOpenAI();
  const base = {
    model: args.model,
    messages: args.messages,
    max_completion_tokens: args.maxTokens,
    ...(args.jsonMode ? { response_format: { type: "json_object" as const } } : {}),
  };
  try {
    const res = await client.chat.completions.create({
      ...base,
      temperature: args.temperature,
    });
    return res.choices[0]?.message?.content ?? "";
  } catch (err) {
    if (isTemperatureRejection(err)) {
      const res = await client.chat.completions.create(base);
      return res.choices[0]?.message?.content ?? "";
    }
    throw err;
  }
}
