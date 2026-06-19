// ─────────────────────────────────────────────────────────────────────────────
// Strange Attractors — filamentary dynamical density.
//
// The whole quality is LOG-DENSITY ACCUMULATION + TONE MAPPING. We never draw
// points directly. Each step iterates an attractor map ~100k–300k times, binning
// hits into a Float32Array density buffer. render() tone-maps that density
// (log curve + gamma) through an OKLCH palette into an ImageData — smoky,
// additive, anti-aliased-looking filaments instead of an aliased point spray.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  GenerativeSystem,
  ParamSchema,
  Params,
  RNG,
  RenderSurface,
  Canvas2DSurface,
} from "../core/types";
import { fieldToRgb, getPalette, PALETTE_IDS } from "../core/color";
import { clamp } from "../core/math";

// ── Param schema ─────────────────────────────────────────────────────────────
// Coefficients / map / iteration counts are COLD (require reset to take effect).
// exposure / gamma / palette / blendBg are HOT (only touch tone-mapping at
// render time, so they can be tweaked live without re-simulating).
const schema: ParamSchema = {
  mapFamily: {
    type: "select",
    options: ["dejong", "clifford", "hopalong"],
    default: "dejong",
    label: "Map family",
  },
  a: { type: "number", min: -3, max: 3, step: 0.001, default: 1.4, label: "a" },
  b: { type: "number", min: -3, max: 3, step: 0.001, default: -2.3, label: "b" },
  c: { type: "number", min: -3, max: 3, step: 0.001, default: 2.4, label: "c" },
  d: { type: "number", min: -3, max: 3, step: 0.001, default: -2.1, label: "d" },
  iterationsPerFrame: {
    type: "int",
    min: 50_000,
    max: 500_000,
    default: 200_000,
    label: "Iterations / frame",
  },
  totalIterations: {
    type: "int",
    min: 1_000_000,
    max: 30_000_000,
    default: 12_000_000,
    label: "Total iterations",
  },
  exposure: { type: "number", min: 0.01, max: 50, step: 0.01, default: 6, hot: true, label: "Exposure" },
  gamma: { type: "number", min: 0.2, max: 4, step: 0.01, default: 1.4, hot: true, label: "Gamma" },
  palette: { type: "select", options: PALETTE_IDS, default: "fluoro", hot: true, label: "Palette" },
  blendBg: { type: "color", default: "#06060a", hot: true, label: "Background" },
};

// ── State ────────────────────────────────────────────────────────────────────
interface State {
  params: Params; // live reference — HOT params read fresh at render time
  rng: RNG;
  w: number; // density buffer width (device px)
  h: number; // density buffer height (device px)
  density: Float32Array; // w*h accumulation buffer
  x: number; // running map coordinate
  y: number;
  iterationsDone: number;
  done: boolean;
}

// ── Map families ─────────────────────────────────────────────────────────────
type MapFn = (x: number, y: number, a: number, b: number, c: number, d: number) => [number, number];

const sign = (v: number) => (v > 0 ? 1 : v < 0 ? -1 : 0);

const MAPS: Record<string, MapFn> = {
  dejong: (x, y, a, b, c, d) => [Math.sin(a * y) - Math.cos(b * x), Math.sin(c * x) - Math.cos(d * y)],
  clifford: (x, y, a, b, c, d) => [
    Math.sin(a * y) + c * Math.cos(a * x),
    Math.sin(b * x) + d * Math.cos(b * y),
  ],
  hopalong: (x, y, a, b, c, _d) => [y - sign(x) * Math.sqrt(Math.abs(b * x - c)), a - x],
};

const getMap = (family: string): MapFn => MAPS[family] ?? MAPS.dejong;

// World-space half-extent the map is assumed to live in. Hopalong sprawls wider.
const worldExtent = (family: string): number => (family === "hopalong" ? 10 : 2.2);

// ── Number helpers ───────────────────────────────────────────────────────────
const num = (p: Params, k: string, fallback: number): number => {
  const v = p[k];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
};
const str = (p: Params, k: string, fallback: string): string => {
  const v = p[k];
  return typeof v === "string" ? v : fallback;
};

// ── Core iteration: accumulate `count` hits into `density` ────────────────────
// Mutates the running (x,y). Returns the new running coordinate. Maps world
// coords (±extent) → pixel coords with a margin and bins each visited cell.
function accumulate(
  density: Float32Array,
  w: number,
  h: number,
  family: string,
  startX: number,
  startY: number,
  a: number,
  b: number,
  c: number,
  d: number,
  count: number,
): [number, number] {
  const fn = getMap(family);
  const ext = worldExtent(family);
  const margin = 0.06;
  const span = ext * 2;
  // Fit the square world into the surface keeping aspect (uniform scale).
  const sc = (Math.min(w, h) * (1 - margin * 2)) / span;
  const cx = w * 0.5;
  const cy = h * 0.5;

  let x = startX;
  let y = startY;

  for (let i = 0; i < count; i++) {
    const next = fn(x, y, a, b, c, d);
    x = next[0];
    y = next[1];

    // Guard against escape to NaN/inf — reseed near the origin.
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      x = 0.0001;
      y = 0.0001;
      continue;
    }

    const px = cx + x * sc;
    const py = cy + y * sc;
    const ix = px | 0;
    const iy = py | 0;
    if (ix >= 0 && ix < w && iy >= 0 && iy < h) {
      density[ix + iy * w] += 1;
    }
  }

  return [x, y];
}

// ── Tone-map a density buffer into an ImageData (shared by render + export) ───
function toneMap(
  density: Float32Array,
  w: number,
  h: number,
  exposure: number,
  gamma: number,
  paletteId: string,
  bgHex: string,
): ImageData {
  const palette = getPalette(paletteId);
  const img = new ImageData(w, h);
  const data = img.data;

  // Background fill colour.
  const bg = hexToRgb(bgHex);

  // Find a robust max via a coarse histogram-percentile (99.5th) so a few
  // hot cells don't crush the whole image into darkness.
  let rawMax = 0;
  for (let i = 0; i < density.length; i++) {
    const v = density[i];
    if (v > rawMax) rawMax = v;
  }
  let max = rawMax;
  if (rawMax > 0) {
    const BINS = 1024;
    const hist = new Uint32Array(BINS);
    const inv = (BINS - 1) / rawMax;
    let nonZero = 0;
    for (let i = 0; i < density.length; i++) {
      const v = density[i];
      if (v > 0) {
        hist[(v * inv) | 0]++;
        nonZero++;
      }
    }
    const target = nonZero * 0.995;
    let cum = 0;
    for (let bIdx = 0; bIdx < BINS; bIdx++) {
      cum += hist[bIdx];
      if (cum >= target) {
        max = (bIdx / (BINS - 1)) * rawMax;
        break;
      }
    }
    if (max <= 0) max = rawMax;
  }

  const logMax = Math.log(1 + max * exposure);
  const invLogMax = logMax > 0 ? 1 / logMax : 0;
  const invGamma = 1 / gamma;

  for (let i = 0; i < density.length; i++) {
    const o = i * 4;
    const v = density[i];
    if (v <= 0) {
      data[o] = bg[0];
      data[o + 1] = bg[1];
      data[o + 2] = bg[2];
      data[o + 3] = 255;
      continue;
    }
    let t = Math.log(1 + v * exposure) * invLogMax;
    t = clamp(t, 0, 1);
    t = Math.pow(t, invGamma);

    const [fr, fg, fb] = fieldToRgb(t, palette);
    // Composite the filament over the background, weighted by tone t so faint
    // hits melt smoothly into the bg (smoky edges, no harsh point pixels).
    const a = clamp(t, 0, 1);
    data[o] = (fr * a + bg[0] * (1 - a)) | 0;
    data[o + 1] = (fg * a + bg[1] * (1 - a)) | 0;
    data[o + 2] = (fb * a + bg[2] * (1 - a)) | 0;
    data[o + 3] = 255;
  }

  return img;
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (h.length !== 6) return [6, 6, 10];
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return [6, 6, 10];
  return [r, g, b];
}

// ── System ───────────────────────────────────────────────────────────────────
export const strangeAttractors: GenerativeSystem<State> = {
  id: "strange-attractors",
  title: "Strange Attractors",
  blurb: "Filamentary dynamical density — luminous, smoky.",
  tier: "canvas2d",
  schema,

  init(surface: RenderSurface, params: Params, rng: RNG): State {
    const s = surface as Canvas2DSurface;
    const w = s.canvas.width;
    const h = s.canvas.height;
    const density = new Float32Array(w * h);

    // Seed the iterate near the origin (jittered so distinct seeds settle onto
    // the same attractor from slightly different transients).
    let x = rng.range(-0.1, 0.1);
    let y = rng.range(-0.1, 0.1);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      x = 0.0001;
      y = 0.0001;
    }

    return {
      params,
      rng,
      w,
      h,
      density,
      x,
      y,
      iterationsDone: 0,
      done: false,
    };
  },

  step(state: State, _dt: number): State {
    if (state.done) return state;
    const p = state.params;
    const family = str(p, "mapFamily", "dejong");
    const a = num(p, "a", 1.4);
    const b = num(p, "b", -2.3);
    const c = num(p, "c", 2.4);
    const d = num(p, "d", -2.1);
    const perFrame = Math.max(1, Math.floor(num(p, "iterationsPerFrame", 200_000)));
    const total = Math.max(1, Math.floor(num(p, "totalIterations", 12_000_000)));

    const remaining = total - state.iterationsDone;
    const count = Math.min(perFrame, remaining);
    if (count <= 0) {
      state.done = true;
      return state;
    }

    const [nx, ny] = accumulate(
      state.density,
      state.w,
      state.h,
      family,
      state.x,
      state.y,
      a,
      b,
      c,
      d,
      count,
    );
    state.x = nx;
    state.y = ny;
    state.iterationsDone += count;
    if (state.iterationsDone >= total) state.done = true;

    return state;
  },

  render(state: State, surface: RenderSurface): void {
    const s = surface as Canvas2DSurface;
    const p = state.params;
    const exposure = num(p, "exposure", 6);
    const gamma = clamp(num(p, "gamma", 1.4), 0.05, 8);
    const paletteId = str(p, "palette", "fluoro");
    const bgHex = str(p, "blendBg", "#06060a");

    const img = toneMap(state.density, state.w, state.h, exposure, gamma, paletteId, bgHex);

    // Draw 1:1 in device pixels — neutralise the dpr transform the harness set.
    s.ctx.setTransform(1, 0, 0, 1, 0, 0);
    s.ctx.putImageData(img, 0, 0);
  },

  isDone(state: State): boolean {
    return state.done;
  },

  exportHiRes(
    params: Params,
    rng: RNG,
    scale: number,
    baseWidth: number,
    baseHeight: number,
  ): Promise<Blob> {
    const w = Math.max(1, Math.round(baseWidth * scale));
    const h = Math.max(1, Math.round(baseHeight * scale));

    const family = str(params, "mapFamily", "dejong");
    const a = num(params, "a", 1.4);
    const b = num(params, "b", -2.3);
    const c = num(params, "c", 2.4);
    const d = num(params, "d", -2.1);
    const exposure = num(params, "exposure", 6);
    const gamma = clamp(num(params, "gamma", 1.4), 0.05, 8);
    const paletteId = str(params, "palette", "fluoro");
    const bgHex = str(params, "blendBg", "#06060a");
    const baseTotal = Math.max(1, Math.floor(num(params, "totalIterations", 12_000_000)));

    // Iterate total × scale² so density-per-area (hence brightness/detail at a
    // given tone) is preserved at the higher resolution.
    const total = Math.floor(baseTotal * scale * scale);

    const density = new Float32Array(w * h);
    let x = rng.range(-0.1, 0.1);
    let y = rng.range(-0.1, 0.1);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      x = 0.0001;
      y = 0.0001;
    }

    // Run in chunks to avoid one monstrous loop hogging too long a stretch.
    const CHUNK = 2_000_000;
    let done = 0;
    while (done < total) {
      const count = Math.min(CHUNK, total - done);
      const [nx, ny] = accumulate(density, w, h, family, x, y, a, b, c, d, count);
      x = nx;
      y = ny;
      done += count;
    }

    const img = toneMap(density, w, h, exposure, gamma, paletteId, bgHex);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return Promise.reject(new Error("strange-attractors: 2D context unavailable for export"));
    ctx.putImageData(img, 0, 0);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("strange-attractors: toBlob returned null"));
      }, "image/png");
    });
  },
};
