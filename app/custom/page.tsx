"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { track } from "@/lib/analytics";

const STORAGE_KEY = "polite-lie:customScenario";

export default function CustomPage() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = idea.trim().length >= 10 && target.trim().length >= 3;

  async function generate() {
    if (!ready || loading) return;
    setLoading(true);
    setError(null);
    track("scenario_selected", { scenario: "custom" });
    try {
      const res = await fetch("/api/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: idea.trim(), targetCustomer: target.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Something went wrong. Try again.");
        setLoading(false);
        return;
      }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      router.push("/interview/custom");
    } catch {
      setError("Network hiccup — try again.");
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <div className="flex gap-1.5">
          <span className="size-2 animate-bounce rounded-full bg-accent [animation-delay:-0.3s]" />
          <span className="size-2 animate-bounce rounded-full bg-accent [animation-delay:-0.15s]" />
          <span className="size-2 animate-bounce rounded-full bg-accent" />
        </div>
        <p className="mt-5 font-serif text-xl text-ink-100">Building your customer…</p>
        <p className="mt-2 max-w-sm text-sm text-ink-400">
          Inventing a real person with a hidden agenda — pains, budget, politics,
          and at least one inconvenient truth.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-6 py-16">
      <Link
        href="/"
        className="text-xs text-ink-500 underline-offset-4 hover:text-ink-300 hover:underline"
      >
        ← Polite Lie
      </Link>
      <h1 className="mt-4 font-serif text-4xl text-ink-50">Interview your own customer</h1>
      <p className="mt-3 text-ink-300">
        Describe what you&apos;re thinking of building and who you&apos;d talk to.
        We&apos;ll invent a realistic customer with a hidden fact sheet — and the
        persona won&apos;t know your idea exists, so pitching is always your choice
        (and always a mistake).
      </p>

      <form
        className="mt-8 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void generate();
        }}
      >
        <div>
          <label htmlFor="idea" className="text-sm font-medium text-ink-200">
            Your idea
          </label>
          <textarea
            id="idea"
            value={idea}
            onChange={(e) => setIdea(e.target.value.slice(0, 2000))}
            rows={3}
            placeholder="e.g. A tool that auto-drafts release notes from merged pull requests for busy eng managers."
            className="mt-2 w-full resize-none rounded-xl border border-ink-700 bg-ink-900 px-4 py-3 text-sm text-ink-100 placeholder:text-ink-500 focus:border-accent-dim focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="target" className="text-sm font-medium text-ink-200">
            Who would you interview?
          </label>
          <textarea
            id="target"
            value={target}
            onChange={(e) => setTarget(e.target.value.slice(0, 1000))}
            rows={2}
            placeholder="e.g. An engineering manager at a 200-person B2B SaaS company."
            className="mt-2 w-full resize-none rounded-xl border border-ink-700 bg-ink-900 px-4 py-3 text-sm text-ink-100 placeholder:text-ink-500 focus:border-accent-dim focus:outline-none"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!ready}
          className="w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-ink-950 transition hover:bg-accent-bright disabled:cursor-not-allowed disabled:opacity-40"
        >
          Build my customer
        </button>
        <p className="text-center text-xs text-ink-500">
          Takes a few seconds. Your customer is single-use and never stored.
        </p>
      </form>
    </main>
  );
}
