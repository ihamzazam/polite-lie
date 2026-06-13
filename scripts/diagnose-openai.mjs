// Diagnostic: confirm which OpenAI models this key can use and which API works.
// Run: node --env-file=.env.local scripts/diagnose-openai.mjs
// Prints model ids + the exact error from a minimal call, so we pick the right
// model id and API surface without guessing. Never prints the key.
import OpenAI from "openai";

const key = process.env.OPENAI_API_KEY;
if (!key) {
  console.error("OPENAI_API_KEY not loaded. Use: node --env-file=.env.local scripts/diagnose-openai.mjs");
  process.exit(1);
}
const client = new OpenAI({ apiKey: key });

console.log("1) Listing available models (gpt-5 / gpt-4 family)…");
try {
  const list = await client.models.list();
  const ids = list.data
    .map((m) => m.id)
    .filter((id) => /gpt-5|gpt-4|o1|o3|o4/.test(id))
    .sort();
  console.log("   models:", ids.join(", ") || "(none matched)");
} catch (e) {
  console.log("   models.list error:", e?.status, e?.message);
}

const candidates = ["gpt-5.5-instant", "gpt-5.5", "gpt-5.4-mini", "gpt-5", "gpt-4o"];

async function tryChatCompletions(model) {
  try {
    const r = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: "say 'ok'" }],
      max_completion_tokens: 16,
    });
    return `OK chat.completions -> "${r.choices[0]?.message?.content ?? ""}"`;
  } catch (e) {
    return `chat.completions ERR ${e?.status}: ${e?.message}`;
  }
}

async function tryResponses(model) {
  try {
    if (!client.responses?.create) return "responses API: not in SDK";
    const r = await client.responses.create({ model, input: "say 'ok'", max_output_tokens: 16 });
    const text = r.output_text ?? JSON.stringify(r.output)?.slice(0, 60);
    return `OK responses -> "${text}"`;
  } catch (e) {
    return `responses ERR ${e?.status}: ${e?.message}`;
  }
}

console.log("\n2) Probing candidate models on both API surfaces…");
for (const model of candidates) {
  console.log(`   [${model}]`);
  console.log("     ", await tryChatCompletions(model));
  console.log("     ", await tryResponses(model));
}
console.log("\nDone.");
