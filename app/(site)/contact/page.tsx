import type { Metadata } from "next";
import RevealRoot from "@/components/RevealRoot";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact — Frond Studio",
  description: "Let's connect. Tell us about what you're building.",
};

export default function ContactPage() {
  return (
    <RevealRoot>
      <section className="page-gutter" style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "var(--pad-top) var(--gutter) var(--pad-bottom)" }}>
        <div
          className="contact-grid"
          style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: "clamp(44px,6vw,96px)", alignItems: "start" }}
        >
          {/* Left */}
          <div>
            <div
              data-rv
              style={{
                display: "flex",
                alignItems: "center",
                gap: 13,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.26em",
                textTransform: "uppercase",
                color: "var(--fg-dim)",
                marginBottom: "clamp(20px,3vh,30px)",
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)" }} />
              Contact — Worldwide
            </div>

            <h1 style={{ fontFamily: "var(--font-display), sans-serif", fontWeight: 600, fontSize: "clamp(52px,9vw,128px)", lineHeight: 0.92, letterSpacing: "-0.035em" }}>
              <span className="mask-line">
                <span style={{ transitionDelay: "0.05s" }}>Let&apos;s</span>
              </span>
              <span className="mask-line">
                <span style={{ transitionDelay: "0.13s" }}>connect.</span>
              </span>
            </h1>

            <p data-rv style={{ transitionDelay: "0.2s", maxWidth: 460, marginTop: "clamp(22px,3vh,38px)", fontSize: "clamp(16px,1.35vw,19px)", lineHeight: 1.55, color: "var(--fg-dim)" }}>
              Fill out the form and we&apos;ll get back to you — we look forward to hearing about what you&apos;re building.
            </p>
          </div>

          {/* Right — form */}
          <div data-rv style={{ transitionDelay: "0.22s" }}>
            <ContactForm />
          </div>
        </div>
      </section>
    </RevealRoot>
  );
}
