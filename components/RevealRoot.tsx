"use client";

import { useEffect, useRef } from "react";

/**
 * Wraps a page. Handles three motion concerns from the prototype:
 *  - load reveal: sets data-revealed="true" shortly after mount (drives [data-rv] + .mask-line)
 *  - scroll reveal: IntersectionObserver toggles data-inview on [data-rvs] / [data-stag]
 *  - parallax: translates [data-par] elements on scroll (rAF-throttled)
 * Respects prefers-reduced-motion.
 */
export default function RevealRoot({ children }: { children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Load reveal (page-scoped, drives [data-rv] + .mask-line).
    const revealTimer = window.setTimeout(() => root.setAttribute("data-revealed", "true"), 60);

    // Scroll reveal — document-wide so the shared footer (rendered outside this
    // wrapper, in the layout) reveals too.
    let revEls = Array.from(document.querySelectorAll<HTMLElement>("[data-rvs],[data-stag]"));
    const reveal = (el: Element) => el.setAttribute("data-inview", "true");

    let io: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              reveal(e.target);
              io!.unobserve(e.target);
              revEls = revEls.filter((x) => x !== e.target);
            }
          });
        },
        { threshold: 0.16, rootMargin: "0px 0px -10% 0px" }
      );
      revEls.forEach((el) => io!.observe(el));
    }

    // Scroll-position fallback (also catches anything already in view).
    const checkReveal = () => {
      const vh = window.innerHeight || 800;
      revEls = revEls.filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < vh * 0.88 && r.bottom > -40) {
          reveal(el);
          if (io) io.unobserve(el);
          return false;
        }
        return true;
      });
    };
    window.addEventListener("scroll", checkReveal, { passive: true });
    window.addEventListener("resize", checkReveal, { passive: true });
    checkReveal();

    // Parallax.
    const docTop = (el: HTMLElement) => {
      let y = 0;
      let n: HTMLElement | null = el;
      while (n) {
        y += n.offsetTop;
        n = n.offsetParent as HTMLElement | null;
      }
      return y;
    };
    let parRaf: number | null = null;
    const parTick = () => {
      parRaf = null;
      const vh = window.innerHeight;
      const sc = window.scrollY;
      document.querySelectorAll<HTMLElement>("[data-par]").forEach((el) => {
        const f = parseFloat(el.getAttribute("data-par") || "0") || 0;
        const off = (sc + vh / 2 - (docTop(el) + el.offsetHeight / 2)) * f;
        el.style.transform = `translate3d(0,${off.toFixed(1)}px,0)`;
      });
    };
    const onPar = () => {
      if (!reduce && parRaf === null) parRaf = requestAnimationFrame(parTick);
    };
    window.addEventListener("scroll", onPar, { passive: true });
    window.addEventListener("resize", onPar, { passive: true });
    if (!reduce) parTick();

    return () => {
      window.clearTimeout(revealTimer);
      window.removeEventListener("scroll", checkReveal);
      window.removeEventListener("resize", checkReveal);
      window.removeEventListener("scroll", onPar);
      window.removeEventListener("resize", onPar);
      if (parRaf !== null) cancelAnimationFrame(parRaf);
      if (io) io.disconnect();
    };
  }, []);

  return (
    <div ref={rootRef} data-revealed="false">
      {children}
    </div>
  );
}
