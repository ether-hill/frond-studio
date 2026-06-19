// Phyllotaxis — the Vogel spiral that packs a sunflower head, a pinecone, the
// scales of a daisy. Each floret n sits at radius c·√n and angle n·θ. At the
// golden angle (137.507°) the florets pack with no preferred direction; detune a
// few degrees and the latent Fibonacci spiral arms snap into view as ridges.
//
// This system is essentially static: the layout is cheap to recompute, so most
// params are hot and the point set is rebuilt from current params inside render.
// A light reveal animation (`grown`) wipes the florets in from the centre out.

import type {
  Canvas2DSurface,
  GenerativeSystem,
  ParamSchema,
  Params,
  RNG,
  RenderSurface,
} from "../core/types";
import { fieldToColor, getPalette, PALETTE_IDS } from "../core/color";
import { clamp, map, TAU } from "../core/math";

// ── Schema ──────────────────────────────────────────────────────────────────
const schema: ParamSchema = {
  goldenAngle: {
    type: "number",
    min: 135,
    max: 140,
    step: 0.001,
    default: 137.507,
    hot: true,
    label: "Divergence angle (°)",
  },
  pointCount: { type: "int", min: 50, max: 4000, default: 1600, hot: true, label: "Florets" },
  scaleC: { type: "number", min: 0.5, max: 24, step: 0.1, default: 8, hot: true, label: "Spacing c" },
  sizeMode: {
    type: "select",
    options: ["constant", "byN", "byRadius"],
    default: "byRadius",
    hot: true,
    label: "Floret size",
  },
  baseSize: { type: "number", min: 0.3, max: 8, step: 0.1, default: 3.2, hot: true, label: "Base size" },
  sizeJitter: { type: "number", min: 0, max: 1, step: 0.01, default: 0.25, hot: true, label: "Size jitter" },
  colorBy: { type: "select", options: ["radius", "angle"], default: "radius", hot: true, label: "Colour by" },
  relax: { type: "bool", default: false, hot: true, label: "Relax packing" },
  palette: { type: "select", options: PALETTE_IDS, default: "ember", hot: true, label: "Palette" },
};

// ── State ─────────────────────────────────────────────────────────────────--
interface Floret {
  x: number; // normalised model coords, centred on origin (units of c·√n)
  y: number;
  r: number; // radius √n (for colour-by-radius / size-by-radius)
  theta: number; // angle in radians (for colour-by-angle)
}

interface State {
  params: Params; // live reference — read hot
  jitter: number[]; // deterministic per-index size jitter, length = jitterCount
  jitterCount: number;
  florets: Floret[]; // recomputed from params when the layout signature changes
  sig: string; // signature of the params that affect geometry
  grown: number; // florets revealed so far (centre-out wipe)
  done: boolean;
}

const RAD = Math.PI / 180;

const num = (p: Params, k: string, d: number) => (typeof p[k] === "number" ? (p[k] as number) : d);
const str = (p: Params, k: string, d: string) => (typeof p[k] === "string" ? (p[k] as string) : d);
const bool = (p: Params, k: string, d: boolean) => (typeof p[k] === "boolean" ? (p[k] as boolean) : d);

// Fill/grow the jitter array deterministically from the passed rng. We only ever
// grow it (never reseed mid-life) so values are stable across re-renders.
function ensureJitter(state: State, need: number, rng: RNG): void {
  if (need <= state.jitterCount) return;
  for (let i = state.jitterCount; i < need; i++) {
    state.jitter.push(rng.range(-1, 1));
  }
  state.jitterCount = need;
}

// Signature of every param that changes the *positions* of florets.
function geoSig(p: Params): string {
  return [
    num(p, "goldenAngle", 137.507),
    Math.round(num(p, "pointCount", 1600)),
    num(p, "scaleC", 8),
    bool(p, "relax", false) ? 1 : 0,
  ].join("|");
}

// Build the Vogel-spiral layout in model space (origin-centred, unscaled by c
// is folded in via scaleC). Optionally apply a few relaxation passes that nudge
// overlapping neighbours apart to soften the synthetic grid.
function buildFlorets(p: Params): Floret[] {
  const n = Math.max(1, Math.round(num(p, "pointCount", 1600)));
  const c = num(p, "scaleC", 8);
  const ga = num(p, "goldenAngle", 137.507) * RAD;
  const out: Floret[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const rr = Math.sqrt(i); // √n
    const theta = i * ga;
    out[i] = { x: c * rr * Math.cos(theta), y: c * rr * Math.sin(theta), r: rr, theta };
  }

  if (bool(p, "relax", false)) {
    relax(out, c);
  }
  return out;
}

// Light packing relaxation: a few iterations pushing apart florets that sit
// closer than a target spacing. O(n·k) via a coarse spatial grid so it stays
// cheap even at 4000 points. Positions only; r/theta kept for colour stability.
function relax(florets: Floret[], c: number): void {
  const n = florets.length;
  if (n < 3) return;
  const target = c * 0.9; // desired min separation in model units
  const cell = target;
  const iterations = 4;

  for (let it = 0; it < iterations; it++) {
    // bounds
    let minX = Infinity, minY = Infinity;
    for (let i = 0; i < n; i++) {
      const f = florets[i];
      if (f.x < minX) minX = f.x;
      if (f.y < minY) minY = f.y;
    }
    const grid = new Map<number, number[]>();
    const cols = 1 << 16;
    const key = (gx: number, gy: number) => gx * cols + gy;
    for (let i = 0; i < n; i++) {
      const f = florets[i];
      const gx = Math.floor((f.x - minX) / cell);
      const gy = Math.floor((f.y - minY) / cell);
      const k = key(gx, gy);
      const bucket = grid.get(k);
      if (bucket) bucket.push(i);
      else grid.set(k, [i]);
    }
    const dx = new Float64Array(n);
    const dy = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const a = florets[i];
      const gx = Math.floor((a.x - minX) / cell);
      const gy = Math.floor((a.y - minY) / cell);
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const bucket = grid.get(key(gx + ox, gy + oy));
          if (!bucket) continue;
          for (let bi = 0; bi < bucket.length; bi++) {
            const j = bucket[bi];
            if (j <= i) continue;
            const b = florets[j];
            const ddx = a.x - b.x;
            const ddy = a.y - b.y;
            const d2 = ddx * ddx + ddy * ddy;
            if (d2 >= target * target || d2 <= 1e-9) continue;
            const d = Math.sqrt(d2);
            const push = (target - d) * 0.25;
            const nx = ddx / d;
            const ny = ddy / d;
            dx[i] += nx * push; dy[i] += ny * push;
            dx[j] -= nx * push; dy[j] -= ny * push;
          }
        }
      }
    }
    for (let i = 0; i < n; i++) {
      florets[i].x += dx[i];
      florets[i].y += dy[i];
    }
  }
}

// ── System ────────────────────────────────────────────────────────────────--
function init(_surface: RenderSurface, params: Params, rng: RNG): State {
  const state: State = {
    params,
    jitter: [],
    jitterCount: 0,
    florets: [],
    sig: "",
    grown: 0,
    done: false,
  };
  const n = Math.max(1, Math.round(num(params, "pointCount", 1600)));
  ensureJitter(state, n, rng);
  state.florets = buildFlorets(params);
  state.sig = geoSig(params);
  return state;
}

function step(state: State, dt: number): State {
  const total = state.florets.length;
  // Reveal centre-out over ~0.9s, then the system is static & done.
  const perSecond = Math.max(total / 0.9, 600);
  state.grown = Math.min(total, state.grown + perSecond * Math.max(0, dt));
  state.done = state.grown >= total;
  return state;
}

function render(state: State, surface: RenderSurface): void {
  const s = surface as Canvas2DSurface;
  const { ctx, width: w, height: h } = s;
  const p = state.params;

  // Recompute layout from current params if anything geometric changed (hot edits).
  const sig = geoSig(p);
  if (sig !== state.sig) {
    state.florets = buildFlorets(p);
    state.sig = sig;
    if (state.florets.length > state.grown) {
      // keep the reveal sensible: don't snap-hide already-grown florets.
      state.grown = Math.min(state.grown, state.florets.length);
    }
  }

  const florets = state.florets;
  const n = florets.length;

  const palette = getPalette(str(p, "palette", "ember"));
  const sizeMode = str(p, "sizeMode", "byRadius");
  const baseSize = num(p, "baseSize", 3.2);
  const jitterAmt = clamp(num(p, "sizeJitter", 0.25), 0, 1);
  const colorBy = str(p, "colorBy", "radius");

  // background
  ctx.fillStyle = fieldToColor(0, palette);
  ctx.fillRect(0, 0, w, h);

  if (n === 0) return;

  const cx = w / 2;
  const cy = h / 2;

  // Fit the whole head into ~92% of the min dimension. The outermost floret sits
  // at model radius ≈ c·√(n-1); scale model→screen by that.
  const c = num(p, "scaleC", 8);
  const modelMaxR = c * Math.sqrt(Math.max(1, n - 1)) || 1;
  const fit = (Math.min(w, h) * 0.46) / modelMaxR;

  // jitter array is grown lazily here too (e.g. if grown without a fresh init);
  // it's purely cosmetic so a cheap deterministic hash fallback is fine.
  const jitter = state.jitter;
  const jCount = state.jitterCount;

  const reveal = Math.floor(state.grown);
  const drawCount = state.done ? n : Math.min(n, reveal);

  for (let i = 0; i < drawCount; i++) {
    const f = florets[i];
    const sx = cx + f.x * fit;
    const sy = cy + f.y * fit;

    // colour field in [0,1]
    let v: number;
    if (colorBy === "angle") {
      // wrap angle into [0,1)
      let a = f.theta % TAU;
      if (a < 0) a += TAU;
      v = a / TAU;
    } else {
      v = modelMaxR > 0 ? f.r / Math.sqrt(Math.max(1, n - 1)) : 0;
    }
    ctx.fillStyle = fieldToColor(clamp(v, 0, 1), palette);

    // size mapping (model units), then to screen, with slight overlap.
    let sz: number;
    if (sizeMode === "byN") {
      sz = baseSize * map(i, 0, n, 1.4, 0.6);
    } else if (sizeMode === "byRadius") {
      const rNorm = f.r / Math.sqrt(Math.max(1, n - 1));
      sz = baseSize * map(rNorm, 0, 1, 1.5, 0.7);
    } else {
      sz = baseSize;
    }
    // deterministic per-index jitter
    const jv = i < jCount ? jitter[i] : ((Math.imul(i + 1, 2654435761) >>> 0) / 4294967296) * 2 - 1;
    sz *= 1 + jitterAmt * jv * 0.8;

    // screen-space radius; overlap so florets read as packed scales, not dots.
    const screenR = Math.max(0.75, sz * fit * 0.65);

    ctx.beginPath();
    ctx.arc(sx, sy, screenR, 0, TAU);
    ctx.fill();
  }
}

function isDone(state: State): boolean {
  return state.done;
}

export const phyllotaxis: GenerativeSystem<State> = {
  id: "phyllotaxis",
  title: "Phyllotaxis",
  blurb: "Radial packing order — sunflower heads, pinecones.",
  tier: "canvas2d",
  schema,
  init,
  step,
  render,
  isDone,
};
