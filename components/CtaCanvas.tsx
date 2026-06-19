"use client";

import { useEffect, useRef } from "react";

/**
 * Closing-CTA background — the "Field Dynamics" algorithm from the Algorithms
 * catalogue, running live: invisible forces (vortices, sources, sinks) compose a
 * vector field, and particles stream the field lines leaving luminous ghost
 * traces. Defaults to the COLOUR variant (renderArt's `color:1`). RANDOMISE
 * (the `cta-mycelium-reseed` event) re-seeds with a fresh field + palette.
 */
export default function CtaCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let inst: { remove: () => void; noLoop?: () => void; loop?: () => void } | null = null;
    let render: typeof import("./projects/algorithms/engine/artGenerators").renderArt | null = null;
    let disposed = false;
    let seed = 1;
    let stillT = 0;
    let visible = false; // CTA starts below the fold — don't burn CPU until it's in view

    // p5 keeps a rAF loop running regardless of visibility, so gate it on the
    // viewport: the field only animates while the CTA is actually on screen.
    const applyVisibility = () => {
      if (!inst || reduce) return;
      if (visible && !document.hidden) inst.loop?.();
      else inst.noLoop?.();
    };

    // square sim canvas (stretched to fill the wide banner via 100%/100%); sized
    // to the larger edge so the field still reads after the cover-stretch.
    const simSize = () => {
      const r = host.getBoundingClientRect();
      return Math.max(420, Math.min(Math.round(Math.max(r.width, r.height)), 1100));
    };

    const mount = (s: number) => {
      if (!render || disposed) return;
      seed = s;
      window.clearTimeout(stillT);
      try {
        inst?.remove();
      } catch {
        /* noop */
      }
      host.replaceChildren();
      // Lighter than the Algorithms-page default (fewer particles, 24fps) — it's
      // a backdrop behind a scrim, not the hero of the page. The particle budget
      // is kept modest so it doesn't chug against the capabilities node graph in
      // the section above when both are on screen during a scroll.
      inst = render(host, "field-dynamics", seed, simSize(), 24, { color: 1, particles: 420 });
      // reduced motion: let it trace the field briefly, then hold a still frame.
      if (reduce && inst?.noLoop) stillT = window.setTimeout(() => inst?.noLoop?.(), 1600);
      else applyVisibility(); // a freshly mounted instance must respect current visibility
    };

    import("./projects/algorithms/engine/artGenerators")
      .then((m) => {
        if (disposed) return;
        render = m.renderArt;
        mount(Math.floor(Math.random() * 1e9));
      })
      .catch(() => {
        /* engine failed to load — leave the CTA bg empty */
      });

    let io: IntersectionObserver | null = null;
    if (!reduce && "IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            visible = e.isIntersecting;
            applyVisibility();
          }
        },
        { threshold: 0 }
      );
      io.observe(host);
    }

    const onVis = () => applyVisibility(); // also pause in a hidden tab
    document.addEventListener("visibilitychange", onVis);

    const onReseed = () => mount(Math.floor(Math.random() * 1e9));
    window.addEventListener("cta-mycelium-reseed", onReseed);

    let resizeT = 0;
    const onResize = () => {
      window.clearTimeout(resizeT);
      resizeT = window.setTimeout(() => mount(seed), 280); // same field, new size
    };
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.clearTimeout(stillT);
      window.clearTimeout(resizeT);
      window.removeEventListener("cta-mycelium-reseed", onReseed);
      window.removeEventListener("resize", onResize);
      try {
        inst?.remove();
      } catch {
        /* noop */
      }
    };
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden
      className="cta-bg"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "hidden", opacity: 0.6 }}
    />
  );
}
