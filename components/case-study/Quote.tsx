import type { Project } from "@/content/projects/_types";

export default function Quote({ quote }: { quote: NonNullable<Project["quote"]> }) {
  return (
    <section data-rvs style={{ maxWidth: "22ch", marginInline: "auto", textAlign: "center" }}>
      <blockquote style={{ margin: 0 }}>
        <p style={{ fontFamily: "var(--font-display), sans-serif", fontSize: "clamp(26px,3.6vw,52px)", fontWeight: 400, lineHeight: 1.18, letterSpacing: "-0.02em", color: "var(--fg)" }}>
          &ldquo;{quote.body}&rdquo;
        </p>
        <footer style={{ marginTop: "clamp(20px,3vh,30px)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--fg-faint)" }}>
          {quote.author} &middot; {quote.role}
        </footer>
      </blockquote>
    </section>
  );
}
