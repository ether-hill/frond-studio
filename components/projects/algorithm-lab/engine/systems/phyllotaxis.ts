// Phyllotaxis — the Vogel spiral that packs a sunflower head, a pinecone, the
// scales of a daisy. Each floret n sits at radius c·√n and angle n·θ. At the
// golden angle (137.507°) the florets pack with no preferred direction; detune a
// few degrees and the latent Fibonacci spiral arms snap into view as ridges.
//
// This build is NOT static — it's a visual circus. An internal frame `tick`
// continuously oscillates the divergence angle around the golden angle, so the
// spiral arms morph and swirl forever. scaleC and baseSize pulse, the whole
// field slowly rotates, per-floret jitter churns, the angle occasionally jolts
// for sudden re-organisation, and the colour field ripples outward and rotates
// while the palette cycles. It never stops.

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
  pointCount: { type: "int", min: 50, max: 4000, default: 2600, hot: true, label: "Florets" },
  scaleC: { type: "number", min: 0.5, max: 24, step: 0.1, default: 8, hot: true, label: "Spacing c" },
  sizeMode: {
    type: "select",
    options: ["constant", "byN", "byRadius"],
    default: "byRadius",
    hot: true,
    label: "Floret size",
  },
  baseSize: { type: "number", min: 0.3, max: 8, step: 0.1, default: 3.4, hot: true, label: "Base size" },
  sizeJitter: { type: "number", min: 0, max: 1, step: 0.01, default: 0.35, hot: true, label: "Size jitter" },
  colorBy: { type: "select", options: ["radius", "angle"], default: "radius", hot: true, label: "Colour by" },
  relax: { type: "bool", default: false, hot: true, label: "Relax packing" },
  palette: { type: "select", options: PALETTE_IDS, default: "fluoro", hot: true, label: "Palette" },
  chaos: { type: "number", min: 0, max: 1, step: 0.01, default: 0.85, hot: true, label: "Chaos" },
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
  rng: RNG; // live reference — drives the random wander & jolts
  jitter: number[]; // deterministic per-index size jitter, length = jitterCount
  jitterCount: number;
  florets: Floret[]; // rebuilt every frame from the *effective* (animated) params
  grown: number; // florets revealed so far (centre-out wipe), then held full
  done: boolean; // ALWAYS false — this system animates forever
  tick: number; // internal animation clock (seconds), drives all the motion
  angleWander: number; // slow rng-driven drift added to the angle (radians of degrees)
  wanderTarget: number; // where the random wander is easing toward
  jolt: number; // transient angle kick (degrees) that decays back to 0
  paletteIdx: number; // continuously advancing palette cursor for colour churn
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

// The *effective* divergence angle in radians for the current tick. This is the
// money effect: a constant sinusoidal swirl around 137.5° plus a slow random
// wander, plus any transient jolt, all scaled by `chaos`.
function effectiveAngleRad(state: State): number {
  const p = state.params;
  const base = num(p, "goldenAngle", 137.507);
  const chaos = clamp(num(p, "chaos", 0.85), 0, 1);
  const t = state.tick;
  // Layered sines so the morph never settles into an obvious period.
  const osc =
    Math.sin(t * 0.55) * 1.9 +
    Math.sin(t * 0.21 + 1.3) * 1.1 +
    Math.sin(t * 1.07 + 2.1) * 0.5;
  const deg = base + chaos * (osc + state.angleWander) + state.jolt;
  return deg * RAD;
}

// The *effective* spacing for the current tick — a gentle breathing pulse.
function effectiveScaleC(state: State): number {
  const p = state.params;
  const c = num(p, "scaleC", 8);
  const chaos = clamp(num(p, "chaos", 0.85), 0, 1);
  const pulse = 1 + chaos * 0.18 * Math.sin(state.tick * 0.7 + 0.6);
  return c * pulse;
}

// Build the Vogel-spiral layout in model space for a given angle/spacing. Cheap
// enough to rebuild every frame, which is exactly what makes the arms swirl.
function buildFlorets(p: Params, gaRad: number, c: number): Floret[] {
  const n = Math.max(1, Math.round(num(p, "pointCount", 2600)));
  const out: Floret[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const rr = Math.sqrt(i); // √n
    const theta = i * gaRad;
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
    rng,
    jitter: [],
    jitterCount: 0,
    florets: [],
    grown: 0,
    done: false,
    tick: 0,
    angleWander: 0,
    wanderTarget: rng.range(-1.5, 1.5),
    jolt: 0,
    paletteIdx: rng.range(0, PALETTE_IDS.length),
  };
  const n = Math.max(1, Math.round(num(params, "pointCount", 2600)));
  ensureJitter(state, n, rng);
  // Seed a first layout so frame 0 isn't empty.
  state.florets = buildFlorets(params, effectiveAngleRad(state), effectiveScaleC(state));
  return state;
}

function step(state: State, dt: number): State {
  const d = Math.max(0, Math.min(dt, 0.1)); // clamp huge frame gaps
  const chaos = clamp(num(state.params, "chaos", 0.85), 0, 1);

  // Advance the master clock — chaos makes time run a touch faster, livelier.
  state.tick += d * (1 + chaos * 0.6);

  // ── Slow random wander of the angle: ease toward a moving random target so
  // the swirl never repeats. Re-pick the target when we get close.
  state.wanderTarget += state.rng.range(-1, 1) * d * 1.4 * (0.3 + chaos);
  state.wanderTarget = clamp(state.wanderTarget, -2.5, 2.5);
  state.angleWander += (state.wanderTarget - state.angleWander) * Math.min(1, d * 2.0);

  // ── Sudden jolts: occasionally kick the angle hard for an instant re-org.
  state.jolt *= Math.max(0, 1 - d * 3.5); // decay back to baseline
  if (state.rng.next() < d * (0.25 + chaos * 0.9)) {
    state.jolt += state.rng.range(-1, 1) * (1.5 + chaos * 4.0);
  }

  // ── Colour cursor advances continuously (palette cycling speed ∝ chaos).
  state.paletteIdx += d * (0.05 + chaos * 0.22);

  // ── Per-floret jitter churn: nudge a slice of the jitter array each frame so
  // floret sizes shimmer over time rather than sitting frozen.
  const jc = state.jitterCount;
  if (jc > 0) {
    const churn = Math.max(1, Math.floor(jc * (0.02 + chaos * 0.05)));
    for (let k = 0; k < churn; k++) {
      const idx = state.rng.int(0, jc - 1);
      state.jitter[idx] = clamp(state.jitter[idx] + state.rng.range(-0.4, 0.4), -1, 1);
    }
  }

  // ── Reveal centre-out on first load, then hold full forever.
  const total = state.florets.length;
  const perSecond = Math.max(total / 0.7, 800);
  state.grown = Math.min(total, state.grown + perSecond * d);

  // NEVER STOP.
  state.done = false;
  return state;
}

function render(state: State, surface: RenderSurface): void {
  const s = surface as Canvas2DSurface;
  const { ctx, width: w, height: h } = s;
  const p = state.params;

  // Rebuild the layout every frame from the *animated* angle & spacing — this is
  // what makes the spiral arms morph and swirl continuously.
  const gaRad = effectiveAngleRad(state);
  const cEff = effectiveScaleC(state);
  ensureJitter(state, Math.max(1, Math.round(num(p, "pointCount", 2600))), state.rng);
  state.florets = buildFlorets(p, gaRad, cEff);

  const florets = state.florets;
  const n = florets.length;

  const sizeMode = str(p, "sizeMode", "byRadius");
  const chaos = clamp(num(p, "chaos", 0.85), 0, 1);
  const t = state.tick;

  // baseSize pulses (lively breathing on top of the spacing pulse).
  const baseSize = num(p, "baseSize", 3.4) * (1 + chaos * 0.22 * Math.sin(t * 1.1 + 1.4));
  const jitterAmt = clamp(num(p, "sizeJitter", 0.35), 0, 1);
  const colorBy = str(p, "colorBy", "radius");

  // ── Colour churn: blend between the chosen palette and the cycling one so
  // colour waves ripple while the whole palette drifts.
  const basePalette = getPalette(str(p, "palette", "fluoro"));
  const cycleId = PALETTE_IDS[Math.floor(state.paletteIdx) % PALETTE_IDS.length];
  const cyclePalette = getPalette(cycleId);
  const palMix = 0.5 + 0.5 * Math.sin(state.paletteIdx * Math.PI); // 0..1, smooth crossfade
  const palette = chaos > 0 && palMix > 0.5 ? cyclePalette : basePalette;

  // Time-varying colour offsets — a radial wave travelling outward and an
  // angular wave rotating around the head.
  const radialWave = chaos * 0.45; // amplitude of outward colour ripple
  const radialSpeed = t * (0.8 + chaos * 1.6);
  const angularWave = chaos * 0.35;
  const angularSpeed = t * (0.4 + chaos * 1.2);

  // background — a dark wash from the palette floor
  ctx.fillStyle = fieldToColor(0, palette);
  ctx.fillRect(0, 0, w, h);

  if (n === 0) return;

  const cx = w / 2;
  const cy = h / 2;

  // ── Slowly rotate the WHOLE field (speed ∝ chaos), wobbling direction over time.
  const fieldRot = t * 0.25 * (0.4 + chaos * 1.6) + chaos * 0.3 * Math.sin(t * 0.13);
  const cosR = Math.cos(fieldRot);
  const sinR = Math.sin(fieldRot);

  // Fit the whole head into the frame. Outermost floret ≈ cEff·√(n-1).
  const modelMaxR = cEff * Math.sqrt(Math.max(1, n - 1)) || 1;
  const fit = (Math.min(w, h) * 0.46) / modelMaxR;
  const rNormDen = Math.sqrt(Math.max(1, n - 1));

  const jitter = state.jitter;
  const jCount = state.jitterCount;

  const reveal = Math.floor(state.grown);
  const drawCount = Math.min(n, Math.max(reveal, 1));

  for (let i = 0; i < drawCount; i++) {
    const f = florets[i];
    // rotate the field
    const rx = f.x * cosR - f.y * sinR;
    const ry = f.x * sinR + f.y * cosR;
    const sx = cx + rx * fit;
    const sy = cy + ry * fit;

    const rNorm = f.r / rNormDen;

    // colour field in [0,1], modulated by travelling radial + rotating angular waves.
    let v: number;
    if (colorBy === "angle") {
      let a = f.theta % TAU;
      if (a < 0) a += TAU;
      v = a / TAU;
    } else {
      v = rNorm;
    }
    let aNorm = f.theta % TAU;
    if (aNorm < 0) aNorm += TAU;
    v +=
      radialWave * Math.sin(rNorm * 9 - radialSpeed) +
      angularWave * Math.sin((aNorm / TAU) * TAU * 3 + angularSpeed);
    // wrap into [0,1] so the wave loops smoothly instead of clamping flat.
    v = v - Math.floor(v);
    ctx.fillStyle = fieldToColor(clamp(v, 0, 1), palette);

    // size mapping (model units)
    let sz: number;
    if (sizeMode === "byN") {
      sz = baseSize * map(i, 0, n, 1.4, 0.6);
    } else if (sizeMode === "byRadius") {
      sz = baseSize * map(rNorm, 0, 1, 1.5, 0.7);
    } else {
      sz = baseSize;
    }
    const jv = i < jCount ? jitter[i] : ((Math.imul(i + 1, 2654435761) >>> 0) / 4294967296) * 2 - 1;
    // jitter both from the (churning) array and a per-floret time wobble.
    const wobble = chaos * 0.25 * Math.sin(t * 1.7 + i * 0.37);
    sz *= 1 + jitterAmt * jv * 0.8 + wobble;

    const screenR = Math.max(0.75, sz * fit * 0.65);

    ctx.beginPath();
    ctx.arc(sx, sy, screenR, 0, TAU);
    ctx.fill();
  }
}

function isDone(_state: State): boolean {
  // Never stops — this is a forever-running visual circus.
  return false;
}

export const phyllotaxis: GenerativeSystem<State> = {
  id: "phyllotaxis",
  title: "Phyllotaxis",
  blurb: "Swirling sunflower spiral that never stops morphing.",
  tier: "canvas2d",
  schema,
  init,
  step,
  render,
  isDone,
};
