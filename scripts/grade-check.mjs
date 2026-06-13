// Full-pipeline check: run a mixed-quality interview, then grade it.
// Run: node scripts/grade-check.mjs <scenario>   (dev server must be running)
const BASE = process.env.BASE ?? "http://localhost:3000";
const scenario = process.argv[2] ?? "dana-payouts";

// A deliberately mixed interview: some strong moves, some weak ones.
const questions = [
  "hey Dana, thanks for the time. how do driver payouts actually work day to day right now?",
  "would you pay $30 a month for a tool that automated all of that?", // HYPOTHETICAL + MONEY
  "what does this whole mess cost you each month?", // MONEY deflect
  "ballpark it for me — roughly how much a month?", // MONEY reveal
  "when was the last time a dispute really blew up? walk me through it.", // PAST_BEHAVIOR
  "and who would actually sign off on buying a tool like this?", // AUTHORITY
  "so I'm thinking of building a WhatsApp bot that auto-reconciles this — pretty useful right?", // PITCH
];

let messages = [];
let revealedIds = [];
let canon = [];

console.log(`=== running interview: ${scenario} ===`);
for (const content of questions) {
  messages.push({ role: "user", content });
  const res = await fetch(`${BASE}/api/interview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario, messages, revealedIds, canon }),
  });
  if (!res.ok) { console.log("interview error", res.status, await res.text()); process.exit(1); }
  const data = await res.json();
  messages.push({ role: "assistant", content: data.reply });
  revealedIds = data.revealedIds;
  canon = data.canon;
  console.log(`  Q: ${content}\n  A: ${data.reply}  [signals=${data.signalsCaptured}]`);
}

console.log(`\n=== grading (${messages.length} messages) ===`);
const t = Date.now();
const gres = await fetch(`${BASE}/api/grade`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ scenario, messages }),
});
console.log(`grade HTTP ${gres.status} in ${Date.now() - t}ms`);
const report = await gres.json();
console.log(JSON.stringify(report, null, 2));
