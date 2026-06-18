"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import AutoVideo from "./AutoVideo";
import MediaPlaceholder from "./MediaPlaceholder";
import type { ProjectCard } from "@/sanity/lib/queries";

export default function SelectedWork({ projects }: { projects: ProjectCard[] }) {
  const [view, setView] = useState<"grid" | "index">("grid");

  return (
    <section
      id="work"
      className="page-gutter"
      style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "var(--section-y) var(--gutter)", position: "relative" }}
    >
      <div
        data-rvs
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 24,
          flexWrap: "wrap",
          borderTop: "1px solid var(--line)",
          paddingTop: 22,
          marginBottom: "clamp(34px,5vh,58px)",
        }}
      >
        <div style={{ display: "flex", gap: 18, alignItems: "baseline" }}>
          <h2 style={{ fontFamily: "var(--font-display), sans-serif", fontSize: "clamp(34px,4.6vw,66px)", fontWeight: 500, letterSpacing: "-0.018em" }}>
            Recent Work
          </h2>
        </div>
        <div
          className="seg"
          role="group"
          aria-label="Work layout"
          style={{
            display: "inline-flex",
            alignItems: "center",
            border: "1px solid var(--line)",
            borderRadius: 999,
            padding: 3,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          <button
            onClick={() => setView("grid")}
            data-on={view === "grid"}
            style={{ border: "none", cursor: "pointer", background: "transparent", color: "var(--fg-dim)", padding: "7px 15px", borderRadius: 999 }}
          >
            Grid
          </button>
          <button
            onClick={() => setView("index")}
            data-on={view === "index"}
            style={{ border: "none", cursor: "pointer", background: "transparent", color: "var(--fg-dim)", padding: "7px 15px", borderRadius: 999 }}
          >
            Index
          </button>
        </div>
      </div>

      {view === "grid" ? <WorkGrid projects={projects} /> : <WorkIndex projects={projects} />}

      <div data-rvs style={{ marginTop: "clamp(40px,6vh,72px)", display: "flex", justifyContent: "center" }}>
        <Link href="/work" className="pill pill-ghost" style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", padding: "14px 28px" }}>
          View all projects
        </Link>
      </div>
    </section>
  );
}

function disciplineLine(p: ProjectCard) {
  return (p.services || []).slice(0, 3).join(" · ");
}

function WorkGrid({ projects }: { projects: ProjectCard[] }) {
  // Same card language as Recent Projects: a 16:9 cover, a caps discipline
  // kicker, the title, and an "Open →" affordance — three-up.
  return (
    <div className="sp-grid" data-stag style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "clamp(20px,2.4vw,40px)" }}>
      {projects.map((p) => (
        <Link key={p._id} className="vwork" href={`/work/${p.slug}`} style={{ display: "flex", flexDirection: "column", textDecoration: "none", color: "inherit" }}>
          <span className="proj-shot">
            {p.thumbnailVideo ? <AutoVideo src={p.thumbnailVideo} poster={`/posters/${p.slug}.jpg`} /> : <MediaPlaceholder label={p.title} />}
          </span>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--fg-faint)",
              marginBottom: 12,
            }}
          >
            {disciplineLine(p)}
          </div>
          <h3
            className="vwork-name"
            style={{
              margin: 0,
              fontFamily: "var(--font-display), sans-serif",
              fontWeight: 500,
              fontSize: "clamp(24px,2.4vw,34px)",
              lineHeight: 1.02,
              letterSpacing: "-0.018em",
            }}
          >
            {p.title}
          </h3>
          <span
            className="linku"
            style={{
              marginTop: 20,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--accent)",
            }}
          >
            Open →
          </span>
        </Link>
      ))}
    </div>
  );
}

function WorkIndex({ projects }: { projects: ProjectCard[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    const preview = previewRef.current;
    const video = videoRef.current;
    if (!el || !preview) return;

    let tx = 0, ty = 0, cx = 0, cy = 0, shown = false, started = false, raf = 0;

    const loop = () => {
      cx += (tx - cx) * 0.16;
      cy += (ty - cy) * 0.16;
      preview.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0) translate(-50%,-50%)`;
      raf = requestAnimationFrame(loop);
    };
    const onMove = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      const target = e.target as HTMLElement;
      const row = target.closest && (target.closest("[data-vid]") as HTMLElement | null);
      if (row) {
        const url = row.getAttribute("data-vid");
        if (video && url && video.getAttribute("src") !== url) {
          video.src = url;
          video.muted = true;
          video.loop = true;
          const pl = video.play();
          if (pl && pl.catch) pl.catch(() => {});
        }
        if (!shown) {
          shown = true;
          cx = tx;
          cy = ty;
          preview.style.opacity = "1";
        }
      }
      if (!started) {
        started = true;
        loop();
      }
    };
    const onLeave = () => {
      shown = false;
      preview.style.opacity = "0";
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const firstWithVid = projects.find((p) => p.thumbnailVideo);
  const firstVid = firstWithVid?.thumbnailVideo || undefined;
  const firstPoster = firstWithVid ? `/posters/${firstWithVid.slug}.jpg` : undefined;

  return (
    <div ref={wrapRef} className="work-index" style={{ position: "relative", borderBottom: "1px solid var(--line)" }}>
      <div
        ref={previewRef}
        className="work-preview"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "clamp(280px,28vw,440px)",
          aspectRatio: "16/9",
          borderRadius: 6,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 45,
          opacity: 0,
          transform: "translate(-50%,-50%)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
          transition: "opacity .4s ease",
          willChange: "transform",
          background: "var(--media)",
        }}
      >
        <video ref={videoRef} src={firstVid} poster={firstPoster} autoPlay muted loop playsInline preload="metadata" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      </div>

      {projects.map((p) => (
        <Link
          key={p._id}
          className="wi-row"
          data-vid={p.thumbnailVideo || ""}
          href={`/work/${p.slug}`}
          data-rvs
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto auto",
            gap: "clamp(16px,3vw,48px)",
            alignItems: "center",
            padding: "clamp(20px,2.5vw,38px) 0",
            borderTop: "1px solid var(--line)",
          }}
        >
          <h3 className="wi-name" style={{ fontFamily: "var(--font-display), sans-serif", fontSize: "clamp(28px,4.6vw,72px)", fontWeight: 500, letterSpacing: "-0.022em", lineHeight: 1 }}>
            {p.title}
          </h3>
          <span className="wi-tags" style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-dim)", whiteSpace: "nowrap" }}>
            {disciplineLine(p)}
          </span>
          <span className="wi-arrow" style={{ fontSize: 21, color: "var(--accent)" }}>
            &#8599;
          </span>
        </Link>
      ))}
    </div>
  );
}
