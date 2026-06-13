import "server-only";
import type { FactSheet } from "@/lib/types";

/**
 * Sealed-token pattern for custom scenarios (Phase 5). The plaintext fact sheet
 * never reaches the client (CLAUDE.md rule 1); instead the client holds an
 * AES-256-GCM ciphertext keyed by SCENARIO_SECRET and echoes it back each turn,
 * and the server decrypts it to rebuild context.
 *
 * Implemented in Phase 5; signatures fixed now.
 */

/** Encrypt a generated fact sheet into an opaque, URL-safe sealed token. */
export function seal(_sheet: FactSheet): string {
  throw new Error("Not implemented (Phase 5)");
}

/** Decrypt and validate a sealed token back into a fact sheet. */
export function unseal(_token: string): FactSheet {
  throw new Error("Not implemented (Phase 5)");
}
