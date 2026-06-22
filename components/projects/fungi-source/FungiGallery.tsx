"use client";

import { useCallback, useEffect, useState } from "react";

export type GalleryItem = {
  image: string;
  caption: string; // descriptive line (lightbox + plate caption)
  href?: string; // source link shown in the lightbox
  hrefLabel?: string;
  title?: string; // cover grid: book title
  meta?: string; // cover grid: author · year
};

/**
 * A masonry plate wall or a cover grid, either of which opens a lightbox with
 * keyboard / arrow navigation. Used by the Fungi Source page for both the plate
 * gallery and the bibliography's cover grid.
 */
export default function FungiGallery({ items, variant }: { items: GalleryItem[]; variant: "masonry" | "covers" }) {
  const [open, setOpen] = useState<number | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const go = useCallback(
    (d: number) => setOpen((i) => (i === null ? i : (i + d + items.length) % items.length)),
    [items.length],
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

  return (
    <>
      <div className={variant === "covers" ? "fs-covers" : "fs-plates"} data-stag>
        {items.map((it, i) =>
          variant === "covers" ? (
            <button key={it.image + i} type="button" className="fs-cover" onClick={() => setOpen(i)} data-rvs>
              <span className="fs-cover-shot">
                <img src={it.image} alt={it.title || it.caption} loading="lazy" decoding="async" />
              </span>
              <span className="fs-cover-title">{it.title}</span>
              <span className="fs-cover-meta">{it.meta}</span>
            </button>
          ) : (
            <button key={it.image + i} type="button" className="fs-plate" onClick={() => setOpen(i)} data-rvs>
              <img src={it.image} alt={it.caption} loading="lazy" decoding="async" />
              <span className="fs-plate-cap">{it.caption}</span>
            </button>
          ),
        )}
      </div>

      {cur && (
        <div className="fs-lb" role="dialog" aria-modal="true" onClick={close}>
          <button type="button" className="fs-lb-x" onClick={close} aria-label="Close">✕</button>
          {items.length > 1 && (
            <button type="button" className="fs-lb-arrow prev" aria-label="Previous" onClick={(e) => { e.stopPropagation(); go(-1); }}>‹</button>
          )}
          <figure className="fs-lb-fig" onClick={(e) => e.stopPropagation()}>
            <img src={cur.image} alt={cur.caption} />
            <figcaption>
              {cur.title && <strong>{cur.title}</strong>}
              <span>{cur.caption}</span>
              {cur.href && (
                <a href={cur.href} target="_blank" rel="noopener noreferrer">
                  {cur.hrefLabel || "View source →"}
                </a>
              )}
            </figcaption>
          </figure>
          {items.length > 1 && (
            <button type="button" className="fs-lb-arrow next" aria-label="Next" onClick={(e) => { e.stopPropagation(); go(1); }}>›</button>
          )}
        </div>
      )}
    </>
  );
}
