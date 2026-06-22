"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import MediaPlaceholder from "./MediaPlaceholder";
import { PERSONAL_PROJECTS, type PersonalProject } from "@/lib/projects";

/**
 * "More projects" — a horizontal carousel of project cards shown at the foot of a
 * project page (replacing the global CTA there). Four cards per view on desktop,
 * two on tablet, one on mobile (set in CSS via flex-basis); paging is native
 * scroll-snap driven by the prev/next arrows in the top-right. The arrows disable
 * at each end. Reuses the site's standard .vwork / .proj-shot card language.
 */
export default function MoreProjects({
  excludeSlug,
  title = "More projects",
}: {
  excludeSlug?: string;
  title?: string;
}) {
  const items: PersonalProject[] = PERSONAL_PROJECTS.filter((p) => p.slug !== excludeSlug);
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = () => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // Page by one viewport-width of the track, so each step advances by the number
  // of cards currently visible (4 / 2 / 1 across the breakpoints).
  const page = (dir: number) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  };

  return (
    <section data-theme="dark" className="morep-section" aria-label={title}>
      <div className="morep">
        <div className="morep-head" data-rvs>
          <h2 className="morep-title">{title}</h2>
          <div className="morep-nav">
            <button type="button" className="morep-arrow" onClick={() => page(-1)} disabled={atStart} aria-label="Previous projects">
              <svg width="13" height="22" viewBox="0 0 13 22" fill="none" aria-hidden="true">
                <path d="M11.5 1 2 11l9.5 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button type="button" className="morep-arrow" onClick={() => page(1)} disabled={atEnd} aria-label="Next projects">
              <svg width="13" height="22" viewBox="0 0 13 22" fill="none" aria-hidden="true">
                <path d="M1.5 1 11 11l-9.5 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="morep-track" ref={trackRef} data-stag>
          {items.map((p) => {
            const inner = (
              <>
                <span className="proj-shot">
                  {p.image ? (
                    <img src={p.image} alt={`${p.title} preview`} loading="lazy" decoding="async" width={1600} height={900} />
                  ) : (
                    <MediaPlaceholder label={p.title} />
                  )}
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
                  {p.kicker}
                </div>
                <h3
                  className="vwork-name"
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-display), sans-serif",
                    fontWeight: 500,
                    fontSize: "var(--text-subtitle)",
                    lineHeight: 1.02,
                    letterSpacing: "-0.018em",
                  }}
                >
                  {p.title}
                </h3>
                <span className="linku link-cta" style={{ marginTop: 20 }}>
                  {p.external ? "Visit ↗" : "Open →"}
                </span>
              </>
            );

            const cardStyle: React.CSSProperties = {
              display: "flex",
              flexDirection: "column",
              textDecoration: "none",
              color: "inherit",
            };

            return p.external ? (
              <a key={p.slug} href={p.href} target="_blank" rel="noopener noreferrer" className="vwork morep-card" style={cardStyle}>
                {inner}
              </a>
            ) : (
              <Link key={p.slug} href={p.href} className="vwork morep-card" style={cardStyle}>
                {inner}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
