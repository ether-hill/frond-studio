// Generative renderers for the Algorithms catalogue. Each entry is a real p5.js
// sketch (instance mode) that runs LIVE: the generator does its one-time init and
// returns a `frame()` closure which advances the simulation and paints one
// animation frame. The Algorithms page drives a large "hero" canvas plus a grid of
// seeded example tiles per algorithm — every one of them animating.
//
// Eleven systems: the six nature algorithms documented on the page (Physarum,
// Reaction–Diffusion, Boids, L-Systems, Voronoi, DLA) plus the five named
// movements from the `algorithmic-art` skill (Organic Turbulence, Quantum
// Harmonics, Recursive Whispers, Field Dynamics, Stochastic Crystallization).
//
// Palettes are drawn from the skill's Anthropic signature colours, luminous on a
// near-black ground so the gallery sits naturally inside the monochrome site.

import p5 from "p5";

// Live, tunable parameters (numbers keyed by name, plus optional hex colour keys).
// The Algorithms page passes nothing → each generator falls back to its built-in
// defaults; the Sandbox passes a params object the user edits in real time.
export type Params = Record<string, number | string>;
// A generator initialises state for (seed, size, params) and returns the per-frame step.
export type Gen = (p: any, seed: number, size: number, params?: Params) => () => void;
type RGB = [number, number, number];

// read a numeric param with a fallback default
const gp = (P: Params | undefined, k: string, d: number): number => {
  const v = P && P[k];
  return typeof v === "number" && isFinite(v) ? v : d;
};
// read a hex colour param → RGB with a fallback default
const gc = (P: Params | undefined, k: string, d: RGB): RGB => {
  const v = P && P[k];
  return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? rgb(v) : d;
};

const rgb = (hex: string): RGB => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// ──────────────────────────────────────────────────────── procedural colour ──
// HSL → RGB. h in degrees, s/l in 0..1. Lets each seed pick a fresh, harmonious
// palette so RANDOMISE varies hue/saturation/contrast, not just the layout.
const hsl = (h: number, s: number, l: number): RGB => {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
};
// Default-monochrome switch. The Algorithms page opens every demo in greyscale and
// only rolls colour when the user hits RANDOMISE (which passes `color:1`); renderArt
// sets this from the params before each generator runs. One toggle covers all demos
// because every generator draws its palette through autoPal / autoRamp.
let MONO_MODE = true;

// a vivid, luminous palette of `n` colours from a random colour scheme — for art on
// a dark ground. Always reads bright (l ≥ 0.42) so nothing randomises into mud. In
// MONO_MODE it returns a spread of greys instead, still separable element-to-element.
function autoPal(p: any, n: number): RGB[] {
  if (MONO_MODE) {
    const out: RGB[] = [];
    for (let i = 0; i < n; i++) {
      const base = n <= 1 ? 0.82 : 0.5 + 0.46 * (i / (n - 1));
      const l = Math.max(0.36, Math.min(0.98, base + (p.random() - 0.5) * 0.08));
      const v = Math.round(l * 255);
      out.push([v, v, v]);
    }
    return out;
  }
  const base = p.random(360);
  const schemes = [
    [0, 22, 44, 66, 88, 110],     // analogous sweep
    [0, 28, 184, 210, 56, 232],   // split-complementary
    [0, 120, 240, 60, 180, 300],  // triad + accents
    [0, 14, 28, 196, 210, 224],   // warm/cool duo-tone
    [0, 40, 80, 120, 160, 200],   // rainbow band
  ];
  const sc = schemes[Math.floor(p.random(schemes.length))];
  const sat = 0.58 + p.random() * 0.38;
  const out: RGB[] = [];
  for (let i = 0; i < n; i++) {
    const h = base + sc[i % sc.length] + (p.random() - 0.5) * 14;
    const l = Math.max(0.44, Math.min(0.84, 0.58 + 0.16 * Math.sin(i * 1.7) + (p.random() - 0.5) * 0.18));
    out.push(hsl(h, sat, l));
  }
  return out;
}
// a bg→lo→hi ramp from a random hue — for trail / density systems (Physarum, RD).
// In MONO_MODE the ramp is greyscale: near-black ground up to a near-white high.
function autoRamp(p: any): { bg: RGB; lo: RGB; hi: RGB } {
  if (MONO_MODE) {
    const h = Math.round((0.9 + p.random() * 0.08) * 255);
    return { bg: [9, 9, 11], lo: [54, 54, 58], hi: [h, h, h] };
  }
  const hue = p.random(360);
  const sat = 0.55 + p.random() * 0.4;
  return {
    bg: hsl(hue, sat * 0.7, 0.03 + p.random() * 0.025),
    lo: hsl(hue + (p.random() - 0.5) * 36, sat, 0.26 + p.random() * 0.12),
    hi: hsl(hue + (p.random() - 0.5) * 48, sat * 0.55, 0.72 + p.random() * 0.14),
  };
}
const lerp3 = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const BG: RGB = [9, 9, 11];

// Advance a seed for the next cycle of a looping "constructive" system.
const nextSeed = (s: number) => (s * 1103515245 + 12345) & 0x7fffffff;

// ─────────────────────────────────────────────────────── grid blit surface ──
// Many systems live on a coarse grid; rather than upscale pixel-by-pixel in JS
// every frame, we paint the grid into a tiny offscreen canvas once and let the
// GPU stretch it onto the visible canvas. Returns the RGBA buffer to write into.
interface Surface { off: HTMLCanvasElement; octx: CanvasRenderingContext2D; img: ImageData; data: Uint8ClampedArray; }
function gridSurface(G: number): Surface {
  const off = document.createElement("canvas");
  off.width = G;
  off.height = G;
  const octx = off.getContext("2d") as CanvasRenderingContext2D;
  const img = octx.createImageData(G, G);
  return { off, octx, img, data: img.data as Uint8ClampedArray };
}
function blit(p: any, s: Surface, size: number, smooth = true) {
  s.octx.putImageData(s.img, 0, 0);
  const ctx = p.drawingContext as CanvasRenderingContext2D;
  ctx.imageSmoothingEnabled = smooth;
  ctx.drawImage(s.off, 0, 0, size, size);
}

// ───────────────────────────────────────────────────────── skill movements ──

// Organic Turbulence — layered Perlin flow field; thousands of particles stream
// along it, trails accumulating additively while the field slowly evolves.
const organicTurbulence: Gen = (p, seed, size, params) => {
  p.randomSeed(seed);
  p.noiseSeed(seed);
  p.background(BG[0], BG[1], BG[2]);
  const colors = autoPal(p, 5);
  const big = size > 360;
  const scl = gp(params, "noiseScale", 0.0016 + p.random() * 0.0016);
  let z = p.random(1000);
  const N = Math.round(gp(params, "particles", big ? 1150 : 400));
  const x = new Float32Array(N);
  const y = new Float32Array(N);
  const life = new Float32Array(N);
  const spawn = (i: number) => { x[i] = p.random(size); y[i] = p.random(size); life[i] = 20 + p.random(90); };
  for (let i = 0; i < N; i++) spawn(i);
  const step = size * 0.001 * gp(params, "speed", 3.3);
  const evolve = gp(params, "evolve", 0.005);
  return () => {
    p.noStroke();
    p.fill(BG[0], BG[1], BG[2], 15);
    p.rect(0, 0, size, size);
    const ctx = p.drawingContext;
    ctx.globalCompositeOperation = "lighter";
    p.strokeWeight(big ? 1.3 : 0.85);
    for (let i = 0; i < N; i++) {
      const a = p.noise(x[i] * scl, y[i] * scl, z) * Math.PI * 4;
      const nx = x[i] + Math.cos(a) * step;
      const ny = y[i] + Math.sin(a) * step;
      const c = colors[i % colors.length];
      p.stroke(c[0], c[1], c[2], 44);
      p.line(x[i], y[i], nx, ny);
      x[i] = nx; y[i] = ny;
      if (--life[i] <= 0 || nx < -2 || nx > size + 2 || ny < -2 || ny > size + 2) spawn(i);
    }
    ctx.globalCompositeOperation = "source-over";
    z += evolve; // field evolution speed
  };
};

// Quantum Harmonics — point sources radiating sine waves; their interference,
// folded into n-fold rotational symmetry, breathes as the phases advance.
const quantumHarmonics: Gen = (p, seed, size, params) => {
  p.randomSeed(seed);
  const cols = autoPal(p, 4);
  const cA = cols[0], cB = cols[1];                    // glow hue drifts cA↔cB
  const accent = lerp3(cols[2], [255, 255, 255], 0.45); // nodes bloom toward white
  const sym = Math.round(gp(params, "symmetry", 3 + Math.floor(p.random(10)))); // 3–12 fold
  const mirror = p.random() < 0.6;                                              // kaleidoscopic reflection
  const G = size > 360 ? 300 : 150; // hi-res compute grid; blitted up to the canvas
  const cx = G / 2;
  const cy = G / 2;
  const M = Math.round(gp(params, "sources", 5 + Math.floor(p.random(7)))); // 5–11 sources → clear hyperbolic fringes
  const bandK = 2 + p.random() * 2.5; // fringe frequency in the colour map
  const phaseSpeed = gp(params, "phaseSpeed", 1);
  const sx: number[] = [];
  const sy: number[] = [];
  const fr: number[] = [];
  const ph: number[] = [];
  const dph: number[] = [];
  const amp: number[] = [];
  for (let i = 0; i < M; i++) {
    const r = p.random(G * 0.05, G * 0.45);
    const ang = p.random(Math.PI * 2);
    sx.push(cx + Math.cos(ang) * r);
    sy.push(cy + Math.sin(ang) * r);
    fr.push((0.06 + p.random() * 0.17) * (160 / G)); // higher frequencies → fine intricate interference, not smooth blobs
    ph.push(p.random(Math.PI * 2));
    dph.push((0.4 + p.random()) * 0.05);
    amp.push(0.6 + p.random() * 0.7);
  }
  const wedge = (Math.PI * 2) / sym;
  const surf = gridSurface(G);
  const data = surf.data;
  return () => {
    for (let i = 0; i < M; i++) ph[i] += dph[i] * phaseSpeed;
    for (let y = 0; y < G; y++) {
      for (let x = 0; x < G; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const rad = Math.hypot(dx, dy);
        let ang = Math.atan2(dy, dx);
        ang = ((ang % wedge) + wedge) % wedge;
        if (mirror) ang = Math.abs(ang - wedge * 0.5); // mirror each wedge → mandala
        const px = cx + Math.cos(ang) * rad;
        const py = cy + Math.sin(ang) * rad;
        let v = 0, w = 0;
        for (let i = 0; i < M; i++) {
          const d = Math.hypot(px - sx[i], py - sy[i]);
          v += amp[i] * Math.sin(d * fr[i] - ph[i]);
          w += Math.sin(d * fr[i] * 0.45 + ph[i] * 1.3); // slow second field → hue drift
        }
        v /= Math.sqrt(M); // keep amplitude → fringes stay crisp, not averaged to mush
        const band = (Math.sin(v * bandK) + 1) / 2; // periodic colour map → bright concentric/hyperbolic fringes
        const glow = Math.pow(band, 1.5);
        const node = Math.pow(band, 8) * 2.8; // sharp bright fringe crests
        const m = (Math.sin(w * 0.7) + 1) / 2;
        const idx = 4 * (y * G + x);
        data[idx] = Math.min(255, (cA[0] + (cB[0] - cA[0]) * m) * glow + accent[0] * node);
        data[idx + 1] = Math.min(255, (cA[1] + (cB[1] - cA[1]) * m) * glow + accent[1] * node);
        data[idx + 2] = Math.min(255, (cA[2] + (cB[2] - cA[2]) * m) * glow + accent[2] * node);
        data[idx + 3] = 255;
      }
    }
    blit(p, surf, size, true);
  };
};

// Recursive Whispers — self-similar branching, golden-angle splits. Grown live:
// the canopy unfurls branch by branch, then dissolves and regrows from a new seed.
const recursiveWhispers: Gen = (p, seed, size, params) => {
  let segs: { x1: number; y1: number; x2: number; y2: number; c: RGB; w: number }[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  const spreadF = gp(params, "splitAngle", 0.55);
  const depthBias = Math.round(gp(params, "maxDepth", 0));
  const CAP = 16000; // bound the per-frame redraw / recursion explosion
  let s = seed;
  const grow = () => {
    p.randomSeed(s);
    p.noiseSeed(s);
    p.background(BG[0], BG[1], BG[2]);
    segs = [];
    const cols = autoPal(p, 7);
    const maxDepth = depthBias > 0 ? depthBias : 10 + Math.floor(p.random(4)); // 10–13 → denser, lung/oak depth
    // every regrow rolls a different "species": split angle, droop/curl, branch
    // factor, length decay and growth habit (rooted tree vs radial coral burst).
    const baseSpread = golden * (0.4 + p.random() * 0.8);
    const curl = (p.random() - 0.5) * 0.5;
    const wob = 0.35 + p.random() * 0.95;
    const decayMin = 0.63 + p.random() * 0.13;
    const kidsBase = 2 + (p.random() < 0.58 ? 1 : 0);     // more 3-way splits → fern/lung density
    const branch = (x: number, y: number, ang: number, len: number, depth: number) => {
      if (depth > maxDepth || len < 1.6 || segs.length >= CAP) return;
      const nx = x + Math.cos(ang) * len;
      const ny = y + Math.sin(ang) * len;
      const c = cols[Math.min(cols.length - 1, Math.floor((depth / maxDepth) * cols.length))];
      segs.push({ x1: x, y1: y, x2: nx, y2: ny, c, w: Math.max(0.5, (maxDepth - depth) * 0.82) });
      const kids = kidsBase + (p.random() < 0.18 ? 1 : 0);
      for (let i = 0; i < kids; i++) {
        const spread = baseSpread * spreadF * (i - (kids - 1) / 2) + (p.random() - 0.5) * 0.28;
        const jitter = (p.noise(nx * 0.012, ny * 0.012, depth) - 0.5) * wob + curl;
        branch(nx, ny, ang + spread + jitter, len * (decayMin + p.random() * 0.17), depth + 1);
      }
    };
    if (p.random() < 0.62) {
      const trunks = 1 + Math.floor(p.random(3)); // rooted canopy
      for (let i = 0; i < trunks; i++) {
        branch(size * (0.22 + p.random() * 0.56), size * 0.98, -Math.PI / 2 + (p.random() - 0.5) * 0.55, size * (0.12 + p.random() * 0.06), 0);
      }
    } else {
      const bursts = 4 + Math.floor(p.random(7)); // radial coral / anemone
      for (let i = 0; i < bursts; i++) {
        branch(size * 0.5, size * 0.5, (i / bursts) * Math.PI * 2 + p.random() * 0.4, size * (0.09 + p.random() * 0.05), 0);
      }
    }
    // fit the whole structure to the frame so every habit fills it, centred
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const g of segs) {
      if (g.x1 < minX) minX = g.x1; if (g.x2 < minX) minX = g.x2;
      if (g.x1 > maxX) maxX = g.x1; if (g.x2 > maxX) maxX = g.x2;
      if (g.y1 < minY) minY = g.y1; if (g.y2 < minY) minY = g.y2;
      if (g.y1 > maxY) maxY = g.y1; if (g.y2 > maxY) maxY = g.y2;
    }
    const wd = (maxX - minX) || 1, ht = (maxY - minY) || 1;
    const sc = Math.min((size * 0.9) / wd, (size * 0.9) / ht);
    const fx = size / 2 - ((minX + maxX) / 2) * sc;
    const fy = size / 2 - ((minY + maxY) / 2) * sc;
    for (const g of segs) {
      g.x1 = g.x1 * sc + fx; g.y1 = g.y1 * sc + fy;
      g.x2 = g.x2 * sc + fx; g.y2 = g.y2 * sc + fy;
      g.w = Math.max(0.6, Math.min(7, g.w * sc));
    }
  };
  grow();
  let shown = 0;
  let mode = 0; // 0 grow · 1 hold · 2 dissolve
  let t = 0;
  let perFrame = Math.max(8, Math.ceil(segs.length / 55));
  return () => {
    if (mode === 2) {
      p.noStroke();
      p.fill(BG[0], BG[1], BG[2], 30);
      p.rect(0, 0, size, size);
      if (t++ > 22) { s = nextSeed(s); grow(); shown = 0; mode = 0; t = 0; perFrame = Math.max(8, Math.ceil(segs.length / 55)); }
      return;
    }
    if (shown >= segs.length) { if (t++ > 12) { mode = 2; t = 0; } return; }
    const end = Math.min(segs.length, shown + perFrame);
    const ctx = p.drawingContext as CanvasRenderingContext2D;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    // Batch the frame's new segments into Path2D buckets by width, stroke each once —
    // round-capped, depth-shaded, additive. Overlapping branches pool into glowing
    // volume (the layered, rounded look of lungs / oak / synapse) at a handful of calls.
    const buckets = new Map<number, { pa: Path2D; c: RGB; w: number }>();
    for (let i = shown; i < end; i++) {
      const g = segs[i];
      const wb = Math.max(1, Math.round(g.w * 1.5));
      let e = buckets.get(wb); if (!e) { e = { pa: new Path2D(), c: g.c, w: g.w }; buckets.set(wb, e); }
      e.pa.moveTo(g.x1, g.y1); e.pa.lineTo(g.x2, g.y2);
    }
    buckets.forEach((e) => {
      const ds = 0.45 + 0.55 * Math.min(1, e.w / 6);      // thicker (lower depth) → brighter
      ctx.strokeStyle = `rgba(${Math.min(255, e.c[0] * ds + 30) | 0},${Math.min(255, e.c[1] * ds + 30) | 0},${Math.min(255, e.c[2] * ds + 30) | 0},0.96)`;
      ctx.lineWidth = e.w; ctx.stroke(e.pa);
    });
    shown = end;
  };
};

// Field Dynamics — invisible forces made visible. Vortices, sources and sinks
// compose a vector field; particles stream the field lines, dying and respawning
// at the edges so the ghost-traced flow keeps renewing.
const fieldDynamics: Gen = (p, seed, size, params) => {
  p.randomSeed(seed);
  p.background(BG[0], BG[1], BG[2]);
  const colors = autoPal(p, 5);
  const big = size > 360;
  const K = Math.max(1, Math.round(gp(params, "singularities", 3 + Math.floor(p.random(3)))));
  const fade = gp(params, "fade", 5);
  const gx: number[] = [];
  const gy: number[] = [];
  const gk: number[] = [];
  const gs: number[] = [];
  for (let i = 0; i < K; i++) {
    gx.push(p.random(size * 0.15, size * 0.85));
    gy.push(p.random(size * 0.15, size * 0.85));
    gk.push(p.random());
    gs.push((0.5 + p.random()) * 0.32); // unitless: field normalised by size below
  }
  // distances normalised by `size` so field strength is scale-invariant — without
  // this the field weakens as 1/size and large canvases would render blank.
  const field = (x: number, y: number): [number, number] => {
    let vx = 0;
    let vy = 0;
    for (let i = 0; i < K; i++) {
      const dx = (x - gx[i]) / size;
      const dy = (y - gy[i]) / size;
      const d2 = dx * dx + dy * dy + 0.0016;
      const d = Math.sqrt(d2);
      const inv = gs[i] / d2;
      if (gk[i] < 0.5) {
        vx += (-dy / d) * inv;
        vy += (dx / d) * inv;
      } else {
        const sign = gk[i] < 0.78 ? 1 : -1;
        vx += (sign * dx / d) * inv;
        vy += (sign * dy / d) * inv;
      }
    }
    return [vx, vy];
  };
  const N = Math.round(gp(params, "particles", big ? 1300 : 380));
  const x = new Float32Array(N);
  const y = new Float32Array(N);
  const life = new Float32Array(N);
  const col = new Int32Array(N);
  // Spawn across the whole field (not just the edges): some fields collapse all
  // edge-born particles into a single attractor, leaving the rest of the frame
  // blank — seeding everywhere traces the entire field-line structure for any seed.
  const spawn = (i: number) => {
    x[i] = p.random(size);
    y[i] = p.random(size);
    life[i] = 40 + p.random(170);
    col[i] = Math.floor(p.random(colors.length));
  };
  for (let i = 0; i < N; i++) spawn(i);
  const step = size * 0.001 * gp(params, "speed", 4);
  return () => {
    p.noStroke();
    p.fill(BG[0], BG[1], BG[2], fade); // near-persistent: the full field-line structure accumulates
    p.rect(0, 0, size, size);
    const ctx = p.drawingContext;
    ctx.globalCompositeOperation = "lighter";
    p.strokeWeight(big ? 1.7 : 1.0); // bolder so the thin field lines survive scaling
    for (let i = 0; i < N; i++) {
      const [vx, vy] = field(x[i], y[i]);
      const m = Math.hypot(vx, vy);
      if (m < 0.02 || --life[i] <= 0) { spawn(i); continue; }
      const nx = x[i] + (vx / m) * step;
      const ny = y[i] + (vy / m) * step;
      const c = colors[col[i]];
      p.stroke(c[0], c[1], c[2], 42 + Math.min(50, m * 70));
      p.line(x[i], y[i], nx, ny);
      x[i] = nx; y[i] = ny;
      if (nx < 0 || nx > size || ny < 0 || ny > size) spawn(i);
    }
    ctx.globalCompositeOperation = "source-over";
  };
};

// Stochastic Crystallization — randomised circle packing, then brought to life: every
// circle breathes, and a constant churn pops circles out and back in so the lattice
// shimmers and pulses like a living tissue.
// Stochastic Crystallization — recursive Apollonian-style circle packing inside a
// bounding disk: each new circle grows to the largest radius that fits the gaps left
// by its neighbours, so progressively finer circles fractal-fill the voids. Drawn as
// nested line-art rings (circles within circles) that breathe and pop, alive.
const stochasticCrystallization: Gen = (p, seed, size, params) => {
  p.randomSeed(seed);
  const colors = autoPal(p, 6);
  const cxC = size / 2, cyC = size / 2;
  const BR = size * 0.47;                                  // bounding circle
  const maxR0 = size * (0.09 + p.random() * 0.08);
  const minR = size * 0.0045;
  const breatheSpeed = gp(params, "breathe", 0.05);
  const churnRate = gp(params, "churn", 0.5);
  const maxCount = Math.round(gp(params, "count", 900 + p.random() * 500));
  const cx: number[] = [];
  const cy: number[] = [];
  const cr: number[] = [];
  const attempts = size * 90;
  for (let a = 0; a < attempts && cr.length < maxCount; a++) {
    // uniform sample inside the bounding disk, then grow to the largest gap-filling radius
    const ang = p.random(Math.PI * 2);
    const rr = Math.sqrt(p.random()) * BR;
    const x = cxC + Math.cos(ang) * rr;
    const y = cyC + Math.sin(ang) * rr;
    let r = Math.min(maxR0, BR - Math.hypot(x - cxC, y - cyC));
    for (let i = 0; i < cr.length; i++) {
      const d = Math.hypot(x - cx[i], y - cy[i]) - cr[i];
      if (d < r) r = d;
      if (r < minR) break;
    }
    if (r >= minR) { cx.push(x); cy.push(y); cr.push(r - size * 0.0016); }
  }
  const n = cr.length;
  const scale = new Float32Array(n);
  const target = new Float32Array(n).fill(1);
  const phase = new Float32Array(n);
  const delay = new Float32Array(n);
  const colIdx = new Int32Array(n);
  const rings = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    phase[i] = p.random(Math.PI * 2);
    delay[i] = p.random(75);
    colIdx[i] = Math.floor(p.random(colors.length));
    rings[i] = 1 + Math.floor(cr[i] / (size * 0.022)); // bigger circles nest more rings inside
  }
  const lineW = Math.max(0.7, size * 0.0021);
  let f = 0;
  return () => {
    f++;
    p.background(BG[0], BG[1], BG[2]);
    p.noFill();
    p.stroke(170, 172, 182, 90);
    p.strokeWeight(lineW);
    p.circle(cxC, cyC, BR * 2); // the bounding membrane
    for (let k = 0; k < 2; k++) {
      if (p.random() < churnRate) {
        const i = Math.floor(p.random(n));
        if (scale[i] > 0.7) target[i] = 0;
      }
    }
    for (let i = 0; i < n; i++) {
      if (f < delay[i]) continue;
      scale[i] += (target[i] - scale[i]) * 0.16;
      if (target[i] === 0 && scale[i] < 0.06) target[i] = 1;
      if (scale[i] < 0.02) continue;
      const breath = 0.9 + 0.1 * Math.sin(f * breatheSpeed + phase[i]);
      const baseR = cr[i] * scale[i] * breath;
      const c = colors[colIdx[i]];
      p.stroke(c[0], c[1], c[2], 235);
      p.strokeWeight(lineW);
      const nr = Math.min(rings[i], 4); // nested concentric rings → circles within circles
      for (let k = 0; k < nr; k++) {
        const rk = baseR * (1 - k * 0.28);
        if (rk > size * 0.004) p.circle(cx[i], cy[i], rk * 2);
      }
    }
  };
};

// ─────────────────────────────────────────────────────────── nature systems ──

// Physarum — agent swarm laying and following a chemoattractant trail; the
// minimal transport network emerges and keeps reorganising. Tuned to the studio
// playground's purple "Jones" configuration.
const physarum: Gen = (p, seed, size, params) => {
  p.randomSeed(seed);
  // no colour override (RANDOMISE) → a fresh hue ramp; the page passes Monochrome Drift by default.
  const ramp = autoRamp(p);
  const bg = gc(params, "bg", ramp.bg);
  const lo = gc(params, "lo", ramp.lo);
  const hi = gc(params, "hi", ramp.hi);
  const big = size > 360;
  const G = big ? 185 : 104; // grid scales with canvas → cheap thumbnails
  const trail = new Float32Array(G * G);
  const tmp = new Float32Array(G * G);
  const n = Math.floor(G * G * gp(params, "density", 0.065 + p.random() * 0.05));
  const ax = new Float32Array(n);
  const ay = new Float32Array(n);
  const ah = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    ax[i] = p.random(G);
    ay[i] = p.random(G);
    ah[i] = p.random(Math.PI * 2);
  }
  // personality randomised from the seed when not overridden → networks that range
  // from tight reticulated webs to long drifting filaments.
  const sa = gp(params, "sensorAngle", 12 + p.random() * 24) * Math.PI / 180;
  const ta = gp(params, "turnSpeed", 22 + p.random() * 30) * Math.PI / 180;
  const sd = Math.max(3, gp(params, "sensorDist", G * (0.028 + p.random() * 0.055)));
  const stepLen = gp(params, "stepSize", 0.9 + p.random() * 1.0);
  const decay = gp(params, "decay", 0.90 + p.random() * 0.055);
  const gamma = gp(params, "gamma", 0.36 + p.random() * 0.3);
  const substeps = Math.max(1, Math.round(gp(params, "speed", 2 + p.random() * 2.4)));
  const sample = (x: number, y: number) => {
    const xi = ((x | 0) % G + G) % G;
    const yi = ((y | 0) % G + G) % G;
    return trail[yi * G + xi];
  };
  const surf = gridSurface(G);
  const data = surf.data;
  return () => {
    for (let sub = 0; sub < substeps; sub++) {
      for (let i = 0; i < n; i++) {
        const h = ah[i];
        const x = ax[i];
        const y = ay[i];
        const f = sample(x + Math.cos(h) * sd, y + Math.sin(h) * sd);
        const l = sample(x + Math.cos(h - sa) * sd, y + Math.sin(h - sa) * sd);
        const r = sample(x + Math.cos(h + sa) * sd, y + Math.sin(h + sa) * sd);
        let nh = h;
        if (f >= l && f >= r) nh = h;
        else if (l > r) nh = h - ta;
        else if (r > l) nh = h + ta;
        else nh = h + (p.random() - 0.5) * ta;
        ah[i] = nh;
        let nx = x + Math.cos(nh) * stepLen;
        let ny = y + Math.sin(nh) * stepLen;
        nx = (nx % G + G) % G;
        ny = (ny % G + G) % G;
        ax[i] = nx;
        ay[i] = ny;
        trail[(ny | 0) * G + (nx | 0)] += 1;
      }
    }
    // diffuse (3×3 box) + decay — carves the stable channels
    for (let y = 0; y < G; y++) {
      const ym = ((y - 1 + G) % G) * G;
      const yp = ((y + 1) % G) * G;
      const yc = y * G;
      for (let x = 0; x < G; x++) {
        const xm = (x - 1 + G) % G;
        const xp = (x + 1) % G;
        const sum =
          trail[ym + xm] + trail[ym + x] + trail[ym + xp] +
          trail[yc + xm] + trail[yc + x] + trail[yc + xp] +
          trail[yp + xm] + trail[yp + x] + trail[yp + xp];
        // Heavily centre-weighted: the reference config uses diffuse≈0, so keep
        // filaments single-cell sharp (a strong blur fuses them into fat parallel
        // lanes instead of a reticulated web). 0.93 decay carves stable channels.
        tmp[yc + x] = (trail[yc + x] * 0.84 + (sum / 9) * 0.16) * decay;
      }
    }
    trail.set(tmp);
    let maxv = 1e-3;
    for (let i = 0; i < trail.length; i++) if (trail[i] > maxv) maxv = trail[i];
    const inv = 1 / maxv;
    for (let i = 0; i < trail.length; i++) {
      const v = Math.pow(Math.min(1, trail[i] * inv), gamma);
      const c = v < 0.5 ? lerp3(bg, lo, v * 2) : lerp3(lo, hi, (v - 0.5) * 2);
      const idx = i * 4;
      data[idx] = c[0];
      data[idx + 1] = c[1];
      data[idx + 2] = c[2];
      data[idx + 3] = 255;
    }
    blit(p, surf, size, true);
  };
};

// Reaction–Diffusion — Gray–Scott morphogenesis. Two chemicals diffuse and react;
// the pattern spreads and evolves frame by frame.
const grayScott: Gen = (p, seed, size, params) => {
  p.randomSeed(seed);
  const big = size > 360;
  const G = big ? 120 : 74; // grid scales with canvas
  const iters = Math.max(1, Math.round(gp(params, "speed", 10)));
  let U = new Float32Array(G * G).fill(1);
  let V = new Float32Array(G * G);
  const U2 = new Float32Array(G * G);
  const V2 = new Float32Array(G * G);
  const splats = 8 + Math.floor(p.random(12));
  for (let s = 0; s < splats; s++) {
    const cx = Math.floor(p.random(G));
    const cy = Math.floor(p.random(G));
    const rr = 2 + Math.floor(p.random(5));
    for (let y = -rr; y <= rr; y++) {
      for (let x = -rr; x <= rr; x++) {
        const xx = cx + x;
        const yy = cy + y;
        if (xx < 0 || yy < 0 || xx >= G || yy >= G) continue;
        if (x * x + y * y <= rr * rr) V[yy * G + xx] = 1;
      }
    }
  }
  const feed = gp(params, "feed", 0.034 + p.random() * 0.024);
  const kill = gp(params, "kill", 0.057 + p.random() * 0.008);
  const Du = 0.16;
  const Dv = 0.08;
  const lo = rgb("#1a1a22");
  const mid = rgb("#6a9bcc");
  const hi = rgb("#f2d4a7");
  const surf = gridSurface(G);
  const data = surf.data;
  let Uc = U;
  let Vc = V;
  let Un = U2;
  let Vn = V2;
  return () => {
    for (let it = 0; it < iters; it++) {
      for (let y = 0; y < G; y++) {
        const ym = ((y - 1 + G) % G) * G;
        const yp = ((y + 1) % G) * G;
        const yc = y * G;
        for (let x = 0; x < G; x++) {
          const xm = (x - 1 + G) % G;
          const xp = (x + 1) % G;
          const i = yc + x;
          const lapU = Uc[yc + xm] + Uc[yc + xp] + Uc[ym + x] + Uc[yp + x] - 4 * Uc[i];
          const lapV = Vc[yc + xm] + Vc[yc + xp] + Vc[ym + x] + Vc[yp + x] - 4 * Vc[i];
          const uvv = Uc[i] * Vc[i] * Vc[i];
          Un[i] = Uc[i] + Du * lapU - uvv + feed * (1 - Uc[i]);
          Vn[i] = Vc[i] + Dv * lapV + uvv - (kill + feed) * Vc[i];
        }
      }
      let t = Uc; Uc = Un; Un = t;
      t = Vc; Vc = Vn; Vn = t;
    }
    for (let i = 0; i < G * G; i++) {
      const v = Math.max(0, Math.min(1, Vc[i] * 2.4));
      const c = v < 0.5 ? lerp3(lo, mid, v / 0.5) : lerp3(mid, hi, (v - 0.5) / 0.5);
      const idx = i * 4;
      data[idx] = c[0];
      data[idx + 1] = c[1];
      data[idx + 2] = c[2];
      data[idx + 3] = 255;
    }
    blit(p, surf, size, true);
  };
};

// Boids — emergent flocking, tuned for the restless unpredictability of a real
// starling murmuration. On top of Reynolds' separation / alignment / cohesion sit
// three things that keep the flock from settling into a steady stream: a slowly
// wandering curl-noise flow field that swings the whole flock's direction over time,
// soft boundary containment so the body turns and folds back into frame instead of
// wrapping, and intermittent "predator" scares that tear the flock open and let it
// reform — the swooshing agitation waves murmurations are known for.
const boids: Gen = (p, seed, size, params) => {
  p.randomSeed(seed);
  p.noiseSeed(seed);
  p.background(BG[0], BG[1], BG[2]);
  const colors = autoPal(p, 6);
  const big = size > 360;
  const N = Math.round(gp(params, "count", big ? 560 : 200));
  const sepW = gp(params, "separation", 1.5);
  const fade = gp(params, "trailFade", 17);
  const px: number[] = [], py: number[] = [], vx: number[] = [], vy: number[] = [];
  const maxS = size * 0.001 * gp(params, "speed", 12);
  const minS = maxS * 0.5;                       // never fully stop → always banking
  // start as a loose blob near centre so the flock reads as one body
  for (let i = 0; i < N; i++) {
    const a = p.random(Math.PI * 2), r = p.random(size * 0.22);
    px.push(size / 2 + Math.cos(a) * r); py.push(size / 2 + Math.sin(a) * r);
    const va = p.random(Math.PI * 2);
    vx.push(Math.cos(va) * maxS); vy.push(Math.sin(va) * maxS);
  }
  const R = size * 0.06, R2 = R * R;
  const head = big ? 2.7 : 1.8;
  const flowScale = 1.5 / size;                  // spatial scale of the wandering field
  const wanderW = gp(params, "wander", 0.55);    // how hard the flock follows the flow
  let flowT = p.random(1000);

  // predator scares — a point that crosses the frame and the flock flees
  const PR = size * 0.2, PR2 = PR * PR;
  let pred = { on: false, x: 0, y: 0, vx: 0, vy: 0, ttl: 0 };
  let nextScare = 90 + p.random() * 200;
  let frame = 0;

  // chaos → order → chaos phase loop. The flock drifts in disorder (wander dominates),
  // gradually unifies onto a single shared heading (alignment ramps up, wander falls),
  // holds that ordered stream, then a predator scare shatters it back to chaos. Phase
  // durations are seed-varied so no two runs pulse the same way.
  let phase = 0, pt = 0, kGlobal = 0, curWander = wanderW;
  let gdir = p.random(Math.PI * 2);
  const DUR = [180 + p.random() * 200, 210 + p.random() * 130, 150 + p.random() * 140];

  const stepFlock = () => {
    flowT += 0.0019;                             // field drifts → direction keeps changing
    frame++; pt++;
    // phase machine (eased ramps between regimes)
    if (phase === 0) {                           // CHAOS
      kGlobal += (0 - kGlobal) * 0.05; curWander += (wanderW - curWander) * 0.04;
      if (pt > DUR[0]) { phase = 1; pt = 0; gdir = p.random(Math.PI * 2); }
    } else if (phase === 1) {                    // CONVERGING → order
      kGlobal += (0.95 - kGlobal) * 0.03; curWander += (0.08 - curWander) * 0.03;
      if (pt > DUR[1]) { phase = 2; pt = 0; }
    } else {                                     // ORDER (unified stream), then shatter
      kGlobal += (1.15 - kGlobal) * 0.04; curWander += (0.05 - curWander) * 0.04;
      if (pt > DUR[2]) { phase = 0; pt = 0; nextScare = frame; } // scare fires now
    }
    const gdx = Math.cos(gdir), gdy = Math.sin(gdir);
    // advance / schedule the predator
    if (pred.on) {
      pred.x += pred.vx; pred.y += pred.vy;
      if (--pred.ttl <= 0) { pred.on = false; nextScare = frame + 120 + p.random() * 260; }
    } else if (frame > nextScare) {
      const edge = Math.floor(p.random(4));
      pred.x = edge === 1 ? size : edge === 3 ? 0 : p.random(size);
      pred.y = edge === 0 ? 0 : edge === 2 ? size : p.random(size);
      const tx = size * (0.3 + p.random() * 0.4), ty = size * (0.3 + p.random() * 0.4);
      const ad = Math.hypot(tx - pred.x, ty - pred.y) || 1;
      const ps = maxS * 1.3;
      pred.vx = (tx - pred.x) / ad * ps; pred.vy = (ty - pred.y) / ad * ps;
      pred.ttl = 70 + p.random() * 90; pred.on = true;
    }
    for (let i = 0; i < N; i++) {
      let sepx = 0, sepy = 0, alx = 0, aly = 0, cox = 0, coy = 0, cnt = 0;
      for (let j = 0; j < N; j++) {
        if (i === j) continue;
        const dx = px[i] - px[j], dy = py[i] - py[j];
        const d2 = dx * dx + dy * dy;
        if (d2 < R2 && d2 > 0) {
          sepx += dx / d2; sepy += dy / d2;
          alx += vx[j]; aly += vy[j];
          cox += px[j]; coy += py[j];
          cnt++;
        }
      }
      let ax = 0, ay = 0;
      if (cnt > 0) {
        alx /= cnt; aly /= cnt; cox /= cnt; coy /= cnt;
        ax += sepx * sepW * maxS + (alx - vx[i]) + (cox - px[i]) * 0.012;
        ay += sepy * sepW * maxS + (aly - vy[i]) + (coy - py[i]) * 0.012;
      }
      // global alignment to the shared heading — drives the order phase (unified flow)
      ax += (gdx * maxS - vx[i]) * kGlobal; ay += (gdy * maxS - vy[i]) * kGlobal;
      // wandering curl-noise flow — dominates in chaos, fades out in order
      const fa = p.noise(px[i] * flowScale, py[i] * flowScale, flowT) * Math.PI * 4;
      ax += Math.cos(fa) * maxS * curWander; ay += Math.sin(fa) * maxS * curWander;
      // in chaos, a gentle pull to centre keeps the flock a cohesive swirling mass;
      // it releases as order takes over so the unified stream can flow across (wrapped)
      const chaosF = 1 - Math.min(1, kGlobal);
      ax += (size / 2 - px[i]) * 0.0006 * chaosF * maxS; ay += (size / 2 - py[i]) * 0.0006 * chaosF * maxS;
      // flee the predator → split-and-reform swooshes
      if (pred.on) {
        const dx = px[i] - pred.x, dy = py[i] - pred.y, d2 = dx * dx + dy * dy;
        if (d2 < PR2) { const d = Math.sqrt(d2) || 1; const f = (1 - d / PR) * maxS * 3.2; ax += dx / d * f; ay += dy / d * f; }
      }
      vx[i] += ax * 0.16; vy[i] += ay * 0.16;
      const sp = Math.hypot(vx[i], vy[i]) || 1;          // clamp speed into [minS,maxS]
      if (sp > maxS) { vx[i] = vx[i] / sp * maxS; vy[i] = vy[i] / sp * maxS; }
      else if (sp < minS) { vx[i] = vx[i] / sp * minS; vy[i] = vy[i] / sp * minS; }
    }
  };

  return () => {
    p.noStroke();
    p.fill(BG[0], BG[1], BG[2], fade);             // gentle fade → trails linger
    p.rect(0, 0, size, size);
    const ctx = p.drawingContext;
    ctx.globalCompositeOperation = "lighter";
    p.strokeWeight(big ? 1.5 : 1.0);
    for (let sub = 0; sub < 2; sub++) {            // two integration steps per frame
      stepFlock();
      for (let i = 0; i < N; i++) {
        const nx = (px[i] + vx[i] + size) % size;        // toroidal wrap → unified flow can stream across
        const ny = (py[i] + vy[i] + size) % size;
        const c = colors[i % colors.length];
        const sp = Math.hypot(vx[i], vy[i]);
        p.stroke(c[0], c[1], c[2], 60 + 90 * Math.min(1, sp / maxS)); // faster = brighter (banking)
        if (Math.abs(nx - px[i]) < size * 0.5 && Math.abs(ny - py[i]) < size * 0.5)
          p.line(px[i], py[i], nx, ny);                  // skip the seam line on wrap
        px[i] = nx; py[i] = ny;
      }
    }
    p.noStroke();
    for (let i = 0; i < N; i++) {
      const c = colors[i % colors.length];
      p.fill(c[0], c[1], c[2], 240);
      p.circle(px[i], py[i], head);
    }
    ctx.globalCompositeOperation = "source-over";
  };
};

// L-Systems — reframed as a continuously growing procedural jungle. Instead of one
// Lindenmayer plant drawn then wiped, a population of plants of several species —
// Lindenmayer ferns and bushes, plus procedurally-built palms and climbing ivy —
// spawns along the ground over time, each unfurling stroke by stroke, swaying when
// mature, then fading so a new frond can take its place. Plants are layered back-to-
// front for depth. Default monochrome; RANDOMISE rolls a colour.
const lSystem: Gen = (p, seed, size, params) => {
  p.randomSeed(seed);
  p.noiseSeed(seed);
  // foliage vs stem tones (greyscale by default; one hue when coloured)
  const pal = autoPal(p, 6);
  const stemTone = pal[3];
  const leafTone = pal[Math.min(5, pal.length - 1)];

  // a segment in plant-local space: origin at the base, +y points UP, unit step.
  interface Seg { x1: number; y1: number; x2: number; y2: number; d: number; leaf: boolean; }

  // ---- generic Lindenmayer turtle (returns local segments + bbox) ----
  const lbuild = (axiom: string, rules: Record<string, string>, iter: number, angDeg: number, wobble: number, cap: number) => {
    let str = axiom;
    for (let k = 0; k < iter && str.length < 120000; k++) {
      let nx = "";
      for (const ch of str) { nx += rules[ch] ?? ch; if (nx.length > 120000) break; }
      str = nx;
    }
    const segs: Seg[] = [];
    const base = (angDeg * Math.PI) / 180;
    let x = 0, y = 0, a = 0;                 // a=0 → straight up
    let depth = 0, maxD = 0;
    const stack: number[][] = [];
    let minX = 0, maxX = 0, maxY = 0;
    for (const ch of str) {
      if (segs.length >= cap) break;
      if (ch === "F") {
        const nx = x + Math.sin(a), ny = y + Math.cos(a);
        segs.push({ x1: x, y1: y, x2: nx, y2: ny, d: depth, leaf: depth >= 2 });
        x = nx; y = ny;
        if (x < minX) minX = x; if (x > maxX) maxX = x; if (y > maxY) maxY = y;
        if (depth > maxD) maxD = depth;
      } else if (ch === "+") { a += base + (p.noise(x * 0.05, y * 0.05) - 0.5) * wobble; }
      else if (ch === "-") { a -= base + (p.noise(x * 0.05 + 9, y * 0.05) - 0.5) * wobble; }
      else if (ch === "[") { stack.push([x, y, a, depth]); depth++; }
      else if (ch === "]") { const s = stack.pop(); if (s) { x = s[0]; y = s[1]; a = s[2]; depth = s[3]; } }
    }
    return { segs, maxD: Math.max(1, maxD), w: Math.max(1, maxX - minX), h: Math.max(1, maxY) };
  };

  // ---- procedural palm: a short trunk + a crown of arching feather fronds ----
  const buildPalm = () => {
    const segs: Seg[] = [];
    const trunkH = 5 + p.random() * 3, steps = 9;
    let tx = 0, ty = 0; const lean = (p.random() - 0.5) * 0.5;
    for (let i = 0; i < steps; i++) {
      const nx = tx + Math.sin(lean * (i / steps)) * 0.5, ny = ty + trunkH / steps;
      segs.push({ x1: tx, y1: ty, x2: nx, y2: ny, d: 0, leaf: false });
      tx = nx; ty = ny;
    }
    const K = 6 + Math.floor(p.random() * 5);
    const frondLen = 5 + p.random() * 3;
    for (let f = 0; f < K; f++) {
      const spread = -1.15 + (f / (K - 1)) * 2.3;        // fan, radians from vertical
      const droop = 0.5 + p.random() * 0.4;
      let fx = tx, fy = ty, ang = spread;
      const ribs = 10;
      for (let i = 0; i < ribs; i++) {
        ang += droop / ribs * Math.sign(spread || 1);     // arch downward as it extends
        const nx = fx + Math.sin(ang) * (frondLen / ribs), ny = fy + Math.cos(ang) * (frondLen / ribs);
        segs.push({ x1: fx, y1: fy, x2: nx, y2: ny, d: 1, leaf: false });
        // pinnae (leaflets) along the rachis
        const pl = 0.8 * (1 - i / ribs);
        for (const sgn of [-1, 1]) {
          const la = ang + sgn * 1.0;
          segs.push({ x1: nx, y1: ny, x2: nx + Math.sin(la) * pl, y2: ny + Math.cos(la) * pl, d: 2, leaf: true });
        }
        fx = nx; fy = ny;
      }
    }
    let maxY = 0, minX = 0, maxX = 0;
    for (const s of segs) { maxY = Math.max(maxY, s.y1, s.y2); minX = Math.min(minX, s.x1, s.x2); maxX = Math.max(maxX, s.x1, s.x2); }
    return { segs, maxD: 2, w: Math.max(1, maxX - minX), h: Math.max(1, maxY) };
  };

  const bbox = (segs: Seg[], md: number): Built => {
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    for (const s of segs) { minX = Math.min(minX, s.x1, s.x2); maxX = Math.max(maxX, s.x1, s.x2); minY = Math.min(minY, s.y1, s.y2); maxY = Math.max(maxY, s.y1, s.y2); }
    return { segs, maxD: md, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
  };

  // ---- recursive self-similar fern frond — the studio's signature form. A rachis
  // of curving segments carries paired pinnae; each pinna is itself a smaller frond
  // (2–3 levels of feathering) shrinking toward the curling tip. This is what gives
  // the bipinnate "fern" look from the reference plate. ----
  const buildFern = (): Built => {
    const segs: Seg[] = [];
    const sub = p.random() < 0.45 ? 3 : 2;                 // levels of feathering
    const curl = (p.random() - 0.5) * 0.07;                // rachis curvature (fiddlehead at the extremes)
    const pinAng = 0.42 + p.random() * 0.55;               // pinna divergence
    const taper = 0.6 + p.random() * 0.18;                 // pinna length vs rachis
    const asym = 0.82 + p.random() * 0.34;                 // left/right asymmetry
    const spacing = Math.max(1, Math.round(1 + p.random() * 2)); // steps between pinnae
    const CAP = 9000;
    const frond = (x: number, y: number, a: number, len: number, level: number) => {
      if (segs.length >= CAP || len < 0.5) return;
      const steps = Math.max(5, Math.round(len * (level === sub ? 1.0 : 1.5)));
      const seg = len / steps, d = sub - level;
      let cx = x, cy = y, ca = a;
      for (let i = 0; i < steps; i++) {
        ca += curl * (1 + 0.8 * (i / steps)) + (p.noise(cx * 0.06, cy * 0.06, level + 1) - 0.5) * 0.045;
        const nx = cx + Math.sin(ca) * seg, ny = cy + Math.cos(ca) * seg;
        segs.push({ x1: cx, y1: cy, x2: nx, y2: ny, d, leaf: level === 0 });
        const t = i / steps;
        if (level > 0 && t > 0.05 && i % spacing === 0) {
          const pl = len * taper * (1 - 0.82 * t);
          if (pl > 0.5) {
            frond(nx, ny, ca - pinAng, pl * asym, level - 1);
            frond(nx, ny, ca + pinAng, pl, level - 1);
          }
        }
        cx = nx; cy = ny;
      }
      if (level === 0) {                                   // terminal leaflet pair at the tip
        for (const sgn of [-1, 1]) segs.push({ x1: cx, y1: cy, x2: cx + Math.sin(ca + sgn * 0.5) * seg * 1.2, y2: cy + Math.cos(ca + sgn * 0.5) * seg * 1.2, d, leaf: true });
      }
    };
    frond(0, 0, (p.random() - 0.5) * 0.16, 10 + p.random() * 6, sub);
    return bbox(segs, sub);
  };

  // ---- fractal tree — recursive 2/3-way branching with bud tips, the bare-branch
  // and dense-canopy forms from the reference. ----
  const buildTree = (): Built => {
    const segs: Seg[] = [];
    const ang = 0.3 + p.random() * 0.32, ratio = 0.7 + p.random() * 0.1;
    const three = p.random() < 0.45, CAP = 9000;
    let maxD = 0;
    const branch = (x: number, y: number, a: number, len: number, d: number) => {
      if (len < 0.4 || segs.length >= CAP) return;
      if (d > maxD) maxD = d;
      const nx = x + Math.sin(a) * len, ny = y + Math.cos(a) * len;
      segs.push({ x1: x, y1: y, x2: nx, y2: ny, d, leaf: len < 1.1 });
      const wob = (p.noise(x * 0.1, y * 0.1, d) - 0.5) * 0.34;
      branch(nx, ny, a - ang + wob, len * ratio, d + 1);
      branch(nx, ny, a + ang + wob, len * ratio, d + 1);
      if (three) branch(nx, ny, a + wob * 0.6, len * ratio * 0.86, d + 1);
    };
    branch(0, 0, (p.random() - 0.5) * 0.12, 7 + p.random() * 3, 0);
    return bbox(segs, Math.max(1, maxD));
  };

  // ---- Barnsley fern (IFS chaos game) — the canonical fractal fern, rendered as a
  // fine stipple of points. ----
  const buildBarnsley = (): Built => {
    const segs: Seg[] = [];
    const N = 7200;
    let x = 0, y = 0;
    for (let i = 0; i < N; i++) {
      const r = p.random(); let nx: number, ny: number;
      if (r < 0.01) { nx = 0; ny = 0.16 * y; }
      else if (r < 0.86) { nx = 0.85 * x + 0.04 * y; ny = -0.04 * x + 0.85 * y + 1.6; }
      else if (r < 0.93) { nx = 0.2 * x - 0.26 * y; ny = 0.23 * x + 0.22 * y + 1.6; }
      else { nx = -0.15 * x + 0.28 * y; ny = 0.26 * x + 0.24 * y + 0.44; }
      x = nx; y = ny;
      if (i > 20) segs.push({ x1: x, y1: y, x2: x, y2: y, d: 2, leaf: true });  // round-capped dot
    }
    return bbox(segs, 2);
  };

  // Deepened Lindenmayer grammars (iter 6 → far denser than before).
  const FERNS = [
    { axiom: "X", rules: { X: "F-[[X]+X]+F[+FX]-X", F: "FF" }, iter: 6, ang: 22 },
    { axiom: "X", rules: { X: "F+[[X]-X]-F[-FX]+X", F: "FF" }, iter: 6, ang: 25 },
    { axiom: "X", rules: { X: "F[-X][+X]F[-X]+FX", F: "FF" }, iter: 6, ang: 19 },    // bipinnate, dense
    { axiom: "X", rules: { X: "FF[++X][+X][-X][--X]", F: "FF" }, iter: 5, ang: 16 }, // feathery rachis
  ];

  type Built = { segs: Seg[]; maxD: number; w: number; h: number };
  // Fern-dominant population matching the reference plate: recursive fronds, fractal
  // trees and the Barnsley fern carry it; deepened Lindenmayer ferns and the palm add
  // variety. Caps are ~6× the old jungle so each specimen is far more intricate.
  const makeSpecies = (): Built => {
    const r = p.random();
    if (r < 0.46) return buildFern();
    if (r < 0.68) return buildTree();
    if (r < 0.82) return buildBarnsley();
    if (r < 0.95) { const f = FERNS[Math.floor(p.random(FERNS.length))]; return lbuild(f.axiom, f.rules, f.iter, f.ang + p.random() * 6, 0.28, 9000); }
    return buildPalm();
  };

  interface Plant {
    segs: Seg[]; maxD: number; baseX: number; baseY: number; scale: number; flip: number;
    depth: number; h: number; tone: number; shown: number; grow: number; state: number; age: number; life: number;
    alpha: number; cache: Map<number, Path2D> | null;
  }
  const plants: Plant[] = [];
  const MAXP = Math.round(gp(params, "plants", size > 360 ? 7 : 4));

  const spawn = () => {
    const b = makeSpecies();
    const depth = p.random();                               // 0 far … 1 near
    const baseScale = (size * (0.30 + depth * 0.5)) / b.h;  // nearer = bigger, taller specimen
    plants.push({
      segs: b.segs, maxD: b.maxD,
      baseX: p.random(size * 0.06, size * 0.94),
      baseY: size * (0.9 + depth * 0.1),                    // nearer plants sit lower (front)
      scale: baseScale, flip: p.random() < 0.5 ? -1 : 1, h: b.h,
      depth, tone: 0.58 + depth * 0.42,
      shown: 0, grow: Math.max(24, Math.ceil(b.segs.length / 80)),
      state: 0, age: 0, life: 600 + p.random() * 700, alpha: 1, cache: null,
    });
    plants.sort((a, c) => a.depth - c.depth);               // back-to-front
  };
  for (let i = 0; i < 4; i++) spawn();                      // seed a few immediately
  let spawnAt = 14;
  let frame = 0;

  // Geometry buckets (one Path2D per leaf/depth band), in screen space. Built once the
  // plant is fully unfurled, then cached and re-stroked each frame at the current alpha
  // — so a frame of detailed ferns is a few dozen stroke() calls, not tens of thousands.
  const buildGeom = (pl: Plant, count: number) => {
    const m = new Map<number, Path2D>();
    for (let i = 0; i < count; i++) {
      const g = pl.segs[i];
      const key = (g.leaf ? 4096 : 0) + g.d;
      let pa = m.get(key); if (!pa) { pa = new Path2D(); m.set(key, pa); }
      pa.moveTo(pl.baseX + g.x1 * pl.scale * pl.flip, pl.baseY - g.y1 * pl.scale);
      pa.lineTo(pl.baseX + g.x2 * pl.scale * pl.flip, pl.baseY - g.y2 * pl.scale);
    }
    return m;
  };

  const drawPlant = (pl: Plant) => {
    const k = pl.tone * pl.alpha;
    const wfac = 0.5 + pl.depth * 0.9;
    const ctx = p.drawingContext as CanvasRenderingContext2D;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    let buckets: Map<number, Path2D>;
    if (pl.state >= 1) { if (!pl.cache) pl.cache = buildGeom(pl, pl.segs.length); buckets = pl.cache; }
    else buckets = buildGeom(pl, Math.min(pl.shown, pl.segs.length));
    buckets.forEach((pa, key) => {
      const leaf = key >= 4096, d = key & 4095;
      const c = leaf ? leafTone : stemTone;
      const ds = 0.72 + 0.28 * (1 - d / (pl.maxD + 1));
      ctx.strokeStyle = `rgba(${Math.min(255, c[0] * k * ds + 26) | 0},${Math.min(255, c[1] * k * ds + 26) | 0},${Math.min(255, c[2] * k * ds + 26) | 0},${((leaf ? 200 : 255) * pl.alpha) / 255})`;
      ctx.lineWidth = Math.max(0.45, (leaf ? 0.7 : 2.2 * (1 - d / (pl.maxD + 1)) + 0.45) * wfac);
      ctx.stroke(pa);
    });
  };

  return () => {
    frame++;
    p.background(8, 10, 9);
    if (frame > spawnAt && plants.length < MAXP) {          // staggered, continuous spawning
      spawn(); spawnAt = frame + 40 + Math.floor(p.random() * 90);
    }
    for (let i = plants.length - 1; i >= 0; i--) {
      const pl = plants[i];
      pl.age++;
      if (pl.state === 0) { pl.shown += pl.grow; if (pl.shown >= pl.segs.length) pl.state = 1; }
      else if (pl.state === 1 && pl.age > pl.life) pl.state = 2;
      if (pl.state === 2) { pl.alpha -= 0.01; if (pl.alpha <= 0) { plants.splice(i, 1); continue; } }
      drawPlant(pl);
    }
  };
};

// Voronoi — cellular tissue in the spirit of Raven Kwok. Seeds scatter by a noise
// density field (so cell sizes vary like a plant cross-section); each cell is drawn
// with nested membrane rings via the F2−F1 distance field, and walls between coarse
// regions thicken into the structural veins. Cells drift so the tissue breathes.
const voronoi: Gen = (p, seed, size, params) => {
  p.randomSeed(seed);
  p.noiseSeed(seed);
  const colors = autoPal(p, 9);
  const N = Math.max(60, Math.round(gp(params, "seeds", 240 + p.random() * 140)));
  const driftMul = gp(params, "drift", 1);
  const sx = new Float64Array(N);
  const sy = new Float64Array(N);
  const region = new Int32Array(N);
  const nscale = 0.0022 + p.random() * 0.0032; // density field scale
  const rscale = 0.0014 + p.random() * 0.001;  // coarse region field
  const regCount = 4 + Math.floor(p.random() * 5);
  // variable-density seeding: keep more cells where the noise field reads high
  for (let i = 0; i < N; i++) {
    let px = p.random(size), py = p.random(size);
    for (let tries = 0; tries < 20; tries++) {
      px = p.random(size); py = p.random(size);
      if (p.random() < 0.16 + 0.84 * p.noise(px * nscale, py * nscale)) break;
    }
    sx[i] = px; sy[i] = py;
    region[i] = Math.floor(p.noise(px * rscale + 11, py * rscale + 7) * regCount * 1.4) % regCount;
  }
  const ox = new Float64Array(N);
  const oy = new Float64Array(N);
  const orad = new Float64Array(N);
  const ophase = new Float64Array(N);
  const ospeed = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    ox[i] = sx[i]; oy[i] = sy[i];
    orad[i] = size * (0.006 + p.random() * 0.018);
    ophase[i] = p.random(Math.PI * 2);
    ospeed[i] = (0.4 + p.random()) * 0.03 * driftMul;
  }
  const R = Math.round(gp(params, "resolution", 360)); // high-res raster
  const surf = gridSurface(R);
  const data = surf.data;
  const B = Math.max(5, Math.round(Math.sqrt(N) * 1.2)); // spatial bins
  const binSize = size / B;
  const bins: number[][] = new Array(B * B);
  for (let i = 0; i < B * B; i++) bins[i] = [];
  const ringW = size * (0.013 + p.random() * 0.018); // nested-membrane spacing
  const lineFrac = 0.12 + p.random() * 0.1;
  const thinT = size * 0.0016;
  const thickT = size * 0.0042;
  let t = 0;
  return () => {
    t += 1;
    for (let i = 0; i < N; i++) {
      const a = ophase[i] + t * ospeed[i];
      sx[i] = ox[i] + Math.cos(a) * orad[i];
      sy[i] = oy[i] + Math.sin(a * 1.3) * orad[i];
    }
    for (let i = 0; i < B * B; i++) bins[i].length = 0;
    for (let i = 0; i < N; i++) {
      const bx = Math.min(B - 1, Math.max(0, (sx[i] / binSize) | 0));
      const by = Math.min(B - 1, Math.max(0, (sy[i] / binSize) | 0));
      bins[by * B + bx].push(i);
    }
    for (let y = 0; y < R; y++) {
      const wy = (y / R) * size;
      const by = Math.min(B - 1, (wy / binSize) | 0);
      for (let x = 0; x < R; x++) {
        const wx = (x / R) * size;
        const bx = Math.min(B - 1, (wx / binSize) | 0);
        // two nearest seeds (F1, F2)
        let best = 0, bd = 1e18, best2 = 0, bd2 = 1e18;
        for (let r = 0; r <= B; r++) {
          const xlo = Math.max(0, bx - r), xhi = Math.min(B - 1, bx + r);
          const ylo = Math.max(0, by - r), yhi = Math.min(B - 1, by + r);
          for (let cy = ylo; cy <= yhi; cy++) {
            for (let cx = xlo; cx <= xhi; cx++) {
              if (r > 0 && cx > xlo && cx < xhi && cy > ylo && cy < yhi) continue;
              const cell = bins[cy * B + cx];
              for (let k = 0; k < cell.length; k++) {
                const i = cell[k];
                const dx = wx - sx[i], dy = wy - sy[i];
                const d = dx * dx + dy * dy;
                if (d < bd) { bd2 = bd; best2 = best; bd = d; best = i; }
                else if (d < bd2) { bd2 = d; best2 = i; }
              }
            }
          }
          const safe = r * binSize;
          if (bd2 <= safe * safe) break; // both nearest are settled
        }
        const wall = Math.sqrt(bd2) - Math.sqrt(bd); // 0 at the cell boundary
        const idx = 4 * (y * R + x);
        const c = colors[best % colors.length];
        const thick = region[best] !== region[best2];
        if (wall < (thick ? thickT : thinT)) {
          const k = thick ? 1 : 0.72; // structural region veins brighter than hair walls
          data[idx] = 238 * k; data[idx + 1] = 240 * k; data[idx + 2] = 247 * k;
        } else {
          const ph = wall / ringW;
          const fr = ph - Math.floor(ph);
          if (fr < lineFrac) {
            // a nested membrane ring — light tint of the cell colour
            data[idx] = Math.min(255, c[0] * 0.5 + 120);
            data[idx + 1] = Math.min(255, c[1] * 0.5 + 122);
            data[idx + 2] = Math.min(255, c[2] * 0.5 + 128);
          } else {
            const v = 0.34 + 0.13 * (Math.floor(ph) % 3); // concentric depth banding
            data[idx] = c[0] * v; data[idx + 1] = c[1] * v; data[idx + 2] = c[2] * v;
          }
        }
        data[idx + 3] = 255;
      }
    }
    blit(p, surf, size, false);
  };
};

// Lloyd relaxation on a coarse grid — nudges each seed toward the centroid of its
// cell, producing the even, organic packing nature favours (and that the page's
// params card advertises). One-time, at init.
function lloyd(sx: Float64Array, sy: Float64Array, N: number, size: number, iters: number): void {
  const G = 96;
  const cell = size / G;
  const cxAcc = new Float64Array(N), cyAcc = new Float64Array(N), cnt = new Float64Array(N);
  for (let it = 0; it < iters; it++) {
    cxAcc.fill(0); cyAcc.fill(0); cnt.fill(0);
    for (let gy = 0; gy < G; gy++) {
      const wy = (gy + 0.5) * cell;
      for (let gx = 0; gx < G; gx++) {
        const wx = (gx + 0.5) * cell;
        let best = 0, bd = 1e18;
        for (let i = 0; i < N; i++) {
          const dx = wx - sx[i], dy = wy - sy[i], d = dx * dx + dy * dy;
          if (d < bd) { bd = d; best = i; }
        }
        cxAcc[best] += wx; cyAcc[best] += wy; cnt[best] += 1;
      }
    }
    for (let i = 0; i < N; i++) if (cnt[i] > 0) { sx[i] = cxAcc[i] / cnt[i]; sy[i] = cyAcc[i] / cnt[i]; }
  }
}

// Voronoi (recursive line-art) — rebuilt toward the benchmark: a recursive cellular
// LINE drawing, not filled cells. Centre-biased seeds are Lloyd-relaxed into an
// organic packing, then each cell is subdivided into its own Voronoi two levels deep
// (cells within cells within cells). Edges are stroked as crisp, anti-aliased vectors
// with graded weight — bold structural walls down to hairline subdivisions — on a
// near-white ground, and a scatter of leaf cells sprout the fine "spindle" bursts and
// dot stipples of the reference. Default monochrome; RANDOMISE tints the ink. The
// original raster `voronoi` is kept frozen above.
const voronoiRecursive: Gen = (p, seed, size, params) => {
  p.randomSeed(seed);
  p.noiseSeed(seed);
  const colored = !MONO_MODE;
  const N = Math.max(40, Math.round(gp(params, "seeds", 104)));
  const driftMul = gp(params, "drift", 1);
  const lloydIters = Math.max(0, Math.round(gp(params, "relaxation", 4)));
  const TAU = Math.PI * 2;
  const pad = size * 0.16;                       // cells run past the frame
  const box = [-pad, -pad, size + pad, -pad, size + pad, size + pad, -pad, size + pad];

  // ---- parent seeds: centre-biased density, then Lloyd relaxation ----
  const sx = new Float64Array(N), sy = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const a = p.random(TAU);
    const rr = Math.pow(p.random(), 0.62) * size * 0.62;   // dense core, sparse rim
    sx[i] = size / 2 + Math.cos(a) * rr + (p.random() - 0.5) * size * 0.12;
    sy[i] = size / 2 + Math.sin(a) * rr + (p.random() - 0.5) * size * 0.12;
  }
  if (lloydIters > 0) lloyd(sx, sy, N, size, lloydIters);

  // ---- ink palette (grey by default; one hue when coloured) ----
  const hue = p.random(360);
  const inkAt = (lvl: number, bold: boolean): RGB => {
    const l = bold ? 0.05 : lvl === 0 ? 0.17 : lvl === 1 ? 0.4 : 0.56; // darker = structural
    if (!colored) { const v = Math.round(l * 255); return [v, v, v]; }
    return hsl(hue + lvl * 16, 0.5, Math.min(0.6, l + 0.05));
  };
  const ground: RGB = colored ? hsl(hue, 0.16, 0.96) : [244, 244, 242];

  // ---- a fixed recursion tree (built once; only the parents drift, kids inherit) ----
  interface Node { ox: number; oy: number; kids: Node[]; spray: number; dots: number; bold: boolean; }
  const MAXLVL = 2;
  const pSub = [0.74, 0.36];
  const cellR = (size / Math.sqrt(N)) * 0.5;
  const radAt = [cellR, cellR * 0.5, cellR * 0.42];
  const build = (lvl: number): Node => {
    const kids: Node[] = [];
    if (lvl < MAXLVL && p.random() < pSub[lvl]) {
      const k = (lvl === 0 ? 3 : 2) + Math.floor(p.random() * (lvl === 0 ? 5 : 3));
      for (let j = 0; j < k; j++) {
        const ang = p.random(TAU), rad = radAt[lvl + 1] * (0.2 + p.random() * 0.95);
        const kid = build(lvl + 1);
        kid.ox = Math.cos(ang) * rad; kid.oy = Math.sin(ang) * rad;
        kids.push(kid);
      }
    }
    return {
      ox: 0, oy: 0, kids,
      spray: p.random() < 0.14 ? 7 + Math.floor(p.random() * 15) : 0,
      dots: p.random() < 0.08 ? 4 + Math.floor(p.random() * 7) : 0,
      bold: p.random() < 0.13,
    };
  };
  const roots: Node[] = [];
  for (let i = 0; i < N; i++) roots.push(build(0));

  // ---- gentle drift ----
  const ox0 = Float64Array.from(sx), oy0 = Float64Array.from(sy);
  const orad = new Float64Array(N), ophase = new Float64Array(N), ospeed = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    orad[i] = size * (0.004 + p.random() * 0.006);
    ophase[i] = p.random(TAU);
    ospeed[i] = (0.4 + p.random()) * 0.013 * driftMul;
  }

  // clip a convex polygon (flat [x,y,...]) to the half-plane closer to A than B
  const clip = (poly: number[], ax: number, ay: number, bx: number, by: number): number[] => {
    const mx = (ax + bx) / 2, my = (ay + by) / 2, dx = bx - ax, dy = by - ay; // inside: dot(P-M,d) <= 0
    const out: number[] = [];
    const n = poly.length / 2;
    for (let i = 0; i < n; i++) {
      const x1 = poly[2 * i], y1 = poly[2 * i + 1];
      const j = (i + 1) % n, x2 = poly[2 * j], y2 = poly[2 * j + 1];
      const s1 = (x1 - mx) * dx + (y1 - my) * dy;
      const s2 = (x2 - mx) * dx + (y2 - my) * dy;
      if (s1 <= 0) out.push(x1, y1);
      if ((s1 < 0) !== (s2 < 0)) {
        const tt = s1 / (s1 - s2);
        out.push(x1 + (x2 - x1) * tt, y1 + (y2 - y1) * tt);
      }
    }
    return out;
  };

  type Edge = [number, number, number, number, number, boolean];
  let edges: Edge[] = [];
  const sprays: { x: number; y: number; r: number; n: number }[] = [];
  const dots: { x: number; y: number; r: number }[] = [];

  // process a group of sibling nodes sharing convex `poly`; seed positions in px/py
  const group = (nodes: Node[], px: number[], py: number[], poly: number[], lvl: number) => {
    const m = nodes.length;
    for (let i = 0; i < m; i++) {
      let cell = poly;
      for (let j = 0; j < m && cell.length >= 6; j++) {
        if (j !== i) cell = clip(cell, px[i], py[i], px[j], py[j]);
      }
      const vn = cell.length / 2;
      if (vn < 3) continue;
      const nd = nodes[i];
      for (let v = 0; v < vn; v++) {
        const a = 2 * v, b = 2 * ((v + 1) % vn);
        edges.push([cell[a], cell[a + 1], cell[b], cell[b + 1], lvl, nd.bold]);
      }
      if (nd.kids.length) {
        const kx: number[] = [], ky: number[] = [];
        for (const k of nd.kids) { kx.push(px[i] + k.ox); ky.push(py[i] + k.oy); }
        group(nd.kids, kx, ky, cell, lvl + 1);
      } else if (nd.spray || nd.dots) {
        let cx = 0, cy = 0;
        for (let v = 0; v < vn; v++) { cx += cell[2 * v]; cy += cell[2 * v + 1]; }
        cx /= vn; cy /= vn;
        const r = radAt[Math.min(lvl, 2)];
        if (nd.spray) sprays.push({ x: cx, y: cy, r: r * 0.95, n: nd.spray });
        if (nd.dots) dots.push({ x: cx, y: cy, r: r * 0.55 });
      }
    }
  };

  let t = 0;
  return () => {
    t += 1;
    if (t % 2 === 1) { // rebuild geometry every other frame (drift is slow) → redraw stays cheap
      const px: number[] = [], py: number[] = [];
      for (let i = 0; i < N; i++) {
        const a = ophase[i] + t * ospeed[i];
        px.push(ox0[i] + Math.cos(a) * orad[i]);
        py.push(oy0[i] + Math.sin(a * 1.27) * orad[i]);
      }
      edges = []; sprays.length = 0; dots.length = 0;
      group(roots, px, py, box, 0);
    }

    const ctx = p.drawingContext as CanvasRenderingContext2D;
    ctx.save();
    ctx.fillStyle = `rgb(${ground[0]},${ground[1]},${ground[2]})`;
    ctx.fillRect(0, 0, size, size);
    ctx.lineCap = "round"; ctx.lineJoin = "round";

    const sc = size / 680;
    // stroke edges in weight buckets so each is one path (cheap + crisp)
    const buckets = [
      { lvl: 0, bold: true, w: 2.5 }, { lvl: 0, bold: false, w: 1.25 },
      { lvl: 1, bold: false, w: 0.7 }, { lvl: 2, bold: false, w: 0.45 },
    ];
    for (const g of buckets) {
      const col = inkAt(g.lvl, g.bold);
      ctx.strokeStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
      ctx.lineWidth = Math.max(0.3, g.w * sc);
      ctx.beginPath();
      for (const e of edges) {
        if (e[4] !== g.lvl) continue;
        if (g.lvl === 0 && e[5] !== g.bold) continue;
        ctx.moveTo(e[0], e[1]); ctx.lineTo(e[2], e[3]);
      }
      ctx.stroke();
    }

    // spindle bursts
    const fine = inkAt(2, false);
    ctx.strokeStyle = `rgba(${fine[0]},${fine[1]},${fine[2]},0.72)`;
    ctx.lineWidth = Math.max(0.3, 0.42 * sc);
    ctx.beginPath();
    for (const s of sprays) {
      for (let k = 0; k < s.n; k++) {
        const a = (k / s.n) * TAU + s.x;
        const len = s.r * (0.3 + ((k * 53) % 100) / 100 * 0.85);
        ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + Math.cos(a) * len, s.y + Math.sin(a) * len);
      }
    }
    ctx.stroke();

    // dot stipples
    ctx.fillStyle = `rgb(${fine[0]},${fine[1]},${fine[2]})`;
    for (const d of dots) {
      for (let k = 0; k < 6; k++) {
        const a = k * 1.7, rr = d.r * ((k % 3) / 3 + 0.15);
        ctx.beginPath();
        ctx.arc(d.x + Math.cos(a) * rr, d.y + Math.sin(a) * rr, Math.max(0.6, 0.85 * sc), 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  };
};


// DLA — diffusion-limited aggregation. Random walkers freeze on contact with the
// cluster; the dendrite grows live, then shimmers — every arm twinkling — before it
// dissolves and a fresh one grows. Rendered on a grid and blitted with a soft glow.
const dla: Gen = (p, seed, size, params) => {
  p.randomSeed(seed);
  const G = 260; // grid → intricate dendrite, blitted up with a glow
  const colors = autoPal(p, 8);
  const swirl = 1 + Math.floor(p.random() * 5);   // colour rotates into spiral arms
  const driftP = 0.1 + p.random() * 0.2;          // how hard walkers are pulled inward → density vs wisp
  const cxg = Math.floor(G / 2);
  const cyg = Math.floor(G / 2);
  const col = new Int8Array(G * G).fill(-1); // colour index per occupied cell, -1 empty
  let maxR = 2;
  let stuck = 1;
  let s = seed;
  const capR = G * gp(params, "radius", 0.43);
  const shimmer = gp(params, "shimmer", 0.13);
  const maxParticles = Math.floor(G * gp(params, "density", 52)); // dense, frame-filling cluster
  const surf = gridSurface(G);
  const data = surf.data;
  const reset = () => {
    p.randomSeed(s);
    col.fill(-1);
    col[cyg * G + cxg] = 0;
    maxR = 2;
    stuck = 1;
  };
  reset();
  const grow = (count: number) => {
    for (let k = 0; k < count; k++) {
      if (stuck >= maxParticles) break;
      const sr = Math.min(maxR + 3, capR + 3);
      const killR2 = (sr + 12) * (sr + 12);
      let ang = p.random(Math.PI * 2);
      let x = Math.floor(cxg + Math.cos(ang) * sr);
      let y = Math.floor(cyg + Math.sin(ang) * sr);
      for (let walk = 0; walk < 3 * G; walk++) {
        x += Math.floor(p.random(3)) - 1;
        y += Math.floor(p.random(3)) - 1;
        let dx = x - cxg;
        let dy = y - cyg;
        // gentle inward drift → walkers reach the cluster from every direction,
        // so it fills a full symmetric disk instead of one starved spike
        if (p.random() < driftP) {
          if (dx) x -= dx > 0 ? 1 : -1;
          if (dy) y -= dy > 0 ? 1 : -1;
          dx = x - cxg; dy = y - cyg;
        }
        if (dx * dx + dy * dy > killR2) {
          ang = p.random(Math.PI * 2);
          x = Math.floor(cxg + Math.cos(ang) * sr);
          y = Math.floor(cyg + Math.sin(ang) * sr);
          continue;
        }
        if (x < 1 || y < 1 || x >= G - 1 || y >= G - 1) continue;
        if (col[y * G + x - 1] >= 0 || col[y * G + x + 1] >= 0 || col[(y - 1) * G + x] >= 0 || col[(y + 1) * G + x] >= 0) {
          const rr = Math.sqrt(dx * dx + dy * dy);
          // reject sticks beyond capR so no single arm runs away — the cluster fills
          // inward into a full, roughly circular dendrite instead of one lopsided spike.
          if (rr > capR) break;
          if (rr > maxR) maxR = rr;
          // colour by radius woven with angle → spiralling chromatic arms, not flat rings
          const aa = Math.atan2(dy, dx) / (Math.PI * 2) + 0.5;
          const tcol = (rr / capR) * 0.5 + (((aa * swirl) % 1) * 0.5);
          col[y * G + x] = Math.min(colors.length - 1, Math.floor(tcol * colors.length));
          stuck++;
          break;
        }
      }
    }
  };
  let f = 0;
  let mode = 0; // 0 grow · 1 alive (shimmer) · 2 dissolve
  let t = 0;
  const render = (fade: number) => {
    for (let c = 0; c < G * G; c++) {
      const ci = col[c];
      const idx = c * 4;
      if (ci < 0) {
        data[idx] = 9; data[idx + 1] = 9; data[idx + 2] = 11;
      } else {
        const tw = (0.55 + 0.45 * Math.sin(f * shimmer + c * 0.7)) * fade; // per-arm twinkle
        const cc = colors[ci];
        data[idx] = Math.min(255, cc[0] * tw * 1.2);
        data[idx + 1] = Math.min(255, cc[1] * tw * 1.2);
        data[idx + 2] = Math.min(255, cc[2] * tw * 1.2);
      }
      data[idx + 3] = 255;
    }
    blit(p, surf, size, true);
  };
  return () => {
    f++;
    if (mode === 0) {
      grow(300);
      if (stuck >= maxParticles) { mode = 1; t = 0; }
      render(1);
    } else if (mode === 1) {
      render(1);
      if (t++ > 200) { mode = 2; t = 0; }
    } else {
      render(Math.max(0, 1 - t / 24)); // fade out, then regrow
      if (t++ > 24) { s = nextSeed(s); reset(); mode = 0; t = 0; }
    }
  };
};

// Mycelium — fungal network growth, after the Neighbour-Sensing model (Meškauskas &
// Moore) and space-colonization venation (Runions et al.). Hyphal TIPS are agents that
// extend one step per frame, steered by chemotropism up a nutrient field, negative
// autotropism away from their own density, and a habit-specific bias; they branch
// (apical + frequent fine laterals) and ANASTOMOSE into loops on contact. Width and
// brightness are graded by branch hierarchy — thick bright primary veins down to fine
// pale tips — so it reads with depth. The seed picks one of three growth HABITS, so
// RANDOMISE changes the structure, not just the colour:
//   • colony — a coherent radial mat that expands and anastomoses (top-down fungus)
//   • frost  — directional ribs with dense feathery side-branching (hoarfrost fern)
//   • bush   — grows up from a base, thick trunks tapering to fine tips
// Monochrome by default; coloured runs use a magma ramp keyed to hierarchy.
const mycelium: Gen = (p, seed, size, params) => {
  p.randomSeed(seed); p.noiseSeed(seed);
  const colored = !MONO_MODE;
  const presetK = params && typeof (params as Record<string, unknown>).preset === "string"
    ? String((params as Record<string, unknown>).preset) : "wild";
  const TAU = Math.PI * 2;
  // Six growth habits — biased toward the dense, intricate end. RANDOMISE rolls
  // the structure, not just the colour.
  //   colony — coherent radial mat that anastomoses        (open)
  //   frost  — directional ribs, feathery side-branching    (mid)
  //   bush   — trunks rising from a base, tapering to tips   (mid)
  //   cord   — thick rhizomorph cords feeding fine laterals  (intricate)
  //   coral  — relentless forking, fine and crowded          (very intricate)
  //   veil   — delicate high-count filigree web              (very intricate)
  const HABITS = ["colony", "frost", "bush", "cord", "coral", "veil"] as const;
  type Habit = (typeof HABITS)[number];
  let habit: Habit = HABITS[Math.floor(p.random() * HABITS.length)];
  const initialHabit = habit;

  // ── palette per preset, inherited down each hypha lineage. Strands gradient from
  // one palette colour to the next along their depth, so veins shift tone toward
  // their tips rather than reading as flat fills. ──
  const hsl = (h: number, s: number, l: number): RGB => {
    h = (((h % 360) + 360) % 360) / 360;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => { const k = (n + h * 12) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  };
  const palette: RGB[] = [];
  const addc = (h: number, s: number, l: number) => palette.push(hsl(h, s, l));
  if (presetK === "bloom") {                           // gradient greens, blues, yellows
    const hs = [52, 96, 138, 168, 202, 64];
    for (const h of hs) addc(h + (p.random() - 0.5) * 16, 0.55 + p.random() * 0.28, 0.5 + p.random() * 0.16);
  } else if (presetK === "filigree") {                 // light grey → soft brown (hairline)
    for (let i = 0; i < 5; i++) { const brown = p.random() < 0.55; addc(30 + p.random() * 14, brown ? 0.16 + p.random() * 0.22 : 0.02, 0.64 + p.random() * 0.24); }
  } else if (presetK === "cords") {                    // earthy roots — browns and tans
    for (let i = 0; i < 5; i++) addc(22 + p.random() * 24, 0.32 + p.random() * 0.3, 0.32 + p.random() * 0.32);
  } else {                                             // wild — a mix of greys
    for (let i = 0; i < 5; i++) addc(0, 0, 0.5 + p.random() * 0.5);
  }
  // gradient lineage colour, dimmed slightly toward the fine tips
  const shade = (dnorm: number, ci: number): RGB => {
    const a = palette[ci % palette.length], b = palette[(ci + 1) % palette.length];
    const f = dnorm, dim = 1 - 0.34 * dnorm;
    return [Math.round((a[0] + (b[0] - a[0]) * f) * dim), Math.round((a[1] + (b[1] - a[1]) * f) * dim), Math.round((a[2] + (b[2] - a[2]) * f) * dim)];
  };
  const bg: RGB = [6, 8, 9];

  // fields
  const G = 84, cell = size / G;
  const nut = new Float32Array(G * G), den = new Float32Array(G * G);
  for (let i = 0; i < G * G; i++) { const gx = i % G, gy = (i / G) | 0; nut[i] = 0.55 + 0.45 * p.noise(gx * 0.05, gy * 0.05); }
  const clampC = (v: number) => Math.max(0, Math.min(G - 1, v | 0));
  const gi = (x: number, y: number) => clampC(y / cell) * G + clampC(x / cell);
  const sample = (f: Float32Array, x: number, y: number) => f[gi(x, y)];
  const grad = (f: Float32Array, x: number, y: number): [number, number] => {
    const cx = Math.max(1, Math.min(G - 2, x / cell | 0)), cy = Math.max(1, Math.min(G - 2, y / cell | 0));
    return [f[cy * G + cx + 1] - f[cy * G + cx - 1], f[(cy + 1) * G + cx] - f[(cy - 1) * G + cx]];
  };

  // habit parameters
  const rootMode = presetK === "cords";                 // grows from top-centre downward, like roots
  const cx0 = size / 2, cy0 = rootMode ? size * 0.05 : habit === "bush" ? size * 0.99 : size / 2;
  const CFG = {
    colony: { maxTurn: 0.26, Kchemo: 0.6, Kauto: 0.8, Kwander: 0.18, Kbias: 0.4, branch: 0.17, latFrac: 0.5, latAng: 0.9, fuseD: 1.4, fuseP: 0.78, wBase: 2.6, maxAge: 1100 },
    frost:  { maxTurn: 0.12, Kchemo: 0.4, Kauto: 0.55, Kwander: 0.10, Kbias: 0.7, branch: 0.20, latFrac: 0.82, latAng: 0.62, fuseD: 2.6, fuseP: 0.30, wBase: 2.2, maxAge: 1400 },
    bush:   { maxTurn: 0.20, Kchemo: 0.5, Kauto: 0.85, Kwander: 0.16, Kbias: 0.55, branch: 0.18, latFrac: 0.45, latAng: 1.0, fuseD: 1.6, fuseP: 0.55, wBase: 3.0, maxAge: 1300 },
    // rhizomorph cords: persistent thick primaries feeding a haze of fine laterals
    cord:   { maxTurn: 0.17, Kchemo: 0.62, Kauto: 0.92, Kwander: 0.12, Kbias: 0.5, branch: 0.23, latFrac: 0.82, latAng: 0.72, fuseD: 1.8, fuseP: 0.42, wBase: 3.6, maxAge: 1500 },
    // coral: relentless apical forking, fine and crowded
    coral:  { maxTurn: 0.30, Kchemo: 0.5, Kauto: 1.02, Kwander: 0.20, Kbias: 0.3, branch: 0.27, latFrac: 0.38, latAng: 1.12, fuseD: 1.3, fuseP: 0.62, wBase: 2.1, maxAge: 1250 },
    // veil: delicate, high tip-count filigree
    veil:   { maxTurn: 0.22, Kchemo: 0.46, Kauto: 0.72, Kwander: 0.24, Kbias: 0.36, branch: 0.30, latFrac: 0.7, latAng: 0.86, fuseD: 1.2, fuseP: 0.72, wBase: 1.6, maxAge: 1600 },
  };
  let cfg = CFG[habit];
  // habits a new source may switch to mid-run (bush is origin-specific, so excluded)
  const ROTATE: Habit[] = ["colony", "frost", "cord", "coral", "veil"];

  // Named presets from the page's chooser. A preset fixes the config (overriding
  // the random habit) and freezes mid-run rotation, for a repeatable look.
  //  • reticulum — dense "foam" mat: heavy anastomosis closes cells, thick bright
  //    cords ring fine inner fuzz, low radial bias so it fills the frame evenly.
  type CfgT = typeof CFG.colony;
  const PRESETS: Record<string, Partial<CfgT> & { habit: Habit }> = {
    // very fine hairline web, high tip-count
    filigree: { habit: "veil", maxTurn: 0.27, Kchemo: 0.46, Kauto: 0.78, Kwander: 0.26, Kbias: 0.26, branch: 0.34, latFrac: 0.78, latAng: 0.85, fuseD: 1.25, fuseP: 0.45, wBase: 1.0, maxAge: 1900 },
    // roots: thick primary cords descending from the top, straightish, with dense thin branching
    cords:    { habit: "cord", maxTurn: 0.11, Kchemo: 0.55, Kauto: 0.62, Kwander: 0.07, Kbias: 1.05, branch: 0.3, latFrac: 0.76, latAng: 0.6, fuseD: 2.0, fuseP: 0.32, wBase: 3.4, maxAge: 2200 },
    // colour colony with gradient strands
    bloom:    { habit: "colony", maxTurn: 0.26, Kbias: 0.42, branch: 0.2, wBase: 2.4, maxAge: 1300 },
  };
  const presetActive = Object.prototype.hasOwnProperty.call(PRESETS, presetK);
  if (presetActive) {
    const { habit: ph, ...over } = PRESETS[presetK];
    habit = ph;
    cfg = { ...CFG[habit], ...over };
  }
  // Wild (no preset): longer strands — branch less often and live longer.
  if (!presetActive) cfg = { ...cfg, branch: cfg.branch * 0.6, maxAge: cfg.maxAge * 1.7 };

  // denser, more intricate by default; the finest habits get the most tips
  const intricate = habit === "coral" || habit === "veil" || habit === "cord";
  interface Tip { x: number; y: number; a: number; age: number; energy: number; depth: number; sb: number; ci: number; }
  let tips: Tip[] = [];
  const baseTips = size > 360 ? (intricate ? 1200 : 880) : (intricate ? 480 : 340);
  const MAXT = Math.round(gp(params, "tips", baseTips));
  const step = size * 0.0045;
  const branchSpace = size * (presetActive ? 0.010 : 0.016);  // wild: branch less often → longer strands
  const DCAP = 9;                                       // depth → dnorm normaliser
  const palN = palette.length;
  const mutateCi = (ci: number) => (p.random() < 0.12 ? (p.random() * palN) | 0 : ci);

  // the laid-down network — stored so brightness pulses can travel along it (a real
  // mycelium translocates signal/nutrient: "communication"). dist = radius from the
  // colony origin, which sets when each outward pulse reaches a given segment.
  interface NSeg { x1: number; y1: number; x2: number; y2: number; w: number; r: number; g: number; b: number; dist: number; node: boolean; }
  const network: NSeg[] = [];                         // current frame's new growth (drawn then emptied)
  const pushSeg = (x1: number, y1: number, x2: number, y2: number, w: number, col: RGB, nd: boolean) => {
    const mx = (x1 + x2) / 2 - cx0, my = (y1 + y2) / 2 - cy0;
    network.push({ x1, y1, x2, y2, w, r: col[0], g: col[1], b: col[2], dist: Math.hypot(mx, my), node: nd });
  };

  const newTip = (x: number, y: number, a: number, depth = 0, energy = 110, ci = 0): Tip => ({ x, y, a, age: 0, energy, depth, sb: 0, ci });
  const seedColony = (n: number) => {
    for (let i = 0; i < n; i++) {
      const ci = (p.random() * palN) | 0;
      const ang = rootMode
        ? Math.PI / 2 + (i / n - 0.5) * 1.0 + (p.random() - 0.5) * 0.25  // downward fan from the top
        : habit === "bush"
        ? -Math.PI / 2 + (p.random() - 0.5) * 1.1
        : (i / n) * TAU + p.random() * 0.3;
      tips.push(newTip(cx0, cy0, ang, 0, 110, ci));
    }
  };
  seedColony(rootMode ? 9 + (p.random() * 6 | 0) : intricate ? 26 + (p.random() * 10 | 0) : habit === "frost" ? 14 + (p.random() * 6 | 0) : 20 + (p.random() * 8 | 0));

  // directional bias — radial-out for colony/frost, up-and-out for bush, down-and-out
  // from the top for roots (cords).
  const bias = (x: number, y: number): [number, number] => {
    if (rootMode) { let dx = (x - cx0) * 0.45, dy = 1.0; const l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; }
    if (habit === "bush") { let dx = (x - size / 2) * 0.5, dy = -(cy0 - y); const l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; }
    let dx = x - cx0, dy = y - cy0; const l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l];
  };

  let frame = 0;
  const advance = () => {
    frame++;
    if (frame % 4 === 0) for (let y = 1; y < G - 1; y++) for (let x = 1; x < G - 1; x++) { const i = y * G + x; nut[i] += ((nut[i - 1] + nut[i + 1] + nut[i - G] + nut[i + G]) * 0.25 - nut[i]) * 0.1; }
    // Density clears very slowly, so colonised ground stays "occupied" and tips
    // are repelled into open space — the colony fills the region as an expanding
    // network instead of overdrawing into a solid mass. Substrate trickles back
    // just enough to keep slow growth going indefinitely.
    for (let i = 0; i < G * G; i++) { den[i] *= 0.998; if (nut[i] < 0.5) nut[i] += 0.0003; }

    const next: Tip[] = [];
    for (const t of tips) {
      let hx = Math.cos(t.a), hy = Math.sin(t.a);
      const [gnx, gny] = grad(nut, t.x, t.y);
      const [gdx, gdy] = grad(den, t.x, t.y);
      const [bx, by] = bias(t.x, t.y);
      const wa = p.noise(t.x * 0.01, t.y * 0.01, frame * 0.006) * TAU * 2;
      let dx = hx + cfg.Kchemo * gnx - cfg.Kauto * gdx + cfg.Kbias * bx + cfg.Kwander * Math.cos(wa);
      let dy = hy + cfg.Kchemo * gny - cfg.Kauto * gdy + cfg.Kbias * by + cfg.Kwander * Math.sin(wa);
      const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
      let da = Math.atan2(dy, dx) - t.a; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
      t.a += Math.max(-cfg.maxTurn, Math.min(cfg.maxTurn, da));
      hx = Math.cos(t.a); hy = Math.sin(t.a);
      const nx = t.x + hx * step, ny = t.y + hy * step;
      if (nx < 1 || nx > size - 1 || ny < 1 || ny > size - 1) continue;

      const dnorm = Math.min(1, t.depth / DCAP);
      const col = shade(dnorm, t.ci);
      const w = Math.max(0.5, cfg.wBase * (1 - 0.72 * dnorm) - t.age * 0.0008);

      // anastomosis: meet established hyphae → fuse into a loop, mark the junction
      if (t.age > 8 && sample(den, nx, ny) > cfg.fuseD && p.random() < cfg.fuseP) {
        pushSeg(t.x, t.y, nx, ny, w, col, false);
        pushSeg(nx, ny, nx, ny, 1.2 + w, [255, 255, 255], true);  // junction node
        continue;
      }

      pushSeg(t.x, t.y, nx, ny, w, col, false);
      t.x = nx; t.y = ny; t.age++; t.sb += step;
      const idx = gi(nx, ny);
      nut[idx] = Math.max(0, nut[idx] - 0.03);
      den[idx] += 1; den[gi(nx + cell, ny)] += 0.3; den[gi(nx, ny + cell)] += 0.3;
      const food = nut[idx];
      t.energy += food * 1.1 - 0.30;

      const crowd = Math.min(1, den[idx] / 6);
      if (t.sb > branchSpace && p.random() < cfg.branch * (0.4 + food) * (1 - crowd) && tips.length + next.length < MAXT) {
        t.sb = 0;
        if (p.random() < cfg.latFrac) {                  // lateral side-branch (feathery)
          const ang = cfg.latAng * (0.7 + p.random() * 0.6) * (p.random() < 0.5 ? 1 : -1);
          next.push(newTip(t.x, t.y, t.a + ang, t.depth + 1, t.energy * 0.4, mutateCi(t.ci)));
          t.energy *= 0.82;                              // parent keeps most energy → vein persists
        } else {                                          // apical fork
          const ang = 0.34 + (p.random() - 0.5) * 0.24;
          next.push(newTip(t.x, t.y, t.a + ang, t.depth + 1, t.energy * 0.5, mutateCi(t.ci)));
          t.a -= ang * 0.6; t.energy *= 0.55;
        }
      }
      if (t.energy <= 0 || t.age > cfg.maxAge) continue;
      next.push(t);
    }
    tips = next;

    // Keep the advancing margin populated — new tips emerge at frontier cells
    // (open, fed substrate). Roots skip this (they grow only from the descending
    // primaries + their branches) so the top-down structure stays legible.
    let guard = 0;
    while (!rootMode && tips.length < MAXT && guard++ < 80) {
      let placed = false;
      for (let tries = 0; tries < 14 && !placed; tries++) {
        const gx = (p.random() * G) | 0, gy = (p.random() * G) | 0, ix = gy * G + gx;
        if (den[ix] > 0.1 && den[ix] < 2.8 && nut[ix] > 0.22) {
          const wx = (gx + .5) * cell, wy = (gy + .5) * cell, [bx, by] = bias(wx, wy);
          tips.push(newTip(wx, wy, Math.atan2(by, bx) + (p.random() - .5) * 0.9, 1, 75, (p.random() * palN) | 0));
          placed = true;
        }
      }
      if (!placed) break;
    }

    // New growth keeps igniting so the network never settles. Roots send fresh
    // primaries down from the top; everything else plants new colonies at random
    // sites that layer over what came before.
    if (frame % (rootMode ? 55 : 150) === 0 || tips.length < 20) {
      const ci0 = (p.random() * palN) | 0;
      let sx0: number, sy0: number;
      if (rootMode) {                                   // a new primary root from near the top
        sx0 = size * (0.18 + p.random() * 0.64); sy0 = size * 0.05;
        const n = 5 + (p.random() * 6 | 0);
        for (let i = 0; i < n; i++) tips.push(newTip(sx0, sy0, Math.PI / 2 + (i / n - 0.5) * 0.9 + (p.random() - 0.5) * 0.3, 0, 100, ci0));
      } else {
        // most bursts also shift the growth habit, so the morphology keeps evolving
        if (!presetActive && p.random() < 0.6) { habit = ROTATE[(p.random() * ROTATE.length) | 0]; cfg = { ...CFG[habit], branch: CFG[habit].branch * 0.6, maxAge: CFG[habit].maxAge * 1.7 }; }
        sx0 = size * (0.1 + p.random() * 0.8); sy0 = size * (0.1 + p.random() * 0.8);
        const n = 7 + (p.random() * 9 | 0), a0 = p.random() * TAU;
        for (let i = 0; i < n; i++) tips.push(newTip(sx0, sy0, a0 + (i / n) * TAU + (p.random() - 0.5) * 0.5, 0, 100, ci0));
      }
      const r = (G * 0.18) | 0, cgx = clampC(sx0 / cell), cgy = clampC(sy0 / cell);
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const gx = cgx + dx, gy = cgy + dy;
        if (gx < 0 || gy < 0 || gx >= G || gy >= G || dx * dx + dy * dy >= r * r) continue;
        const ix = gy * G + gx; nut[ix] = Math.min(1, nut[ix] + 0.5); den[ix] *= 0.4;
      }
    }

  };

  // Accumulative render — the canvas is painted ONCE, then every frame draws only
  // the new segments grown that frame, layering over what's already there. Nothing
  // is ever cleared or removed, so the colony grows out, overlays itself and fills
  // the region indefinitely. `network` holds just the current frame's growth (drawn
  // then emptied), so memory stays flat regardless of how long it runs.
  p.background(bg[0], bg[1], bg[2]);
  const ctx = p.drawingContext as CanvasRenderingContext2D;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  return () => {
    advance();                                       // grow → push this frame's segments

    const buckets = new Map<string, { pa: Path2D; r: number; g: number; b: number; w: number }>();
    for (let i = 0; i < network.length; i++) {
      const s = network[i];
      if (s.node) continue;
      const wb = Math.min(7, Math.round(s.w));
      const key = `${wb}|${s.r >> 4}|${s.g >> 4}|${s.b >> 4}`;
      let e = buckets.get(key);
      if (!e) { e = { pa: new Path2D(), r: s.r, g: s.g, b: s.b, w: s.w }; buckets.set(key, e); }
      e.pa.moveTo(s.x1, s.y1); e.pa.lineTo(s.x2, s.y2);
    }
    buckets.forEach((e) => {
      ctx.strokeStyle = `rgb(${e.r},${e.g},${e.b})`;
      ctx.lineWidth = e.w; ctx.stroke(e.pa);
    });
    // junction nodes — quiet markers where hyphae have fused into loops
    p.noStroke();
    for (let i = 0; i < network.length; i++) {
      const s = network[i];
      if (s.node) p.fill(245, 245, 245, 150), p.circle(s.x1, s.y1, s.w);
    }
    network.length = 0;                              // painted — free for next frame
  };
};

export const GENERATORS: Record<string, Gen> = {
  physarum,
  "gray-scott": grayScott,
  boids,
  "l-system": lSystem,
  voronoi,
  "voronoi-recursive": voronoiRecursive,
  dla,
  "organic-turbulence": organicTurbulence,
  "quantum-harmonics": quantumHarmonics,
  "recursive-whispers": recursiveWhispers,
  "field-dynamics": fieldDynamics,
  "stochastic-crystallization": stochasticCrystallization,
  mycelium,
};


// Create a LIVE p5 instance for `genKey` at `seed`, sized `size`px (the buffer; CSS
// scales it to its square container). The generator returns a per-frame step that
// runs in the draw loop at `fps`. Returns the instance so callers can `.remove()`.
export function renderArt(container: HTMLElement, genKey: string, seed: number, size: number, fps = 30, params?: Params): any {
  const gen = GENERATORS[genKey];
  if (!gen) return null;
  // default monochrome; colour only when the caller opts in with color:1 (RANDOMISE)
  MONO_MODE = !(params && Number((params as Params).color) > 0);
  return new p5((p: any) => {
    let frame: (() => void) | null = null;
    p.setup = () => {
      p.pixelDensity(1);
      const c = p.createCanvas(size, size);
      c.elt.style.width = "100%";
      c.elt.style.height = "100%";
      c.elt.style.display = "block";
      p.frameRate(fps);
      try {
        frame = gen(p, seed, size, params) || null;
      } catch (err) {
        console.error("art generator failed:", genKey, err);
      }
    };
    p.draw = () => {
      if (!frame) return;
      try { frame(); } catch { /* skip a bad frame rather than spamming the console */ }
    };
  }, container);
}
