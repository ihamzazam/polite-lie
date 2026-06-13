# CLAUDE.md

## What this is

A discovery-interview training simulator. The user interviews a synthetic customer (LLM persona with a hidden fact sheet) and gets a graded report on their interviewing technique. Built solo in ~6 days for the Mind the Product "Everyone Ships Now" hackathon (Devpost, deadline June 20, 2026, 5pm BST). Judging is 25% each: product thinking, craft/execution, originality, shippedness.

Full product spec: `docs/SPEC.md`. Phase plan and acceptance criteria: `docs/BUILD_PLAN.md`. Read the relevant SPEC section before implementing each phase; do not improvise persona or grading behavior that contradicts it.

## Stack (decided, do not relitigate)

- Next.js (App Router) + TypeScript + Tailwind, deployed on Vercel
- Anthropic API for all LLM calls, server-side only
- No database. Server is stateless. Custom scenarios use the sealed-token pattern (below)
- No auth, no signup
- Rate limiting: Upstash Redis ratelimit if `UPSTASH_REDIS_REST_URL` is set, otherwise in-memory best-effort fallback
- Non-streaming persona replies in MVP (replies are 1-3 sentences; latency is fine)

## Models (env-configured, defaults below)

```
PERSONA_MODEL=claude-haiku-4-5-20251001     # cheap, fast, temperature 0.9
CLASSIFIER_MODEL=claude-sonnet-4-6          # temperature 0, strict JSON
NARRATIVE_MODEL=claude-sonnet-4-6
GENERATOR_MODEL=claude-sonnet-4-6           # custom scenarios only
```

## Architecture map

```
app/
  page.tsx                 landing: scenario picker, example report link
  interview/[id]/page.tsx  chat UI
  report/page.tsx          scorecard render (client-held report JSON)
  api/interview/route.ts   persona turn: validates, injects fact sheet, calls LLM, parses ###META
  api/grade/route.ts       pass 1 classify -> pass 2 score (code) -> pass 3 narrative
  api/scenario/route.ts    custom mode: generate fact sheet, return sealed token
lib/
  persona.ts               system prompt builder, META parse + one retry
  taxonomy.ts              question types, precedence, flags (mirror SPEC section 3)
  scoring.ts               PURE functions, no LLM, unit-tested (formulas in SPEC 3)
  seal.ts                  AES-256-GCM encrypt/decrypt of scenario JSON with SCENARIO_SECRET
  ratelimit.ts
presets/                   hand-authored fact sheets; load server-side only
evals/
  fixtures/                5 transcripts (SPEC section 7)
  run.ts                   `npm run eval` asserts score ordering + flags
```

## Hard rules

1. The fact sheet NEVER reaches the client. Not in props, not in API responses, not in errors, not in the sealed token in plaintext. Client may hold: scenario id or sealed token (ciphertext), transcript, revealed fact IDs (ids only, e.g. "F3"), canon strings the persona already said or implied.
2. API keys server-side only. Never expose in client bundles.
3. Scores are computed in `lib/scoring.ts` as arithmetic over Pass 1 classifications. The LLM never outputs a numeric score.
4. Classifier and generator calls: temperature 0, strict JSON, validated with zod, one repair retry, then graceful failure (fall back to preset / show retry UI).
5. Persona turn: if `###META` is missing or invalid after one retry, synthesize `{facts_revealed:[],canon_additions:[],polite_lie:false,complimented:false}` and continue. Never show META or raw errors to the user.
6. Caps everywhere: 14 user turns max per session, max_tokens on every call, 600-char limit per user message, per-IP daily session cap (default 15), and a global daily call/spend breaker (a hard ceiling across all IPs, default env `GLOBAL_DAILY_CALL_CAP`) so a distributed spike or viral moment cannot run up the bill during judging week. The per-IP cap alone does not stop a distributed spike.
7. Stateless API: every /api/interview call receives `{scenario: id|sealedToken, messages, revealedIds, canon}` and rebuilds context server-side.
8. Before changing any prompt in `lib/`, run `npm run eval`. A prompt change that breaks fixture ordering does not ship.
9. Commit small and often with descriptive messages (Novus watches this repo; commit activity is part of the demo story). Conventional commits style.
10. Design bar is high (25% of judging is craft): intentional copy, generous whitespace, fast loads, flawless mobile, accessible (semantic HTML, keyboard nav, sufficient contrast, `prefers-reduced-motion` honored on the score animation). No default-Tailwind-template look. No lorem ipsum anywhere, ever.
11. The example report at `/report/example` and any shared report view must render with ZERO API calls — fully static or rebuilt from encoded data in the URL. The core demo (landing -> example report) must survive an Anthropic outage during judging. The fact sheet is never part of that encoded data.

## Commands

```
npm run dev
npm run eval        # grading regression harness, must be green before prompt changes
npm run test        # scoring.ts unit tests
npm run build
```

## Phasing and cut line

Phases 0-4 (scaffold, persona, grading, eval, polish) are the non-negotiable MVP and must be polished. Phases 5 (custom + paste mode) and 6 (extended hardening) are stretch and get cut the moment the schedule slips — shippedness and craft reward one polished thing over five rough ones. The minimum cost/abuse guards (rule 6 caps + global breaker) ship regardless, before launch.

## Novus instrumentation (shippedness is 25%; the data is the Day-18 post and the video's third act)

Fire these named events (server- or client-side as appropriate): `example_report_viewed`, `scenario_selected`, `interview_started`, `question_sent` (include classified type when known), `gate_triggered`, `interview_completed`, `report_viewed`, `share_clicked`. "Install Novus" is not enough on its own — without these events there is no real finding to post or demo.

## Out of scope for MVP (do not build unless asked)

Voice mode, accounts, payments, persistence of past sessions, difficulty levels beyond "realistic", team features, i18n.
