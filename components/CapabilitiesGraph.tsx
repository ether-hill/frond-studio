"use client";

import { useEffect, useRef } from "react";
import { CAP_NODES as NODES, CAP_LINKS as LINKS, GROUP_COLORS as COLORS, GROUP_COLORS_LIGHT as COLORS_LIGHT } from "@/lib/capabilities";

/**
 * Capabilities as an interactive 3D force-directed graph, rendered on a plain 2D
 * canvas (no three.js dep — keeps the bundle light and the main thread quiet).
 * Nodes are the capabilities themselves (text), sized by where our expertise
 * actually sits, coloured by discipline, and wired by how the work crosses over
 * (data in lib/capabilities). Drag to rotate, scroll to zoom, hover to trace a
 * capability's connections. The layout is force-settled once on mount; the loop
 * only rotates + projects, and pauses entirely when the section is off-screen.
 */

const FONT = '600 16px "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif';
const rgba = (c: [number, number, number], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

export default function CapabilitiesGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const n = NODES.length;
    const id2i = new Map(NODES.map((nd, i) => [nd.id, i]));
    const edges: [number, number][] = LINKS.map(
      ([a, b]) => [id2i.get(a)!, id2i.get(b)!] as [number, number]
    ).filter(([a, b]) => a !== undefined && b !== undefined);
    const adj: Set<number>[] = NODES.map(() => new Set<number>());
    for (const [a, b] of edges) {
      adj[a].add(b);
      adj[b].add(a);
    }

    // seeded PRNG so the layout is stable across reloads
    let s = 0x9e3779b9 ^ 0x1f2e3d4c;
    const rnd = () => {
      s |= 0; s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    type P = { x: number; y: number; z: number; vx: number; vy: number; vz: number };
    const pos: P[] = NODES.map(() => {
      const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, r = Math.cbrt(rnd());
      const sp = Math.sqrt(1 - u * u);
      return { x: r * sp * Math.cos(th), y: r * sp * Math.sin(th), z: r * u, vx: 0, vy: 0, vz: 0 };
    });

    // force-settle the layout once (annealed)
    const REP = 1.7, SPR = 0.035, REST = 1.15, CENTER = 0.008, DAMP = 0.86;
    let step = 1.0;
    for (let it = 0; it < 560; it++) {
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const dx = pos[i].x - pos[j].x, dy = pos[i].y - pos[j].y, dz = pos[i].z - pos[j].z;
          const d2 = dx * dx + dy * dy + dz * dz + 0.02;
          const d = Math.sqrt(d2);
          const f = REP / d2;
          const fx = (dx / d) * f, fy = (dy / d) * f, fz = (dz / d) * f;
          pos[i].vx += fx; pos[i].vy += fy; pos[i].vz += fz;
          pos[j].vx -= fx; pos[j].vy -= fy; pos[j].vz -= fz;
        }
      }
      for (const [a, b] of edges) {
        const dx = pos[b].x - pos[a].x, dy = pos[b].y - pos[a].y, dz = pos[b].z - pos[a].z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.001;
        const f = SPR * (d - REST);
        const fx = (dx / d) * f, fy = (dy / d) * f, fz = (dz / d) * f;
        pos[a].vx += fx; pos[a].vy += fy; pos[a].vz += fz;
        pos[b].vx -= fx; pos[b].vy -= fy; pos[b].vz -= fz;
      }
      for (let i = 0; i < n; i++) {
        pos[i].vx -= pos[i].x * CENTER; pos[i].vy -= pos[i].y * CENTER; pos[i].vz -= pos[i].z * CENTER;
        pos[i].vx *= DAMP; pos[i].vy *= DAMP; pos[i].vz *= DAMP;
        pos[i].x += pos[i].vx * step; pos[i].y += pos[i].vy * step; pos[i].z += pos[i].vz * step;
      }
      step *= 0.996;
    }
    // centre + normalise to unit radius
    let cx = 0, cy = 0, cz = 0;
    for (const p of pos) { cx += p.x; cy += p.y; cz += p.z; }
    cx /= n; cy /= n; cz /= n;
    let maxR = 1e-6;
    for (const p of pos) { p.x -= cx; p.y -= cy; p.z -= cz; maxR = Math.max(maxR, Math.hypot(p.x, p.y, p.z)); }
    for (const p of pos) { p.x /= maxR; p.y /= maxR; p.z /= maxR; }

    // view state
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let W = 0, H = 0;
    let rotX = -0.35, rotY = 0.4, hover = -1;
    let dragging = false, lastX = 0, lastY = 0;
    const proj = NODES.map(() => ({ sx: 0, sy: 0, depth: 0, persp: 1, fs: 12 }));

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const COL = document.documentElement.dataset.theme === "light" ? COLORS_LIGHT : COLORS;
      const cX = Math.cos(rotX), sX = Math.sin(rotX), cY = Math.cos(rotY), sY = Math.sin(rotY);
      // ~40% bigger than before so it fills the section, runs behind the copy
      // and spills off the edges.
      const R = Math.min(W, H) * 0.64;
      // widen the cluster (it's ~spherical) to span / overflow a wide section
      const xStretch = Math.min(1.7, Math.max(1, (W / H) * 0.8));
      // shifted right so it sits more to the right of the copy
      const focal = 2.7, ox = W * 0.6, oy = H / 2;
      for (let i = 0; i < n; i++) {
        const p = pos[i];
        const x1 = p.x * cY - p.z * sY, z1 = p.x * sY + p.z * cY;
        const y2 = p.y * cX - z1 * sX, z2 = p.y * sX + z1 * cX;
        const persp = focal / (focal + z2);
        proj[i].sx = ox + x1 * R * persp * xStretch;
        proj[i].sy = oy + y2 * R * persp;
        proj[i].depth = z2;
        proj[i].persp = persp;
        // smaller on average; micro words (val 3) land ~9px, hubs ~28px
        proj[i].fs = (1 + NODES[i].val * 2.7) * persp;
      }

      // edges (behind), faded by depth; brighter when touching the hovered node
      for (const [a, b] of edges) {
        const pa = proj[a], pb = proj[b];
        const near = hover >= 0 && (a === hover || b === hover);
        const dim = hover >= 0 && !near;
        const dep = (pa.depth + pb.depth) / 2;
        const base = 0.07 + 0.16 * (0.5 + dep * 0.5);
        const alpha = near ? 0.6 : dim ? base * 0.3 : base;
        ctx.strokeStyle = rgba(COL[NODES[a].group], alpha);
        ctx.lineWidth = (near ? 1.1 : 0.6) * ((pa.persp + pb.persp) / 2);
        ctx.beginPath();
        ctx.moveTo(pa.sx, pa.sy);
        ctx.lineTo(pb.sx, pb.sy);
        ctx.stroke();
      }

      // nodes back-to-front
      const order = [...proj.keys()].sort((i, j) => proj[i].depth - proj[j].depth);
      ctx.textBaseline = "middle";
      for (const i of order) {
        const p = proj[i], nd = NODES[i], col = COL[nd.group];
        const depthT = 0.5 + p.depth * 0.5;
        const hot = hover === i || (hover >= 0 && adj[hover].has(i));
        const dim = hover >= 0 && !hot && hover !== i;
        const alpha = (0.4 + 0.6 * depthT) * (dim ? 0.34 : 1);
        const fs = p.fs * (hover === i ? 1.12 : 1);
        ctx.fillStyle = rgba(col, alpha);
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, Math.max(1.4, fs * 0.12), 0, Math.PI * 2);
        ctx.fill();
        ctx.font = FONT.replace("16px", `${fs.toFixed(1)}px`);
        // labels grow inward near the right edge so they never clip off-canvas
        const rightSide = p.sx > W * 0.62;
        ctx.textAlign = rightSide ? "right" : "left";
        ctx.fillText(nd.label, p.sx + (rightSide ? -1 : 1) * fs * 0.34, p.sy);
      }
      ctx.textAlign = "left";
    };

    const hitTest = (mx: number, my: number) => {
      let best = -1, bestD = 26 * 26;
      for (let i = 0; i < n; i++) {
        const dx = mx - proj[i].sx, dy = my - proj[i].sy;
        const d = dx * dx + dy * dy;
        const rad = Math.max(16, proj[i].fs * 1.1);
        if (d < rad * rad && d < bestD) { bestD = d; best = i; }
      }
      return best;
    };

    // interaction
    const onDown = (e: PointerEvent) => {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (dragging) {
        rotY += (e.clientX - lastX) * 0.006;
        rotX += (e.clientY - lastY) * 0.006;
        rotX = Math.max(-1.35, Math.min(1.35, rotX));
        lastX = e.clientX; lastY = e.clientY;
      } else {
        const r = canvas.getBoundingClientRect();
        const h = hitTest(e.clientX - r.left, e.clientY - r.top);
        hover = h;
        canvas.style.cursor = h >= 0 ? "pointer" : "grab";
      }
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      try { canvas.releasePointerCapture(e.pointerId); } catch { /* noop */ }
      canvas.style.cursor = "grab";
    };
    const onLeave = () => { hover = -1; };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.style.cursor = "grab";

    // render loop, paused while off-screen
    let raf = 0, looping = false, visible = !reduce;
    const loop = () => {
      if (!visible) { looping = false; return; }
      if (!dragging && hover < 0) rotY += 0.0016; // gentle auto-orbit
      draw();
      raf = requestAnimationFrame(loop);
    };
    const startLoop = () => { if (!looping && visible) { looping = true; raf = requestAnimationFrame(loop); } };

    if (reduce) {
      draw(); // single still frame
    } else {
      startLoop();
    }

    let io: IntersectionObserver | null = null;
    if (!reduce && "IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) { visible = e.isIntersecting; if (visible) startLoop(); }
        },
        { threshold: 0 }
      );
      io.observe(canvas);
    }

    let resizeT = 0;
    const onResize = () => {
      window.clearTimeout(resizeT);
      resizeT = window.setTimeout(() => { resize(); draw(); }, 150);
    };
    window.addEventListener("resize", onResize);

    return () => {
      visible = false;
      cancelAnimationFrame(raf);
      io?.disconnect();
      window.clearTimeout(resizeT);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Interactive 3D graph of studio capabilities"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", touchAction: "pan-y", userSelect: "none" }}
    />
  );
}
