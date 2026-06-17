"use client";

import { useEffect, useRef } from "react";

/** Generative flow-field: particles advect through a procedural field, leaving faint trails. */
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
    let P: { x: number; y: number; px: number; py: number }[] = [];

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const N = Math.max(60, Math.min(190, Math.floor((W * H) / 8200)));
      P = [];
      for (let i = 0; i < N; i++) P.push({ x: Math.random() * W, y: Math.random() * H, px: 0, py: 0 });
    };
    resize();
    window.addEventListener("resize", resize);

    const mouse = { x: -9999, y: -9999 };
    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    };
    const onLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };
    window.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);

    let t = 0;
    const step = () => {
      t += 0.0017;
      ctx.fillStyle = "rgba(11,10,8,0.058)";
      ctx.fillRect(0, 0, W, H);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(222,206,180,0.34)";
      for (const p of P) {
        p.px = p.x;
        p.py = p.y;
        const a = (Math.sin(p.x * 0.0021 + t) + Math.cos(p.y * 0.0021 - t * 1.3)) * Math.PI;
        let vx = Math.cos(a);
        let vy = Math.sin(a);
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 26000) {
          const d = Math.sqrt(d2) || 1;
          const f = (1 - d / 161) * 2.6;
          vx += (dx / d) * f;
          vy += (dy / d) * f;
        }
        p.x += vx * 1.1;
        p.y += vy * 1.1;
        if (p.x < 0) p.x = W;
        else if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        else if (p.y > H) p.y = 0;
        if (Math.abs(p.x - p.px) < 40 && Math.abs(p.y - p.py) < 40) {
          ctx.beginPath();
          ctx.moveTo(p.px, p.py);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
      }
    };

    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    if (reduce) {
      for (let k = 0; k < 140; k++) step();
    } else {
      const loop = () => {
        step();
        raf = requestAnimationFrame(loop);
      };
      loop();
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", opacity: 0.55 }}
    />
  );
}
