# Frond Studio — Algorithm Lab, Wave 2

**A build brief for Claude Code.**
**Goal:** stand up a self-contained prototype lab to explore seven new nature-inspired generative systems, judge their range, and decide which earn a place in the live `/projects/algorithms` toolbox.

This is an *exploration* deliverable, not production. Optimize for fast iteration, wide parameter ranges, reproducibility, and clean module boundaries — not for SEO, SSR, or polish. The one hard architectural constraint is that the algorithm cores must be portable into the existing Next.js site later with no rewrite.

---

## 0. Context

Frond Studio runs a live generative-art toolbox at `/projects/algorithms` (Next.js / Vercel) — currently twelve canonical emergence systems (Physarum, reaction–diffusion, boids, L-systems, Voronoi, DLA, etc.). Wave 2 extends that set in directions that read as *less standard* and more organically structural. Before integrating, we want a sandbox to feel out each system's parameter space and visual character.

---

## 1. Scope

**In scope**
- A standalone prototype app (the "Lab") that hosts the seven Wave-2 systems.
- A shared harness: param control panel, seedable RNG, color utilities, PNG/hi-res export, preset save/load.
- Each system as an independent, parameter-driven, seedable module.

**Out of scope / non-goals**
- No integration into the production Next.js site in this wave (that's Wave 3, gated on what we learn here).
- No SSR, no SEO, no analytics, no auth.
- No design-system fidelity — the Lab UI should be minimal and utilitarian.
- No mobile optimization (desktop-first prototype).

---

## 2. Stack & architecture

**Stack**
- **Vite + TypeScript** (vanilla, no React for the core). Fast HMR is the priority.
- **Tweakpane** for the control panel (framework-agnostic, declarative — good fit for a vanilla harness).
- **three.js** only for the one 3D system (Reaction–Diffusion on a surface).
- Raw WebGL (or `regl` if it speeds you up) for the GPU fluid system.
- **culori** (or a small inline util) for OKLCH ↔ sRGB color conversion.
- A small seedable PRNG (`mulberry32` / `sfc32`), seeded from a string.

**The core contract (most important part of this brief)**

Every system implements the same framework-agnostic interface. Cores must not import Vite, Tweakpane, or any DOM framework — they receive a rendering surface and a params object and nothing else. This is what makes them liftable into Next.js later.

```ts
// A declarative param schema drives BOTH the control panel and presets.
type ParamSpec =
  | { type: 'number'; min: number; max: number; step?: number; default: number }
  | { type: 'int'; min: number; max: number; default: number }
  | { type: 'bool'; default: boolean }
  | { type: 'select'; options: string[]; default: string }
  | { type: 'color'; default: string }        // OKLCH or hex
  | { type: 'seed'; default: string };

type ParamSchema = Record<string, ParamSpec>;

interface GenerativeSystem<State = unknown> {
  id: string;
  title: string;
  blurb: string;                  // one line of character description
  schema: ParamSchema;            // single source of truth for controls + presets
  tier: 'canvas2d' | 'webgl' | 'three';

  init(surface: RenderSurface, params: Params, rng: RNG): State;
  step(state: State, dt: number): State;   // advance the simulation
  render(state: State, surface: RenderSurface): void;
  reset(seed: string): void;               // deterministic re-seed
  exportHiRes?(scale: number): Promise<Blob>;  // offscreen render at N× resolution
}
```

`RenderSurface` is a thin wrapper over either a Canvas2D context, a WebGL context, or a three.js renderer + scene handle, so the harness owns the surface and the module owns the content.

**Rendering tiers**
- **Tier A — Canvas2D / CPU:** Space Colonization, Differential Growth, Phyllotaxis, Strange Attractors, Dielectric Breakdown. Plenty for prototype scale, crisp vector-like output, fastest to build.
- **Tier B — WebGL / three.js:** Stable Fluids (GPU ping-pong), Reaction–Diffusion on a surface (three.js). Build after the Tier-A five are working.

---

## 3. Shared foundation (build this first, before any algorithm)

1. **Lab shell** — a route/page listing the systems; pick one to load it full-bleed with its control panel docked to one side.
2. **Harness loop** — owns `requestAnimationFrame`, passes `dt` to `step`, calls `render`, exposes play/pause/step-once/reset.
3. **Tweakpane binding** — auto-generate controls from each system's `schema`. Changing a param live-updates the running system (re-init only where unavoidable; note which params are hot vs. require reset).
4. **Seedable RNG** — string seed → PRNG. Same seed + same params ⇒ identical output. Surface the current seed in the UI with a "randomize seed" button and a "lock seed" toggle.
5. **Color utilities** — OKLCH-based palette helpers and a `fieldToColor(value, palette)` gradient-mapper. All interpolation in OKLab/OKLCH, never raw RGB. Ship 4–5 reference palettes sampled from natural sources (botanical, mineral, microscopy).
6. **Export** — (a) current-canvas PNG; (b) hi-res export at 2×/4×/8× via offscreen render; (c) "copy params as JSON."
7. **Presets** — save the current `{ systemId, seed, params }` to `localStorage` and to a downloadable JSON; load presets back. This is how we capture "keepers" during exploration.

---

## 4. The Wave-2 systems

Each system below: character → method → **params to expose** → fidelity/render notes → prototype "done." Expose generous ranges; the goal is to find where each system breaks and where it sings.

### CORE TIER (Canvas2D — build these five first)

#### 4.1 Space Colonization (venation)
- **Character:** vascular branching — leaf veins, tree canopies, root systems.
- **Method:** scatter attraction points in a domain; nodes grow toward nearby attractors within an influence radius; remove an attractor once a node reaches its kill radius. (Runions/Lane/Prusinkiewicz.)
- **Params:** attractor count & distribution (uniform / shape-masked / clustered), domain shape (leaf outline / circle / canopy / custom mask), influence radius, kill radius, step length, max nodes, thickness model (taper by subtree size / Strahler order).
- **Fidelity:** tapered strokes, width by branch order, color by depth-from-root via the OKLCH gradient-mapper. Optional second pass for a faint capillary layer.
- **Done:** can grow a recognizable vein network inside an arbitrary domain mask; thickness taper looks botanical, not uniform.

#### 4.2 Differential Growth
- **Character:** buckling membranes — brain coral, hyphae, convoluted ribbons.
- **Method:** a polyline of nodes; each step apply edge-spring (keep spacing), short-range repulsion (spatial hash), optional curl/Brownian jitter; insert a node wherever an edge exceeds a max length. Supports closed loops and open curves.
- **Params:** repulsion radius, repulsion strength, spring/attraction strength, split threshold (max edge length), node cap, jitter amount, growth bias (uniform vs. seeded hotspots), open/closed.
- **Fidelity:** smooth the polyline (Catmull-Rom) before stroking; variable width; render multiple historical layers with falloff for depth. **Needs a spatial hash** for neighbor queries — naive O(n²) will choke past a few thousand nodes.
- **Done:** a loop that convincingly buckles into coral-like convolution and stays stable (no self-intersection blowups) up to the node cap.

#### 4.3 Phyllotaxis (Vogel spiral)
- **Character:** radial packing order — sunflower heads, pinecones, seed florets.
- **Method:** `r = c·√n`, `θ = n · 137.507°` (golden angle).
- **Params:** golden angle (allow ±a few degrees off 137.5 to expose spiral artifacts — this is the most rewarding knob), point count, scale `c`, per-point size mapping (constant / by `n` / by radius), packing relaxation on/off, palette mapping (by angle / by radius).
- **Fidelity:** render seeds as real shapes with slight overlap and size jitter, not 1px dots; palette by radial position. Optional light packing relaxation to remove the synthetic gridiness.
- **Done:** clean sunflower at 137.5°, plus visibly distinct regimes as the angle detunes.

#### 4.4 Strange Attractors
- **Character:** filamentary dynamical-systems density — luminous, smoky.
- **Method:** iterate a 2D map (de Jong, Clifford, Hopalong) into a **density/histogram buffer**, then log-tone-map density → color with additive accumulation.
- **Params:** map family (select), coefficients a/b/c/d, iteration count, exposure, gamma, density colormap, additive vs. alpha blend.
- **Fidelity:** the *whole* quality here is log-density accumulation + good tone mapping. Don't draw points directly — accumulate, then map. Offer a "explore coefficients" randomize that stays within visually live ranges.
- **Done:** smooth tonal filaments (no aliased point spray), with a coefficient randomizer that mostly lands on non-degenerate attractors.

#### 4.5 Dielectric Breakdown (Lichtenberg)
- **Character:** field-driven ramification — lightning, fulgurite, root creep.
- **Method:** solve Laplace's equation for potential on a grid; add growth sites with probability ∝ |∇φ|^η (η: ~1 lightning-like, higher = sparser/straighter). Relax potential after additions.
- **Params:** η (eta) exponent, grid resolution, boundary config (point-to-plane / point-to-point / ring), growth steps, candidate neighborhood.
- **Fidelity:** color by growth-time (age) for a "charge propagation" read; optional glow pass. **Compute note:** the Laplace solve each step is the bottleneck — at prototype res use an iterative solver (Gauss–Seidel/SOR) with a capped iteration budget, or an approximate relaxation; document the tradeoff. Keep grid modest (e.g. ≤ 512²) for interactivity.
- **Done:** η visibly controls branchiness from forked-lightning to sparse-creep; growth stays interactive at prototype res.

### STRETCH TIER (GPU / 3D — build after the core five run)

#### 4.6 Stable Fluids (substrate)
- **Character:** ink-in-water advection — a *multiplier* for the other systems, not just a standalone look.
- **Method:** Jos Stam semi-Lagrangian solver (advect → diffuse → project) on GPU ping-pong textures. Inject dye/force from pointer and, as a stretch, from another system's output buffer.
- **Params:** viscosity, dye dissipation, force/dye injection strength, vorticity confinement (adds curl detail back), simulation resolution.
- **Fidelity:** WebGL strongly preferred; vorticity confinement is what keeps it from going muddy. Expose a "seed dye from image/buffer" hook so we can test advecting a Tier-A output through it.
- **Done:** stable interactive fluid with dye; pointer injection feels responsive; vorticity knob visibly sharpens curl.

#### 4.7 Reaction–Diffusion on a Surface
- **Character:** Turing patterns wrapping 3D geometry — animal-coat patterning on a mesh.
- **Method:** Gray–Scott solved in the mesh's UV/texture space (or vertex-based with a cotangent Laplacian), result mapped back onto a three.js mesh.
- **Params:** feed F, kill k, Da, Db, base mesh (sphere / torus / blob / imported), spatially-varying feed/kill map on/off, color mapping.
- **Fidelity:** the spatially-varying F/k map is what produces multiple "zoologies" on one surface — prioritize exposing it. three.js + GPU fragment-shader solve.
- **Done:** recognizable Turing spots/stripes that wrap a mesh cleanly across the UV seam, with F/k sliders that traverse the Gray–Scott regime map.

---

## 5. Cross-cutting fidelity requirements

These apply to every system and echo the studio's fidelity standards:

- **Color in OKLCH only.** No raw RGB lerps anywhere. Drive color from a simulation *field* (age, depth, density, velocity) through the shared gradient-mapper.
- **Deterministic.** Seed + params fully determine output. No `Math.random()` outside the seeded PRNG.
- **Render the field, don't dump pixels.** Where it's cheap, support an optional post layer: subtle grain, a substrate texture multiply, and a restrained bloom. Off by default, one toggle to enable.
- **Hi-res export must match the live look** — same params, just more resolution (offscreen render, not upscale).
- **Spatially-varying parameters** wherever a system supports it (feed/kill maps, growth-bias masks, density fields) — this is the difference between "demo" and "specimen."

---

## 6. Quality bar / acceptance criteria

- Each system runs independently from the Lab shell, with live controls generated from its `schema`.
- Same seed + same params reproduces an identical frame sequence.
- Tier-A systems hold an interactive frame rate (target 60fps) at prototype scale; Tier-B at their stated resolution.
- Preset save → reload restores the exact visual.
- Hi-res PNG export works for all seven and visually matches the live canvas.
- Algorithm cores have zero Vite/Tweakpane/DOM-framework imports (verify by grep) — portable to Next.js.
- No crashes or unbounded growth at the documented param caps.

---

## 7. Build order

- **M0 — Foundation:** Vite/TS scaffold, harness loop, Tweakpane binding, seedable RNG, OKLCH color utils + palettes, export, presets. *Validate with one trivial placeholder system before proceeding.*
- **M1 — Core tier:** Space Colonization → Differential Growth → Phyllotaxis → Strange Attractors → Dielectric Breakdown. Each lands with full param schema, a couple of saved presets, and working export.
- **M2 — Stretch tier:** Stable Fluids, then Reaction–Diffusion on a surface.
- **M3 — Review pass:** a one-screen contact sheet of all systems' "keeper" presets for a go/no-go integration decision per system.

Build incrementally and verify each system end-to-end (controls → render → seed reproduce → export) before starting the next. Don't batch.

---

## 8. Deliverables & repo layout

```
frond-algorithm-lab/
├─ src/
│  ├─ harness/        # loop, tweakpane binding, export, presets, RNG
│  ├─ core/           # color (OKLCH), palettes, spatial-hash, math, types
│  ├─ systems/        # one file per GenerativeSystem (framework-agnostic)
│  │  ├─ space-colonization.ts
│  │  ├─ differential-growth.ts
│  │  ├─ phyllotaxis.ts
│  │  ├─ strange-attractors.ts
│  │  ├─ dielectric-breakdown.ts
│  │  ├─ stable-fluids.ts
│  │  └─ rd-surface.ts
│  ├─ surfaces/       # Canvas2D / WebGL / three RenderSurface wrappers
│  └─ main.ts         # Lab shell
├─ presets/           # exported keeper presets (JSON)
└─ README.md          # how to run, the GenerativeSystem contract, per-system param notes
```

The README is part of the deliverable: document the `GenerativeSystem` contract and, per system, which params are "hot" (live) vs. require re-init, plus any compute caveats (e.g. dielectric breakdown's solver budget).

---

## Appendix — references per system

- **Space Colonization:** Runions, Lane, Prusinkiewicz — "Modeling Trees with a Space Colonization Algorithm" / leaf venation work.
- **Differential Growth:** the inconvergent / Anders Hoff lineage; node-insertion + repulsion on a polyline.
- **Phyllotaxis:** Vogel's model; golden-angle sunflower packing.
- **Strange Attractors:** Peter de Jong / Clifford Pickover maps; log-density accumulation rendering.
- **Dielectric Breakdown:** Niemeyer–Pietronero–Wiesmann DBM (η-generalized DLA).
- **Stable Fluids:** Jos Stam, "Stable Fluids" (1999); vorticity confinement (Fedkiw et al.).
- **RD on surfaces:** Gray–Scott; Greg Turk, "Generating Textures on Arbitrary Surfaces using Reaction–Diffusion."
