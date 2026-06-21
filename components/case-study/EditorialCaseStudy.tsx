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
 * Long-scroll editorial case study. Frond Studio design system throughout. Every
 * block past the hero + intro is optional, so a project renders only the sections
 * it provides (EFM uses them all; Source Library uses a focused subset). Full-
 * bleed band/quote break out of the centered container via the 100vw trick.
 * Server-rendered; reveals use the site [data-rvs] hooks; video slots use
 * AutoVideo (muted, autoplay on screen, poster fallback).
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

function Frame({ media, url, flat }: { media: EditorialMedia; url?: string; flat?: boolean }) {
  return (
    <div className={flat ? "ecs-frame ecs-frame-flat" : "ecs-frame"}>
      <div className="ecs-frame-bar"><i /><i /><i />{url ? <span className="ecs-url">{url}</span> : null}</div>
      <div className="ecs-frame-screen" style={{ aspectRatio: RATIO[media.ratio] }}><Well media={media} /></div>
    </div>
  );
}

const bodyStyle: React.CSSProperties = { fontFamily: "var(--font-body), sans-serif", fontSize: "clamp(17px,1.5vw,21px)", lineHeight: 1.55, color: "var(--fg-dim)", maxWidth: "54ch" };

export default function EditorialCaseStudy({ project, moreWork = [] }: { project: EditorialProject; moreWork?: MoreWorkItem[] }) {
  const p = project;
  const liteClass = p.heroLite ? " ecs-hero-lite" : "";
  const heroCard = () => (
    <div className="ecs-hero-card">
      <div className="ecs-hero-bar">
        <i /><i /><i />
        {p.liveLabel ? <span className="ecs-hero-url">{p.liveLabel}</span> : null}
      </div>
      <div className="ecs-hero-screen">
        {p.hero.type === "video" ? (
          <AutoVideo src={p.hero.src} poster={p.hero.poster} objectFit="contain" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.hero.src} alt={p.hero.alt} loading="lazy" decoding="async" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
        )}
      </div>
    </div>
  );

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

      {/* ── Hero: floating frosted browser card over a full-bleed image ─── */}
      <section className={`ecs-hero${liteClass}`} data-rvs>
        {p.heroBg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="ecs-hero-img" src={p.heroBg} alt="" aria-hidden="true" />
        ) : null}
        <div className="ecs-hero-scrim" />
        {heroCard()}
      </section>

      <div className="page-gutter" style={PAD}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--section-y)", paddingTop: "var(--section-y)", paddingBottom: "var(--section-y)" }}>

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

          {/* ── At a glance + tech ────────────────────────── */}
          {p.stats?.length || p.integrations?.length ? (
            <section data-rvs>
              {p.stats && p.stats.length ? (
                <>
                  <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "8px 16px" }}>
                    <Eyebrow>{p.statsLabel ?? "By the numbers"}</Eyebrow>
                    {p.statsAsOf ? (
                      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--fg-faint)" }}>As of {p.statsAsOf}</span>
                    ) : null}
                  </div>
                  <div className="ecs-grid ecs-stats" style={{ marginTop: "clamp(24px,3.5vh,40px)" }}>
                    {p.stats.map((s) => (
                      <div key={s.label} className="ecs-cell">
                        <div style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: "clamp(40px,4.4vw,72px)", lineHeight: 0.9, letterSpacing: "-0.04em", color: "var(--fg)" }}>{s.value}</div>
                        <div style={{ marginTop: 16, fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-faint)" }}>{s.label}</div>
                        {s.note ? <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.5, color: "var(--fg-dim)" }}>{s.note}</div> : null}
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              {p.integrations && p.integrations.length ? (
                <div style={{ marginTop: p.stats?.length ? "clamp(40px,6vh,72px)" : 0 }}>
                  <Eyebrow color="var(--fg-faint)">Tech &amp; integrations</Eyebrow>
                  <div className="ecs-grid ecs-tech" style={{ marginTop: "clamp(20px,3vh,32px)" }}>
                    {p.integrations.map((name) => {
                      const logo = logoFor(name);
                      const letter = !logo && /^BPH/i.test(name) ? "B" : null;
                      return (
                        <div key={name} className="ecs-cell ecs-techcell">
                          <span className="ecs-techicon" aria-hidden="true">
                            {logo ? (
                              <svg viewBox={logo.viewBox ?? "0 0 24 24"} width="18" height="18" fill="currentColor"><path d={logo.path} /></svg>
                            ) : letter ? (
                              <span style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 17, lineHeight: 1 }}>{letter}</span>
                            ) : null}
                          </span>
                          <span style={{ fontFamily: MONO, fontSize: 13, letterSpacing: "0.02em", color: "var(--fg)", lineHeight: 1.3 }}>{name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {/* ── Before / after (neutral) ───────────────────── */}
          {p.before?.length && p.after?.length ? (
            <section className="ecs-ba" data-rvs>
              {([["Before", p.before], ["After", p.after]] as const).map(([label, points]) => (
                <div key={label}>
                  <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--fg-faint)" }}>{label}</div>
                  <ul style={{ marginTop: "clamp(18px,2.6vh,28px)", display: "flex", flexDirection: "column", gap: 16 }}>
                    {points.map((pt) => (
                      <li key={pt} style={{ display: "flex", alignItems: "flex-start", gap: 14, fontSize: "clamp(16px,1.4vw,20px)", lineHeight: 1.45, color: "var(--fg)" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, marginTop: "0.6em" }} />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ) : null}

          {/* ── Front door ────────────────────────────────── */}
          {p.frontDoor ? (
            <section data-rvs>
              {p.frontDoor.eyebrow ? <Eyebrow>{p.frontDoor.eyebrow}</Eyebrow> : null}
              <Heading style={{ marginTop: 18, maxWidth: "16ch" }}>{p.frontDoor.heading}</Heading>
              {p.frontDoor.body ? <p style={{ ...bodyStyle, marginTop: "clamp(18px,2.4vh,28px)" }}>{p.frontDoor.body}</p> : null}
            </section>
          ) : null}

          {/* ── Full-bleed montage band ───────────────────── */}
          {p.band ? (
            <section className="ecs-band" data-rvs>
              <Well media={p.band.media} />
              <div className="ecs-band-shade" />
              <div className="ecs-band-inner page-gutter" style={PAD}>
                <p style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: "clamp(32px,5vw,72px)", lineHeight: 1.02, letterSpacing: "-0.025em", color: "#f4efe6" }}>{p.band.text}</p>
              </div>
            </section>
          ) : null}

          {/* ── Showcase: text + a full-width feature video ─── */}
          {p.showcase ? (
            <section data-rvs>
              <div style={{ maxWidth: 760 }}>
                {p.showcase.eyebrow ? <Eyebrow>{p.showcase.eyebrow}</Eyebrow> : null}
                <Heading style={{ marginTop: 18, maxWidth: "18ch" }}>{p.showcase.heading}</Heading>
                {p.showcase.body ? <p style={{ ...bodyStyle, marginTop: "clamp(16px,2.2vh,26px)" }}>{p.showcase.body}</p> : null}
              </div>
              <div className="ecs-showcase-well" style={{ marginTop: "clamp(34px,5vh,60px)", aspectRatio: RATIO[p.showcase.media.ratio] }}>
                <Well media={p.showcase.media} />
              </div>
            </section>
          ) : null}

          {/* ── Content model + device mockup ─────────────── */}
          {p.contentModel || p.devices ? (
            <section data-rvs>
              {p.contentModel ? (
                <div style={{ maxWidth: 760 }}>
                  {p.contentModel.eyebrow ? <Eyebrow>{p.contentModel.eyebrow}</Eyebrow> : null}
                  <Heading style={{ marginTop: 18, maxWidth: "16ch" }}>{p.contentModel.heading}</Heading>
                  {p.contentModel.body ? <p style={{ ...bodyStyle, marginTop: "clamp(16px,2.2vh,26px)" }}>{p.contentModel.body}</p> : null}
                </div>
              ) : null}

              {p.devices ? (
                <div className="ecs-plate" style={{ marginTop: "clamp(34px,5vh,60px)" }}>
                  <div className="ecs-cluster">
                    <div className="ecs-dev ecs-dev-phone">
                      <div className="ecs-phone-body">
                        <span className="ecs-phone-notch" aria-hidden="true" />
                        <div className="ecs-phone-screen"><Well media={p.devices.phone} /></div>
                      </div>
                    </div>
                    <div className="ecs-dev ecs-dev-tablet">
                      <div className="ecs-tablet-body"><div className="ecs-tablet-screen"><Well media={p.devices.tablet} /></div></div>
                    </div>
                    <div className="ecs-dev ecs-dev-laptop">
                      <div className="ecs-laptop-lid">
                        <span className="ecs-laptop-cam" aria-hidden="true" />
                        <div className="ecs-laptop-screen"><Well media={p.devices.laptop} /></div>
                      </div>
                      <div className="ecs-laptop-base" aria-hidden="true" />
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {/* ── Film & motion (large circles) ─────────────── */}
          {p.film ? (
            <section data-rvs>
              <div style={{ maxWidth: 760 }}>
                {p.film.eyebrow ? <Eyebrow>{p.film.eyebrow}</Eyebrow> : null}
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
          ) : null}

          {/* ── Feature in a browser frame (e.g. seven pillars) ── */}
          {p.pillars ? (
            <section data-rvs style={{ textAlign: "center" }}>
              <div style={{ maxWidth: 760, margin: "0 auto" }}>
                {p.pillars.eyebrow ? <Eyebrow>{p.pillars.eyebrow}</Eyebrow> : null}
                <Heading style={{ marginTop: 18, fontSize: "clamp(28px,3.6vw,50px)" }}>{p.pillars.heading}</Heading>
                {p.pillars.body ? <p style={{ ...bodyStyle, maxWidth: 560, margin: "clamp(16px,2.2vh,26px) auto 0" }}>{p.pillars.body}</p> : null}
              </div>
              <div style={{ maxWidth: 1040, margin: "clamp(34px,5vh,60px) auto 0" }}>
                <Frame media={p.pillars.media} url={p.pillars.media.label} flat />
              </div>
            </section>
          ) : null}

          {/* ── Quote over flowing-lines video ─────────────── */}
          {p.quote ? (
            <section className="ecs-quote" data-rvs>
              {p.quoteBg ? <AutoVideo src={p.quoteBg.src} poster={p.quoteBg.poster} className="quote-vid" noFade /> : null}
              <div className="ecs-quote-vignette" />
              <div className="ecs-quote-inner">
                <blockquote style={{ margin: 0 }}>
                  <p style={{ fontFamily: DISPLAY, fontSize: "clamp(26px,3.6vw,52px)", fontWeight: 400, lineHeight: 1.18, letterSpacing: "-0.018em", color: "var(--fg)" }}>&ldquo;{p.quote.body}&rdquo;</p>
                  <footer style={{ marginTop: "clamp(30px,4vh,48px)", fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--fg-dim)" }}>{p.quote.author}</footer>
                </blockquote>
              </div>
            </section>
          ) : null}
        </div>
      </div>

      <MoreWork items={moreWork} />
    </>
  );
}
