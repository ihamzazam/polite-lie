/**
 * Pendo / Novus analytics agent, injected as a global by the install snippet in
 * app/layout.tsx. Typed minimally so app/pendo.tsx and lib/analytics.ts can use
 * it without `any`. The agent's stub defines these methods synchronously, so
 * they're safe to call before the remote script finishes loading.
 */
interface PendoAgent {
  initialize: (options: {
    visitor?: Record<string, unknown>;
    account?: Record<string, unknown>;
  }) => void;
  track?: (event: string, properties?: Record<string, unknown>) => void;
  [key: string]: unknown;
}

declare global {
  var pendo: PendoAgent;
}

export {};
