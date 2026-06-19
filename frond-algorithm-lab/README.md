# Frond Studio — Algorithm Lab (Wave 2)

A standalone **Vite + TypeScript** sandbox for exploring seven nature-inspired
generative systems, feeling out their parameter space, capturing "keeper" presets,
and deciding which earn a place in the live `/projects/algorithms` toolbox.

This is an **exploration deliverable, not production** — optimized for fast
iteration, wide parameter ranges, reproducibility, and clean module boundaries.

## Run

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # tsc --noEmit + vite build
npm run typecheck
npm run check:portable   # asserts cores have no Vite/Tweakpane/framework imports
```

Keyboard: `space` play/pause · `r` reset.

## The one hard rule — portability

Algorithm **cores** (`src/core`, `src/systems`) must not import Vite, Tweakpane,
or any DOM framework. They receive a `RenderSurface` and a `params` object and
nothing else — that is what makes them liftable into the Next.js site later with
no rewrite. `three` is allowed **only** in `rd-surface.ts`. Enforced by
`npm run check:portable`.

## The `GenerativeSystem` contract (`src/core/types.ts`)

A declarative `ParamSchema` is the single source of truth for **both** the
control panel and presets. Every system implements:

```ts
interface GenerativeSystem<State> {
  id; title; blurb; schema; tier;   // 'canvas2d' | 'webgl' | 'three'
  init(surface, params, rng): State;     // build initial State
  step(state, dt): State;                // advance the sim
  render(state, surface): void;          // draw current State (scaled to surface size)
  isDone?(state): boolean;               // sim converged → harness stops stepping
  exportHiRes?(params, rng, scale, w, h): Promise<Blob>;
}
```

Harness ownership and conventions:

- **The harness owns the loop and the State.** `const state = init(...)`, then each
  frame `state = step(state, dt); render(state, surface)`.
- **Reset = re-init.** The harness re-calls `init()` with a fresh RNG built from
  the seed, so systems stay purely `(seed, params) → output` and never track their
  own seed. Same seed + same params ⇒ identical frame sequence.
- **Hot vs. cold params.** Each system holds the *shared, mutable* `params` object
  in its `State` and reads `hot` params live in `step`/`render`. A schema spec
  marked `hot: true` updates live with no reset; anything else (counts, grid
  resolution, structural choices) triggers a `reset()` when changed.
- **Determinism.** Randomness comes only from the seeded `rng` (`src/core/rng.ts`,
  sfc32 + xmur3). No `Math.random` in a core.
- **Colour in OKLCH only** (`src/core/color.ts`). Colour is driven from a
  simulation *field* (depth / age / density / B-concentration) through
  `fieldToColor(value, palette)`, interpolated in OKLab — never raw RGB lerps.
  Six reference palettes sampled from natural sources (fern, coral, azurite,
  fluoro, ember, ice).
- **Hi-res export is a re-simulation, not an upscale.** The harness re-runs the
  system on an N× offscreen surface for the same elapsed frames; density systems
  override `exportHiRes` to scale the iteration budget by N² so brightness matches.

`RenderSurface` is a thin wrapper over a Canvas2D context, a WebGL2 context, or a
three.js renderer (`src/surfaces`). A fresh canvas is created per system load
(a canvas can't switch 2D ⇄ WebGL contexts).

## The seven systems

| # | System | Tier | Character |
|---|--------|------|-----------|
| 1 | Space Colonization | canvas2d | vascular venation — leaf veins, canopies, roots |
| 2 | Differential Growth | canvas2d | buckling membranes — brain coral, hyphae |
| 3 | Phyllotaxis | canvas2d | radial packing — sunflower heads, pinecones |
| 4 | Strange Attractors | canvas2d | filamentary density — luminous, smoky |
| 5 | Dielectric Breakdown | canvas2d | field-driven ramification — lightning, root creep |
| 6 | Stable Fluids | webgl | ink-in-water advection (GPU ping-pong) |
| 7 | Reaction–Diffusion on a Surface | three | Turing patterns wrapping a mesh |

### Per-system notes (hot vs. reset, caveats)

- **Space Colonization** — *hot:* `palette`, `strokeScale`. *Reset:* attractor
  count/distribution, domain shape, influence/kill radius, step length, max nodes,
  thickness model. Grows incrementally then `done`.
- **Differential Growth** — *hot:* repulsion/spring strengths, split threshold,
  jitter, palette, stroke scale. *Reset:* node cap, open/closed, growth bias.
  Uses a spatial hash for neighbour queries (naive O(n²) chokes past a few k).
- **Phyllotaxis** — almost everything is hot (recompute is cheap): golden angle
  (the rewarding knob — detune off 137.5° to expose spiral arms), point count,
  scale, size mode, palette. Static layout with an optional reveal animation.
- **Strange Attractors** — *hot:* exposure, gamma, palette, background. *Reset:*
  map family, coefficients, iteration budget. **The whole quality is log-density
  accumulation + tone mapping** — points are accumulated into a density buffer,
  never drawn directly. Custom `exportHiRes` scales iterations by N².
- **Dielectric Breakdown** — *hot:* η (affects future growth), palette, glow.
  *Reset:* grid resolution, boundary, neighbourhood, growth/step, solver sweeps,
  max cells. **Compute caveat:** the Laplace solve each step is the bottleneck —
  it uses a **capped Gauss–Seidel/SOR budget** (`solverSweeps`, warm-started) as a
  deliberate approximation. Keep `gridRes ≤ 512` for interactivity.
- **Stable Fluids** — *hot:* viscosity, dissipations, pressure iterations,
  vorticity, force/dye strength, palette. *Reset:* sim resolution (re-allocates
  float textures). Pointer injects dye+force (listeners on the surface canvas).
  Needs `EXT_color_buffer_float`; degrades gracefully if absent.
- **Reaction–Diffusion on a Surface** — *hot:* F, k, Da, Db, vary-F/k, substeps,
  colours, rotation. *Reset:* mesh, sim resolution. Gray–Scott runs in a ping-pong
  render-target texture and is sampled onto the mesh in UV space; the
  spatially-varying F/k map produces multiple "zoologies" on one surface.

## Layout

```
src/
  core/        types (the contract), rng, math, color (OKLCH), spatial-hash
  surfaces/    Canvas2D / WebGL / three RenderSurface wrappers
  harness/     loop, panel (Tweakpane binding), export (PNG/hi-res/JSON), presets
  systems/     one file per GenerativeSystem (framework-agnostic)
  main.ts      the Lab shell
scripts/       check-portable.mjs
```

## Status

- **M0 Foundation** ✓ — shell, loop, Tweakpane binding, seedable RNG, OKLCH colour
  + palettes, PNG/hi-res export, presets.
- **M1 Core tier** ✓ — the five Canvas2D systems.
- **M2 Stretch tier** ✓ — Stable Fluids (WebGL) and RD-on-a-surface (three).
- **M3 Review pass** — open: a one-screen contact sheet of keeper presets for the
  go/no-go integration decision per system.

The systems were built against the contract and the project type-checks and
builds; they still want a visual pass in the browser to dial in default params and
confirm each one "sings."
