import type { Project } from "@/content/projects/_types";

export default function Quote({ quote }: { quote: NonNullable<Project["quote"]> }) {
  return (
    <section data-rvs style={{ maxWidth: "min(900px, 100%)", marginInline: "auto", textAlign: "center" }}>
      <blockquote style={{ margin: 0 }}>
        <p style={{ fontFamily: "var(--font-display), sans-serif", fontSize: "var(--text-title)", fontWeight: 400, lineHeight: 1.18, letterSpacing: "-0.02em", color: "var(--fg)" }}>
          &ldquo;{quote.body}&rdquo;
        </p>
        <footer style={{ marginTop: "clamp(20px,3vh,30px)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--fg-faint)" }}>
          {quote.author}
          {quote.role ? <> &middot; {quote.role}</> : null}
        </footer>
      </blockquote>
    </section>
  );
}
