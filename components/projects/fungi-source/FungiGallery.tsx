"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type GalleryItem = {
  image: string;
  title?: string; // lightbox heading + cover-grid title
  meta?: string; // cover-grid + lightbox subline (author · year)
  caption?: string; // plate caption (grid + lightbox)
  body?: string; // lightbox: full summary
  details?: { label: string; value: string }[]; // lightbox: structured details
  href?: string;
  hrefLabel?: string;
};

type Props = {
  items: GalleryItem[];
  variant: "masonry" | "covers";
  /** Show this many to start (rest revealed via "Load more"). Default: all. */
  initialCount?: number;
  /** How many more each "Load more" reveals. */
  step?: number;
  /** Never reveal more than this many. Default: all items. */
  maxCount?: number;
  /** Label for the load-more control. */
  moreLabel?: string;
};

/**
 * A masonry plate wall or a cover grid, either of which opens a lightbox with
 * prev/next + keyboard nav. The lightbox renders through a portal to <body> so
 * it escapes the reveal system's transformed ancestors (a `position: fixed`
 * element inside a transformed parent is positioned relative to that parent,
 * which would otherwise trap and break it). The masonry variant supports a
 * "Load more" control; its tiles skip the per-item reveal so freshly-loaded
 * ones aren't stuck in the reveal-hidden state.
 */
export default function FungiGallery({ items, variant, initialCount, step = 12, maxCount, moreLabel = "Load more" }: Props) {
  const isBook = variant === "covers";
  const cap = Math.min(maxCount ?? items.length, items.length);
  const [shown, setShown] = useState(Math.min(initialCount ?? items.length, cap));
  const [open, setOpen] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const close = useCallback(() => setOpen(null), []);
  const go = useCallback(
    (d: number) => setOpen((i) => (i === null ? i : (i + d + shown) % shown)),
    [shown],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, go, close]);

  const cur = open === null ? null : items[open];

  const lightbox =
    cur && mounted
      ? createPortal(
          <div className="fs-lb" role="dialog" aria-modal="true" onClick={close}>
            <button type="button" className="fs-lb-x" onClick={close} aria-label="Close (Esc)">✕</button>
            {shown > 1 && (
              <button type="button" className="fs-lb-arrow prev" aria-label="Previous" onClick={(e) => { e.stopPropagation(); go(-1); }}>‹</button>
            )}
            <figure className={`fs-lb-fig${isBook ? " book" : ""}`} onClick={(e) => e.stopPropagation()}>
              <img src={cur.image} alt={cur.title || cur.caption || ""} />
              <figcaption>
                {cur.title && <strong>{cur.title}</strong>}
                {(cur.meta || cur.caption) && <span className="fs-lb-meta">{cur.meta || cur.caption}</span>}
                {cur.body && <p className="fs-lb-body">{cur.body}</p>}
                {cur.details && cur.details.length > 0 && (
                  <dl className="fs-lb-details">
                    {cur.details.map((d) => (
                      <Fragment key={d.label}>
                        <dt>{d.label}</dt>
                        <dd>{d.value}</dd>
                      </Fragment>
                    ))}
                  </dl>
                )}
                {cur.href && (
                  <a className="fs-lb-link" href={cur.href} target="_blank" rel="noopener noreferrer">
                    {cur.hrefLabel || "View source →"}
                  </a>
                )}
                <span className="fs-lb-count">{(open ?? 0) + 1} / {shown}</span>
              </figcaption>
            </figure>
            {shown > 1 && (
              <button type="button" className="fs-lb-arrow next" aria-label="Next" onClick={(e) => { e.stopPropagation(); go(1); }}>›</button>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className={isBook ? "fs-covers" : "fs-plates"} data-stag={isBook ? "" : undefined}>
        {items.slice(0, shown).map((it, i) =>
          isBook ? (
            <button key={it.image + i} type="button" className="fs-cover" onClick={() => setOpen(i)} data-rvs>
              <span className="fs-cover-shot">
                <img src={it.image} alt={it.title || ""} loading="lazy" decoding="async" />
              </span>
              <span className="fs-cover-title">{it.title}</span>
              <span className="fs-cover-meta">{it.meta}</span>
            </button>
          ) : (
            <button key={it.image + i} type="button" className="fs-plate" onClick={() => setOpen(i)}>
              <img src={it.image} alt={it.caption || ""} loading="lazy" decoding="async" />
              <span className="fs-plate-cap">{it.caption}</span>
            </button>
          ),
        )}
      </div>

      {shown < cap && (
        <div className="fs-more">
          <button type="button" className="ui-btn ui-btn-pill" onClick={() => setShown((s) => Math.min(s + step, cap))}>
            {moreLabel}
            <span className="fs-more-n">+{Math.min(step, cap - shown)}</span>
          </button>
          <span className="fs-more-count">{shown} of {cap}</span>
        </div>
      )}

      {lightbox}
    </>
  );
}
