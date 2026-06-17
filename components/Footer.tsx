import Link from "next/link";
import { NAV_LINKS } from "@/lib/site";
import CurrentYear from "./CurrentYear";
import FooterBlurb from "./FooterBlurb";

const label = (text: string) => (
  <div
    style={{
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: "var(--fg-faint)",
      marginBottom: 18,
    }}
  >
    {text}
  </div>
);

export default function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--line)", background: "var(--bg-1)" }}>
      <div
        className="page-gutter"
        style={{
          maxWidth: "var(--maxw)",
          margin: "0 auto",
          padding: "clamp(64px,9vh,110px) var(--gutter) clamp(40px,5vh,56px)",
        }}
      >
        <FooterBlurb />

        <div
          className="footer-grid"
          data-stag
          style={{
            display: "grid",
            gridTemplateColumns: "1.6fr 1fr 1.4fr",
            gap: 40,
            alignItems: "start",
          }}
        >
          <div>
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1, gap: 4, marginBottom: 18 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 27, fontWeight: 400, letterSpacing: "0.005em" }}>
                Frond
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.44em",
                  textTransform: "uppercase",
                  color: "var(--fg-dim)",
                  paddingLeft: 1,
                }}
              >
                Studio
              </span>
            </div>
            <p style={{ color: "var(--fg-dim)", fontSize: 15, lineHeight: 1.55, maxWidth: "34ch" }}>
              A transdisciplinary design &amp; technology studio working remotely worldwide.
            </p>
          </div>

          <div>
            {label("Navigate")}
            <ul style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 15 }}>
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <Link className="linku" href={l.href} style={{ color: "var(--fg-dim)" }}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            {label("Start a project")}
            <p style={{ color: "var(--fg-dim)", fontSize: 15, lineHeight: 1.55, maxWidth: "30ch", marginBottom: 20 }}>
              Tell us what you&apos;re building — we&apos;d love to hear about it.
            </p>
            <Link
              href="/contact"
              className="pill pill-ghost"
              style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", padding: "10px 18px" }}
            >
              Get in touch
            </Link>
          </div>
        </div>

        <div
          style={{
            marginTop: "clamp(48px,7vh,80px)",
            paddingTop: 22,
            borderTop: "1px solid var(--line)",
            display: "flex",
            flexWrap: "wrap",
            gap: "14px 28px",
            justifyContent: "space-between",
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--fg-faint)",
          }}
        >
          <span>© <CurrentYear /> Frond Studio</span>
          <div style={{ display: "flex", gap: 24 }}>
            <a className="linku" href="#" style={{ color: "var(--fg-faint)" }}>
              Terms
            </a>
            <a className="linku" href="#" style={{ color: "var(--fg-faint)" }}>
              Privacy
            </a>
          </div>
          <span>Working remotely worldwide</span>
        </div>
      </div>
    </footer>
  );
}
