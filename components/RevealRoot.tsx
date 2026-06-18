"use client";

import { useEffect, useRef } from "react";

/**
 * Page motion, GSAP + ScrollTrigger driven (ported from the generatives site's
 * motion language). Animates the shared markup hooks:
 *  - `.mask-line > span` — headline lines rise out of their clip
 *  - `[data-rv]`         — fade + rise (load / on enter)
 *  - `[data-rvs]`        — fade + rise on scroll-in
 *  - `[data-stag] > *`   — staggered children on scroll-in
 *  - `[data-par]`        — scrubbed positional parallax (y)
 *  - `[data-par-scale]`  — scrubbed scale parallax (slow zoom as it scrolls)
 *
 * Elements start hidden via the `.gsap-on` CSS states (set before paint by the
 * inline script in layout). Respects prefers-reduced-motion: when set, `.gsap-on`
 * is never added, content shows immediately, and this skips all motion.
 */
export default function RevealRoot({ children }: { children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let killed = false;
    let ctx: { revert: () => void } | undefined;

    (async () => {
      try {
        const [{ gsap }, { ScrollTrigger }] = await Promise.all([
          import("gsap"),
          import("gsap/ScrollTrigger"),
        ]);
        if (killed) return;
        gsap.registerPlugin(ScrollTrigger);

        // Hold the intro until the display font is ready AND the browser has
        // painted a clean frame. Otherwise the load animation starts mid-FOUT
        // (the headline re-measures when the font swaps in) and competes with
        // hydration — both read as a choppy/jumpy reveal. Content stays hidden
        // via `.gsap-on` until then, so there's no flash; the font wait is
        // capped so a slow font can never strand the page hidden.
        const fontsReady =
          typeof document !== "undefined" && document.fonts?.ready
            ? document.fonts.ready
            : Promise.resolve();
        await Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1200))]);
        if (killed) return;
        await new Promise<void>((r) =>
          requestAnimationFrame(() => requestAnimationFrame(() => r()))
        );
        if (killed) return;

        // Release the compositor-driven hero intro (CSS keyframes, see
        // globals.css .hero-rise/.hero-fade) at this font-stable, post-paint
        // moment — independent of the main-thread GSAP work below.
        document.documentElement.classList.add("intro-ready");

        ctx = gsap.context(() => {
          const vh = window.innerHeight || 800;
          // Is the element's (untransformed) trigger already in the first view?
          // Those play on load; everything else waits for ScrollTrigger. This
          // sidesteps ScrollTrigger mis-measuring elements that begin transformed.
          const inFold = (measureEl: HTMLElement) =>
            measureEl.getBoundingClientRect().top < vh * 0.92;

          // Reveal a target with `to` vars, on load if in-fold else on scroll.
          const reveal = (
            target: HTMLElement | HTMLElement[],
            measureEl: HTMLElement,
            fromVars: gsap.TweenVars,
            toVars: gsap.TweenVars,
            loadDelay = 0
          ) => {
            if (inFold(measureEl)) {
              gsap.fromTo(target, fromVars, { ...toVars, delay: loadDelay });
            } else {
              gsap.fromTo(target, fromVars, {
                ...toVars,
                scrollTrigger: { trigger: measureEl, start: "top 88%", once: true },
              });
            }
          };

          // Headline lines rise out of their masking clip (measure off the
          // untransformed .mask-line wrapper).
          gsap.utils.toArray<HTMLElement>(".mask-line > span").forEach((el, i) => {
            reveal(
              el,
              el.parentElement || el,
              { autoAlpha: 0, yPercent: 110 },
              { autoAlpha: 1, yPercent: 0, duration: 1.1, ease: "power3.out" },
              0.05 + i * 0.06
            );
          });

          // Single elements: fade + rise.
          (["[data-rv]", "[data-rvs]"] as const).forEach((sel) => {
            gsap.utils.toArray<HTMLElement>(sel).forEach((el) => {
              reveal(
                el,
                el,
                { autoAlpha: 0, y: sel === "[data-rvs]" ? 30 : 24 },
                { autoAlpha: 1, y: 0, duration: 0.9, ease: "power2.out" },
                0.15
              );
            });
          });

          // Staggered groups.
          gsap.utils.toArray<HTMLElement>("[data-stag]").forEach((grp) => {
            const items = Array.from(grp.children) as HTMLElement[];
            if (!items.length) return;
            reveal(
              items,
              grp,
              { autoAlpha: 0, y: 26 },
              { autoAlpha: 1, y: 0, duration: 0.8, ease: "power2.out", stagger: 0.08 },
              0.1
            );
          });

          // Scrubbed positional parallax.
          gsap.utils.toArray<HTMLElement>("[data-par]").forEach((el) => {
            const f = parseFloat(el.getAttribute("data-par") || "0") || 0;
            if (!f) return;
            gsap.fromTo(
              el,
              { y: f * 120 },
              {
                y: -f * 120,
                ease: "none",
                scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
              }
            );
          });

          // Scrubbed scale parallax — a subtle slow zoom as the element travels
          // the viewport. Stays >= 1 so an overflow-clipped media frame never
          // reveals its edges. Composes with [data-par] (GSAP tweens y + scale
          // as independent transform components on the same element).
          gsap.utils.toArray<HTMLElement>("[data-par-scale]").forEach((el) => {
            const f = parseFloat(el.getAttribute("data-par-scale") || "0") || 0;
            if (!f) return;
            gsap.fromTo(
              el,
              { scale: 1 },
              {
                scale: 1 + f,
                ease: "none",
                transformOrigin: "center center",
                scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
              }
            );
          });
        }, document.body);  // body-scoped so the shared Footer (rendered outside this wrapper) reveals too

        // Re-measure once fonts/images settle.
        ScrollTrigger.refresh();
        if (document.fonts?.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
      } catch {
        // GSAP failed to load — reveal everything so nothing stays hidden.
        document.documentElement.classList.remove("gsap-on");
      }
    })();

    return () => {
      killed = true;
      ctx?.revert();
    };
  }, []);

  return <div ref={rootRef}>{children}</div>;
}
