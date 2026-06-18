"use client";

import { useState } from "react";

export type ResearchSlide = {
  title: string;
  body: string;
  attribution: string;
  cta: string;
  href: string;
};

/** The original's Webflow slider — one research paper at a time, prev/next arrows + dots. */
export default function ResearchCarousel({ items }: { items: ResearchSlide[] }) {
  const [i, setI] = useState(0);
  const n = items.length;
  const go = (d: number) => setI((p) => (p + d + n) % n);
  const it = items[i];

  return (
    <div className="sym-carousel">
      <button type="button" className="sym-arrow" onClick={() => go(-1)} aria-label="Previous article">
        <svg width="13" height="22" viewBox="0 0 13 22" fill="none" aria-hidden="true">
          <path d="M11.5 1 2 11l9.5 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="sym-slide" key={i}>
        <h3>{it.title}</h3>
        <p>{it.body}</p>
        <span className="sym-attr">{it.attribution}</span>
        <a className="sym-readbtn" href={it.href} target="_blank" rel="noopener noreferrer">
          {it.cta}
        </a>
      </div>

      <button type="button" className="sym-arrow" onClick={() => go(1)} aria-label="Next article">
        <svg width="13" height="22" viewBox="0 0 13 22" fill="none" aria-hidden="true">
          <path d="M1.5 1 11 11l-9.5 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="sym-dots" role="tablist" aria-label="Choose article">
        {items.map((s, k) => (
          <button
            key={s.href}
            type="button"
            className={k === i ? "on" : ""}
            onClick={() => setI(k)}
            role="tab"
            aria-selected={k === i}
            aria-label={`Article ${k + 1}: ${s.title}`}
          />
        ))}
      </div>
    </div>
  );
}
