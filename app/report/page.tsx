import type { Metadata } from "next";
import ReportClient from "./ReportClient";

/**
 * Report page. The full report rides in the URL fragment (client-only, zero
 * API calls); a shared link also carries grade/score/line in the query string
 * so social unfurls get a rich card via /api/og. The fragment is invisible to
 * the server, which is exactly why the OG bits live in the query.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const grade = typeof sp.g === "string" ? sp.g : undefined;
  const score = typeof sp.s === "string" ? sp.s : undefined;
  const line = typeof sp.l === "string" ? sp.l : undefined;

  if (grade && score) {
    const og =
      `/api/og?grade=${encodeURIComponent(grade)}&score=${encodeURIComponent(score)}` +
      (line ? `&line=${encodeURIComponent(line)}` : "");
    return {
      title: `Graded ${grade} on interview technique`,
      description: line ?? "Practice customer interviews against a user who lies politely.",
      openGraph: {
        title: `I scored ${score}/100 (${grade}) on Polite Lie`,
        description: line ?? "Practice customer interviews against a user who lies politely.",
        images: [og],
      },
      twitter: { card: "summary_large_image", images: [og] },
    };
  }
  return { title: "Your report" };
}

export default function ReportPage() {
  return <ReportClient />;
}
