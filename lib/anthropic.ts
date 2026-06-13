import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Single shared Anthropic client. API key stays server-side (CLAUDE.md rule 2);
 * importing "server-only" makes a client-side import a build error.
 */
let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}
