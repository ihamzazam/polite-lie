/**
 * Thin, dependency-free wrapper around Novus/Pendo analytics.
 *
 * Novus installs a global tracker via the instrumentation PR; until that lands
 * (and in any environment where it's absent) every call degrades to a no-op,
 * with a dev-only console trace so we can see events firing locally. The named
 * event set is fixed in CLAUDE.md — shippedness (25%) is measured from this
 * data, so the names must stay stable.
 *
 * Isomorphic on purpose: importable from both client components and server
 * routes. No "server-only" here.
 */

export type AnalyticsEvent =
  | "example_report_viewed"
  | "scenario_selected"
  | "interview_started"
  | "question_sent"
  | "gate_triggered"
  | "interview_completed"
  | "report_viewed"
  | "share_clicked";

export type AnalyticsProps = Record<string, string | number | boolean | undefined>;

type Tracker = (event: string, props?: AnalyticsProps) => void;

function resolveTracker(): Tracker | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    novus?: { track?: Tracker };
    pendo?: { track?: Tracker };
  };
  if (typeof w.novus?.track === "function") return w.novus.track.bind(w.novus);
  if (typeof w.pendo?.track === "function") return w.pendo.track.bind(w.pendo);
  return null;
}

export function track(event: AnalyticsEvent, props?: AnalyticsProps): void {
  try {
    const tracker = resolveTracker();
    if (tracker) {
      tracker(event, props);
    } else if (process.env.NODE_ENV !== "production") {
      console.debug("[analytics]", event, props ?? {});
    }
  } catch {
    // Analytics must never break a user flow.
  }
}
