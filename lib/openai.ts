import "server-only";
import OpenAI from "openai";

/**
 * Single shared OpenAI client. API key stays server-side (CLAUDE.md rule 2);
 * importing "server-only" makes a client-side import a build error.
 */
let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}
