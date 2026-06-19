// ─────────────────────────────────────────────────────────────────────────────
// Differential Growth (Hoff lineage).
//
// A polyline (closed loop or open chain) relaxes under three competing forces:
//   1. edge springs pull each node toward its rest spacing with its neighbours,
//   2. short-range repulsion pushes nodes apart so the curve never overlaps,
//   3. optional Brownian / curl jitter breaks symmetry.
// Wherever an edge grows longer than `splitThreshold` a midpoint node is inserted,
// so the line lengthens and is forced to buckle into brain-coral / hyphal folds.
// Neighbour queries go through a uniform SpatialHash (rebuilt each step) so it
// stays linear up to the node cap instead of O(n²).
//
// All geometry is worked in a normalised space (units of min(w,h)); the renderer
// multiplies by min(w,h) so it scales to any surface. Determinism flows from the
// passed RNG alone — no Math.random.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  Canvas2DSurface,
  GenerativeSystem,
  ParamSchema,
  Params,
  RenderSurface,
  RNG,
} from "../core/types";
import { fieldToColor, getPalette, PALETTE_IDS, type Palette, type Stop } from "../core/color";
import { clamp, TAU, type Vec2 } from "../core/math";
import { SpatialHash } from "../core/spatial-hash";

// ── A single node of the growing polyline ────────────────────────────────────
interface Node {
  x: number; // normalised coords (units of min(w,h)), origin at centre-ish
  y: number;
  px: number; // accumulated displacement for this step (applied after the pass)
  py: number;
  age: number; // step on which the node was born — drives colour by growth age
  hot: number; // local insertion-bias weight in [0,1] (hotspots mode)
}

// ── Hotspot: a region with elevated insertion rate ───────────────────────────
interface Hotspot {
  x: number;
  y: number;
  r: number;
  age: number; // tick at which it was (re)placed — lets hotspots drift + retire
}

export interface State {
  params: Params; // live reference — HOT params read straight off this each frame
  rng: RNG;
  nodes: Node[];
  hotspots: Hotspot[];
  closed: boolean; // structural — captured at init
  nodeCap: number; // structural — captured at init
  step: number; // step counter (drives node.age + jitter phase)
  /** faded historical snapshots for depth (oldest first) */
  history: { nodes: Vec2[]; closed: boolean }[];
  framesSinceSnapshot: number;

  // ── circus drive (auto-chaos) ───────────────────────────────────────────────
  tick: number; // ever-advancing internal frame clock — drives all wander/sweep
  paletteIndex: number; // which palette we are churning toward (cycles over time)
  paletteBlend: number; // 0..1 cross-fade progress between adjacent palettes
  framesSincePrune: number; // when capped, how long since we last pruned a chunk
  framesSinceJolt: number; // throttles the random impulse injections
  framesSinceSpawn: number; // throttles spawning of extra loops
}

// ── Schema: single source of truth for the control panel + presets ───────────
const schema: ParamSchema = {
  palette: { type: "select", options: PALETTE_IDS, default: "coral", hot: true, label: "Palette" },
  strokeScale: { type: "number", min: 0.2, max: 4, step: 0.05, default: 1, hot: true, label: "Stroke scale" },

  repulsionRadius: { type: "number", min: 0.004, max: 0.05, step: 0.001, default: 0.018, label: "Repulsion radius" },
  repulsionStrength: { type: "number", min: 0, max: 1, step: 0.01, default: 0.42, label: "Repulsion strength" },
  springStrength: { type: "number", min: 0, max: 1, step: 0.01, default: 0.3, label: "Spring strength" },
  splitThreshold: { type: "number", min: 0.01, max: 0.06, step: 0.001, default: 0.022, label: "Max edge length" },
  jitter: { type: "number", min: 0, max: 0.004, step: 0.0001, default: 0.0008, label: "Jitter" },

  nodeCap: { type: "int", min: 200, max: 6000, default: 3200, label: "Node cap" },
  growthBias: { type: "select", options: ["uniform", "hotspots"], default: "uniform", label: "Growth bias" },
  closed: { type: "bool", default: true, label: "Closed loop" },

  // Global energy knob. Scales jitter, repulsion swing, split-threshold wander,
  // hotspot migration speed, jolt frequency and colour churn. The circus dial.
  chaos: { type: "number", min: 0, max: 1, step: 0.01, default: 0.85, hot: true, label: "Chaos" },
};

// ── helpers ──────────────────────────────────────────────────────────────────
const num = (p: Params, k: string, d: number) => {
  const v = p[k];
  return typeof v === "number" ? v : d;
};
const str = (p: Params, k: string, d: string) => {
  const v = p[k];
  return typeof v === "string" ? v : d;
};
const bool = (p: Params, k: string, d: boolean) => {
  const v = p[k];
  return typeof v === "boolean" ? v : d;
};

// Cross-fade two palettes into a new one. We resample both to a common number of
// control stops along their 0..1 position, then lerp each stop (shortest-arc
// hue) so the whole ramp morphs smoothly — used for live colour churn.
function blendPalettes(a: Palette, b: Palette, t: number): Palette {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const m = Math.max(a.stops.length, b.stops.length);
  const stops: Stop[] = [];
  for (let i = 0; i < m; i++) {
    const u = m === 1 ? 0 : i / (m - 1);
    const sa = sampleStop(a, u);
    const sb = sampleStop(b, u);
    let dh = sb.h - sa.h;
    if (dh > 180) dh -= 360;
    if (dh < -180) dh += 360;
    stops.push({
      L: sa.L + (sb.L - sa.L) * t,
      C: sa.C + (sb.C - sa.C) * t,
      h: ((sa.h + dh * t) % 360 + 360) % 360,
    });
  }
  return { id: `${a.id}~${b.id}`, label: "churn", stops };
}

// Sample a palette's control points at normalised position u∈[0,1].
function sampleStop(pal: Palette, u: number): Stop {
  const s = pal.stops;
  if (s.length === 1) return s[0];
  const x = clamp(u, 0, 1) * (s.length - 1);
  const i = Math.min(s.length - 2, Math.floor(x));
  const f = x - i;
  const a = s[i];
  const b = s[i + 1];
  let dh = b.h - a.h;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  return { L: a.L + (b.L - a.L) * f, C: a.C + (b.C - a.C) * f, h: ((a.h + dh * f) % 360 + 360) % 360 };
}

// ── init ──────────────────────────────────────────────────────────────────────
function init(_surface: RenderSurface, params: Params, rng: RNG): State {
  const closed = bool(params, "closed", true);
  const nodeCap = Math.round(num(params, "nodeCap", 3200));
  const split = num(params, "splitThreshold", 0.022);

  // Hotspots: a few regions that bias node insertion when growthBias === hotspots.
  const hotspots: Hotspot[] = [];
  const hsCount = rng.int(2, 4);
  for (let i = 0; i < hsCount; i++) {
    const a = rng.range(0, TAU);
    const rad = rng.range(0.05, 0.32);
    hotspots.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad, r: rng.range(0.08, 0.2), age: 0 });
  }

  const nodes = seedLoop(closed, split, rng, 0, 0, 1, 0, hotspots);

  return {
    params,
    rng,
    nodes,
    hotspots,
    closed,
    nodeCap,
    step: 0,
    history: [],
    framesSinceSnapshot: 0,
    tick: 0,
    paletteIndex: 0,
    paletteBlend: 0,
    framesSincePrune: 0,
    framesSinceJolt: 0,
    framesSinceSpawn: 0,
  };
}

// Build a fresh small loop / chain at (ox,oy) with a given scale and phase. Used
// both for the initial seed and to spawn extra loops / re-seed after a reset so
// the system perpetually re-buckles from new starting geometry.
function seedLoop(
  closed: boolean,
  split: number,
  rng: RNG,
  ox: number,
  oy: number,
  scale: number,
  bornStep: number,
  hotspots: Hotspot[],
): Node[] {
  const nodes: Node[] = [];
  if (closed) {
    // Start from a small circle so the very first step already has tension.
    const count = 44;
    // radius a touch under half the split threshold × count / TAU so edges sit
    // comfortably below the split length — buckling, not exploding, from frame 1.
    const radius = Math.max(0.05, (split * count) / TAU * 0.45) * scale;
    const wobble = rng.range(0, TAU);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU;
      // a faint radial wobble seeds asymmetry deterministically from the rng.
      const rr = radius * (1 + 0.05 * Math.sin(a * 3 + wobble) + rng.range(-0.015, 0.015));
      nodes.push({ x: ox + Math.cos(a) * rr, y: oy + Math.sin(a) * rr, px: 0, py: 0, age: bornStep, hot: 0 });
    }
  } else {
    // Open chain: a short, slightly bowed horizontal line through the centre.
    const count = 40;
    const half = ((split * count) / 2) * 0.4 * scale;
    const ang = rng.range(0, TAU);
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const lx = (t - 0.5) * 2 * half;
      const ly = Math.sin(t * Math.PI) * 0.01 * scale + rng.range(-0.003, 0.003);
      nodes.push({ x: ox + lx * ca - ly * sa, y: oy + lx * sa + ly * ca, px: 0, py: 0, age: bornStep, hot: 0 });
    }
  }
  for (const n of nodes) n.hot = hotspotWeight(n.x, n.y, hotspots);
  return nodes;
}

function hotspotWeight(x: number, y: number, hotspots: Hotspot[]): number {
  let w = 0;
  for (const h of hotspots) {
    const dx = x - h.x;
    const dy = y - h.y;
    const d = Math.hypot(dx, dy);
    if (d < h.r) {
      const f = 1 - d / h.r;
      w = Math.max(w, f * f);
    }
  }
  return w;
}

// ── step ──────────────────────────────────────────────────────────────────────
function step(state: State, _dt: number): State {
  const nodes = state.nodes;
  if (nodes.length < 2) {
    // Never die — re-seed a fresh tiny loop and keep the circus going.
    reseed(state);
  }

  const p = state.params;
  const closed = state.closed;
  // The energy dial. Everything below is scaled by it.
  const chaos = clamp(num(p, "chaos", 0.85), 0, 1);

  // Advance the internal clock. Faster than `step` so motion writhes even once
  // the geometry would otherwise relax. Chaos speeds the whole carousel up.
  state.tick += 0.6 + 1.4 * chaos;
  const T = state.tick;

  // ── (auto-chaos drive) continuously wander the governing parameters ──
  // Slow, out-of-phase sines so the system breathes between buckling regimes;
  // a per-frame rng nudge keeps it from being perfectly periodic.
  const baseJit = Math.max(0, num(p, "jitter", 0.0008));
  const baseRep = num(p, "repulsionStrength", 0.42);
  const baseSplit = clamp(num(p, "splitThreshold", 0.022), 0.004, 0.2);
  const springStrength = num(p, "springStrength", 0.3);
  const repulsionRadius = clamp(num(p, "repulsionRadius", 0.018), 0.001, 0.2);
  const bias = str(p, "growthBias", "uniform");

  // Jitter: a strong, ever-shifting Brownian budget. Floor it well above the raw
  // param so it always writhes; swing it wildly with chaos.
  const jitter = (baseJit + 0.0016 * chaos) * (1 + 0.9 * chaos * (0.5 + 0.5 * Math.sin(T * 0.07 + 0.0)))
    * (0.85 + 0.3 * state.rng.next());
  // Repulsion strength pulses so folds alternately crowd and splay.
  const repulsionStrength = clamp(baseRep * (1 + 0.6 * chaos * Math.sin(T * 0.045 + 1.7)), 0, 1.6);
  // Split threshold wanders so growth alternately races and stalls → re-buckles.
  const splitThreshold = clamp(
    baseSplit * (1 + 0.45 * chaos * Math.sin(T * 0.033 + 3.1)),
    0.004,
    0.2,
  );

  // ── migrate the growth-bias hotspots so buckling roams the canvas ──
  driftHotspots(state, T, chaos);

  // Run several relaxation sub-steps per frame so it moves energetically. More
  // chaos → more sub-steps → faster, livelier writhing.
  const subSteps = 2 + Math.round(2 * chaos);
  for (let s = 0; s < subSteps; s++) {
    relax(state, repulsionRadius, repulsionStrength, springStrength, splitThreshold, jitter, bias, closed);
  }

  // ── (3) injection: sudden jolts to random node spans ──
  state.framesSinceJolt++;
  const joltGap = Math.max(8, Math.round(70 - 60 * chaos));
  if (state.nodes.length >= 4 && state.framesSinceJolt >= joltGap && state.rng.next() < 0.4 + 0.5 * chaos) {
    injectJolt(state, repulsionRadius, chaos);
    state.framesSinceJolt = 0;
  }

  // ── (4) node insertion where an edge exceeds the split threshold ──
  if (state.nodes.length < state.nodeCap) {
    insertSplits(state, splitThreshold, bias);
  } else {
    // CAP HIT — never freeze. Prune a chunk of the strand and keep growing so it
    // perpetually buckles and re-buckles; occasionally reset to a fresh loop.
    state.framesSincePrune++;
    if (state.framesSincePrune >= 3) {
      state.framesSincePrune = 0;
      if (state.rng.next() < 0.08) {
        reseed(state);
      } else {
        pruneChunk(state, chaos);
      }
    }
  }

  // ── injection: occasionally spawn an extra loop to keep things lively ──
  state.framesSinceSpawn++;
  const spawnGap = Math.max(40, Math.round(220 - 150 * chaos));
  if (
    state.nodes.length < state.nodeCap * 0.92 &&
    state.framesSinceSpawn >= spawnGap &&
    state.rng.next() < 0.3 + 0.5 * chaos
  ) {
    spawnLoop(state, splitThreshold);
    state.framesSinceSpawn = 0;
  }

  // ── (colour churn) advance palette cross-fade over time ──
  state.paletteBlend += (0.0009 + 0.004 * chaos);
  if (state.paletteBlend >= 1) {
    state.paletteBlend -= 1;
    state.paletteIndex = (state.paletteIndex + 1) % PALETTE_IDS.length;
  }

  state.step++;

  // periodic historical snapshot for depth layers (keep a small ring)
  state.framesSinceSnapshot++;
  if (state.framesSinceSnapshot >= 18) {
    state.framesSinceSnapshot = 0;
    state.history.push({
      nodes: state.nodes.map((nd) => ({ x: nd.x, y: nd.y })),
      closed,
    });
    if (state.history.length > 2) state.history.shift();
  }

  return state;
}

// One relaxation pass: repulsion + springs + jitter, displacement applied.
function relax(
  state: State,
  repulsionRadius: number,
  repulsionStrength: number,
  springStrength: number,
  splitThreshold: number,
  jitter: number,
  bias: string,
  closed: boolean,
): void {
  const nodes = state.nodes;
  const n = nodes.length;
  if (n < 2) return;

  const restLen = splitThreshold * 0.62;
  const minSpacing = Math.max(restLen * 0.85, repulsionRadius * 0.45);

  const hash = new SpatialHash<Node>(repulsionRadius);
  hash.rebuild(nodes);

  for (let i = 0; i < n; i++) {
    nodes[i].px = 0;
    nodes[i].py = 0;
  }

  const r2 = repulsionRadius * repulsionRadius;

  for (let i = 0; i < n; i++) {
    const a = nodes[i];

    // ── (2) short-range repulsion ──
    if (repulsionStrength > 0) {
      hash.query(a.x, a.y, repulsionRadius, (b) => {
        if (b === a) return;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > r2 || d2 <= 1e-12) return;
        const d = Math.sqrt(d2);
        const target = Math.max(minSpacing, d);
        const push = ((repulsionRadius - d) / repulsionRadius) * repulsionStrength;
        const inv = 1 / d;
        a.px += dx * inv * push * target;
        a.py += dy * inv * push * target;
      });
    }

    // ── (1) edge springs toward neighbour midpoint + rest length ──
    if (springStrength > 0) {
      const prevI = i === 0 ? (closed ? n - 1 : -1) : i - 1;
      const nextI = i === n - 1 ? (closed ? 0 : -1) : i + 1;
      if (prevI >= 0 && nextI >= 0) {
        const pv = nodes[prevI];
        const nx = nodes[nextI];
        const mx = (pv.x + nx.x) * 0.5;
        const my = (pv.y + nx.y) * 0.5;
        a.px += (mx - a.x) * springStrength * 0.5;
        a.py += (my - a.y) * springStrength * 0.5;
      }
      if (prevI >= 0) springToward(a, nodes[prevI], restLen, springStrength * 0.5);
      if (nextI >= 0) springToward(a, nodes[nextI], restLen, springStrength * 0.5);
    }

    // ── (3) Brownian / curl jitter ──
    if (jitter > 0) {
      const w = bias === "hotspots" ? 0.4 + a.hot : 1;
      a.px += state.rng.gaussian(0, 1) * jitter * w;
      a.py += state.rng.gaussian(0, 1) * jitter * w;
    }
  }

  // Apply accumulated displacement (clamped so a frame can never blow up).
  const maxMove = repulsionRadius * 0.9;
  for (let i = 0; i < n; i++) {
    const a = nodes[i];
    let dx = a.px;
    let dy = a.py;
    const m2 = dx * dx + dy * dy;
    if (m2 > maxMove * maxMove) {
      const sc = maxMove / Math.sqrt(m2);
      dx *= sc;
      dy *= sc;
    }
    a.x += dx;
    a.y += dy;
  }
}

// Wander the hotspot centres so the growth-bias regions roam the canvas — the
// buckling migrates instead of staying pinned. Occasionally retire/replace one.
function driftHotspots(state: State, T: number, chaos: number): void {
  const hs = state.hotspots;
  for (let i = 0; i < hs.length; i++) {
    const h = hs[i];
    const ph = i * 1.7;
    const sp = 0.004 + 0.012 * chaos;
    h.x += Math.cos(T * 0.02 + ph) * sp + state.rng.range(-1, 1) * 0.0015 * chaos;
    h.y += Math.sin(T * 0.017 + ph * 1.3) * sp + state.rng.range(-1, 1) * 0.0015 * chaos;
    // keep them within a sane window so growth stays on-screen.
    const d = Math.hypot(h.x, h.y);
    if (d > 0.42) {
      h.x *= 0.42 / d;
      h.y *= 0.42 / d;
    }
    // pulse the radius gently so hot regions breathe.
    h.r = clamp(h.r + Math.sin(T * 0.03 + ph) * 0.0008, 0.06, 0.26);
  }
  // occasionally relocate one hotspot entirely for a fresh focus of buckling.
  if (hs.length > 0 && state.rng.next() < 0.01 * (0.3 + chaos)) {
    const h = hs[state.rng.int(0, hs.length - 1)];
    const a = state.rng.range(0, TAU);
    const rad = state.rng.range(0.05, 0.34);
    h.x = Math.cos(a) * rad;
    h.y = Math.sin(a) * rad;
    h.r = state.rng.range(0.08, 0.2);
    h.age = T;
  }
}

// Sudden impulse to a random contiguous span of nodes — a jolt that ripples out.
function injectJolt(state: State, repulsionRadius: number, chaos: number): void {
  const nodes = state.nodes;
  const n = nodes.length;
  const span = state.rng.int(3, Math.max(4, Math.round(n * 0.12)));
  const start = state.rng.int(0, n - 1);
  const ang = state.rng.range(0, TAU);
  const mag = repulsionRadius * (1.5 + 4 * chaos) * (0.6 + 0.8 * state.rng.next());
  const dx = Math.cos(ang) * mag;
  const dy = Math.sin(ang) * mag;
  for (let k = 0; k < span; k++) {
    const idx = state.closed ? (start + k) % n : Math.min(n - 1, start + k);
    // tapered so the jolt is strongest at the centre of the span (a bump).
    const t = k / (span - 1 || 1);
    const env = Math.sin(t * Math.PI);
    nodes[idx].x += dx * env;
    nodes[idx].y += dy * env;
  }
}

// Cut a contiguous chunk out of the strand so it can re-grow and re-buckle.
function pruneChunk(state: State, chaos: number): void {
  const nodes = state.nodes;
  const n = nodes.length;
  // remove between ~12% and ~30% of the nodes, scaled up with chaos.
  const frac = 0.12 + 0.18 * chaos;
  const remove = clamp(Math.round(n * frac), 1, n - 40);
  if (remove <= 0) return;
  const start = state.rng.int(0, n - 1);
  if (start + remove <= n) {
    nodes.splice(start, remove);
  } else {
    // wrap: trim the tail then the head (closed loops stay continuous).
    const tail = n - start;
    nodes.splice(start, tail);
    nodes.splice(0, remove - tail);
  }
}

// Reset to a fresh small loop at a new rng spot — perpetual re-buckling.
function reseed(state: State): void {
  const split = clamp(num(state.params, "splitThreshold", 0.022), 0.004, 0.2);
  const ox = state.rng.range(-0.22, 0.22);
  const oy = state.rng.range(-0.22, 0.22);
  const scale = state.rng.range(0.7, 1.4);
  state.nodes = seedLoop(state.closed, split, state.rng, ox, oy, scale, state.step, state.hotspots);
  state.history = [];
}

// Spawn an extra small loop spliced onto the strand so new buckling fronts open.
function spawnLoop(state: State, splitThreshold: number): void {
  const ox = state.rng.range(-0.26, 0.26);
  const oy = state.rng.range(-0.26, 0.26);
  const scale = state.rng.range(0.4, 0.9);
  const extra = seedLoop(state.closed, splitThreshold, state.rng, ox, oy, scale, state.step, state.hotspots);
  // splice the new loop in at a random point so it joins the existing strand.
  const at = state.rng.int(0, state.nodes.length);
  state.nodes.splice(at, 0, ...extra);
  if (state.nodes.length > state.nodeCap) state.nodes.length = state.nodeCap;
}

function springToward(a: Node, b: Node, rest: number, k: number): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  if (d <= 1e-9) return;
  // positive when too far → pull toward b; negative when too close → push off.
  const diff = (d - rest) / d;
  a.px += dx * diff * k;
  a.py += dy * diff * k;
}

function insertSplits(state: State, splitThreshold: number, bias: string): void {
  const nodes = state.nodes;
  const n = nodes.length;
  const closed = state.closed;
  const cap = state.nodeCap;
  const t2 = splitThreshold * splitThreshold;
  const edgeCount = closed ? n : n - 1;

  // Collect insertions first (index after which to insert + the new node), then
  // splice once so indices stay valid.
  const inserts: { after: number; node: Node }[] = [];

  for (let i = 0; i < edgeCount; i++) {
    if (n + inserts.length >= cap) break;
    const a = nodes[i];
    const b = nodes[(i + 1) % n];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 < t2) continue;

    const mx = (a.x + b.x) * 0.5;
    const my = (a.y + b.y) * 0.5;
    const hw = hotspotWeight(mx, my, state.hotspots);

    if (bias === "hotspots") {
      // outside hotspots, split probabilistically so growth concentrates inside.
      const prob = 0.25 + 0.75 * hw;
      if (state.rng.next() > prob) continue;
    }

    inserts.push({
      after: i,
      node: { x: mx, y: my, px: 0, py: 0, age: state.step, hot: hw },
    });
  }

  if (inserts.length === 0) return;

  // Splice from the back so earlier indices remain valid.
  for (let j = inserts.length - 1; j >= 0; j--) {
    const ins = inserts[j];
    nodes.splice(ins.after + 1, 0, ins.node);
  }
  if (nodes.length > cap) nodes.length = cap;
}

// ── Catmull-Rom → cubic-Bézier smoothing for the stroke ──────────────────────
function strokeCatmullRom(
  ctx: CanvasRenderingContext2D,
  pts: { x: number; y: number }[],
  closed: boolean,
): void {
  const n = pts.length;
  if (n < 2) return;

  const P = (i: number) => {
    if (closed) return pts[((i % n) + n) % n];
    return pts[clamp(i, 0, n - 1)];
  };

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1);
    const p1 = P(i);
    const p2 = P(i + 1);
    const p3 = P(i + 2);
    // standard Catmull-Rom → Bézier control points (tension 0.5 baked into /6).
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p2.x, p2.y);
  }
  if (closed) ctx.closePath();
}

// ── render ─────────────────────────────────────────────────────────────────────
function render(state: State, surface: RenderSurface): void {
  const s = surface as Canvas2DSurface;
  const ctx = s.ctx;
  const w = s.width;
  const h = s.height;
  const scaleUnit = Math.min(w, h);
  const cx = w * 0.5;
  const cy = h * 0.5;

  const p = state.params;
  const chaos = clamp(num(p, "chaos", 0.85), 0, 1);

  // ── (colour churn) cross-fade between two cycling palettes over time ──
  // We blend the user palette with the next system palette so the whole field
  // drifts through hue families; chaos deepens how far it strays.
  const userPal = getPalette(str(p, "palette", "coral"));
  const churn = 0.35 + 0.55 * chaos;
  const palA = blendPalettes(userPal, getPalette(PALETTE_IDS[state.paletteIndex]), churn);
  const palB = blendPalettes(userPal, getPalette(PALETTE_IDS[(state.paletteIndex + 1) % PALETTE_IDS.length]), churn);
  const palette = blendPalettes(palA, palB, state.paletteBlend);

  // a slow time-varying offset added to every colour field lookup — the whole
  // strand pulses through the ramp.
  const colourOffset = 0.18 * Math.sin(state.tick * 0.05) * (0.5 + chaos);

  const strokeScale = num(p, "strokeScale", 1);

  // background — dark base tinted toward the low end of the palette.
  const bg = fieldToColor(0.04, palette);
  ctx.save();
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // map normalised coord → device coord.
  const TX = (x: number) => cx + x * scaleUnit;
  const TY = (y: number) => cy + y * scaleUnit;

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // ── faded historical layers for depth (oldest = faintest, drawn first) ──
  for (let hi = 0; hi < state.history.length; hi++) {
    const layer = state.history[hi];
    const depth = (hi + 1) / (state.history.length + 1); // 0..1, newer = larger
    const pts = layer.nodes.map((nd) => ({ x: TX(nd.x), y: TY(nd.y) }));
    ctx.globalAlpha = 0.1 + 0.12 * depth;
    ctx.strokeStyle = fieldToColor(0.3 + 0.2 * depth, palette);
    ctx.lineWidth = Math.max(0.5, strokeScale * scaleUnit * 0.0016 * (1 + depth));
    strokeCatmullRom(ctx, pts, layer.closed);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // ── main curve ──
  const nodes = state.nodes;
  const n = nodes.length;
  if (n >= 2) {
    const pts = nodes.map((nd) => ({ x: TX(nd.x), y: TY(nd.y) }));

    // Variable width: thicker on the younger / higher-curvature stretches. We
    // colour by growth age (newer growth = brighter) so the bloom history reads.
    const maxAge = Math.max(1, state.step);
    // Draw segment-by-segment so width + colour can vary along the curve.
    const last = state.closed ? n : n - 1;

    const baseW = strokeScale * scaleUnit * 0.0026;

    for (let i = 0; i < last; i++) {
      const a = nodes[i];
      const b = nodes[(i + 1) % n];

      // curvature estimate at this segment (turn angle with the previous node).
      const prevI = i === 0 ? (state.closed ? n - 1 : 0) : i - 1;
      const curv = turnAngle(nodes[prevI], a, b);

      const ageT = clamp(a.age / maxAge, 0, 1); // 0 old … 1 just born
      // colour field blends growth age + curvature with a travelling hue sweep
      // along the strand and the global time offset → vivid, shifting colour.
      const sweep = 0.32 * Math.sin((i / Math.max(1, last)) * TAU * (1.5 + 1.5 * chaos) - state.tick * 0.08);
      const field = clamp(0.25 + 0.45 * ageT + 0.3 * (curv / Math.PI) + colourOffset + sweep, 0, 1);
      // width swells with curvature and youth, but stays bounded.
      const wWidth = baseW * (0.7 + 1.4 * (curv / Math.PI) + 0.5 * ageT);

      ctx.beginPath();
      // short Catmull-Rom span across p0..p3 for a smooth segment
      const p0 = nodes[prevI];
      const p3 = nodes[(i + 2) % n];
      const A = pts[i];
      const B = pts[(i + 1) % n];
      const c1x = A.x + (B.x - TX(p0.x)) / 6;
      const c1y = A.y + (B.y - TY(p0.y)) / 6;
      const c2x = B.x - (TX(p3.x) - A.x) / 6;
      const c2y = B.y - (TY(p3.y) - A.y) / 6;
      ctx.moveTo(A.x, A.y);
      ctx.bezierCurveTo(c1x, c1y, c2x, c2y, B.x, B.y);
      ctx.strokeStyle = fieldToColor(field, palette);
      ctx.lineWidth = Math.max(0.4, wWidth);
      ctx.stroke();
    }

    // a faint bright overlay along the whole loop to tie it together.
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = fieldToColor(0.92, palette);
    ctx.lineWidth = Math.max(0.4, baseW * 0.45);
    strokeCatmullRom(ctx, pts, state.closed);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function turnAngle(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }): number {
  const v1x = b.x - a.x;
  const v1y = b.y - a.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const l1 = Math.hypot(v1x, v1y) || 1;
  const l2 = Math.hypot(v2x, v2y) || 1;
  const dot = (v1x * v2x + v1y * v2y) / (l1 * l2);
  return Math.acos(clamp(dot, -1, 1)); // 0 (straight) … π (reversal)
}

function isDone(_state: State): boolean {
  // The circus never closes. Always live → constant vivid motion.
  return false;
}

export const differentialGrowth: GenerativeSystem<State> = {
  id: "differential-growth",
  title: "Differential Growth",
  blurb: "Buckling membranes — brain coral, hyphae, ribbons.",
  tier: "canvas2d",
  schema,
  init,
  step,
  render,
  isDone,
};
