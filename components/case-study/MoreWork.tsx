"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

export type MoreWorkItem = { slug: string; title: string; label?: string; image?: string };

/**
 * "See more work" — a horizontal slider showing 3 projects per page on desktop
 * (fewer as it narrows). The arrows step one card at a time; native scroll-snap
 * keeps cards aligned and the track keyboard/touch scrollable.
 */
export default function MoreWork({ items }: { items: MoreWorkItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }, []);

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
  }, [update]);

  const step = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const gap = parseFloat(getComputedStyle(el).columnGap || "0") || 24;
    const amount = card ? card.offsetWidth + gap : el.clientWidth / 3;
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  if (!items.length) return null;

  return (
    <section data-rvs className="page-gutter" style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "clamp(56px,9vh,120px) var(--gutter)", borderTop: "1px solid var(--line)" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: "clamp(28px,4vh,48px)" }}>
        <h2 style={{ fontFamily: "var(--font-display), sans-serif", fontSize: "clamp(28px,3.6vw,52px)", fontWeight: 500, letterSpacing: "-0.02em" }}>
          See more work
        </h2>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="ui-btn ui-btn-icon" aria-label="Previous projects" onClick={() => step(-1)} disabled={atStart}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button type="button" className="ui-btn ui-btn-icon" aria-label="Next projects" onClick={() => step(1)} disabled={atEnd}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div ref={trackRef} className="mw-track">
        {items.map((p) => (
          <Link key={p.slug} href={`/work/${p.slug}`} className="vwork mw-card" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="proj-shot mw-shot">
              {p.image ? (
                <img src={p.image} alt={`${p.title} preview`} loading="lazy" decoding="async" />
              ) : (
                <span className="mw-ph">{p.title}</span>
              )}
            </span>
            {p.label ? (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--fg-faint)", marginTop: 14 }}>
                {p.label}
              </span>
            ) : null}
            <span className="vwork-name" style={{ fontFamily: "var(--font-display), sans-serif", fontWeight: 500, fontSize: "clamp(20px,2vw,28px)", letterSpacing: "-0.018em", lineHeight: 1.05, marginTop: 6 }}>
              {p.title}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
