// ─────────────────────────────────────────────────────────────────────────────
// Dielectric Breakdown Model (DBM) — Niemeyer–Pietronero–Wiesmann (1984).
// η-generalized DLA: ramified growth driven by the Laplacian potential field φ.
//
//   • The cluster (a conductor) is held at φ = 0; an outer boundary at φ = 1.
//   • Between them φ obeys Laplace's equation ∇²φ = 0 (charge-free dielectric).
//   • Each growth step the field is RELAXED toward that solution with a CAPPED
//     iteration budget (Gauss–Seidel / SOR sweeps — see `relax()`), then one (or
//     a few) empty neighbour cells are added to the cluster with probability
//         p_i  ∝  (φ_i)^η         (clamped φ ≥ 0, normalised over candidates)
//   • η tunes branchiness: η→0 ≈ compact Eden; η≈1 forked lightning;
//     η large ≈ sparse, near-straight creep (the dominant tip wins).
//
// CIRCUS MODE: this build never stops. Bolts strike perpetually — when a
// discharge finishes (hits max cells, bridges the gap, or runs out of room) it is
// AUTO-RESEEDED from a fresh rng-chosen seed, and several discharges run at once.
// η and the growth rate wander over time (sin(tick)+rng·chaos) so the morphology
// keeps shifting between forked and creeping. Older charge fades and flickers, and
// the colour field sweeps — a constant, colourful, crackling light show.
//
// APPROXIMATION NOTE: a true DBM re-solves Laplace to convergence every step.
// We instead run a fixed, small number of relaxation sweeps per step (warm-
// started from the previous frame's φ, which is already close). This is a known,
// deliberately cheap approximation that keeps the prototype interactive; the
// field lags the true solution slightly but the morphology is faithful.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  Canvas2DSurface,
  GenerativeSystem,
  ParamSchema,
  Params,
  RenderSurface,
  RNG,
} from "../core/types";
import { clamp } from "../core/math";
import { fieldToColor, getPalette, PALETTE_IDS } from "../core/color";

// ── State ────────────────────────────────────────────────────────────────────
interface State {
  params: Params; // live reference — hot params read fresh each frame
  rng: RNG;

  gw: number; // grid width  (= gridRes)
  gh: number; // grid height (= gridRes)
  phi: Float32Array; // potential field φ ∈ [0,1], length gw*gh
  occ: Uint8Array; // occupancy: 1 = cluster cell (conductor, φ=0)
  fixed: Uint8Array; // 1 = boundary cell held at φ=1 (Dirichlet)
  age: Int32Array; // growth-time (in ticks) per cell; -1 = never grown
  cluster: number[]; // flat indices of cluster cells, in growth order

  bolts: number; // count of active simultaneous discharges
  boltDone: boolean[]; // per-bolt "finished, awaiting reseed" flags (parallel-ish)

  tick: number; // internal frame counter — drives all the chaos wandering
  step: number; // growth-time counter (advances ~1 per tick)
  done: boolean; // ALWAYS false in circus mode; kept for the contract
}

// ── Schema ───────────────────────────────────────────────────────────────────
const schema: ParamSchema = {
  eta: {
    type: "number",
    min: 0.5,
    max: 6,
    step: 0.1,
    default: 1.0,
    hot: true, // base η — wandered each frame by `chaos`
    label: "η (branchiness)",
  },
  chaos: {
    type: "number",
    min: 0,
    max: 1,
    default: 1.0, // PUSHED to the max — η/growth wander, reseed rate, palette churn
    hot: true,
    label: "Chaos",
  },
  gridRes: {
    type: "int",
    min: 60,
    max: 512,
    default: 200, // KEEP MODEST — this is the grid cells per side; drives solver cost
    label: "Grid res",
  },
  boundary: {
    type: "select",
    options: ["point-plane", "point-point", "ring"],
    default: "point-plane",
    label: "Boundary",
  },
  neighborhood: {
    type: "select",
    options: ["4", "8"],
    default: "8",
    label: "Neighbourhood",
  },
  growthPerStep: {
    type: "int",
    min: 1,
    max: 60,
    default: 14, // FASTER — bolts shoot quickly (wandered by chaos)
    label: "Growth / step",
  },
  solverSweeps: {
    type: "int",
    min: 4,
    max: 40,
    default: 12, // capped Laplace budget per step (warm-started)
    label: "Solver sweeps",
  },
  maxCells: {
    type: "int",
    min: 200,
    max: 60000,
    default: 5200, // per-discharge budget before it fades & reseeds
    label: "Max cells",
  },
  palette: {
    type: "select",
    options: PALETTE_IDS,
    default: "fluoro",
    hot: true,
    label: "Palette",
  },
  glow: {
    type: "bool",
    default: true,
    hot: true,
    label: "Glow",
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const asInt = (v: unknown, d: number) => (typeof v === "number" ? Math.round(v) : d);
const asNum = (v: unknown, d: number) => (typeof v === "number" ? v : d);
const asStr = (v: unknown, d: string) => (typeof v === "string" ? v : d);
const asBool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);

/** Mark a cell as part of the conductive cluster (φ pinned to 0). */
function addCluster(s: State, idx: number, atStep: number): void {
  s.occ[idx] = 1;
  s.phi[idx] = 0;
  s.fixed[idx] = 0; // a cluster cell can never also be a φ=1 boundary
  s.age[idx] = atStep;
  s.cluster.push(idx);
}

/** Re-paint the φ=1 Dirichlet boundary for the current mode (used on (re)seed). */
function paintBoundary(s: State, boundary: string): void {
  const { phi, fixed, occ, gw, gh } = s;
  const idx = (x: number, y: number) => y * gw + x;
  if (boundary === "point-plane" || boundary === "point-point") {
    for (let x = 0; x < gw; x++) {
      const i = idx(x, gh - 1);
      if (occ[i]) continue;
      fixed[i] = 1;
      phi[i] = 1;
    }
  } else {
    const cx = (gw - 1) / 2;
    const cy = (gh - 1) / 2;
    const r = Math.min(gw, gh) * 0.47;
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const i = idx(x, y);
        if (occ[i]) continue;
        if (Math.hypot(x - cx, y - cy) >= r) {
          fixed[i] = 1;
          phi[i] = 1;
        }
      }
    }
  }
}

/** Drop a fresh discharge seed at an rng-chosen launch point for this boundary. */
function seedBolt(s: State, boundary: string): void {
  const { gw, gh, occ, fixed } = s;
  const idx = (x: number, y: number) => y * gw + x;
  const tryAt = (x: number, y: number): boolean => {
    x = clamp(x | 0, 1, gw - 2);
    y = clamp(y | 0, 1, gh - 2);
    const i = idx(x, y);
    if (occ[i] || fixed[i]) return false;
    addCluster(s, i, s.step);
    return true;
  };

  for (let attempt = 0; attempt < 24; attempt++) {
    if (boundary === "ring") {
      // launch near the centre, jittered, so radial bolts fan out differently
      const jx = s.rng.range(-0.12, 0.12) * gw;
      const jy = s.rng.range(-0.12, 0.12) * gh;
      if (tryAt(gw / 2 + jx, gh / 2 + jy)) return;
    } else {
      // point-plane / point-point: a tip somewhere along the top, growing down
      if (tryAt(s.rng.range(0.08, 0.92) * gw, s.rng.range(1, 3))) return;
    }
  }
}

// ── init ─────────────────────────────────────────────────────────────────────
function init(_surface: RenderSurface, params: Params, rng: RNG): State {
  const gridRes = clamp(asInt(params.gridRes, 200), 8, 512);
  const gw = gridRes;
  const gh = gridRes;
  const n = gw * gh;

  const phi = new Float32Array(n);
  const occ = new Uint8Array(n);
  const fixed = new Uint8Array(n);
  const age = new Int32Array(n).fill(-1);

  const boundary = asStr(params.boundary, "point-plane");

  // Initialise φ to a smooth interior guess (1) so the first relax converges
  // faster; boundary/seed pinned below.
  phi.fill(1);

  const state: State = {
    params,
    rng,
    gw,
    gh,
    phi,
    occ,
    fixed,
    age,
    cluster: [],
    bolts: 0,
    boltDone: [],
    tick: 0,
    step: 0,
    done: false,
  };

  paintBoundary(state, boundary);

  // ── Seed the opening salvo of simultaneous discharges. ───────────────────
  const initial = boundary === "ring" ? 3 : 3;
  for (let b = 0; b < initial; b++) seedBolt(state, boundary);
  state.bolts = initial;

  return state;
}

// ── Laplace relaxation (capped Gauss–Seidel / SOR) ───────────────────────────
//
// Solve ∇²φ = 0 on the non-fixed, non-cluster cells. We run `sweeps` in-place
// red-black-agnostic Gauss–Seidel passes with a mild over-relaxation factor.
// Cluster cells (φ=0) and boundary cells (φ=1) are Dirichlet — skipped. This is
// the CAPPED budget that keeps growth interactive (see header note).
function relax(s: State, sweeps: number): void {
  const { phi, occ, fixed, gw, gh } = s;
  const omega = 1.5; // SOR over-relaxation (1 = plain Gauss–Seidel)
  for (let pass = 0; pass < sweeps; pass++) {
    for (let y = 1; y < gh - 1; y++) {
      const row = y * gw;
      for (let x = 1; x < gw - 1; x++) {
        const i = row + x;
        if (occ[i] || fixed[i]) continue; // Dirichlet cell — held fixed
        const avg =
          0.25 * (phi[i - 1] + phi[i + 1] + phi[i - gw] + phi[i + gw]);
        // φ_new = φ + ω·(avg − φ)  → ω=1 is the plain Jacobi/GS update
        phi[i] += omega * (avg - phi[i]);
      }
    }
  }
}

// ── One growth step ──────────────────────────────────────────────────────────
function step(s: State, _dt: number): State {
  const p = s.params;
  const boundary = asStr(p.boundary, "point-plane");
  const chaos = clamp(asNum(p.chaos, 0.85), 0, 1);

  // ── AUTO-CHAOS DRIVE ──────────────────────────────────────────────────────
  // Wander η and the growth rate over time so branchiness keeps shifting
  // between forked (low η) and creeping (high η). sin gives a slow breathing
  // cycle; rng adds per-frame jitter; both scaled by `chaos`.
  const tick = s.tick;
  const baseEta = asNum(p.eta, 1.0);
  // Slow, breathing η drift — gentle jitter only, so morphology evolves
  // gracefully between forked and creeping rather than thrashing frame to frame.
  const etaWander =
    Math.sin(tick * 0.006) * 1.7 + (s.rng.next() - 0.5) * 0.6;
  const eta = clamp(baseEta + etaWander * chaos, 0.4, 6);

  // GROWTH RATE: kept measured so branches UNFURL rather than snap into place.
  // A slow sinusoid breathes the pace; chaos adds only mild variance.
  const baseGrowth = clamp(asInt(p.growthPerStep, 14), 1, 100);
  const growthWander = 1 + 0.35 * Math.sin(tick * 0.011) + (s.rng.next() - 0.5) * 0.35;
  const growthPerStep = clamp(
    Math.round(baseGrowth * (1 + (growthWander - 1) * chaos)),
    1,
    120,
  );

  const sweeps = clamp(asInt(p.solverSweeps, 12), 1, 200);
  const maxCells = clamp(asInt(p.maxCells, 5200), 1, 1_000_000);
  const use8 = asStr(p.neighborhood, "8") === "8";

  const { phi, occ, fixed, gw, gh } = s;

  // Neighbour offsets (4- or 8-connected). 8-conn diagonals give rounder,
  // more dendritic clusters; 4-conn gives blockier, axis-biased growth.
  const offs: Array<[number, number]> = use8
    ? [
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [1, 1], [1, -1], [-1, 1], [-1, -1],
      ]
    : [
        [1, 0], [-1, 0], [0, 1], [0, -1],
      ];

  // How many discharges to keep alive at once (more chaos ⇒ more bolts).
  const targetBolts = 2 + Math.round(chaos * 4);

  let bridged = false;

  for (let g = 0; g < growthPerStep; g++) {
    // ── PERPETUAL: never stop. When a bolt has consumed its budget we trim
    //    the oldest charge (so old bolts fade out of the grid) and immediately
    //    reseed a fresh discharge from a new launch point.
    if (s.cluster.length >= maxCells || bridged) {
      recycleOldest(s, Math.max(growthPerStep * 2, 24));
      seedBolt(s, boundary);
      bridged = false;
      continue;
    }

    // Relax the field (warm-started) before evaluating candidates.
    relax(s, sweeps);

    // ── Gather candidate cells: empty, in-bounds, non-boundary neighbours of
    //    the current cluster. Dedupe via a small seen-set keyed by index.
    const candIdx: number[] = [];
    const candW: number[] = []; // unnormalised weight ∝ (φ)^η
    const seen = new Set<number>();
    let total = 0;

    for (let c = 0; c < s.cluster.length; c++) {
      const ci = s.cluster[c];
      const cx = ci % gw;
      const cy = (ci / gw) | 0;
      for (let o = 0; o < offs.length; o++) {
        const nx = cx + offs[o][0];
        const ny = cy + offs[o][1];
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
        const ni = ny * gw + nx;
        if (occ[ni] || fixed[ni]) continue; // already cluster, or φ=1 electrode
        if (seen.has(ni)) continue;
        seen.add(ni);
        // Growth probability ∝ (φ)^η. φ is the local field strength: the
        // closer a candidate is (electrically) to the φ=1 boundary, the more
        // likely it grows. η sharpens this preference.
        const f = phi[ni] < 0 ? 0 : phi[ni];
        const w = eta === 1 ? f : Math.pow(f, eta);
        candIdx.push(ni);
        candW.push(w);
        total += w;
      }
    }

    if (candIdx.length === 0) {
      // No reachable candidates — this discharge is spent. Reseed instead of
      // stopping, so the show never dies.
      recycleOldest(s, Math.max(growthPerStep * 2, 24));
      seedBolt(s, boundary);
      continue;
    }

    // ── Pick one candidate weighted by (φ)^η. If all weights are ~0 (field
    //    not yet propagated), fall back to a uniform pick so growth never stalls.
    let chosen = candIdx[candIdx.length - 1];
    if (total > 0) {
      let r = s.rng.next() * total;
      for (let k = 0; k < candIdx.length; k++) {
        r -= candW[k];
        if (r <= 0) {
          chosen = candIdx[k];
          break;
        }
      }
    } else {
      chosen = s.rng.pick(candIdx);
    }

    addCluster(s, chosen, s.step);

    // point-plane / point-point: a tip reached the opposing plane (breakdown
    // bridged the gap). Flag it so the next loop reseeds a fresh strike.
    const chy = (chosen / gw) | 0;
    if (boundary !== "ring" && chy >= gh - 2) {
      bridged = true;
    }
  }

  // Keep the desired number of simultaneous discharges burning. Occasionally —
  // gated by chaos — fire an extra spontaneous bolt for that crackling churn.
  if (s.rng.next() < 0.04 + chaos * 0.18) {
    seedBolt(s, boundary);
  }
  // Trim drift in total population so the grid never saturates solid.
  if (s.cluster.length > maxCells * 1.15) {
    recycleOldest(s, s.cluster.length - maxCells);
  }
  s.bolts = targetBolts;

  s.tick++;
  s.step++;
  s.done = false; // NEVER STOP
  return s;
}

// ── Fade / recycle the oldest charge ─────────────────────────────────────────
// Remove the `count` oldest cluster cells from the grid (freeing them back to
// dielectric) so old bolts dim out and new ones flash in. Seeds aside, this is
// what makes the field read as alive rather than a static accreted cluster.
function recycleOldest(s: State, count: number): void {
  const { occ, fixed, phi, age, cluster, gw } = s;
  const n = Math.min(count, Math.max(0, cluster.length - 1));
  for (let k = 0; k < n; k++) {
    const idx = cluster.shift();
    if (idx === undefined) break;
    occ[idx] = 0;
    age[idx] = -1;
    // Hand the freed cell back to the solver with a warm guess so the field
    // re-fills smoothly. If it sits on the outer plane, restore it as φ=1.
    const y = (idx / gw) | 0;
    if (y >= s.gh - 1) {
      fixed[idx] = 1;
      phi[idx] = 1;
    } else {
      phi[idx] = 0.5;
    }
  }
}

// ── render ───────────────────────────────────────────────────────────────────
function render(state: State, surface: RenderSurface): void {
  if (surface.kind !== "canvas2d") return;
  const s = surface as Canvas2DSurface;
  const { ctx, width, height } = s;

  // ── COLOUR CHURN: cycle through palettes over time and add a sweeping offset
  //    to the age field, so the charge colour drifts continuously.
  const chaos = clamp(asNum(state.params.chaos, 0.85), 0, 1);
  const baseId = asStr(state.params.palette, "fluoro");
  const baseIdx = PALETTE_IDS.indexOf(baseId);
  const cyc = (Math.floor(state.tick / 240) + (baseIdx < 0 ? 0 : baseIdx)) %
    PALETTE_IDS.length;
  const palette = getPalette(PALETTE_IDS[cyc]);
  const glow = asBool(state.params.glow, true);

  // A time-varying offset added to the normalised age → the colour ramp sweeps.
  const colourSweep = (state.tick * 0.004) % 1;

  // ── FLICKER / PULSE: a fast, jittered brightness pulse so it reads electric.
  const flickerDepth = 0.15 + chaos * 0.45;
  const pulse =
    1 -
    flickerDepth *
      (0.5 + 0.5 * Math.sin(state.tick * 0.9)) *
      (0.7 + 0.3 * state.rng.next());

  // Dark backdrop so the charge propagation reads as luminous filaments.
  ctx.fillStyle = "#06070a";
  ctx.fillRect(0, 0, width, height);

  const { gw, gh, cluster, age } = state;
  const cellW = width / gw;
  const cellH = height / gh;
  // A hair of overdraw avoids seams between rect cells.
  const dw = cellW + 0.75;
  const dh = cellH + 0.75;

  // FADE: charge fades with age. Map each cell's age onto a recent window so the
  // newest charge blazes at full alpha while the trailing tail dims out. The
  // window is shorter when chaos is high → snappier, flashier strikes.
  const now = state.step;
  const fadeWindow = Math.max(40, Math.round((1.4 - chaos) * 520));

  // ── Optional glow pass: large, low-alpha additive dots under the cells.
  if (glow) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const gr = Math.max(cellW, cellH) * 1.9;
    for (let k = 0; k < cluster.length; k++) {
      const idx = cluster[k];
      const a = age[idx];
      if (a < 0) continue;
      const fresh = clamp(1 - (now - a) / fadeWindow, 0, 1);
      if (fresh <= 0.01) continue;
      const x = idx % gw;
      const y = (idx / gw) | 0;
      // Leading tips (freshest) sweep toward the bright end of the ramp.
      const t = ((fresh * 0.6 + 0.4) + colourSweep) % 1;
      ctx.fillStyle = fieldToColor(t, palette);
      ctx.globalAlpha = 0.06 * fresh * fresh * pulse;
      ctx.beginPath();
      ctx.arc((x + 0.5) * cellW, (y + 0.5) * cellH, gr * (0.5 + fresh), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Solid pass: the cluster cells coloured by faded age.
  ctx.globalCompositeOperation = "source-over";
  for (let k = 0; k < cluster.length; k++) {
    const idx = cluster[k];
    const a = age[idx];
    if (a < 0) continue;
    const fresh = clamp(1 - (now - a) / fadeWindow, 0, 1);
    if (fresh <= 0.01) continue;
    const x = idx % gw;
    const y = (idx / gw) | 0;
    // Older charge slides toward the cool end; the leading front blazes bright.
    const t = ((1 - fresh) * 0.85 + colourSweep) % 1;
    ctx.globalAlpha = (0.35 + 0.65 * fresh) * pulse;
    ctx.fillStyle = fieldToColor(t, palette);
    ctx.fillRect(x * cellW, y * cellH, dw, dh);
  }
  ctx.globalAlpha = 1;
}

// ── isDone ───────────────────────────────────────────────────────────────────
// CIRCUS MODE: the lightning never stops. Always false.
function isDone(_state: State): boolean {
  return false;
}

// ── System export ────────────────────────────────────────────────────────────
export const dielectricBreakdown: GenerativeSystem<State> = {
  id: "dielectric-breakdown",
  title: "Dielectric Breakdown",
  blurb: "Perpetual crackling lightning — chaotic, colourful field-driven discharges.",
  tier: "canvas2d",
  schema,
  init,
  step,
  render,
  isDone,
};
