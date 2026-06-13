import { NextResponse } from "next/server";
import { z } from "zod";
import { generateScenario } from "@/lib/generator";
import { seal } from "@/lib/seal";
import { getPreset, toScenarioBrief } from "@/lib/presets";

/**
 * Custom scenario generator (Phase 5): GENERATOR_MODEL builds a fact sheet from
 * the trainee's idea + target customer (SPEC §5), validated with one repair
 * retry; on failure we fall back to the nearest preset with a notice. The
 * plaintext fact sheet never reaches the client — only a sealed token + the
 * public-safe brief (CLAUDE.md rule 1).
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const FALLBACK_PRESET = "dana-payouts";

const ScenarioRequestSchema = z.object({
  idea: z.string().min(10).max(2000),
  targetCustomer: z.string().min(3).max(1000),
});

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  if (!process.env.SCENARIO_SECRET) {
    return bad("Custom scenarios aren't available right now.", 503);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad("Malformed request body.");
  }

  const parsed = ScenarioRequestSchema.safeParse(body);
  if (!parsed.success) {
    return bad("Tell us a bit more about your idea and who you'd interview.");
  }
  const { idea, targetCustomer } = parsed.data;

  try {
    const sheet = await generateScenario(idea, targetCustomer);

    if (sheet) {
      return NextResponse.json({
        ok: true,
        scenario: seal(sheet),
        brief: toScenarioBrief(sheet),
      });
    }

    // Generation failed twice — fall back to a preset with a notice.
    const preset = getPreset(FALLBACK_PRESET)!;
    return NextResponse.json({
      ok: true,
      fallback: true,
      scenario: FALLBACK_PRESET,
      brief: toScenarioBrief(preset),
      notice:
        "We couldn't shape a custom customer this time, so here's a hand-crafted one to practice on.",
    });
  } catch (err) {
    console.error("[scenario] generation failed:", err);
    return bad("We couldn't build that scenario just now — try again in a moment.", 502);
  }
}
