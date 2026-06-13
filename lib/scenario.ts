import "server-only";
import { getPreset } from "@/lib/presets";
import { looksLikeSealedToken, unseal } from "@/lib/seal";
import type { FactSheet } from "@/lib/types";

/**
 * Resolve a scenario reference to its full fact sheet, server-side. Accepts a
 * preset id (e.g. "dana-payouts") or a sealed token for a custom scenario.
 * Returns null for anything unknown or tampered.
 */
export function resolveScenario(scenario: string): FactSheet | null {
  const preset = getPreset(scenario);
  if (preset) return preset;
  if (looksLikeSealedToken(scenario)) {
    try {
      return unseal(scenario);
    } catch {
      return null;
    }
  }
  return null;
}
