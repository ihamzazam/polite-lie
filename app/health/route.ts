import { NextResponse } from "next/server";

/**
 * Lightweight liveness probe for uptime monitoring through judging week.
 * No LLM calls, no secrets — just confirms the app is serving. Reports whether
 * the Anthropic key is configured (boolean only, never the value) so a
 * misconfigured deploy is visible without exposing anything.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "polite-lie",
    anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
    time: new Date().toISOString(),
  });
}
