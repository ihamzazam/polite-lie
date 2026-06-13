import { describe, it, expect, beforeAll } from "vitest";
import { seal, unseal, looksLikeSealedToken } from "@/lib/seal";
import { getPreset } from "@/lib/presets";

beforeAll(() => {
  process.env.SCENARIO_SECRET = "test-secret-for-vitest-only";
});

const sheet = getPreset("dana-payouts")!;

describe("sealed token", () => {
  it("round-trips a fact sheet through encrypt/decrypt", () => {
    const token = seal(sheet);
    expect(unseal(token)).toEqual(sheet);
  });

  it("produces a URL-safe, opaque token (no plaintext fact content)", () => {
    const token = seal(sheet);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token).not.toContain("ops buffer");
    expect(token).not.toContain("CTO");
  });

  it("two seals of the same sheet differ (random IV)", () => {
    expect(seal(sheet)).not.toBe(seal(sheet));
  });

  it("rejects a tampered token", () => {
    const token = seal(sheet);
    const tampered = token.slice(0, -4) + (token.slice(-4) === "AAAA" ? "BBBB" : "AAAA");
    expect(() => unseal(tampered)).toThrow();
  });

  it("distinguishes tokens from preset ids", () => {
    expect(looksLikeSealedToken(seal(sheet))).toBe(true);
    expect(looksLikeSealedToken("dana-payouts")).toBe(false);
  });
});
