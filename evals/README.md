# Eval harness

Grading regression suite (docs/SPEC.md §7). Implemented in **Phase 3**.

Five fixture transcripts run through the full grading pipeline before every
prompt change. Assertions are **tolerance-based** — ordering, score bands, and
flag presence — never exact-equality on a numeric score (classifier temp-0 is
more deterministic, not perfectly so).

- `fixtures/` — the five transcripts (textbook-good, deliberately-terrible,
  mixed, jailbreak, three-then-quit), authored against the `dana-payouts` preset.
- `*.eval.ts` — the runner. Asserts fixture 1 > 3 > 2, fixture 2 has
  ≥2 `FALSE_SIGNAL_FOLLOWUP`, fixture 4 completes with `JAILBREAK_ATTEMPT`
  flagged, fixture 5 trips the gate.

Run with `npm run eval`. Must be green twice in a row before shipping any
prompt change (CLAUDE.md rule 8).
