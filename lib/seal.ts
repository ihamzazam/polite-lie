import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { FactSheetSchema, type FactSheet } from "@/lib/types";

/**
 * Sealed-token pattern for custom scenarios (SPEC §5). The plaintext fact sheet
 * never reaches the client (CLAUDE.md rule 1); the client holds an
 * AES-256-GCM ciphertext keyed by SCENARIO_SECRET and echoes it back each turn,
 * and the server decrypts it to rebuild context.
 *
 * Token layout (base64url): iv(12) || authTag(16) || ciphertext.
 */

const ALGO = "aes-256-gcm";

function key(): Buffer {
  const secret = process.env.SCENARIO_SECRET;
  if (!secret) throw new Error("SCENARIO_SECRET is not set");
  // Derive a stable 32-byte key from whatever the secret is.
  return createHash("sha256").update(secret).digest();
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/** Encrypt a fact sheet into an opaque, URL-safe sealed token. */
export function seal(sheet: FactSheet): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key(), iv);
  const plaintext = Buffer.from(JSON.stringify(sheet), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return b64url(Buffer.concat([iv, tag, ciphertext]));
}

/** Decrypt and validate a sealed token back into a fact sheet. Throws on a
 *  tampered/invalid token or schema mismatch. */
export function unseal(token: string): FactSheet {
  const raw = fromB64url(token);
  if (raw.length < 28) throw new Error("sealed token too short");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = createDecipheriv(ALGO, key(), iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  const json = JSON.parse(plaintext.toString("utf8"));
  return FactSheetSchema.parse(json);
}

/** A sealed token is the opaque ciphertext; presets are short slugs. We treat
 *  anything that isn't a known preset id and is long enough as a candidate
 *  token. */
export function looksLikeSealedToken(scenario: string): boolean {
  return scenario.length > 40 && /^[A-Za-z0-9_-]+$/.test(scenario);
}
