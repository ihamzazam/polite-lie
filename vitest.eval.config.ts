import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Grading regression harness: runs the full pipeline against fixture
// transcripts and asserts score ordering, bands, and flag presence.
// Hits the Anthropic API, so timeouts are generous. Run with `npm run eval`.
// Lives in its own config so `npm run test` stays fast and offline.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./test/server-only-stub.ts", import.meta.url),
      ),
    },
  },
  test: {
    include: ["evals/**/*.eval.ts"],
    setupFiles: ["evals/setup.ts"],
    environment: "node",
    globals: false,
    testTimeout: 120_000,
    hookTimeout: 120_000,
    // Classifier nondeterminism: keep the suite serial and retry once so a
    // single flaky classification doesn't fail CI. Assertions stay
    // tolerance-based (ordering / bands / flags), never exact scores.
    retry: 1,
    fileParallelism: false,
    // Fixtures arrive in Phase 3; keep `npm run eval` green until then.
    passWithNoTests: true,
  },
});
