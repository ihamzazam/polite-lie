import { NextResponse } from "next/server";
import { PROVIDER } from "@/lib/models";

/**
 * Lightweight liveness probe for uptime monitoring through judging week.
 * No LLM calls, no secrets — just confirms the app is serving and that the
 * active provider's key is configured (boolean only, never the value), so a
 * misconfigured deploy is visible without exposing anything.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const keyConfigured =
    PROVIDER === "anthropic"
      ? Boolean(process.env.ANTHROPIC_API_KEY)
      : Boolean(process.env.OPENAI_API_KEY);

  return NextResponse.json({
    status: "ok",
    service: "polite-lie",
    provider: PROVIDER,
    llmConfigured: keyConfigured,
    time: new Date().toISOString(),
  });
}
