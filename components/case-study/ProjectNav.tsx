import Link from "next/link";
import type { Project } from "@/content/projects/_types";

function NavLink({ link, dir }: { link: { slug: string; title: string }; dir: "prev" | "next" }) {
  const isNext = dir === "next";
  return (
    <Link
      href={`/work/${link.slug}`}
      className="linku"
      style={{ color: "var(--fg-dim)", display: "flex", flexDirection: "column", gap: 6, textAlign: isNext ? "right" : "left", marginLeft: isNext ? "auto" : undefined }}
    >
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--fg-faint)" }}>
        {isNext ? "Next →" : "← Previous"}
      </span>
      <span style={{ fontFamily: "var(--font-display), sans-serif", fontSize: "var(--text-subtitle)", color: "var(--fg)" }}>{link.title}</span>
    </Link>
  );
}

export default function ProjectNav({ prev, next }: { prev?: Project["prev"]; next?: Project["next"] }) {
  if (!prev && !next) return null;
  return (
    <nav style={{ borderTop: "1px solid var(--line)", background: "var(--bg-1)" }}>
      <div className="page-gutter" style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "clamp(40px,6vh,72px) var(--gutter)", display: "flex", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
        {prev ? <NavLink link={prev} dir="prev" /> : <span />}
        {next ? <NavLink link={next} dir="next" /> : <span />}
      </div>
    </nav>
  );
}
