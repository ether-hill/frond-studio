import type { Project } from "@/content/projects/_types";
import Media from "./Media";

const TONES = {
  before: { tint: "rgba(196, 96, 74, 0.9)", chip: "rgba(196, 96, 74, 0.14)", border: "rgba(196, 96, 74, 0.32)" },
  after: { tint: "rgba(108, 176, 150, 0.95)", chip: "rgba(108, 176, 150, 0.14)", border: "rgba(108, 176, 150, 0.32)" },
};

function Column({
  kind,
  data,
}: {
  kind: "before" | "after";
  data: { image: Project["before"]["image"]; points: string[] };
}) {
  const tone = TONES[kind];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(20px,3vh,30px)" }}>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: tone.tint,
        }}
      >
        {kind === "before" ? "Before" : "After"}
      </div>
      <Media slot={data.image} />
      <ul style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {data.points.map((p) => (
          <li
            key={p}
            style={{
              listStyle: "none",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--fg)",
              background: tone.chip,
              border: `1px solid ${tone.border}`,
              borderRadius: 999,
              padding: "7px 14px",
            }}
          >
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function BeforeAfter({ project }: { project: Project }) {
  return (
    <section data-rvs className="cs-before-after" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(28px,4vw,64px)" }}>
      <Column kind="before" data={project.before} />
      <Column kind="after" data={project.after} />
    </section>
  );
}
