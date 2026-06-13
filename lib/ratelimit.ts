import "server-only";

/**
 * Rate limiting + abuse caps (Phase 6). Uses Upstash Redis when
 * UPSTASH_REDIS_REST_URL is set, otherwise an in-memory best-effort fallback
 * (CLAUDE.md stack note). Enforces per-IP daily session caps AND a global daily
 * call breaker (rule 6) — the latter is what stops a distributed spike the
 * per-IP cap cannot.
 *
 * Implemented in Phase 6; signatures fixed now.
 */

export interface RateLimitResult {
  allowed: boolean;
  /** Machine-readable reason when blocked, for the right error copy. */
  reason?: "per_ip_daily" | "global_daily" | "too_many_requests";
  /** Seconds until the limit resets, when known. */
  retryAfter?: number;
}

/** Check (and consume) a unit against the per-IP and global limits. */
export async function checkRateLimit(_ip: string): Promise<RateLimitResult> {
  throw new Error("Not implemented (Phase 6)");
}
