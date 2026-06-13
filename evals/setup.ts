import { readFileSync } from "node:fs";

/**
 * Eval setup: load .env.local into process.env so `npm run eval` has the LLM
 * key locally. In CI the key comes from secrets (already in process.env), and
 * .env.local is absent — so this is a best-effort, no-op-on-missing loader.
 * Existing env vars are never overwritten.
 */
try {
  const text = readFileSync(".env.local", "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch {
  // No .env.local (e.g. CI) — rely on the ambient environment.
}
