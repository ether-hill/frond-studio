// Space Colonization (Runions / Lane / Prusinkiewicz venation).
//
// Attractor points are scattered inside a domain mask. Each growth step:
//   1. every attractor finds the nearest growth node within `influenceRadius`;
//   2. every node influenced by ≥1 attractor grows one new node `stepLength`
//      toward the average (normalised) direction of its influencing attractors;
//   3. an attractor is removed once any node sits within `killRadius` of it.
// Growth stops when no attractors remain or `maxNodes` is reached.
//
// Thickness tapers by subtree size or Strahler/branch order so the network looks
// botanical. Colour is driven by depth-from-root through the chosen palette.

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
  parent: number; // index of parent node, or -1 for a root
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

export interface State {
  params: Params;
  rng: RNG;
  nodes: Node[];
  attractors: Attractor[];
  hash: SpatialHash<HashNode>;
  hashItems: HashNode[]; // reused scratch, rebuilt each step
  influenceRadius: number; // resolved (normalised) values cached at init
  killRadius: number;
  stepLength: number;
  maxNodes: number;
  maxDepth: number; // running max depth, for colour normalisation
  maxSubtree: number; // running max subtree size, for thickness normalisation
  done: boolean;
}

// ── Schema ──────────────────────────────────────────────────────────────────────
// Structural params (counts / radii / domain) omit `hot` so a change resets the
// sim. Render-only params (palette, strokeScale) are `hot` so they read live.

const schema: ParamSchema = {
  palette: { type: "select", options: PALETTE_IDS, default: "fern", hot: true, label: "Palette" },
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

// ── Domain masks ─────────────────────────────────────────────────────────────────
// All masks are evaluated in normalised [0,1]² space. Return true if (x,y) is
// inside the domain.

function insideCircle(x: number, y: number): boolean {
  const dx = x - 0.5;
  const dy = y - 0.5;
  return dx * dx + dy * dy <= 0.46 * 0.46;
}

// Teardrop / leaf outline. Centred horizontally; tip at the top, base at bottom.
// We use a superquadric-ish width profile that pinches toward both ends.
function insideLeaf(x: number, y: number): boolean {
  // t ∈ [0,1] from base (bottom, y≈0.92) up to tip (top, y≈0.06)
  const yTop = 0.06;
  const yBot = 0.92;
  if (y < yTop || y > yBot) return false;
  const t = (yBot - y) / (yBot - yTop); // 0 at base, 1 at tip
  // width profile: rounded near base, sharp at tip. sin gives a fat belly,
  // raised to a power to sharpen the tip.
  const halfWidth = 0.34 * Math.pow(Math.sin(t * Math.PI), 0.65) * (1 - 0.25 * t);
  const dx = Math.abs(x - 0.5);
  return dx <= halfWidth;
}

// Upper dome (a tree canopy). Root sits at the bottom-centre, mass up top.
function insideCanopy(x: number, y: number): boolean {
  // dome centred near top, plus a thin trunk corridor down to the base.
  const cx = 0.5;
  const cy = 0.36;
  const dx = (x - cx) / 0.44;
  const dy = (y - cy) / 0.34;
  if (dx * dx + dy * dy <= 1 && y <= 0.62) return true;
  // trunk corridor
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
      // sample on an annulus around centre, then accept if inside the mask.
      const a = rng.next() * TAU;
      const r = 0.46 * Math.sqrt(0.35 + 0.65 * rng.next()); // bias to outer ring
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
      y = 0.9; // base of the leaf (petiole)
    } else {
      // circle: start from centre
      x = 0.5 + jitter + rng.range(-0.01, 0.01);
      y = 0.5 + rng.range(-0.01, 0.01);
    }
    roots.push({ x, y, parent: -1, depth: 0, subtree: 1, order: 1 });
  }
  return roots;
}

// ── Lifecycle ──────────────────────────────────────────────────────────────────────

function init(surface: RenderSurface, params: Params, rng: RNG): State {
  void surface; // geometry is normalised; surface size only matters at render time

  const shape = String(params.domainShape);
  const distribution = String(params.distribution);
  const inside = maskFor(shape);

  const attractorCount = Math.round(Number(params.attractorCount));
  const attractors = scatterAttractors(rng, attractorCount, distribution, inside);
  const nodes = makeRoots(shape, Number(params.rootCount), rng);

  const influenceRadius = Number(params.influenceRadius);
  let killRadius = Number(params.killRadius);
  const stepLength = Number(params.stepLength);
  // keep killRadius below influence so growth can actually reach attractors.
  killRadius = Math.min(killRadius, influenceRadius * 0.9);
  const maxNodes = Math.round(Number(params.maxNodes));

  // hash cell sized to the influence radius for ~O(1) nearest-node queries.
  const hash = new SpatialHash<HashNode>(Math.max(0.01, influenceRadius));

  return {
    params,
    rng,
    nodes,
    attractors,
    hash,
    hashItems: [],
    influenceRadius,
    killRadius,
    stepLength,
    maxNodes,
    maxDepth: 0,
    maxSubtree: 1,
    done: false,
  };
}

function step(state: State, dt: number): State {
  if (state.done) return state;
  void dt;

  // Grow several rounds per frame so the animation reaches a finished network in
  // a reasonable number of frames, but cap work per frame to stay live.
  const roundsPerFrame = 4;
  for (let round = 0; round < roundsPerFrame; round++) {
    if (state.done) break;
    growOnce(state);
  }

  // recompute thickness accumulators for the current network (used by render).
  computeThickness(state);
  return state;
}

// One Space-Colonization growth round.
function growOnce(state: State): void {
  const { nodes, attractors, hash, influenceRadius, killRadius, stepLength } = state;

  if (nodes.length >= state.maxNodes) {
    state.done = true;
    return;
  }

  // count remaining live attractors; finish if none.
  let liveCount = 0;
  for (let i = 0; i < attractors.length; i++) if (attractors[i].alive) liveCount++;
  if (liveCount === 0) {
    state.done = true;
    return;
  }

  // rebuild the spatial hash from the current nodes.
  const items = state.hashItems;
  items.length = 0;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    items.push({ x: n.x, y: n.y, i });
  }
  hash.rebuild(items);

  // For each node, accumulate the summed direction of influencing attractors.
  // dirSum[i] = {x,y}; influenced[i] = count.
  const dirX = new Float64Array(nodes.length);
  const dirY = new Float64Array(nodes.length);
  const infl = new Int32Array(nodes.length);

  const infl2 = influenceRadius * influenceRadius;

  for (let a = 0; a < attractors.length; a++) {
    const at = attractors[a];
    if (!at.alive) continue;

    // find the nearest node within influenceRadius via the hash.
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

  // Grow a new node from every influenced node, toward the averaged direction.
  let grew = false;
  const startLen = nodes.length;
  for (let i = 0; i < startLen; i++) {
    if (infl[i] === 0) continue;
    let vx = dirX[i];
    let vy = dirY[i];
    const l = Math.hypot(vx, vy);
    if (l < 1e-6) continue; // opposing attractors cancelled out
    vx /= l;
    vy /= l;

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
    if (child.depth > state.maxDepth) state.maxDepth = child.depth;
    grew = true;

    if (nodes.length >= state.maxNodes) break;
  }

  // Kill attractors that any node has reached.
  // Rebuild hash with the new nodes for an accurate kill test.
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
    // No node could grow toward any live attractor (e.g. all out of range).
    state.done = true;
  }
}

// Compute subtree sizes and Strahler order in one bottom-up pass.
// Nodes are appended in creation order, so a child always has a higher index
// than its parent — iterate in reverse to accumulate up the tree.
function computeThickness(state: State): void {
  const nodes = state.nodes;
  const n = nodes.length;

  // reset
  for (let i = 0; i < n; i++) {
    nodes[i].subtree = 1;
    nodes[i].order = 1;
  }

  // children lists, to compute Strahler order correctly.
  const childCount = new Int32Array(n);
  const childMaxOrder = new Int32Array(n); // highest child order seen
  const childMaxOrderCount = new Int32Array(n); // how many children share that order

  // First pass (reverse): accumulate subtree sizes.
  for (let i = n - 1; i >= 1; i--) {
    const p = nodes[i].parent;
    if (p >= 0) nodes[p].subtree += nodes[i].subtree;
  }

  // Second pass (reverse): Strahler order.
  // order(leaf)=1. A node's order = max child order, +1 if the top order is shared.
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
    // when we have finished contributing to p (we process children after p? no —
    // children have higher index, so by the time we reach p all its children are
    // already processed). Set p's order now using accumulated child stats.
    if (childCount[p] > 0) {
      nodes[p].order =
        childMaxOrderCount[p] >= 2 ? childMaxOrder[p] + 1 : childMaxOrder[p];
    }
  }

  // track maxima for normalisation.
  let maxSub = 1;
  for (let i = 0; i < n; i++) if (nodes[i].subtree > maxSub) maxSub = nodes[i].subtree;
  state.maxSubtree = maxSub;
}

function isDone(state: State): boolean {
  return state.done;
}

// ── Render ──────────────────────────────────────────────────────────────────────

function render(state: State, surface: RenderSurface): void {
  const s = surface as Canvas2DSurface;
  const ctx = s.ctx;
  const W = s.width;
  const H = s.height;

  // scale normalised [0,1]² geometry to the surface. Use a square unit so the
  // network keeps proportion, centred in the canvas.
  const unit = Math.min(W, H);
  const offX = (W - unit) * 0.5;
  const offY = (H - unit) * 0.5;
  const X = (nx: number) => offX + nx * unit;
  const Y = (ny: number) => offY + ny * unit;

  ctx.clearRect(0, 0, W, H);

  const nodes = state.nodes;
  if (nodes.length < 2) return;

  const palette = getPalette(String(state.params.palette));
  const strokeScale = Number(state.params.strokeScale);
  const thicknessModel = String(state.params.thicknessModel);

  const maxDepth = Math.max(1, state.maxDepth);
  const maxSubtree = Math.max(1, state.maxSubtree);

  // baseline stroke in px, relative to surface size so it scales with re-render.
  const baseW = unit * 0.0016;

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Draw each child→parent segment. Thicker branches (large subtree / high order)
  // are drawn after thin twigs so trunks sit on top.
  // Sort indices by thickness ascending for nicer overlap (cheap for ≤9000).
  const order = new Array<number>(nodes.length);
  for (let i = 0; i < nodes.length; i++) order[i] = i;

  const thicknessOf = (i: number): number => {
    const nd = nodes[i];
    if (thicknessModel === "order") {
      // order grows ~log of subtree; map to width.
      return Math.pow(nd.order, 1.35);
    }
    // subtree model: width ∝ sqrt(subtree) (Murray-ish taper).
    return Math.sqrt(nd.subtree / maxSubtree);
  };

  order.sort((a, b) => thicknessOf(a) - thicknessOf(b));

  // precompute a normaliser for the 'order' model.
  let maxThick = 1e-6;
  for (let i = 0; i < nodes.length; i++) {
    const t = thicknessOf(i);
    if (t > maxThick) maxThick = t;
  }

  for (let k = 0; k < order.length; k++) {
    const i = order[k];
    const nd = nodes[i];
    if (nd.parent < 0) continue;
    const pa = nodes[nd.parent];

    const depth01 = clamp(nd.depth / maxDepth, 0, 1);
    ctx.strokeStyle = fieldToColor(depth01, palette);

    const tNorm = thicknessOf(i) / maxThick; // 0..1
    const w = baseW * strokeScale * (0.4 + 4.2 * tNorm);
    ctx.lineWidth = Math.max(0.4, w);

    ctx.beginPath();
    ctx.moveTo(X(pa.x), Y(pa.y));
    ctx.lineTo(X(nd.x), Y(nd.y));
    ctx.stroke();
  }

  // small dots at the roots to anchor the composition.
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].parent >= 0) continue;
    ctx.fillStyle = fieldToColor(0, palette);
    ctx.beginPath();
    ctx.arc(X(nodes[i].x), Y(nodes[i].y), Math.max(1, baseW * strokeScale * 2.4), 0, TAU);
    ctx.fill();
  }
}

export const spaceColonization: GenerativeSystem<State> = {
  id: "space-colonization",
  title: "Space Colonization",
  blurb: "Vascular venation — leaf veins, canopies, roots.",
  tier: "canvas2d",
  schema,
  init,
  step,
  render,
  isDone,
};
