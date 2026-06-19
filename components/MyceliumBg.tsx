"use client";

import { useEffect, useRef } from "react";

/**
 * Live mycelium background — the accumulative "Mycelium" generator from the
 * Algorithms catalogue, grown behind a hero. It paints perpetually (never
 * cleared), so the hyphae slowly colonise the panel. Lazily imports the p5
 * engine (client-only), pauses while off-screen or in a hidden tab, and holds a
 * single still frame under reduced motion. A scrim over it keeps copy legible.
 */
export default function MyceliumBg() {
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
    let visible = false;

    const applyVisibility = () => {
      if (!inst || reduce) return;
      if (visible && !document.hidden) inst.loop?.();
      else inst.noLoop?.();
    };

    // square sim buffer sized to the larger edge, CSS-stretched to cover the hero
    const simSize = () => {
      const r = host.getBoundingClientRect();
      return Math.max(440, Math.min(Math.round(Math.max(r.width, r.height)), 1100));
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
      // colour palettes (not mono); a calm 30fps — it's a backdrop, not the hero.
      inst = render(host, "mycelium", seed, simSize(), 30, { color: 1 });
      if (reduce && inst?.noLoop) stillT = window.setTimeout(() => inst?.noLoop?.(), 2200);
      else applyVisibility();
    };

    import("./projects/algorithms/engine/artGenerators")
      .then((m) => {
        if (disposed) return;
        render = m.renderArt;
        mount(Math.floor(Math.random() * 1e9));
      })
      .catch(() => {
        /* engine failed to load — leave the hero plain */
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

    const onVis = () => applyVisibility();
    document.addEventListener("visibilitychange", onVis);

    let resizeT = 0;
    const onResize = () => {
      window.clearTimeout(resizeT);
      resizeT = window.setTimeout(() => mount(seed), 280);
    };
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.clearTimeout(stillT);
      window.clearTimeout(resizeT);
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
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "hidden" }}
    />
  );
}
