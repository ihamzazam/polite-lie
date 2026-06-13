import { describe, it, expect } from "vitest";
import {
  buildPersonaSystemPrompt,
  parsePersonaReply,
  validateRevealedIds,
  type PersonaTurnContext,
} from "@/lib/persona";
import { getPreset } from "@/lib/presets";
import type { FactSheet } from "@/lib/types";

const dana = getPreset("dana-payouts")! as FactSheet;

function ctx(overrides: Partial<PersonaTurnContext> = {}): PersonaTurnContext {
  return {
    sheet: dana,
    messages: [{ role: "user", content: "how do payouts work today?" }],
    revealedIds: [],
    canon: [],
    questionsUsed: 1,
    ...overrides,
  };
}

describe("buildPersonaSystemPrompt", () => {
  it("injects identity, visible profile, voice, and ground-truth facts", () => {
    const prompt = buildPersonaSystemPrompt(ctx());
    expect(prompt).toContain("Dana Okafor");
    expect(prompt).toContain(dana.persona.visible_profile);
    expect(prompt).toContain(dana.persona.voice_notes);
    // The persona must know the hidden fact contents and their unlocks.
    expect(prompt).toContain(dana.facts[0].content);
    expect(prompt).toContain(dana.facts[0].unlock);
  });

  it("excludes grading-only rationale (why_it_matters) from the prompt", () => {
    const prompt = buildPersonaSystemPrompt(ctx());
    for (const fact of dana.facts) {
      expect(prompt).not.toContain(fact.why_it_matters);
    }
  });

  it("lists already-revealed ids and canon so it won't re-reveal", () => {
    const prompt = buildPersonaSystemPrompt(
      ctx({ revealedIds: ["F1"], canon: ["pays drivers on Fridays"] }),
    );
    expect(prompt).toContain("F1");
    expect(prompt).toContain("pays drivers on Fridays");
  });

  it("signals wrap-up only in the final stretch", () => {
    const early = buildPersonaSystemPrompt(ctx({ questionsUsed: 2 }));
    expect(early).not.toMatch(/wrap up/i);
    const late = buildPersonaSystemPrompt(ctx({ questionsUsed: 11 }));
    expect(late).toMatch(/wrap up/i);
  });
});

describe("parsePersonaReply", () => {
  it("splits the visible reply from a valid META tail", () => {
    const raw =
      'Ugh, three weeks ago a driver swore he did 14 runs.\n###META {"facts_revealed": ["F4"], "canon_additions": [], "polite_lie": false, "complimented": false}';
    const { reply, meta } = parsePersonaReply(raw);
    expect(reply).toBe("Ugh, three weeks ago a driver swore he did 14 runs.");
    expect(meta).not.toBeNull();
    expect(meta!.facts_revealed).toEqual(["F4"]);
    expect(meta!.polite_lie).toBe(false);
  });

  it("returns null meta when the tail is missing", () => {
    const { reply, meta } = parsePersonaReply("just a reply, no meta here");
    expect(meta).toBeNull();
    expect(reply).toBe("just a reply, no meta here");
  });

  it("returns null meta on malformed JSON but keeps the reply", () => {
    const { reply, meta } = parsePersonaReply(
      "hello there\n###META {not valid json",
    );
    expect(meta).toBeNull();
    expect(reply).toBe("hello there");
  });

  it("rejects a META that fails schema validation", () => {
    const { meta } = parsePersonaReply(
      'hi\n###META {"facts_revealed": "F4", "polite_lie": false}',
    );
    expect(meta).toBeNull();
  });

  it("tolerates stray prose after the JSON object", () => {
    const { meta } = parsePersonaReply(
      'hi\n###META {"facts_revealed": [], "canon_additions": [], "polite_lie": true, "complimented": false} (done)',
    );
    expect(meta).not.toBeNull();
    expect(meta!.polite_lie).toBe(true);
  });
});

describe("validateRevealedIds", () => {
  it("keeps known ids and drops hallucinated ones", () => {
    expect(validateRevealedIds(dana, ["F1", "F99", "F7"])).toEqual([
      "F1",
      "F7",
    ]);
  });
});
