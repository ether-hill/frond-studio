"use client";

import { useEffect, useRef } from "react";

/**
 * Mycelium background for the closing CTA. Fine hyphal tips wander and branch
 * from seeded colonies, accumulating a hairline filament network. A very slow
 * fade keeps it alive (and legible behind the headline) rather than filling
 * solid. RANDOMISE (dispatched via the `cta-mycelium-reseed` event) rolls a new
 * palette + growth habit and starts a fresh colony.
 */
type Tip = { x: number; y: number; a: number; w: number; life: number; hue: number };

export default function CtaCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0;
    let H = 0;

    // theme-aware ink: light filaments on dark, dark filaments on light
    const isDark = () =>
      (document.documentElement.dataset.theme || "dark") !== "light";
    const bgRGB = () => (isDark() ? [11, 10, 8] : [244, 241, 234]);

    let tips: Tip[] = [];
    let baseHue = 150;
    let sat = 22;
    let turn = 0.34;
    let speed = 1.05;
    let branchP = 0.05;
    let frame = 0;

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const seedColony = (n: number) => {
      // colonies start near a random anchor with tips fanning outward
      const ax = rand(0.08, 0.92) * W;
      const ay = rand(0.12, 0.88) * H;
      const spread = rand(0, Math.PI * 2);
      for (let i = 0; i < n; i++) {
        tips.push({
          x: ax + rand(-8, 8),
          y: ay + rand(-8, 8),
          a: spread + (i / n) * Math.PI * 2 + rand(-0.5, 0.5),
          w: rand(0.9, 1.7),
          life: rand(160, 380),
          hue: baseHue + rand(-16, 16),
        });
      }
    };

    const reseed = (clear = true) => {
      baseHue = rand(0, 360);
      sat = rand(10, 34);
      turn = rand(0.22, 0.46);
      speed = rand(0.85, 1.3);
      branchP = rand(0.05, 0.085);
      tips = [];
      frame = 0;
      if (clear) {
        const [r, g, b] = bgRGB();
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(0, 0, W, H);
      }
      const colonies = 3 + (Math.random() * 3 | 0);
      for (let c = 0; c < colonies; c++) seedColony(13 + (Math.random() * 10 | 0));
    };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      reseed(true);
    };
    resize();
    window.addEventListener("resize", resize);

    const MAXT = 680;
    const SETTLE = 1300; // stop spawning after this many frames → a rich, stable network
    const lum = () => (isDark() ? rand(58, 80) : rand(30, 48));

    const step = () => {
      frame++;
      // Accumulative growth — like a real mycelium, segments persist and the
      // network fills the region (no per-frame fade). Legibility comes from the
      // low canvas opacity + the centre scrim, not from erasing the colony.

      const next: Tip[] = [];
      for (const t of tips) {
        const px = t.x;
        const py = t.y;
        t.a += rand(-turn, turn);
        t.x += Math.cos(t.a) * speed;
        t.y += Math.sin(t.a) * speed;
        t.w *= 0.997;
        t.life--;

        ctx.strokeStyle = `hsla(${t.hue},${sat}%,${lum()}%,0.34)`;
        ctx.lineWidth = Math.max(0.35, t.w);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(t.x, t.y);
        ctx.stroke();

        const out = t.x < -20 || t.x > W + 20 || t.y < -20 || t.y > H + 20;
        if (t.life <= 0 || out || t.w < 0.32) continue;

        // branch
        if (Math.random() < branchP && tips.length + next.length < MAXT) {
          next.push({
            x: t.x,
            y: t.y,
            a: t.a + rand(0.5, 1.0) * (Math.random() < 0.5 ? -1 : 1),
            w: t.w * 0.78,
            life: t.life * rand(0.5, 0.85),
            hue: t.hue + rand(-8, 8),
          });
        }
        next.push(t);
      }
      tips = next;

      // keep colonising until the region is filled, then let it settle
      if (frame < SETTLE && tips.length < 90 && frame % 5 === 0) seedColony(11 + (Math.random() * 8 | 0));
    };

    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    if (reduce) {
      for (let k = 0; k < 900; k++) step();
    } else {
      // a few growth sub-steps per frame so the network fills quickly and looks
      // the same regardless of refresh rate
      const loop = () => {
        step();
        step();
        step();
        raf = requestAnimationFrame(loop);
      };
      loop();
    }

    const onReseed = () => reseed(true);
    window.addEventListener("cta-mycelium-reseed", onReseed);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("cta-mycelium-reseed", onReseed);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", opacity: 0.5 }}
    />
  );
}
