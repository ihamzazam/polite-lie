import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Unit tests: pure, fast, no network. Scoring formulas, taxonomy, parsing,
// and the fact-sheet-leakage guard live here. Run with `npm run test`.
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
    include: ["lib/**/*.test.ts", "app/**/*.test.ts"],
    environment: "node",
    globals: false,
  },
});
