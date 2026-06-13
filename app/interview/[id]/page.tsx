import { notFound } from "next/navigation";
import { getPreset, toScenarioBrief } from "@/lib/presets";
import InterviewRoom from "./InterviewRoom";

/**
 * Interview page. Server component: loads the fact sheet server-side and passes
 * ONLY the public-safe brief into the client room (CLAUDE.md rule 1). The chat
 * loop and all LLM calls live behind /api/interview.
 */
export default async function InterviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sheet = getPreset(id);
  if (!sheet) notFound();

  return <InterviewRoom brief={toScenarioBrief(sheet)} />;
}
