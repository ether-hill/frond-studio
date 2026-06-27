import Link from "next/link";
import { NAV_LINKS } from "@/lib/site";
import CurrentYear from "./CurrentYear";
import NewsletterSignup from "./NewsletterSignup";
import Wordmark from "./Wordmark";

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
            <div style={{ marginBottom: 18 }}>
              <Wordmark size={27} link={false} />
            </div>
            <p style={{ color: "var(--fg-dim)", fontSize: "var(--text-lead)", lineHeight: 1.5, maxWidth: "34ch" }}>
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
            {label("News & updates")}
            <p style={{ color: "var(--fg-dim)", fontSize: "var(--text-body)", lineHeight: 1.55, maxWidth: "30ch", marginBottom: 20 }}>
              Sign up for news and fun updates from the studio.
            </p>
            <NewsletterSignup />
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
          <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
            <Link className="linku" href="/design-system" style={{ color: "var(--fg-faint)" }}>
              Design system
            </Link>
            <a className="linku" href="#" style={{ color: "var(--fg-faint)" }}>
              Terms
            </a>
            <a className="linku" href="#" style={{ color: "var(--fg-faint)" }}>
              Privacy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
