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
import { fieldToColor, getPalette, PALETTE_IDS } from "../core/color";
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
  done: boolean;
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

// ── init ──────────────────────────────────────────────────────────────────────
function init(_surface: RenderSurface, params: Params, rng: RNG): State {
  const closed = bool(params, "closed", true);
  const nodeCap = Math.round(num(params, "nodeCap", 3200));
  const split = num(params, "splitThreshold", 0.022);

  const nodes: Node[] = [];

  if (closed) {
    // Start from a small circle so the very first step already has tension.
    const count = 44;
    // radius a touch under half the split threshold × count / TAU so edges sit
    // comfortably below the split length — buckling, not exploding, from frame 1.
    const radius = Math.max(0.05, (split * count) / TAU * 0.45);
    const wobble = rng.range(0, TAU);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU;
      // a faint radial wobble seeds asymmetry deterministically from the rng.
      const rr = radius * (1 + 0.04 * Math.sin(a * 3 + wobble) + rng.range(-0.01, 0.01));
      nodes.push({
        x: Math.cos(a) * rr,
        y: Math.sin(a) * rr,
        px: 0,
        py: 0,
        age: 0,
        hot: 0,
      });
    }
  } else {
    // Open chain: a short, slightly bowed horizontal line through the centre.
    const count = 40;
    const half = (split * count) / 2 * 0.4;
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const x = (t - 0.5) * 2 * half;
      const y = Math.sin(t * Math.PI) * 0.01 + rng.range(-0.002, 0.002);
      nodes.push({ x, y, px: 0, py: 0, age: 0, hot: 0 });
    }
  }

  // Hotspots: a few regions that bias node insertion when growthBias === hotspots.
  const hotspots: Hotspot[] = [];
  const hsCount = rng.int(2, 4);
  for (let i = 0; i < hsCount; i++) {
    const a = rng.range(0, TAU);
    const rad = rng.range(0.05, 0.32);
    hotspots.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad, r: rng.range(0.08, 0.2) });
  }
  // Tag the initial nodes with their hotspot weight.
  for (const n of nodes) n.hot = hotspotWeight(n.x, n.y, hotspots);

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
    done: false,
  };
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
  if (state.done) return state;

  const p = state.params;
  const nodes = state.nodes;
  const n = nodes.length;
  if (n < 2) {
    state.done = true;
    return state;
  }

  const repulsionRadius = clamp(num(p, "repulsionRadius", 0.018), 0.001, 0.2);
  const repulsionStrength = num(p, "repulsionStrength", 0.42);
  const springStrength = num(p, "springStrength", 0.3);
  const splitThreshold = clamp(num(p, "splitThreshold", 0.022), 0.004, 0.2);
  const jitter = Math.max(0, num(p, "jitter", 0.0008));
  const bias = str(p, "growthBias", "uniform");
  const closed = state.closed;

  // Rest length: a hair under the split threshold so springs and splits agree.
  const restLen = splitThreshold * 0.62;
  // Minimum spacing the repulsion defends — keeps the curve from self-touching.
  const minSpacing = Math.max(restLen * 0.85, repulsionRadius * 0.45);

  // 1. Spatial hash for neighbour repulsion (rebuilt every step).
  const hash = new SpatialHash<Node>(repulsionRadius);
  hash.rebuild(nodes);

  // Reset per-step displacement accumulators.
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
        // soft falloff to the repulsion radius, clamped to defend minSpacing.
        const target = Math.max(minSpacing, d);
        const push = ((repulsionRadius - d) / repulsionRadius) * repulsionStrength;
        const inv = 1 / d;
        a.px += (dx * inv) * push * target;
        a.py += (dy * inv) * push * target;
      });
    }

    // ── (1) edge springs toward neighbour midpoint + rest length ──
    if (springStrength > 0) {
      const prevI = i === 0 ? (closed ? n - 1 : -1) : i - 1;
      const nextI = i === n - 1 ? (closed ? 0 : -1) : i + 1;

      if (prevI >= 0 && nextI >= 0) {
        // interior node: pull toward midpoint of its two neighbours (smoothing)
        const pv = nodes[prevI];
        const nx = nodes[nextI];
        const mx = (pv.x + nx.x) * 0.5;
        const my = (pv.y + nx.y) * 0.5;
        a.px += (mx - a.x) * springStrength * 0.5;
        a.py += (my - a.y) * springStrength * 0.5;
      }
      // additionally, enforce rest length on each incident edge
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
      const s = maxMove / Math.sqrt(m2);
      dx *= s;
      dy *= s;
    }
    a.x += dx;
    a.y += dy;
  }

  // ── (4) node insertion where an edge exceeds the split threshold ──
  if (nodes.length < state.nodeCap) {
    insertSplits(state, splitThreshold, bias);
  }

  state.step++;

  // periodic historical snapshot for depth layers (keep a small ring)
  state.framesSinceSnapshot++;
  if (state.framesSinceSnapshot >= 26 && nodes.length < state.nodeCap) {
    state.framesSinceSnapshot = 0;
    state.history.push({
      nodes: nodes.map((nd) => ({ x: nd.x, y: nd.y })),
      closed,
    });
    if (state.history.length > 2) state.history.shift();
  }

  if (nodes.length >= state.nodeCap) state.done = true;

  return state;
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
  const palette = getPalette(str(p, "palette", "coral"));
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
      // colour field blends growth age with curvature so folds catch light.
      const field = clamp(0.25 + 0.55 * ageT + 0.35 * (curv / Math.PI), 0, 1);
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

function isDone(state: State): boolean {
  return state.done;
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
