import Link from "next/link";
import type {
  EditorialProject,
  EditorialMedia,
  EditorialRatio,
} from "@/content/projects/editorial-types";
import AutoVideo from "@/components/AutoVideo";
import MediaPlaceholder from "@/components/MediaPlaceholder";
import IntegrationsStrip from "./IntegrationsStrip";
import MoreWork, { type MoreWorkItem } from "./MoreWork";

/**
 * Long-scroll case study for EFM. Same section set as the design reference (hero
 * in a browser frame, at-a-glance stats, full-bleed band, device cluster, film
 * clips, the seven-pillars feature, quote) but styled entirely with the Frond
 * Studio design system: the site's sans display type, spacing tokens and
 * type scale — no bespoke fonts. Server-rendered; reveals use the site's
 * [data-rv]/[data-rvs] hooks. Video slots use AutoVideo (muted, autoplay on
 * screen, poster + reduced-motion fallback); images are plain lazy <img>.
 */

const RATIO: Record<EditorialRatio, string> = {
  "16:9": "16 / 9",
  "4:5": "4 / 5",
  "3:4": "3 / 4",
  "1:1": "1 / 1",
};

const DISPLAY = "var(--font-display), sans-serif";
const MONO = "var(--font-mono)";

function Well({ media }: { media: EditorialMedia }) {
  if (!media.src) return <MediaPlaceholder label={media.label} />;
  if (media.type === "video") return <AutoVideo src={media.src} poster={media.poster} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={media.src}
      alt={media.alt}
      loading="lazy"
      decoding="async"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
}

function Eyebrow({ children, color = "var(--accent)" }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color }}>
      {children}
    </div>
  );
}

function Heading({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <h2 style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: "clamp(30px,4vw,56px)", lineHeight: 1.04, letterSpacing: "-0.025em", color: "var(--fg)", ...style }}>
      {children}
    </h2>
  );
}

function Frame({ media, url }: { media: EditorialMedia; url?: string }) {
  return (
    <div className="ecs-frame">
      <div className="ecs-frame-bar">
        <i /><i /><i />
        {url ? <span className="ecs-url">{url}</span> : null}
      </div>
      <div className="ecs-frame-screen" style={{ aspectRatio: RATIO[media.ratio] }}>
        <Well media={media} />
      </div>
    </div>
  );
}

const bodyStyle: React.CSSProperties = {
  fontFamily: "var(--font-body), sans-serif",
  fontSize: "clamp(17px,1.5vw,21px)",
  lineHeight: 1.55,
  color: "var(--fg-dim)",
  maxWidth: "54ch",
};

export default function EditorialCaseStudy({
  project,
  moreWork = [],
}: {
  project: EditorialProject;
  moreWork?: MoreWorkItem[];
}) {
  const p = project;

  return (
    <>
      <div className="page-gutter" style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "var(--pad-top) var(--gutter) 0" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--section-y)" }}>

          {/* ── Title + hero ──────────────────────────────── */}
          <section>
            <div
              data-rv
              style={{ display: "flex", alignItems: "center", gap: 13, fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.26em", textTransform: "uppercase", color: "var(--fg-dim)", marginBottom: "clamp(20px,3vh,30px)" }}
            >
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

            <div data-rvs style={{ marginTop: "clamp(40px,6vh,72px)" }}>
              <Frame media={p.hero} url={p.liveLabel} />
            </div>
          </section>

          {/* ── Meta + intro (site layout: meta left, wide intro right) ── */}
          <section className="ecs-intro" data-rvs>
            <div className="ecs-meta">
              <div>
                <Eyebrow color="var(--fg-faint)">Client</Eyebrow>
                <div style={{ marginTop: 10, fontSize: 15, color: "var(--fg)", lineHeight: 1.5 }}>{p.client}</div>
              </div>
              <div>
                <Eyebrow color="var(--fg-faint)">Services</Eyebrow>
                <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {p.services.map((s) => (<span key={s} className="tag">{s}</span>))}
                </div>
              </div>
              {p.liveUrl ? (
                <div>
                  <Eyebrow color="var(--fg-faint)">Live site</Eyebrow>
                  <div style={{ marginTop: 10, fontSize: 15, lineHeight: 1.5 }}>
                    <a className="linku" href={p.liveUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
                      {p.liveLabel ?? "Visit site"} &#8599;
                    </a>
                  </div>
                </div>
              ) : null}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "clamp(24px,3.5vh,40px)" }}>
              <p style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: "clamp(24px,2.6vw,38px)", lineHeight: 1.22, letterSpacing: "-0.02em", color: "var(--fg)", maxWidth: "26ch" }}>
                {p.introLead}
              </p>
              <p style={bodyStyle}>{p.introBody}</p>
            </div>
          </section>

          {/* ── At a glance + tech ────────────────────────── */}
          <section data-rvs>
            <Eyebrow>The build, at a glance</Eyebrow>
            <div className="ecs-stats" style={{ marginTop: "clamp(24px,3.5vh,40px)" }}>
              {p.stats.map((s) => (
                <div key={s.label} className="ecs-stat">
                  <div style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: "clamp(46px,5vw,80px)", lineHeight: 0.9, letterSpacing: "-0.04em", color: "var(--fg)" }}>{s.value}</div>
                  <div style={{ marginTop: 16, fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg)" }}>{s.label}</div>
                  <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.5, color: "var(--fg-dim)" }}>{s.note}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "clamp(40px,6vh,72px)" }}>
              <IntegrationsStrip integrations={p.integrations} />
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
        <div className="ecs-band-inner page-gutter" style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "0 var(--gutter)" }}>
          <p style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: "clamp(32px,5vw,72px)", lineHeight: 1.02, letterSpacing: "-0.025em", color: "#f4efe6" }}>{p.band.text}</p>
        </div>
      </section>

      <div className="page-gutter" style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "0 var(--gutter)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--section-y)" }}>

          {/* ── Content model + device cluster ────────────── */}
          <section data-rvs style={{ paddingTop: "clamp(56px,9vh,120px)" }}>
            <div style={{ maxWidth: 760 }}>
              <Eyebrow>{p.contentModel.eyebrow}</Eyebrow>
              <Heading style={{ marginTop: 18, maxWidth: "16ch" }}>{p.contentModel.heading}</Heading>
              {p.contentModel.body ? <p style={{ ...bodyStyle, marginTop: "clamp(16px,2.2vh,26px)" }}>{p.contentModel.body}</p> : null}
            </div>

            <div className="ecs-plate" style={{ marginTop: "clamp(34px,5vh,60px)" }}>
              <div className="ecs-dev ecs-dev-laptop"><div className="ecs-dev-screen" style={{ aspectRatio: RATIO[p.devices.laptop.ratio] }}><Well media={p.devices.laptop} /></div></div>
              <div className="ecs-dev ecs-dev-tablet"><div className="ecs-dev-screen" style={{ aspectRatio: RATIO[p.devices.tablet.ratio] }}><Well media={p.devices.tablet} /></div></div>
              <div className="ecs-dev ecs-dev-phone"><div className="ecs-dev-screen" style={{ aspectRatio: RATIO[p.devices.phone.ratio] }}><Well media={p.devices.phone} /></div></div>
            </div>
          </section>

          {/* ── Film & motion ─────────────────────────────── */}
          <section data-rvs>
            <div style={{ maxWidth: 760 }}>
              <Eyebrow>{p.film.eyebrow}</Eyebrow>
              <Heading style={{ marginTop: 18, maxWidth: "16ch" }}>{p.film.heading}</Heading>
              {p.film.body ? <p style={{ ...bodyStyle, marginTop: "clamp(16px,2.2vh,26px)" }}>{p.film.body}</p> : null}
            </div>
            <div className="ecs-films" style={{ marginTop: "clamp(36px,5vh,64px)" }}>
              {p.film.clips.map((c) => (
                <div key={c.caption} style={{ textAlign: "center" }}>
                  <div className="ecs-circle"><Well media={c.media} /></div>
                  <div style={{ marginTop: 22, fontFamily: MONO, fontSize: 10, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--fg-faint)" }}>{c.caption}</div>
                  <p style={{ marginTop: 12, maxWidth: 360, marginLeft: "auto", marginRight: "auto", fontSize: 14, lineHeight: 1.55, color: "var(--fg-dim)" }}>{c.note}</p>
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
              <p style={{ marginTop: 12, maxWidth: 480, marginLeft: "auto", marginRight: "auto", fontSize: 14, lineHeight: 1.55, color: "var(--fg-dim)" }}>{p.pillars.note}</p>
            </div>
          </section>

          {/* ── Quote (site Quote style) ──────────────────── */}
          {p.quote ? (
            <section data-rvs style={{ maxWidth: "min(900px, 100%)", marginInline: "auto", textAlign: "center" }}>
              <blockquote style={{ margin: 0 }}>
                <p style={{ fontFamily: DISPLAY, fontSize: "clamp(26px,3.6vw,52px)", fontWeight: 400, lineHeight: 1.18, letterSpacing: "-0.02em", color: "var(--fg)" }}>
                  &ldquo;{p.quote.body}&rdquo;
                </p>
                <footer style={{ marginTop: "clamp(20px,3vh,30px)", fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--fg-faint)" }}>
                  {p.quote.author}
                </footer>
              </blockquote>
            </section>
          ) : null}

          {p.credits ? (
            <section data-rvs style={{ borderTop: "1px solid var(--line-2)", paddingTop: "clamp(24px,3vh,36px)" }}>
              <p style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "0.04em", color: "var(--fg-faint)", lineHeight: 1.6 }}>{p.credits}</p>
            </section>
          ) : null}
        </div>
      </div>

      <MoreWork items={moreWork} />
    </>
  );
}
