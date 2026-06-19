// Space Colonization (Runions / Lane / Prusinkiewicz venation) — CIRCUS MODE.
//
// Attractor points are scattered inside a domain mask. Each growth step:
//   1. every attractor finds the nearest growth node within `influenceRadius`;
//   2. every node influenced by ≥1 attractor grows one new node `stepLength`
//      toward the average (normalised) direction of its influencing attractors;
//   3. an attractor is removed once any node sits within `killRadius` of it.
//
// Unlike a one-shot drawing, this build NEVER settles: when a colony exhausts
// its attractors (or hits the node cap) it auto-reseeds at a fresh rng spot, we
// run several overlapping colonies, sprinkle new attractors near the live tips
// every step, fling new colonies at random, and continuously wander the growth
// parameters + colour with slow sin() of an internal tick scaled by `chaos`.
//
// Thickness tapers by subtree size or Strahler/branch order. Colour is driven by
// depth-from-root through the chosen palette, plus an animated, churning offset.

import type {
  Canvas2DSurface,
  GenerativeSystem,
  ParamSchema,
  Params,
  RenderSurface,
  RNG,
} from "../core/types";
import { fieldToColor, getPalette, PALETTE_IDS } from "../core/color";
import { TAU, clamp } from "../core/math";
import { SpatialHash } from "../core/spatial-hash";

// ── Domain ─────────────────────────────────────────────────────────────────────
// Everything lives in a normalised box [0,1]×[0,1]. (0,0) = top-left to match the
// canvas; "down" is +y. render() multiplies by min(width,height) so a hi-res
// re-render at a larger size is geometrically identical.

interface Node {
  x: number;
  y: number;
  parent: number; // index of parent node within its colony, or -1 for a root
  depth: number; // graph distance from the root (in node hops)
  // accumulators for thickness, filled after growth:
  subtree: number; // number of descendant nodes (incl. self)
  order: number; // Strahler branch order
}

interface Attractor {
  x: number;
  y: number;
  alive: boolean;
}

// SpatialHash item: a node position plus its index so queries can resolve it.
interface HashNode {
  x: number;
  y: number;
  i: number;
}

// One independent growing network. Several run at once and turn over.
interface Colony {
  nodes: Node[];
  attractors: Attractor[];
  hash: SpatialHash<HashNode>;
  hashItems: HashNode[]; // reused scratch, rebuilt each step
  maxDepth: number; // running max depth, for colour normalisation
  maxSubtree: number; // running max subtree size, for thickness normalisation
  hueShift: number; // per-colony colour rotation so they read distinctly
  paletteIndex: number; // which palette this colony currently rides
  finished: boolean; // reached cap / attractors gone → will be reseeded
}

export interface State {
  params: Params;
  rng: RNG;
  colonies: Colony[];
  tick: number; // internal frame counter — drives all the wander
  // live (wandered) values, recomputed each step from base params + chaos:
  influenceRadius: number;
  killRadius: number;
  stepLength: number;
  maxNodes: number;
  // cached domain helpers
  inside: (x: number, y: number) => boolean;
  done: boolean; // never true in circus mode, kept for contract symmetry
}

// ── Schema ──────────────────────────────────────────────────────────────────────
// `chaos` scales every wander / jitter amplitude. Render-only params stay `hot`.

const schema: ParamSchema = {
  palette: { type: "select", options: PALETTE_IDS, default: "fern", hot: true, label: "Palette" },
  chaos: { type: "number", min: 0, max: 1, step: 0.01, default: 0.85, hot: true, label: "Chaos" },
  attractorCount: { type: "int", min: 200, max: 6000, default: 2200, label: "Attractors" },
  distribution: {
    type: "select",
    options: ["uniform", "clustered", "ring"],
    default: "uniform",
    label: "Distribution",
  },
  domainShape: {
    type: "select",
    options: ["circle", "leaf", "canopy"],
    default: "leaf",
    label: "Domain",
  },
  influenceRadius: { type: "number", min: 0.04, max: 0.4, step: 0.005, default: 0.16, label: "Influence radius" },
  killRadius: { type: "number", min: 0.005, max: 0.08, step: 0.001, default: 0.02, label: "Kill radius" },
  stepLength: { type: "number", min: 0.004, max: 0.03, step: 0.001, default: 0.009, label: "Step length" },
  maxNodes: { type: "int", min: 500, max: 9000, default: 6000, label: "Max nodes" },
  thicknessModel: { type: "select", options: ["subtree", "order"], default: "subtree", label: "Thickness" },
  rootCount: { type: "int", min: 1, max: 3, default: 1, label: "Roots" },
  strokeScale: { type: "number", min: 0.2, max: 4, step: 0.05, default: 1.2, hot: true, label: "Stroke scale" },
};

// How many overlapping colonies churn at once.
const COLONY_COUNT = 3;

// ── Domain masks ─────────────────────────────────────────────────────────────────
// All masks are evaluated in normalised [0,1]² space. Return true if (x,y) is
// inside the domain.

function insideCircle(x: number, y: number): boolean {
  const dx = x - 0.5;
  const dy = y - 0.5;
  return dx * dx + dy * dy <= 0.46 * 0.46;
}

// Teardrop / leaf outline. Centred horizontally; tip at the top, base at bottom.
function insideLeaf(x: number, y: number): boolean {
  const yTop = 0.06;
  const yBot = 0.92;
  if (y < yTop || y > yBot) return false;
  const t = (yBot - y) / (yBot - yTop); // 0 at base, 1 at tip
  const halfWidth = 0.34 * Math.pow(Math.sin(t * Math.PI), 0.65) * (1 - 0.25 * t);
  const dx = Math.abs(x - 0.5);
  return dx <= halfWidth;
}

// Upper dome (a tree canopy). Root sits at the bottom-centre, mass up top.
function insideCanopy(x: number, y: number): boolean {
  const cx = 0.5;
  const cy = 0.36;
  const dx = (x - cx) / 0.44;
  const dy = (y - cy) / 0.34;
  if (dx * dx + dy * dy <= 1 && y <= 0.62) return true;
  if (y > 0.62 && Math.abs(x - cx) <= 0.06) return true;
  return false;
}

function maskFor(shape: string): (x: number, y: number) => boolean {
  if (shape === "circle") return insideCircle;
  if (shape === "canopy") return insideCanopy;
  return insideLeaf;
}

// ── Attractor scattering ──────────────────────────────────────────────────────────

function scatterAttractors(
  rng: RNG,
  count: number,
  distribution: string,
  inside: (x: number, y: number) => boolean,
): Attractor[] {
  const out: Attractor[] = [];

  // Pre-pick cluster centres for the 'clustered' distribution.
  const clusterCenters: { x: number; y: number }[] = [];
  if (distribution === "clustered") {
    const nClusters = clamp(Math.round(count / 220), 4, 14);
    let tries = 0;
    while (clusterCenters.length < nClusters && tries < nClusters * 200) {
      tries++;
      const x = rng.next();
      const y = rng.next();
      if (inside(x, y)) clusterCenters.push({ x, y });
    }
    if (clusterCenters.length === 0) clusterCenters.push({ x: 0.5, y: 0.5 });
  }

  let guard = 0;
  const guardMax = count * 400 + 5000;
  while (out.length < count && guard < guardMax) {
    guard++;
    let x: number;
    let y: number;
    if (distribution === "ring") {
      const a = rng.next() * TAU;
      const r = 0.46 * Math.sqrt(0.35 + 0.65 * rng.next());
      x = 0.5 + Math.cos(a) * r;
      y = 0.5 + Math.sin(a) * r;
    } else if (distribution === "clustered") {
      const c = rng.pick(clusterCenters);
      x = c.x + rng.gaussian(0, 0.06);
      y = c.y + rng.gaussian(0, 0.06);
    } else {
      x = rng.next();
      y = rng.next();
    }
    if (x < 0 || x > 1 || y < 0 || y > 1) continue;
    if (inside(x, y)) out.push({ x, y, alive: true });
  }
  return out;
}

// Pick a random root somewhere inside the mask (used for reseeding & flinging).
function randomRoot(rng: RNG, inside: (x: number, y: number) => boolean): Node {
  let x = 0.5;
  let y = 0.5;
  for (let tries = 0; tries < 200; tries++) {
    const cx = rng.next();
    const cy = rng.next();
    if (inside(cx, cy)) {
      x = cx;
      y = cy;
      break;
    }
  }
  return { x, y, parent: -1, depth: 0, subtree: 1, order: 1 };
}

// Seed root nodes near the base of the domain.
function makeRoots(shape: string, rootCount: number, rng: RNG): Node[] {
  const roots: Node[] = [];
  const n = clamp(Math.round(rootCount), 1, 3);
  for (let i = 0; i < n; i++) {
    let x: number;
    let y: number;
    const jitter = n === 1 ? 0 : (i / (n - 1) - 0.5) * 0.18;
    if (shape === "canopy") {
      x = 0.5 + jitter + rng.range(-0.01, 0.01);
      y = 0.9;
    } else if (shape === "leaf") {
      x = 0.5 + jitter + rng.range(-0.01, 0.01);
      y = 0.9;
    } else {
      x = 0.5 + jitter + rng.range(-0.01, 0.01);
      y = 0.5 + rng.range(-0.01, 0.01);
    }
    roots.push({ x, y, parent: -1, depth: 0, subtree: 1, order: 1 });
  }
  return roots;
}

// Build a fresh colony with its own attractor field + roots.
function makeColony(
  state: State,
  opts?: { flung?: boolean },
): Colony {
  const { rng, params, inside } = state;
  const shape = String(params.domainShape);
  const distribution = String(params.distribution);
  const attractorCount = Math.round(Number(params.attractorCount));

  const attractors = scatterAttractors(rng, attractorCount, distribution, inside);

  // A "flung" colony starts from a random in-domain point instead of the base,
  // which keeps the composition unpredictable.
  const nodes = opts?.flung
    ? [randomRoot(rng, inside)]
    : makeRoots(shape, Number(params.rootCount), rng);

  return {
    nodes,
    attractors,
    hash: new SpatialHash<HashNode>(Math.max(0.01, state.influenceRadius)),
    hashItems: [],
    maxDepth: 0,
    maxSubtree: 1,
    hueShift: rng.next(), // 0..1 colour rotation, unique per colony
    paletteIndex: rng.int(0, PALETTE_IDS.length - 1),
    finished: false,
  };
}

// ── Lifecycle ──────────────────────────────────────────────────────────────────────

function init(surface: RenderSurface, params: Params, rng: RNG): State {
  void surface; // geometry is normalised; surface size only matters at render time

  const shape = String(params.domainShape);
  const inside = maskFor(shape);

  const influenceRadius = Number(params.influenceRadius);
  let killRadius = Number(params.killRadius);
  killRadius = Math.min(killRadius, influenceRadius * 0.9);
  const stepLength = Number(params.stepLength);
  const maxNodes = Math.round(Number(params.maxNodes));

  const state: State = {
    params,
    rng,
    colonies: [],
    tick: 0,
    influenceRadius,
    killRadius,
    stepLength,
    maxNodes,
    inside,
    done: false,
  };

  for (let i = 0; i < COLONY_COUNT; i++) {
    state.colonies.push(makeColony(state, { flung: i > 0 }));
  }
  return state;
}

// Re-derive live growth params from base params, wandered by slow sin(tick) plus
// rng jitter, all scaled by `chaos`. This is what keeps the thing breathing.
function driveChaos(state: State): void {
  const p = state.params;
  const chaos = clamp(Number(p.chaos), 0, 1);
  const t = state.tick;

  const baseInfluence = Number(p.influenceRadius);
  const baseKill = Number(p.killRadius);
  const baseStep = Number(p.stepLength);
  const baseMax = Math.round(Number(p.maxNodes));

  // slow, out-of-phase oscillators so params never line up the same way twice.
  const wob = (period: number, phase: number) => Math.sin(t / period + phase);
  const jit = () => (state.rng.next() - 0.5) * 2;

  const inflAmp = baseInfluence * 0.6 * chaos;
  const killAmp = baseKill * 0.6 * chaos;
  const stepAmp = baseStep * 0.8 * chaos;

  state.influenceRadius = clamp(
    baseInfluence + inflAmp * (0.7 * wob(140, 0) + 0.3 * jit()),
    0.04,
    0.45,
  );
  state.stepLength = clamp(
    baseStep + stepAmp * (0.7 * wob(90, 1.7) + 0.3 * jit()),
    0.004,
    0.04,
  );
  // keep kill comfortably below influence so growth keeps reaching attractors.
  const killWander = baseKill + killAmp * (0.7 * wob(110, 3.1) + 0.3 * jit());
  state.killRadius = clamp(Math.min(killWander, state.influenceRadius * 0.85), 0.004, 0.08);

  // breathe the node cap so colonies turn over at varying sizes.
  const capAmp = baseMax * 0.35 * chaos;
  state.maxNodes = Math.round(clamp(baseMax + capAmp * wob(200, 0.5), 500, 9000));
}

function step(state: State, dt: number): State {
  void dt;
  state.tick++;

  driveChaos(state);

  const chaos = clamp(Number(state.params.chaos), 0, 1);

  // Grow several batches per frame across every colony so the canvas fills fast
  // and turns over. More chaos → more work per frame → more frenetic motion.
  const roundsPerFrame = 5 + Math.round(5 * chaos); // 5..10
  for (let round = 0; round < roundsPerFrame; round++) {
    for (let c = 0; c < state.colonies.length; c++) {
      growOnce(state, state.colonies[c]);
    }
  }

  // Continuous injection: sprinkle attractors near live tips, and occasionally
  // fling a whole new colony to keep things unpredictable.
  for (let c = 0; c < state.colonies.length; c++) {
    injectNearTips(state, state.colonies[c]);
  }

  // Reseed any finished colony into a brand-new one so growth is perpetual.
  for (let c = 0; c < state.colonies.length; c++) {
    if (state.colonies[c].finished) {
      state.colonies[c] = makeColony(state, { flung: state.rng.next() < 0.6 });
    }
  }

  // Occasionally fling: replace a random colony with a fresh flung one even if it
  // hasn't finished, so the composition keeps reshuffling. Rate scales with chaos.
  if (state.rng.next() < 0.02 + 0.06 * chaos) {
    const victim = state.rng.int(0, state.colonies.length - 1);
    state.colonies[victim] = makeColony(state, { flung: true });
  }

  // recompute thickness accumulators for every colony (used by render).
  for (let c = 0; c < state.colonies.length; c++) {
    computeThickness(state.colonies[c]);
  }
  return state;
}

// Sprinkle new attractors just beyond the growing tips so branches keep finding
// fresh space to invade. Tips = recently added nodes (high indices).
function injectNearTips(state: State, colony: Colony): void {
  const { rng, inside } = state;
  const chaos = clamp(Number(state.params.chaos), 0, 1);
  const nodes = colony.nodes;
  if (nodes.length === 0) return;
  if (colony.attractors.length > 12000) return; // safety cap on attractor count

  const spawnCount = 4 + Math.round(20 * chaos); // 4..24 per colony per frame
  const spread = state.influenceRadius * (0.8 + 0.6 * chaos);

  for (let i = 0; i < spawnCount; i++) {
    // bias toward the newest tips (end of the array).
    const idx = Math.min(
      nodes.length - 1,
      Math.floor(nodes.length * (1 - rng.next() * rng.next())),
    );
    const tip = nodes[idx];
    const ang = rng.next() * TAU;
    const rad = spread * Math.sqrt(rng.next());
    const x = tip.x + Math.cos(ang) * rad;
    const y = tip.y + Math.sin(ang) * rad;
    if (x < 0 || x > 1 || y < 0 || y > 1) continue;
    if (!inside(x, y)) continue;
    colony.attractors.push({ x, y, alive: true });
  }
}

// One Space-Colonization growth round for a single colony. Sets colony.finished
// when it can no longer grow; the caller reseeds finished colonies.
function growOnce(state: State, colony: Colony): void {
  const { nodes, attractors, hash } = colony;
  const { influenceRadius, killRadius, stepLength } = state;

  if (nodes.length >= state.maxNodes) {
    colony.finished = true;
    return;
  }
  if (nodes.length === 0) {
    colony.finished = true;
    return;
  }

  // count remaining live attractors; finish if none.
  let liveCount = 0;
  for (let i = 0; i < attractors.length; i++) if (attractors[i].alive) liveCount++;
  if (liveCount === 0) {
    colony.finished = true;
    return;
  }

  // rebuild the spatial hash from the current nodes.
  const items = colony.hashItems;
  items.length = 0;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    items.push({ x: n.x, y: n.y, i });
  }
  hash.rebuild(items);

  // For each node, accumulate the summed direction of influencing attractors.
  const dirX = new Float64Array(nodes.length);
  const dirY = new Float64Array(nodes.length);
  const infl = new Int32Array(nodes.length);

  const infl2 = influenceRadius * influenceRadius;

  for (let a = 0; a < attractors.length; a++) {
    const at = attractors[a];
    if (!at.alive) continue;

    let bestI = -1;
    let bestD2 = infl2;
    hash.query(at.x, at.y, influenceRadius, (it) => {
      const dx = nodes[it.i].x - at.x;
      const dy = nodes[it.i].y - at.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        bestI = it.i;
      }
    });

    if (bestI >= 0) {
      const nx = nodes[bestI].x;
      const ny = nodes[bestI].y;
      let vx = at.x - nx;
      let vy = at.y - ny;
      const l = Math.hypot(vx, vy) || 1;
      vx /= l;
      vy /= l;
      dirX[bestI] += vx;
      dirY[bestI] += vy;
      infl[bestI] += 1;
    }
  }

  // Directional jitter so growth wiggles instead of marching straight.
  const chaos = clamp(Number(state.params.chaos), 0, 1);
  const wiggle = 0.5 * chaos;

  let grew = false;
  const startLen = nodes.length;
  for (let i = 0; i < startLen; i++) {
    if (infl[i] === 0) continue;
    let vx = dirX[i];
    let vy = dirY[i];
    const l = Math.hypot(vx, vy);
    if (l < 1e-6) continue;
    vx /= l;
    vy /= l;

    // rotate the growth direction by a small chaotic angle.
    if (wiggle > 0) {
      const ang =
        (Math.sin(state.tick * 0.13 + i * 0.7) * 0.5 + (state.rng.next() - 0.5)) *
        wiggle;
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      const rx = vx * ca - vy * sa;
      const ry = vx * sa + vy * ca;
      vx = rx;
      vy = ry;
    }

    const parent = nodes[i];
    const nxx = parent.x + vx * stepLength;
    const nyy = parent.y + vy * stepLength;

    const child: Node = {
      x: nxx,
      y: nyy,
      parent: i,
      depth: parent.depth + 1,
      subtree: 1,
      order: 1,
    };
    nodes.push(child);
    if (child.depth > colony.maxDepth) colony.maxDepth = child.depth;
    grew = true;

    if (nodes.length >= state.maxNodes) break;
  }

  // Kill attractors that any node has reached.
  items.length = 0;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    items.push({ x: n.x, y: n.y, i });
  }
  hash.rebuild(items);

  const kill2 = killRadius * killRadius;
  for (let a = 0; a < attractors.length; a++) {
    const at = attractors[a];
    if (!at.alive) continue;
    let reached = false;
    hash.query(at.x, at.y, killRadius, (it) => {
      if (reached) return;
      const dx = nodes[it.i].x - at.x;
      const dy = nodes[it.i].y - at.y;
      if (dx * dx + dy * dy <= kill2) reached = true;
    });
    if (reached) at.alive = false;
  }

  if (!grew) {
    // No node could grow toward any live attractor this round. The continuous
    // injection usually revives it next frame, but if it's truly stuck mark it
    // finished so the caller reseeds a fresh colony — never a static frame.
    colony.finished = true;
  }
}

// Compute subtree sizes and Strahler order in one bottom-up pass for a colony.
function computeThickness(colony: Colony): void {
  const nodes = colony.nodes;
  const n = nodes.length;
  if (n === 0) {
    colony.maxSubtree = 1;
    return;
  }

  for (let i = 0; i < n; i++) {
    nodes[i].subtree = 1;
    nodes[i].order = 1;
  }

  const childCount = new Int32Array(n);
  const childMaxOrder = new Int32Array(n);
  const childMaxOrderCount = new Int32Array(n);

  for (let i = n - 1; i >= 1; i--) {
    const p = nodes[i].parent;
    if (p >= 0) nodes[p].subtree += nodes[i].subtree;
  }

  for (let i = n - 1; i >= 1; i--) {
    const o = nodes[i].order;
    const p = nodes[i].parent;
    if (p < 0) continue;
    childCount[p]++;
    if (o > childMaxOrder[p]) {
      childMaxOrder[p] = o;
      childMaxOrderCount[p] = 1;
    } else if (o === childMaxOrder[p]) {
      childMaxOrderCount[p]++;
    }
    if (childCount[p] > 0) {
      nodes[p].order =
        childMaxOrderCount[p] >= 2 ? childMaxOrder[p] + 1 : childMaxOrder[p];
    }
  }

  let maxSub = 1;
  for (let i = 0; i < n; i++) if (nodes[i].subtree > maxSub) maxSub = nodes[i].subtree;
  colony.maxSubtree = maxSub;
}

// Circus mode never settles.
function isDone(): boolean {
  return false;
}

// ── Render ──────────────────────────────────────────────────────────────────────

function render(state: State, surface: RenderSurface): void {
  const s = surface as Canvas2DSurface;
  const ctx = s.ctx;
  const W = s.width;
  const H = s.height;

  const unit = Math.min(W, H);
  const offX = (W - unit) * 0.5;
  const offY = (H - unit) * 0.5;
  const X = (nx: number) => offX + nx * unit;
  const Y = (ny: number) => offY + ny * unit;

  ctx.clearRect(0, 0, W, H);

  const basePaletteId = String(state.params.palette);
  const strokeScale = Number(state.params.strokeScale);
  const thicknessModel = String(state.params.thicknessModel);
  const chaos = clamp(Number(state.params.chaos), 0, 1);
  const t = state.tick;

  // Global colour churn: a time-varying offset added to the depth value before
  // fieldToColor, plus a slow drift through PALETTE_IDS, so hue shifts vividly.
  const globalChurn = 0.5 + 0.5 * Math.sin(t / 60); // 0..1
  const paletteDrift = Math.floor(t / 90); // step through palettes over time

  const baseW = unit * 0.0016;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let c = 0; c < state.colonies.length; c++) {
    const colony = state.colonies[c];
    const nodes = colony.nodes;
    if (nodes.length < 2) continue;

    // Each colony rides its own palette (drifting over time) when chaos is high,
    // otherwise everyone shares the user's chosen palette.
    let paletteId = basePaletteId;
    if (chaos > 0.05) {
      const pi = (colony.paletteIndex + paletteDrift) % PALETTE_IDS.length;
      paletteId = PALETTE_IDS[pi];
    }
    const palette = getPalette(paletteId);

    const maxDepth = Math.max(1, colony.maxDepth);
    const maxSubtree = Math.max(1, colony.maxSubtree);

    const order = new Array<number>(nodes.length);
    for (let i = 0; i < nodes.length; i++) order[i] = i;

    const thicknessOf = (i: number): number => {
      const nd = nodes[i];
      if (thicknessModel === "order") return Math.pow(nd.order, 1.35);
      return Math.sqrt(nd.subtree / maxSubtree);
    };

    order.sort((a, b) => thicknessOf(a) - thicknessOf(b));

    let maxThick = 1e-6;
    for (let i = 0; i < nodes.length; i++) {
      const tk = thicknessOf(i);
      if (tk > maxThick) maxThick = tk;
    }

    // per-colony hue offset + global churn, wrapped into 0..1 for the palette.
    const colourOffset = (colony.hueShift + globalChurn * chaos) % 1;

    for (let k = 0; k < order.length; k++) {
      const i = order[k];
      const nd = nodes[i];
      if (nd.parent < 0) continue;
      const pa = nodes[nd.parent];

      let depth01 = nd.depth / maxDepth + colourOffset;
      depth01 = depth01 - Math.floor(depth01); // wrap into [0,1)
      ctx.strokeStyle = fieldToColor(depth01, palette);

      const tNorm = thicknessOf(i) / maxThick;
      const w = baseW * strokeScale * (0.4 + 4.2 * tNorm);
      ctx.lineWidth = Math.max(0.4, w);

      ctx.beginPath();
      ctx.moveTo(X(pa.x), Y(pa.y));
      ctx.lineTo(X(nd.x), Y(nd.y));
      ctx.stroke();
    }

    // dots at the roots to anchor each colony.
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].parent >= 0) continue;
      ctx.fillStyle = fieldToColor((colourOffset) % 1, palette);
      ctx.beginPath();
      ctx.arc(X(nodes[i].x), Y(nodes[i].y), Math.max(1, baseW * strokeScale * 2.4), 0, TAU);
      ctx.fill();
    }
  }
}

export const spaceColonization: GenerativeSystem<State> = {
  id: "space-colonization",
  title: "Space Colonization",
  blurb: "Vascular venation — leaf veins, canopies, roots. Now a churning, never-still circus.",
  tier: "canvas2d",
  schema,
  init,
  step,
  render,
  isDone,
};
