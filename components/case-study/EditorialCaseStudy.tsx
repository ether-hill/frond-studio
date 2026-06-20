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
 * Long-scroll, editorial case-study layout (Newsreader serif + Schibsted sans).
 * Top to bottom: title, hero in a browser frame, intro + meta, at-a-glance stats,
 * tech grid, front door, full-bleed band, content model + device cluster, film &
 * motion clips, the seven-pillars feature, client quote, then "See more work".
 * Server-rendered; reveals use the site's [data-rvs] in-view hook. Images are
 * plain lazy <img>; video slots use AutoVideo (autoplay-on-screen, muted loop).
 */

const RATIO: Record<EditorialRatio, string> = {
  "16:9": "16 / 9",
  "4:5": "4 / 5",
  "3:4": "3 / 4",
  "1:1": "1 / 1",
};

const SERIF = 'var(--font-serif), Georgia, "Times New Roman", serif';

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

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: "var(--accent)",
      }}
    >
      {children}
    </div>
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
      {/* ── Title ─────────────────────────────────────────── */}
      <header
        className="page-gutter"
        style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "var(--pad-top) var(--gutter) 0" }}
      >
        <div
          data-rv
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--fg-faint)",
            marginBottom: "clamp(22px,3.4vh,34px)",
          }}
        >
          <Link href="/work" className="linku" style={{ color: "var(--fg-dim)" }}>Work</Link>
          <span>/</span>
          <span>{p.title}</span>
        </div>

        <h1 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: "clamp(46px,8vw,128px)", lineHeight: 0.98, letterSpacing: "-0.018em", maxWidth: "14ch" }}>
          <span className="mask-line"><span>{p.title}</span></span>
        </h1>

        <p data-rv style={{ transitionDelay: "0.15s", maxWidth: 620, marginTop: "clamp(22px,3vh,36px)", fontSize: "clamp(17px,1.4vw,21px)", lineHeight: 1.5, color: "var(--fg-dim)" }}>
          {p.oneLiner}
        </p>
      </header>

      {/* ── Hero, in a browser frame over a soft blurred backdrop ─── */}
      <section className="ecs-hero-band" data-rvs>
        {p.hero.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="ecs-hero-bg" src={p.hero.src} alt="" aria-hidden="true" />
        ) : null}
        <div className="page-gutter ecs-hero-inner" style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "clamp(40px,6vh,72px) var(--gutter) 0" }}>
          <Frame media={p.hero} url={p.liveLabel} />
        </div>
      </section>

      <div className="page-gutter" style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "0 var(--gutter)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--section-y)" }}>

          {/* ── Intro + meta ──────────────────────────────── */}
          <section className="ecs-intro" data-rvs style={{ paddingTop: "clamp(56px,9vh,120px)" }}>
            <div>
              <p style={{ fontFamily: SERIF, fontWeight: 400, fontSize: "clamp(26px,3vw,42px)", lineHeight: 1.22, letterSpacing: "-0.01em", color: "var(--fg)", maxWidth: "18ch" }}>
                {p.introLead}
              </p>
              <p style={{ marginTop: "clamp(22px,3vh,34px)", maxWidth: 460, fontSize: "clamp(15px,1.1vw,16px)", lineHeight: 1.65, color: "var(--fg-dim)" }}>
                {p.introBody}
              </p>
            </div>

            <div className="ecs-meta">
              <div>
                <Eyebrow>Client</Eyebrow>
                <div style={{ marginTop: 10, fontSize: 16, color: "var(--fg)" }}>{p.client}</div>
              </div>
              <div>
                <Eyebrow>Services</Eyebrow>
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 7 }}>
                  {p.services.map((s) => (
                    <div key={s} style={{ fontSize: 16, color: "var(--fg)" }}>{s}</div>
                  ))}
                </div>
              </div>
              {p.liveUrl ? (
                <a className="ecs-livebtn" href={p.liveUrl} target="_blank" rel="noopener noreferrer">
                  Visit live site
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                    <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              ) : null}
            </div>
          </section>

          {/* ── At a glance + tech grid ───────────────────── */}
          <section data-rvs>
            <Eyebrow>The build, at a glance</Eyebrow>
            <div className="ecs-stats" style={{ marginTop: "clamp(22px,3vh,34px)" }}>
              {p.stats.map((s) => (
                <div key={s.label} className="ecs-stat">
                  <div style={{ fontFamily: SERIF, fontWeight: 400, fontSize: "clamp(48px,5vw,76px)", lineHeight: 1, letterSpacing: "-0.02em" }}>{s.value}</div>
                  <div style={{ marginTop: 14, fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--fg-faint)" }}>{s.label}</div>
                  <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.5, color: "var(--fg-dim)" }}>{s.note}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "clamp(40px,6vh,72px)" }}>
              <IntegrationsStrip integrations={p.integrations} />
            </div>
          </section>

          {/* ── Front door ────────────────────────────────── */}
          <section data-rvs style={{ maxWidth: 760 }}>
            <Eyebrow>{p.frontDoor.eyebrow}</Eyebrow>
            <h2 style={{ marginTop: 18, fontFamily: SERIF, fontWeight: 400, fontSize: "clamp(34px,5vw,68px)", lineHeight: 1.04, letterSpacing: "-0.015em" }}>{p.frontDoor.heading}</h2>
            {p.frontDoor.body ? <p style={{ marginTop: "clamp(18px,2.4vh,28px)", maxWidth: 560, fontSize: "clamp(15px,1.1vw,16px)", lineHeight: 1.65, color: "var(--fg-dim)" }}>{p.frontDoor.body}</p> : null}
          </section>
        </div>
      </div>

      {/* ── Full-bleed montage band ───────────────────────── */}
      <section className="ecs-band" data-rvs>
        <Well media={p.band.media} />
        <div className="ecs-band-shade" />
        <div className="ecs-band-inner page-gutter" style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "0 var(--gutter)" }}>
          <p style={{ fontFamily: SERIF, fontWeight: 400, fontSize: "clamp(34px,5.6vw,84px)", lineHeight: 1.02, letterSpacing: "-0.018em", color: "#f4efe6" }}>{p.band.text}</p>
        </div>
      </section>

      <div className="page-gutter" style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "0 var(--gutter)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--section-y)" }}>

          {/* ── Content model + device cluster ────────────── */}
          <section data-rvs style={{ paddingTop: "clamp(56px,9vh,120px)" }}>
            <div style={{ maxWidth: 720 }}>
              <Eyebrow>{p.contentModel.eyebrow}</Eyebrow>
              <h2 style={{ marginTop: 18, fontFamily: SERIF, fontWeight: 400, fontSize: "clamp(32px,4.6vw,60px)", lineHeight: 1.06, letterSpacing: "-0.015em" }}>{p.contentModel.heading}</h2>
              {p.contentModel.body ? <p style={{ marginTop: "clamp(16px,2.2vh,26px)", maxWidth: 560, fontSize: "clamp(15px,1.1vw,16px)", lineHeight: 1.65, color: "var(--fg-dim)" }}>{p.contentModel.body}</p> : null}
            </div>

            <div className="ecs-plate" style={{ marginTop: "clamp(34px,5vh,60px)" }}>
              <div className="ecs-dev ecs-dev-laptop"><div className="ecs-dev-screen" style={{ aspectRatio: RATIO[p.devices.laptop.ratio] }}><Well media={p.devices.laptop} /></div></div>
              <div className="ecs-dev ecs-dev-tablet"><div className="ecs-dev-screen" style={{ aspectRatio: RATIO[p.devices.tablet.ratio] }}><Well media={p.devices.tablet} /></div></div>
              <div className="ecs-dev ecs-dev-phone"><div className="ecs-dev-screen" style={{ aspectRatio: RATIO[p.devices.phone.ratio] }}><Well media={p.devices.phone} /></div></div>
            </div>
          </section>

          {/* ── Film & motion ─────────────────────────────── */}
          <section data-rvs>
            <div style={{ maxWidth: 720 }}>
              <Eyebrow>{p.film.eyebrow}</Eyebrow>
              <h2 style={{ marginTop: 18, fontFamily: SERIF, fontWeight: 400, fontSize: "clamp(32px,4.6vw,60px)", lineHeight: 1.06, letterSpacing: "-0.015em" }}>{p.film.heading}</h2>
              {p.film.body ? <p style={{ marginTop: "clamp(16px,2.2vh,26px)", maxWidth: 560, fontSize: "clamp(15px,1.1vw,16px)", lineHeight: 1.65, color: "var(--fg-dim)" }}>{p.film.body}</p> : null}
            </div>
            <div className="ecs-films" style={{ marginTop: "clamp(36px,5vh,64px)" }}>
              {p.film.clips.map((c) => (
                <div key={c.caption} style={{ textAlign: "center" }}>
                  <div className="ecs-circle"><Well media={c.media} /></div>
                  <div style={{ marginTop: 22, fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--fg-faint)" }}>{c.caption}</div>
                  <p style={{ marginTop: 12, maxWidth: 360, marginLeft: "auto", marginRight: "auto", fontSize: 14, lineHeight: 1.55, color: "var(--fg-dim)" }}>{c.note}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── The seven pillars ─────────────────────────── */}
          <section data-rvs style={{ textAlign: "center" }}>
            <div style={{ maxWidth: 720, margin: "0 auto" }}>
              <Eyebrow>{p.pillars.eyebrow}</Eyebrow>
              <h2 style={{ marginTop: 18, fontFamily: SERIF, fontWeight: 400, fontSize: "clamp(30px,4.4vw,56px)", lineHeight: 1.08, letterSpacing: "-0.012em" }}>{p.pillars.heading}</h2>
              {p.pillars.body ? <p style={{ marginTop: "clamp(16px,2.2vh,26px)", maxWidth: 540, margin: "clamp(16px,2.2vh,26px) auto 0", fontSize: "clamp(15px,1.1vw,16px)", lineHeight: 1.65, color: "var(--fg-dim)" }}>{p.pillars.body}</p> : null}
            </div>
            <div style={{ maxWidth: 1040, margin: "clamp(34px,5vh,60px) auto 0" }}>
              <Frame media={p.pillars.media} url={p.liveLabel ? `${p.liveLabel}/about` : undefined} />
            </div>
            <div style={{ marginTop: 24 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--fg-faint)" }}>{p.pillars.caption}</div>
              <p style={{ marginTop: 12, maxWidth: 480, marginLeft: "auto", marginRight: "auto", fontSize: 14, lineHeight: 1.55, color: "var(--fg-dim)" }}>{p.pillars.note}</p>
            </div>
          </section>
        </div>
      </div>

      {/* ── Quote ─────────────────────────────────────────── */}
      {p.quote ? (
        <section className="ecs-quote" data-rvs>
          <div className="page-gutter" style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(72px,12vh,150px) var(--gutter)", textAlign: "center" }}>
            <p style={{ fontFamily: SERIF, fontWeight: 400, fontSize: "clamp(26px,3.4vw,46px)", lineHeight: 1.22, letterSpacing: "-0.01em", color: "#f4efe6" }}>
              &ldquo;{p.quote.body}&rdquo;
            </p>
            <div style={{ marginTop: 28, fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--accent)" }}>
              {p.quote.author}
            </div>
          </div>
        </section>
      ) : null}

      <MoreWork items={moreWork} />
    </>
  );
}
