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
  age: Int32Array; // growth-time per cell; -1 = never grown
  cluster: number[]; // flat indices of cluster cells, in growth order

  step: number;
  done: boolean;
}

// ── Schema ───────────────────────────────────────────────────────────────────
const schema: ParamSchema = {
  eta: {
    type: "number",
    min: 0.5,
    max: 6,
    step: 0.1,
    default: 1.0,
    hot: true, // affects FUTURE growth only (not retroactive) — safe without reset
    label: "η (branchiness)",
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
    max: 20,
    default: 4,
    label: "Growth / step",
  },
  solverSweeps: {
    type: "int",
    min: 4,
    max: 40,
    default: 16, // capped Laplace budget per step (warm-started)
    label: "Solver sweeps",
  },
  maxCells: {
    type: "int",
    min: 200,
    max: 60000,
    default: 9000,
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

  const idx = (x: number, y: number) => y * gw + x;

  // ── Dirichlet boundary (φ = 1) per mode ──────────────────────────────────
  if (boundary === "point-plane") {
    // Outer plane: the bottom edge held at φ=1. Seed sits near the top.
    for (let x = 0; x < gw; x++) {
      fixed[idx(x, gh - 1)] = 1;
      phi[idx(x, gh - 1)] = 1;
    }
  } else if (boundary === "point-point") {
    // Two opposing electrodes: bottom edge at φ=1, seed near the top.
    for (let x = 0; x < gw; x++) {
      fixed[idx(x, gh - 1)] = 1;
      phi[idx(x, gh - 1)] = 1;
    }
  } else {
    // ring: a circular outer boundary at φ=1, seed at the centre.
    const cx = (gw - 1) / 2;
    const cy = (gh - 1) / 2;
    const r = Math.min(gw, gh) * 0.47;
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const d = Math.hypot(dx, dy);
        // Pin everything at/outside the ring radius to φ=1 (acts as the outer
        // electrode); the interior is solved.
        if (d >= r) {
          fixed[idx(x, y)] = 1;
          phi[idx(x, y)] = 1;
        }
      }
    }
  }

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
    step: 0,
    done: false,
  };

  // ── Seed the cluster (φ = 0) ─────────────────────────────────────────────
  if (boundary === "ring") {
    addCluster(state, idx((gw / 2) | 0, (gh / 2) | 0), 0);
  } else if (boundary === "point-point") {
    // Seed a tip near the top, growing down toward the φ=1 plane.
    addCluster(state, idx((gw / 2) | 0, 1), 0);
  } else {
    // point-plane: single seed near the top-centre.
    addCluster(state, idx((gw / 2) | 0, 1), 0);
  }

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
  if (s.done) return s;

  const p = s.params;
  const eta = asNum(p.eta, 1.0);
  const sweeps = clamp(asInt(p.solverSweeps, 16), 1, 200);
  const growthPerStep = clamp(asInt(p.growthPerStep, 4), 1, 100);
  const maxCells = clamp(asInt(p.maxCells, 9000), 1, 1_000_000);
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

  for (let g = 0; g < growthPerStep; g++) {
    if (s.cluster.length >= maxCells) {
      s.done = true;
      break;
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
      // No reachable candidates (e.g. cluster bridged the gap) — finished.
      s.done = true;
      break;
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

    addCluster(s, chosen, s.step + 1);

    // point-point: stop once a tip reaches the opposing plane (breakdown
    // bridged the gap).
    const chy = (chosen / gw) | 0;
    if (
      (asStr(p.boundary, "point-plane") === "point-point" ||
        asStr(p.boundary, "point-plane") === "point-plane") &&
      chy >= gh - 2
    ) {
      s.done = true;
      break;
    }
  }

  s.step++;
  return s;
}

// ── render ───────────────────────────────────────────────────────────────────
function render(state: State, surface: RenderSurface): void {
  if (surface.kind !== "canvas2d") return;
  const s = surface as Canvas2DSurface;
  const { ctx, width, height } = s;

  const palette = getPalette(asStr(state.params.palette, "fluoro"));
  const glow = asBool(state.params.glow, true);

  // Dark backdrop so the charge propagation reads as luminous filaments.
  ctx.fillStyle = "#06070a";
  ctx.fillRect(0, 0, width, height);

  const { gw, gh, cluster, age } = state;
  const cellW = width / gw;
  const cellH = height / gh;
  // A hair of overdraw avoids seams between rect cells.
  const dw = cellW + 0.75;
  const dh = cellH + 0.75;

  // Normalise age (growth-time) over the whole cluster for the colour ramp.
  // age=0 (seed) → palette start; latest growth → palette end. This makes the
  // charge-propagation front read as a moving colour wave.
  const maxAge = Math.max(1, state.step);

  // ── Optional glow pass: large, low-alpha additive dots under the cells.
  if (glow) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const gr = Math.max(cellW, cellH) * 1.9;
    for (let k = 0; k < cluster.length; k++) {
      const idx = cluster[k];
      const x = idx % gw;
      const y = (idx / gw) | 0;
      const a = age[idx] < 0 ? 0 : age[idx];
      const t = a / maxAge;
      ctx.fillStyle = fieldToColor(t, palette);
      ctx.globalAlpha = 0.06;
      ctx.beginPath();
      ctx.arc((x + 0.5) * cellW, (y + 0.5) * cellH, gr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Solid pass: the cluster cells coloured by age.
  ctx.globalAlpha = 1;
  for (let k = 0; k < cluster.length; k++) {
    const idx = cluster[k];
    const x = idx % gw;
    const y = (idx / gw) | 0;
    const a = age[idx] < 0 ? 0 : age[idx];
    const t = a / maxAge;
    ctx.fillStyle = fieldToColor(t, palette);
    ctx.fillRect(x * cellW, y * cellH, dw, dh);
  }
}

// ── isDone ───────────────────────────────────────────────────────────────────
function isDone(state: State): boolean {
  return state.done;
}

// ── System export ────────────────────────────────────────────────────────────
export const dielectricBreakdown: GenerativeSystem<State> = {
  id: "dielectric-breakdown",
  title: "Dielectric Breakdown",
  blurb: "Field-driven ramification — lightning, fulgurite, root creep.",
  tier: "canvas2d",
  schema,
  init,
  step,
  render,
  isDone,
};
