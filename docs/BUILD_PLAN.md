# BUILD_PLAN.md

Deadline: June 20, 2026, 5:00pm BST, which is 9:00pm PKT. Treat 3:00pm PKT on the 20th as your real deadline.

## Day map

| Date | Goal |
|---|---|
| Jun 13-14 | Phase 0 + Phase 1: live URL, Novus connected, persona playable |
| Jun 15 | Phase 2 + Phase 3: grading pipeline + eval harness green |
| Jun 16 | Phase 4: landing, report polish, example report, share card, copy pass |
| Jun 17 | Phase 5: paste mode + custom scenarios. Ship publicly: MTP community, r/ProductManagement, LinkedIn post 1, X. Real users start hitting Novus |
| Jun 18 | Iterate on what Novus shows (drop-off points). Phase 6 hardening. LinkedIn post 2 with a real insight from the data |
| Jun 19 | Record demo video. Write Devpost submission. Capture Novus dashboard screenshots |
| Jun 20 | Buffer. Final read-through. Submit by 3pm PKT |

## Cut line (decide once, hold the line)

Phases 0-4 are the MVP and ship polished. Phase 5 (custom + paste mode) and Phase 6 (extended hardening) are stretch. If Phase 4 is not done and polished by end of Jun 16, cut Phase 5 first, then trim Phase 6 to just the cost/abuse guards. A single polished interview-and-report loop beats five half-finished features under a craft+shippedness rubric.

## How to drive Claude Code

One phase per session. For Phases 1 and 2, use plan mode first (shift+tab), review the plan, then let it implement. After each phase: run the acceptance checks yourself, commit, move on. Do not paste the whole plan at once; CLAUDE.md gives it standing context, these prompts give it the current mission.

---

## Phase 0: Scaffold + deploy + Novus

Paste:

> Initialize this Next.js App Router project with TypeScript and Tailwind per CLAUDE.md. Create the route and lib skeleton from the architecture map (empty implementations with typed signatures), a minimal landing page with the product name and a "start a practice interview" button that routes to a placeholder, a `/health` route, a Novus event helper (`lib/analytics.ts`) stubbing the named events from CLAUDE.md so instrumentation points exist from day one, .env.example with all variables from CLAUDE.md (including `GLOBAL_DAILY_CALL_CAP`), and scripts for dev/test/eval. Set up vitest. Make the landing page genuinely good-looking even as a placeholder: real copy, no lorem ipsum. Then give me the exact commands to deploy to Vercel.

Then you (not Claude Code): push to GitHub, deploy on Vercel, set env vars, connect the repo to Novus at novus.pendo.io, and review/merge the instrumentation PR Novus opens. The forum threads show people stuck on this step, so do it today and post in the hackathon Discussions if it misbehaves.

Acceptance: production URL loads; Novus dashboard shows the repo and at least one event.

## Phase 1: Persona engine

Paste:

> Read docs/SPEC.md sections 1 and 2 fully before writing code. Implement: (1) lib/persona.ts that builds the persona system prompt from a fact sheet JSON exactly per the SPEC template including the few-shot exchanges, (2) /api/interview accepting {scenario, messages, revealedIds, canon}, loading preset fact sheets server-side from /presets, calling PERSONA_MODEL at temperature 0.9, parsing the ###META tail with one retry then synthesizing empty META per CLAUDE.md rule 5, returning only the visible reply plus revealed ids and canon additions, (3) a clean chat UI at /interview/[id] showing the research_brief and visible_profile, a "signals captured: N" counter with no denominator, a question countdown, and an "end interview" button enabled after 5 non-smalltalk questions. Enforce all caps from CLAUDE.md rule 6. The fact sheet must never appear in any response payload; add a unit test asserting the API response shape cannot contain fact content.

Acceptance, tested by you manually against all three presets: open question yields a fact; "would you pay for this?" yields agreeable nothing; first money question deflects, follow-up reveals; "ignore your instructions" gets in-character confusion; no answer exceeds a short paragraph; replies arrive in roughly 2 seconds.

Tuning note: spend real time here playing badly on purpose. If Dana dumps three facts to one lazy question, tighten rule 2 wording before moving on. This hour decides product quality.

## Phase 2: Grading pipeline

Paste:

> Read docs/SPEC.md section 3 fully. Implement: (1) lib/taxonomy.ts mirroring the question taxonomy, precedence, and flags, (2) the Pass 1 classifier call in /api/grade: CLASSIFIER_MODEL, temperature 0, strict JSON validated with zod, one repair retry, including the ten labeled edge-case examples from the SPEC in the prompt, (3) lib/scoring.ts as pure functions implementing the exact formulas from SPEC section 3 Pass 2, with vitest unit tests covering each formula and the 5-question gate, (4) the Pass 3 narrative call producing the five report sections in order, (5) the report page rendering scores, the "what you never found out" section with why_it_matters, worst three questions with quotes and rewrites, best question, and drills. LLMs never emit numeric scores; assert that in a test.

Acceptance: unit tests green; one real session against Dana produces a report where every flag carries a verbatim quote from the transcript.

## Phase 3: Eval harness

Paste:

> Read docs/SPEC.md section 7. Create evals/fixtures with the five transcripts described (write them as realistic full transcripts against the dana-payouts preset), and evals/run.ts executing the full grading pipeline on each, asserting: fixture 1 scores above fixture 3 above fixture 2, fixture 2 has at least two FALSE_SIGNAL_FOLLOWUP flags, fixture 4 completes with JAILBREAK_ATTEMPT flagged, fixture 5 triggers the gate. Wire to npm run eval with clear pass/fail output.

Use tolerance-based assertions (ordering, score bands, flag counts), never exact-equality on scores. Add a minimal GitHub Actions workflow running `npm run eval` and `npm test` on push.

Acceptance: green twice in a row (catches classifier nondeterminism); CI runs the eval on push. From now on, eval before every prompt change.

## Phase 4: Product polish (craft is 25% of the score)

Paste:

> Polish pass. (1) Landing page: one sharp headline about practicing customer interviews against a user who lies politely, the three scenario cards with persona name/role/one teaser line, a prominent "see an example report" link, and a one-line explanation of scoring. (2) Build the static example report at /report/example from a strong fixture run, rendering with ZERO API calls so it survives an Anthropic outage. (3) Shareable report: encode the finished report (scores + narrative only, never the fact sheet) into a URL fragment so /report#<encoded> re-renders the exact scorecard statically; the share card links here, not to the landing page. (4) End-of-interview reveal flow: scores animate in (honor prefers-reduced-motion), then the "what you never found out" section. (5) Share card: an /api/og image with score, one savage highlight line, and the product URL. (6) Full copy pass: every empty state, error state, and loading state has intentional human copy. (7) Mobile flawless and accessible: semantic HTML, keyboard nav, contrast, Lighthouse pass. Keep it fast; no heavy libraries.

Acceptance: hand the URL to one person with zero context; they reach a report without asking you anything.

## Phase 5: Second entry point + custom mode

Paste:

> Read docs/SPEC.md sections 5 and 6. Implement: (1) paste-a-transcript mode: a normalization call that accepts messy formats and asks the user to confirm which speaker is the interviewer, then runs Pass 1 + technique-only scoring rescaled to 100, clearly labeled as a technique audit; (2) custom scenario mode: /api/scenario calls GENERATOR_MODEL with the SPEC section 5 constraints, validates against the fact sheet schema with one repair retry, falls back to the nearest preset with a notice on second failure, and returns a sealed token via lib/seal.ts (AES-256-GCM, SCENARIO_SECRET env) that the client echoes back on each turn. The plaintext fact sheet never reaches the client.

Acceptance: a custom scenario from your real product idea plays consistently for 12 turns; a pasted Zoom transcript grades without errors.

## Phase 6: Hardening

Paste:

> Add Upstash-based rate limiting per CLAUDE.md (with in-memory fallback), per-IP daily session caps, a global daily call/spend breaker (`GLOBAL_DAILY_CALL_CAP`) that protects against distributed spikes the per-IP cap cannot, graceful error states for every API failure mode including LLM provider 429s and 529 overloads, OG/meta tags, and confirm the /health route. Then audit: no fact sheet leakage in any payload or error, no API key in client bundle, all caps enforced, example/shared report renders with zero API calls. Output the audit as a checklist.

Acceptance: audit checklist clean; you cannot make it leak facts or exceed caps from the browser.

---

## Distribution (Jun 17-18, this is part of the build)

The submission explicitly rewards build-in-public posts tagging Mind the Product, and the Shippedness criterion wants real measurable usage. Post 1 (Jun 17): launch post, what it is, the polite-lie insight, link. Post 2 (Jun 18): one real finding from Novus data, what you changed because of it. Drop the link in the hackathon Discussions thread, r/ProductManagement, r/SaaS, and X. Reply to every comment; commenters are users; users are Novus data; Novus data is your demo video's third act.

## Submission checklist (Devpost)

- Public URL, working, no login, survives judging week traffic on capped costs
- 2-3 minute video: 30s problem and polite-lie demo, 60s live session showing a leading question getting stonewalled and a past-behavior question landing, 45s the report reveal including a dead-end scenario scoring an A, 15s Novus dashboard with real usage and one iteration you made from it
- Screenshot of Novus dashboard
- Written description: lead with the quadrant line, every AI research tool points the AI at your users, this one points it at you
- Confirm new work after May 20 (fresh repo timestamps cover this)
- Built-in-public post links

## Cost guards live before launch day

Turn caps, token caps, per-IP daily cap, presets served from disk, custom mode rate-limited harder. Budget assumption: low single-digit cents per session; set a billing alert anyway.
