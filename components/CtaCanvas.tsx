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

    let inst: { remove: () => void; noLoop?: () => void } | null = null;
    let render: typeof import("./projects/algorithms/engine/artGenerators").renderArt | null = null;
    let disposed = false;
    let seed = 1;
    let stillT = 0;

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
      inst = render(host, "field-dynamics", seed, simSize(), reduce ? 24 : 30, { color: 1 });
      // reduced motion: let it trace the field briefly, then hold a still frame.
      if (reduce && inst?.noLoop) stillT = window.setTimeout(() => inst?.noLoop?.(), 1600);
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
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "hidden", opacity: 0.6 }}
    />
  );
}
