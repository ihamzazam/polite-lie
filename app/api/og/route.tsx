import { ImageResponse } from "next/og";

/**
 * Share card (1200x630). Renders the grade, score, and one savage highlight
 * line over the product's ink palette. Pulled in by the report page's OG meta
 * for shared links (BUILD_PLAN Phase 4).
 */
export const runtime = "edge";

const GRADE_COLOR: Record<string, string> = {
  A: "#34d399",
  B: "#eec273",
  C: "#d6a043",
  D: "#fb923c",
  F: "#f87171",
};

export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const grade = (searchParams.get("grade") ?? "B").slice(0, 1).toUpperCase();
  const score = searchParams.get("score") ?? "74";
  const line =
    searchParams.get("line")?.slice(0, 140) ??
    "Practice customer interviews against a user who lies politely.";
  const gradeColor = GRADE_COLOR[grade] ?? "#d6a043";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#09090b",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            color: "#d6a043",
            fontSize: 26,
            letterSpacing: 8,
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          Polite Lie
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 36 }}>
          <div style={{ color: gradeColor, fontSize: 240, fontWeight: 800, lineHeight: 1 }}>
            {grade}
          </div>
          <div style={{ display: "flex", color: "#d4d4dc", fontSize: 64, fontWeight: 700, paddingBottom: 28 }}>
            {score}
            <span style={{ color: "#84848e" }}>/100</span>
          </div>
        </div>

        <div style={{ color: "#f5f5f7", fontSize: 40, lineHeight: 1.3, fontWeight: 500, maxWidth: 980 }}>
          {line}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", color: "#84848e", fontSize: 26 }}>
          <span>The AI customer who agrees with everything and means none of it.</span>
          <span style={{ color: "#aeaeb8" }}>polite-lie.vercel.app</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
