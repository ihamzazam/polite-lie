"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ScenarioBrief } from "@/lib/types";
import InterviewRoom from "../[id]/InterviewRoom";

const STORAGE_KEY = "polite-lie:customScenario";

interface CustomData {
  scenario: string;
  brief: ScenarioBrief;
  fallback?: boolean;
  notice?: string;
}

type State =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "ready"; data: CustomData };

export default function CustomInterviewPage() {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let next: State = { kind: "missing" };
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) next = { kind: "ready", data: JSON.parse(raw) as CustomData };
    } catch {
      next = { kind: "missing" };
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot mount read
    setState(next);
  }, []);

  useEffect(() => {
    if (state.kind === "missing") router.replace("/custom");
  }, [state.kind, router]);

  if (state.kind !== "ready") {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6 text-ink-500">
        <p>Setting up your interview…</p>
      </main>
    );
  }

  return <InterviewRoom brief={state.data.brief} scenario={state.data.scenario} />;
}
