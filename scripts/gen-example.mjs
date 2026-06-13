// Generate the static example report from the textbook transcript.
// Run: node scripts/gen-example.mjs   (dev server must be running)
// Writes lib/example-report.json, rendered statically at /report/example.
import { writeFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3000";

const u = (content) => ({ role: "user", content });
const a = (content) => ({ role: "assistant", content });

const messages = [
  u("Thanks for making the time. To start — how do driver payouts actually work for you day to day right now?"),
  a("honestly it's mostly me. every friday i sit down with a shared google sheet and reconcile the payouts, and it eats three or four hours. the painful part is the numbers come from three places that never agree — the dispatch app export, driver whatsapp screenshots, and a paper log at the warehouse."),
  u("How often do these payout disputes actually come up?"),
  a("maybe six to ten a week across our seventy-odd drivers. it spikes whenever the app has an outage."),
  u("When was the last time one really blew up on you? Walk me through it."),
  a("three weeks ago. a driver swore he did 14 runs, my sheet said 11. it dragged on for two days right before a board meeting, and i ended up paying the difference — about eighteen thousand naira — out of the ops buffer just to make it stop."),
  u("What made that particular one drag on for two whole days?"),
  a("honestly because i couldn't prove either number. the paper log was smudged and his whatsapp screenshots were half missing, so it was his word against a spreadsheet."),
  u("And after you paid it out, did you try to change anything about how you handle them?"),
  a("i actually asked one of our backend devs in january to build a little reconciliation script. he got a half-working notebook going, then got pulled onto the new city launch, and it's been dead since."),
  u("What are you actually spending on this each month in real money?"),
  a("oh, i'd have to think, i don't really track it exactly."),
  u("Totally — even a rough ballpark of the monthly cost?"),
  a("okay, roughly... software spend is basically zero, but it's my friday afternoons plus maybe forty to sixty thousand naira a month in those quiet make-it-go-away payouts."),
  u("If you wanted to buy something to fix this, who actually signs off on it?"),
  a("oh, i'd have to check honestly, i don't really own that decision."),
  u("Say you really wanted it — who literally approves the purchase?"),
  a("the CTO. anything over fifty dollars a month goes through him, and he killed two saas requests last quarter calling them spreadsheet problems."),
  u("Where does fixing this rank against everything else on your plate right now?"),
  a("honestly? maybe fourth. what actually keeps me up is driver churn — we lost nine drivers to a competitor last month. disputes are only a small part of that."),
];

const res = await fetch(`${BASE}/api/grade`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ scenario: "dana-payouts", messages }),
});
if (!res.ok) {
  console.error("grade failed", res.status, await res.text());
  process.exit(1);
}
const report = await res.json();
writeFileSync("lib/example-report.json", JSON.stringify(report, null, 2) + "\n");
console.log(
  `wrote lib/example-report.json — grade ${report.scores.grade} (${report.scores.total}/100), ` +
    `${report.narrative.missed.length} missed, ${report.narrative.worst.length} worst, ` +
    `${report.narrative.drills.length} drills`,
);
console.log("verdict:", report.narrative.verdict);
