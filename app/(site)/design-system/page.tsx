import type { Metadata } from "next";
import RevealRoot from "@/components/RevealRoot";
import PageHeader from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Design System · Frond Studio",
  description:
    "The Frond Studio design system: tokens, typography, components and the guidelines (tone of voice, design ethos) that keep everything consistent.",
};

/* ── reference data ─────────────────────────────────────────────────────── */

const COLORS = [
  { name: "bg-0", role: "Base background", dark: "#0b0a08", light: "#f3efe6" },
  { name: "bg-1", role: "Raised / band", dark: "#100e0b", light: "#ebe6da" },
  { name: "bg-2", role: "Hover / inset", dark: "#16130f", light: "#e3ddce" },
  { name: "fg", role: "Primary text", dark: "#f1ede5", light: "#171410" },
  { name: "fg-dim", role: "Secondary text", dark: "#a39d92", light: "#5b554b" },
  { name: "fg-faint", role: "Tertiary / micro", dark: "#8a8479", light: "#67625a" },
  { name: "accent", role: "Accent / links", dark: "#d9c9b0", light: "#7a5f33" },
  { name: "line", role: "Borders / rules", dark: "13% fg", light: "16% fg" },
];

const TYPE = [
  { label: "Display / H1", cls: "clamp(52px,9vw,148px)", weight: 600, sample: "Natural selections" },
  { label: "Section / H2", cls: "clamp(34px,4.6vw,66px)", weight: 500, sample: "Capabilities" },
  { label: "Statement", cls: "clamp(26px,3.1vw,46px)", weight: 500, sample: "We borrow the patterns of living systems." },
  { label: "Lead", cls: "clamp(19px,1.7vw,27px)", weight: 400, sample: "The interesting problems don’t fit inside one discipline." },
  { label: "Body", cls: "clamp(15px,1.15vw,17px)", weight: 400, sample: "We work across design, engineering, strategy and AI as a single craft." },
];

const TOKENS = [
  { name: "--maxw", value: "1600px", note: "Max content width" },
  { name: "--gutter", value: "64px / 16px", note: "Page margin (desktop / ≤760px)" },
  { name: "--section-y", value: "clamp(72px, 11vh, 128px)", note: "Vertical rhythm between sections" },
  { name: "--pad-top", value: "clamp(130px, 18vh, 210px)", note: "First-section top (clears the nav)" },
  { name: "--content-edge", value: "max(gutter, …)", note: "Aligns absolute controls to the gutter" },
];

const ETHOS = [
  ["Transdisciplinary", "Design, engineering, strategy and AI as one craft, held whole, never passed down a line."],
  ["Biophilic", "We borrow the grammar of living systems: growth, networks, rhythm, adaptation. Things that grow and last."],
  ["Ethical & positive AI", "AI to amplify human craft, with consent and transparency, never to deceive or extract."],
  ["Nourishing, not extractive", "We choose work that gives more than it takes, for people, teams and the planet."],
  ["Restraint", "Quiet surfaces, few colours, generous space. Let the work breathe and the content lead."],
  ["Motion with intent", "Reveal on entry, gentle living backgrounds. Never decorative jitter, always honouring reduced-motion."],
];

const VOICE_DO = [
  "Plain-spoken and warm. Write like a thoughtful person, not a brand.",
  "Precise over clever. Short sentences, concrete nouns.",
  "Confident, not loud. No hype, no exclamation marks.",
  "Curious and generous about the work and the people.",
  "British-leaning spelling: colour, visualise, organise.",
];
const VOICE_DONT = [
  "Em dashes of any kind. They’re a dead giveaway for AI; reach for commas, colons or full stops.",
  "“We leverage cutting-edge synergies to disrupt the industry.”",
  "Buzzwords: revolutionary, world-class, seamless, unlock, supercharge.",
  "Shouting: ALL CAPS sentences, !!!, growth-hack urgency.",
];

/* ── small presentational helpers (server component, no client JS) ──────── */

function Section({ id, n, title, intro, children }: { id: string; n: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section id={id} data-rv style={{ borderTop: "1px solid var(--line)", paddingTop: "clamp(28px,4vh,48px)", marginTop: "clamp(52px,8vh,104px)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 500, color: "var(--fg-faint)" }}>{n}</span>
        <h2 style={{ fontFamily: "var(--font-display), sans-serif", fontSize: "clamp(20px,2.25vw,33px)", fontWeight: 500, letterSpacing: "-0.015em" }}>{title}</h2>
      </div>
      {intro ? <p style={{ maxWidth: "60ch", color: "var(--fg-dim)", fontSize: "clamp(15px,1.15vw,17px)", lineHeight: 1.6, marginBottom: "clamp(28px,4vh,40px)" }}>{intro}</p> : null}
      {children}
    </section>
  );
}

const cardStyle: React.CSSProperties = { border: "1px solid var(--line)", borderRadius: 10, padding: "clamp(20px,2.4vw,30px)", background: "var(--bg-1)" };
const monoLabel: React.CSSProperties = { fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-faint)" };

export default function DesignSystemPage() {
  return (
    <RevealRoot>
      <section className="page-gutter" style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "var(--pad-top) var(--gutter) var(--pad-bottom)" }}>
        <PageHeader
          compact
          title="Design System"
          intro="One source of truth for how the studio looks, moves and sounds. Everything on the site is wired to these tokens and classes. Change them here, change them everywhere."
          introSerif
        />

        {/* Design ethos */}
        <Section id="ethos" n="01" title="Design ethos" intro="The principles underneath every decision. They guide what we make and how it behaves, not just how it looks.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "clamp(18px,2vw,28px)" }}>
            {ETHOS.map(([t, d]) => (
              <div key={t} style={cardStyle}>
                <h3 style={{ fontFamily: "var(--font-display), sans-serif", fontSize: 20, fontWeight: 500, marginBottom: 10 }}>{t}</h3>
                <p style={{ color: "var(--fg-dim)", fontSize: 15, lineHeight: 1.55 }}>{d}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Tone of voice */}
        <Section id="voice" n="02" title="Tone of voice" intro="How we write, across headlines, body copy, micro-labels and email. Warm, precise, unhurried.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "clamp(18px,2vw,28px)" }}>
            <div style={cardStyle}>
              <div style={{ ...monoLabel, color: "var(--accent)", marginBottom: 16 }}>Do</div>
              <ul style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {VOICE_DO.map((v) => (
                  <li key={v} style={{ borderTop: "1px solid var(--line-2)", paddingTop: 12, fontSize: 15, lineHeight: 1.5, color: "var(--fg-dim)" }}>{v}</li>
                ))}
              </ul>
            </div>
            <div style={cardStyle}>
              <div style={{ ...monoLabel, marginBottom: 16 }}>Don’t</div>
              <ul style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {VOICE_DONT.map((v) => (
                  <li key={v} style={{ borderTop: "1px solid var(--line-2)", paddingTop: 12, fontSize: 15, lineHeight: 1.5, color: "var(--fg-faint)" }}>{v}</li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {/* Colour */}
        <Section id="colour" n="03" title="Colour" intro="A warm, low-chroma palette in two themes. Every value is a token that flips between light and dark, so never hardcode a colour, reach for the token. Swatches below show the current theme.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))", gap: 14 }}>
            {COLORS.map((c) => (
              <div key={c.name} style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ height: 72, background: `var(--${c.name})` }} />
                <div style={{ padding: "12px 14px", background: "var(--bg-1)" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg)" }}>--{c.name}</div>
                  <div style={{ fontSize: 12, color: "var(--fg-faint)", marginTop: 3 }}>{c.role}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-dim)", marginTop: 8 }}>
                    {c.dark} · {c.light}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Typography */}
        <Section id="type" n="04" title="Typography" intro="Schibsted Grotesk for everything visible (var(--font-display) / --font-body), a monospace stack (var(--font-mono)) for micro-labels, nav and controls. No serif. Sizes are fluid clamp() steps.">
          <div style={{ display: "flex", flexDirection: "column", gap: "clamp(20px,3vh,32px)" }}>
            {TYPE.map((t) => (
              <div key={t.label} style={{ borderTop: "1px solid var(--line-2)", paddingTop: 16 }}>
                <div style={{ ...monoLabel, marginBottom: 12 }}>{t.label} · {t.cls}</div>
                <div style={{ fontFamily: "var(--font-display), sans-serif", fontSize: t.cls, fontWeight: t.weight, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
                  {t.sample}
                </div>
              </div>
            ))}
            <div style={{ borderTop: "1px solid var(--line-2)", paddingTop: 16 }}>
              <div style={{ ...monoLabel, marginBottom: 12 }}>Mono label · 11px · 0.16em</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--fg-dim)" }}>
                Generative · live in browser
              </div>
            </div>
          </div>
        </Section>

        {/* Buttons & controls */}
        <Section id="controls" n="05" title="Buttons & controls" intro="One global .ui-btn system powers the hero and the closing banner alike: round .ui-btn-icon buttons and labelled .ui-btn-pill buttons, themed entirely via tokens. They live on dark, immersive surfaces, shown here on a dark panel.">
          <div data-theme="dark" style={{ background: "#0b0a08", border: "1px solid rgba(241,237,229,0.13)", borderRadius: 12, padding: "clamp(24px,3vw,40px)", display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
            <button type="button" className="ui-btn ui-btn-pill">Randomise ↻</button>
            <button type="button" className="ui-btn ui-btn-icon" aria-label="Sound">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 9v6h3.5L13 19V5L7.5 9H4Z" fill="currentColor" /><path d="M16 9.2a4 4 0 0 1 0 5.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
            </button>
            <button type="button" className="ui-btn ui-btn-icon" aria-label="Thumbs up">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button type="button" className="ui-btn ui-btn-icon voted" aria-label="Active state">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <span style={{ ...monoLabel, color: "rgba(241,237,229,0.5)" }}>.ui-btn · -icon · -pill · .on/.voted</span>
          </div>
        </Section>

        {/* Pills, links, tags */}
        <Section id="actions" n="06" title="Pills, links & tags" intro="Page-level actions and metadata. .pill (with .pill-solid / .pill-ghost / .pill-lg), the animated .linku underline and its .link-cta variant, and the .tag chip.">
          <div style={{ display: "flex", flexDirection: "column", gap: "clamp(22px,3vh,32px)" }}>
            <div>
              <div style={{ ...monoLabel, marginBottom: 14 }}>Pills</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
                <span className="pill pill-solid">Let’s collaborate</span>
                <span className="pill pill-ghost">View all</span>
                <span className="pill pill-solid pill-lg">Send message</span>
              </div>
            </div>
            <div>
              <div style={{ ...monoLabel, marginBottom: 14 }}>Links</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 28, alignItems: "center" }}>
                <span className="linku" style={{ color: "var(--fg)" }}>An underlined link</span>
                <span className="linku link-cta">View case study →</span>
              </div>
            </div>
            <div>
              <div style={{ ...monoLabel, marginBottom: 14 }}>Tags</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {["Transdisciplinary", "Biophilic", "Web Audio", "Generative"].map((t) => (
                  <span key={t} className="tag">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Motion */}
        <Section id="motion" n="07" title="Motion" intro="GSAP-driven entry reveals plus living generative backgrounds. Motion is purposeful and calm; everything degrades gracefully and pauses off-screen, and all of it honours prefers-reduced-motion.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 14 }}>
            {([
              ["[data-rv] / [data-rvs]", "Fade-rise on entry (single / stronger)."],
              ["[data-stag] > *", "Staggered children, one after another."],
              [".mask-line", "Headline rise from a clipped baseline."],
              ["[data-par]", "Scrub parallax tied to scroll."],
              ["Easing", "in-out cubic-bezier(0.16, 1, 0.3, 1); overshoot (0.34, 1.56, 0.64, 1)."],
              ["Reduced motion", "Loops stop, a single still frame holds."],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} style={cardStyle}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent)", marginBottom: 8 }}>{k}</div>
                <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--fg-dim)" }}>{v}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Spacing & layout */}
        <Section id="layout" n="08" title="Spacing & layout" intro="A small set of layout tokens carries the rhythm. Reach for these instead of magic numbers.">
          <div style={{ display: "flex", flexDirection: "column" }}>
            {TOKENS.map((t) => (
              <div key={t.name} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) minmax(0,1.4fr)", gap: 16, borderTop: "1px solid var(--line-2)", padding: "14px 0", alignItems: "baseline" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg)" }}>{t.name}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-dim)" }}>{t.value}</span>
                <span style={{ fontSize: 14, color: "var(--fg-faint)" }}>{t.note}</span>
              </div>
            ))}
          </div>
        </Section>
      </section>
    </RevealRoot>
  );
}
