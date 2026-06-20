import Link from "next/link";
import type {
  EditorialProject,
  EditorialMedia,
  EditorialRatio,
} from "@/content/projects/editorial-types";
import AutoVideo from "@/components/AutoVideo";
import MediaPlaceholder from "@/components/MediaPlaceholder";
import MoreWork, { type MoreWorkItem } from "./MoreWork";
import { logoFor } from "./techLogos";

/**
 * Long-scroll case study for EFM. Frond Studio design system throughout (sans
 * --font-display, site spacing + type scale) with the editorial treatments from
 * the design reference: a blurred image behind the hero frame, text-left /
 * meta-right intro, matching 4-col stats + tech grids, a real device mockup,
 * large circular film loops, and a quote over a flowing-lines video (distinct
 * dark/light treatment). Server-rendered; reveals use the site [data-rvs] hooks;
 * video slots use AutoVideo (muted, autoplay on screen, poster fallback).
 */

const RATIO: Record<EditorialRatio, string> = { "16:9": "16 / 9", "4:5": "4 / 5", "3:4": "3 / 4", "1:1": "1 / 1" };
const DISPLAY = "var(--font-display), sans-serif";
const MONO = "var(--font-mono)";
const PAD = { maxWidth: "var(--maxw)", margin: "0 auto", padding: "0 var(--gutter)" } as const;

function Well({ media }: { media: EditorialMedia }) {
  if (!media.src) return <MediaPlaceholder label={media.label} />;
  if (media.type === "video") return <AutoVideo src={media.src} poster={media.poster} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={media.src} alt={media.alt} loading="lazy" decoding="async" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
  );
}

function Eyebrow({ children, color = "var(--accent)" }: { children: React.ReactNode; color?: string }) {
  return <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color }}>{children}</div>;
}

function Heading({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <h2 style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: "clamp(30px,4vw,56px)", lineHeight: 1.04, letterSpacing: "-0.025em", color: "var(--fg)", ...style }}>{children}</h2>;
}

function Frame({ media, url }: { media: EditorialMedia; url?: string }) {
  return (
    <div className="ecs-frame">
      <div className="ecs-frame-bar"><i /><i /><i />{url ? <span className="ecs-url">{url}</span> : null}</div>
      <div className="ecs-frame-screen" style={{ aspectRatio: RATIO[media.ratio] }}><Well media={media} /></div>
    </div>
  );
}

const bodyStyle: React.CSSProperties = { fontFamily: "var(--font-body), sans-serif", fontSize: "clamp(17px,1.5vw,21px)", lineHeight: 1.55, color: "var(--fg-dim)", maxWidth: "54ch" };

export default function EditorialCaseStudy({ project, moreWork = [] }: { project: EditorialProject; moreWork?: MoreWorkItem[] }) {
  const p = project;

  return (
    <>
      {/* ── Title ─────────────────────────────────────────── */}
      <header className="page-gutter" style={{ ...PAD, paddingTop: "var(--pad-top)", paddingBottom: "clamp(40px,6vh,72px)" }}>
        <div data-rv style={{ display: "flex", alignItems: "center", gap: 13, fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.26em", textTransform: "uppercase", color: "var(--fg-dim)", marginBottom: "clamp(20px,3vh,30px)" }}>
          <Link href="/work" className="linku" style={{ color: "var(--fg-dim)" }}>Work</Link>
          <span style={{ color: "var(--fg-faint)" }}>/</span>
          <span>{p.title}</span>
        </div>
        <h1 style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: "clamp(44px,7.4vw,120px)", lineHeight: 0.94, letterSpacing: "-0.035em", maxWidth: "18ch" }}>
          <span className="mask-line"><span>{p.title}</span></span>
        </h1>
        <p data-rv style={{ transitionDelay: "0.2s", maxWidth: 720, marginTop: "clamp(24px,3.5vh,42px)", fontFamily: DISPLAY, fontSize: "clamp(22px,2.4vw,34px)", fontWeight: 400, lineHeight: 1.2, letterSpacing: "-0.012em", color: "var(--fg)" }}>
          {p.oneLiner}
        </p>
      </header>

      {/* ── Hero frame over a full-bleed blurred backdrop ─── */}
      <section className="ecs-hero-band" data-rvs>
        {p.heroBg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="ecs-hero-bg" src={p.heroBg} alt="" aria-hidden="true" />
        ) : null}
        <div className="page-gutter ecs-hero-inner" style={PAD}><Frame media={p.hero} url={p.liveLabel} /></div>
      </section>

      <div className="page-gutter" style={PAD}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--section-y)", paddingTop: "var(--section-y)" }}>

          {/* ── Intro: text left, meta right ──────────────── */}
          <section className="ecs-intro" data-rvs>
            <div style={{ display: "flex", flexDirection: "column", gap: "clamp(24px,3.5vh,40px)" }}>
              <p style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: "clamp(26px,3.1vw,46px)", lineHeight: 1.18, letterSpacing: "-0.022em", color: "var(--fg)" }}>{p.introLead}</p>
              <p style={bodyStyle}>{p.introBody}</p>
            </div>
            <div className="ecs-meta">
              <div>
                <Eyebrow color="var(--fg-faint)">Client</Eyebrow>
                <div style={{ marginTop: 12, fontSize: 17, color: "var(--fg)" }}>{p.client}</div>
              </div>
              <div>
                <Eyebrow color="var(--fg-faint)">Services</Eyebrow>
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 9 }}>
                  {p.services.map((s) => (<div key={s} style={{ fontSize: 17, color: "var(--fg)" }}>{s}</div>))}
                </div>
              </div>
              {p.liveUrl ? (
                <a className="ecs-livebtn" href={p.liveUrl} target="_blank" rel="noopener noreferrer">
                  Visit live site
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </a>
              ) : null}
            </div>
          </section>

          {/* ── At a glance + tech (matching 4-col grids) ─── */}
          <section data-rvs>
            <Eyebrow>The build, at a glance</Eyebrow>
            <div className="ecs-grid ecs-stats" style={{ marginTop: "clamp(24px,3.5vh,40px)" }}>
              {p.stats.map((s) => (
                <div key={s.label} className="ecs-cell">
                  <div style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: "clamp(46px,5vw,80px)", lineHeight: 0.9, letterSpacing: "-0.04em", color: "var(--fg)" }}>{s.value}</div>
                  <div style={{ marginTop: 16, fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-faint)" }}>{s.label}</div>
                  <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.5, color: "var(--fg-dim)" }}>{s.note}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "clamp(40px,6vh,72px)" }}>
              <Eyebrow color="var(--fg-faint)">Tech &amp; integrations</Eyebrow>
              <div className="ecs-grid ecs-tech" style={{ marginTop: "clamp(20px,3vh,32px)" }}>
                {p.integrations.map((name) => {
                  const logo = logoFor(name);
                  return (
                    <div key={name} className="ecs-cell ecs-techcell">
                      <span className="ecs-techicon" aria-hidden="true">
                        {logo ? (<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d={logo.path} /></svg>) : null}
                      </span>
                      <span style={{ fontFamily: MONO, fontSize: 13, letterSpacing: "0.02em", color: "var(--fg)", lineHeight: 1.3 }}>{name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ── Front door ────────────────────────────────── */}
          <section data-rvs>
            <Eyebrow>{p.frontDoor.eyebrow}</Eyebrow>
            <Heading style={{ marginTop: 18, maxWidth: "16ch" }}>{p.frontDoor.heading}</Heading>
            {p.frontDoor.body ? <p style={{ ...bodyStyle, marginTop: "clamp(18px,2.4vh,28px)" }}>{p.frontDoor.body}</p> : null}
          </section>
        </div>
      </div>

      {/* ── Full-bleed montage band ───────────────────────── */}
      <section className="ecs-band" data-rvs>
        <Well media={p.band.media} />
        <div className="ecs-band-shade" />
        <div className="ecs-band-inner page-gutter" style={PAD}>
          <p style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: "clamp(32px,5vw,72px)", lineHeight: 1.02, letterSpacing: "-0.025em", color: "#f4efe6" }}>{p.band.text}</p>
        </div>
      </section>

      <div className="page-gutter" style={PAD}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--section-y)" }}>

          {/* ── Content model + device mockup ─────────────── */}
          <section data-rvs style={{ paddingTop: "clamp(56px,9vh,120px)" }}>
            <div style={{ maxWidth: 760 }}>
              <Eyebrow>{p.contentModel.eyebrow}</Eyebrow>
              <Heading style={{ marginTop: 18, maxWidth: "16ch" }}>{p.contentModel.heading}</Heading>
              {p.contentModel.body ? <p style={{ ...bodyStyle, marginTop: "clamp(16px,2.2vh,26px)" }}>{p.contentModel.body}</p> : null}
            </div>

            <div className="ecs-plate" style={{ marginTop: "clamp(34px,5vh,60px)" }}>
              <div className="ecs-dev ecs-dev-tablet"><div className="ecs-screen"><Well media={p.devices.tablet} /></div></div>
              <div className="ecs-dev ecs-dev-laptop">
                <div className="ecs-laptop-lid"><div className="ecs-screen"><Well media={p.devices.laptop} /></div></div>
                <div className="ecs-laptop-base" aria-hidden="true" />
              </div>
              <div className="ecs-dev ecs-dev-phone"><span className="ecs-phone-island" aria-hidden="true" /><div className="ecs-screen"><Well media={p.devices.phone} /></div></div>
            </div>
          </section>

          {/* ── Film & motion (large circles) ─────────────── */}
          <section data-rvs>
            <div style={{ maxWidth: 760 }}>
              <Eyebrow>{p.film.eyebrow}</Eyebrow>
              <Heading style={{ marginTop: 18, maxWidth: "16ch" }}>{p.film.heading}</Heading>
              {p.film.body ? <p style={{ ...bodyStyle, marginTop: "clamp(16px,2.2vh,26px)" }}>{p.film.body}</p> : null}
            </div>
            <div className="ecs-films" style={{ marginTop: "clamp(40px,6vh,80px)" }}>
              {p.film.clips.map((c) => (
                <div key={c.caption}>
                  <div className="ecs-circle"><Well media={c.media} /></div>
                  <div style={{ marginTop: 26, textAlign: "center", fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--fg-faint)" }}>{c.caption}</div>
                  <p style={{ marginTop: 12, maxWidth: 420, marginInline: "auto", textAlign: "center", fontSize: 15, lineHeight: 1.55, color: "var(--fg-dim)" }}>{c.note}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── The seven pillars ─────────────────────────── */}
          <section data-rvs style={{ textAlign: "center" }}>
            <div style={{ maxWidth: 760, margin: "0 auto" }}>
              <Eyebrow>{p.pillars.eyebrow}</Eyebrow>
              <Heading style={{ marginTop: 18, fontSize: "clamp(28px,3.6vw,50px)" }}>{p.pillars.heading}</Heading>
              {p.pillars.body ? <p style={{ ...bodyStyle, maxWidth: 560, margin: "clamp(16px,2.2vh,26px) auto 0" }}>{p.pillars.body}</p> : null}
            </div>
            <div style={{ maxWidth: 1040, margin: "clamp(34px,5vh,60px) auto 0" }}>
              <Frame media={p.pillars.media} url={p.liveLabel ? `${p.liveLabel}/about` : undefined} />
            </div>
            <div style={{ marginTop: 24 }}>
              <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--fg-faint)" }}>{p.pillars.caption}</div>
              <p style={{ marginTop: 12, maxWidth: 480, marginInline: "auto", fontSize: 14, lineHeight: 1.55, color: "var(--fg-dim)" }}>{p.pillars.note}</p>
            </div>
          </section>
        </div>
      </div>

      {/* ── Quote over flowing-lines video ────────────────── */}
      {p.quote ? (
        <section className="ecs-quote" data-rvs>
          {p.quoteBg ? <div className="ecs-quote-bg"><Well media={p.quoteBg} /></div> : null}
          <div className="ecs-quote-shade" />
          <div className="page-gutter ecs-quote-inner" style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(80px,14vh,170px) var(--gutter)", textAlign: "center" }}>
            <blockquote style={{ margin: 0 }}>
              <p style={{ fontFamily: DISPLAY, fontSize: "clamp(26px,3.6vw,52px)", fontWeight: 400, lineHeight: 1.18, letterSpacing: "-0.02em", color: "var(--fg)" }}>&ldquo;{p.quote.body}&rdquo;</p>
              <footer style={{ marginTop: "clamp(20px,3vh,30px)", fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--accent)" }}>{p.quote.author}</footer>
            </blockquote>
          </div>
        </section>
      ) : null}

      {p.credits ? (
        <div className="page-gutter" style={PAD}>
          <section data-rvs style={{ borderTop: "1px solid var(--line-2)", paddingTop: "clamp(24px,3vh,36px)", marginTop: "var(--section-y)" }}>
            <p style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "0.04em", color: "var(--fg-faint)", lineHeight: 1.6 }}>{p.credits}</p>
          </section>
        </div>
      ) : null}

      <MoreWork items={moreWork} />
    </>
  );
}
