// ─────────────────────────────────────────────────────────────────────────────
// The core contract. EVERY generative system implements `GenerativeSystem`.
//
// Hard rule: this file (and everything in src/core) must NOT import Vite,
// Tweakpane, three, or any DOM framework. Cores receive a RenderSurface and a
// params object and nothing else — that is what makes them liftable into the
// Next.js site later with no rewrite. (Verify with: npm run check:portable)
// ─────────────────────────────────────────────────────────────────────────────

/** A declarative param schema drives BOTH the control panel and presets. */
export type ParamSpec =
  | { type: "number"; min: number; max: number; step?: number; default: number; hot?: boolean; label?: string }
  | { type: "int"; min: number; max: number; default: number; hot?: boolean; label?: string }
  | { type: "bool"; default: boolean; hot?: boolean; label?: string }
  | { type: "select"; options: string[]; default: string; hot?: boolean; label?: string }
  | { type: "color"; default: string; hot?: boolean; label?: string } // hex (#rrggbb) or oklch string
  | { type: "seed"; default: string; label?: string };

export type ParamSchema = Record<string, ParamSpec>;

export type ParamValue = number | boolean | string;
/** Resolved param values, keyed by schema key. */
export type Params = Record<string, ParamValue>;

/** Seedable PRNG. Same seed ⇒ identical stream. Never use Math.random in a core. */
export interface RNG {
  /** float in [0, 1) */
  next(): number;
  /** float in [min, max) */
  range(min: number, max: number): number;
  /** integer in [min, max] inclusive */
  int(min: number, max: number): number;
  /** standard-normal-ish (Box–Muller) */
  gaussian(mean?: number, sd?: number): number;
  /** pick one element */
  pick<T>(arr: readonly T[]): T;
  /** the string seed this RNG was created from */
  readonly seed: string;
}

// ── Render surfaces — the harness owns the surface, the module owns the content.

export interface Canvas2DSurface {
  kind: "canvas2d";
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** logical (CSS) pixels — drawing coordinates */
  width: number;
  height: number;
  /** device pixel ratio the backing store is scaled by */
  dpr: number;
}

export interface WebGLSurface {
  kind: "webgl";
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  width: number;
  height: number;
}

/** three.js surface. `renderer`/`THREE` are typed loosely so core/types stays
 *  dependency-free; the rd-surface system imports three itself for real types. */
export interface ThreeSurface {
  kind: "three";
  canvas: HTMLCanvasElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderer: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  THREE: any;
  width: number;
  height: number;
}

export type RenderSurface = Canvas2DSurface | WebGLSurface | ThreeSurface;

/**
 * A generative system. The harness owns the loop and the State:
 *   const state = system.init(surface, params, rng)
 *   each frame:  state = system.step(state, dt); system.render(state, surface)
 *
 * RESET is handled by the harness re-calling init() with a fresh RNG built from
 * the seed — so systems stay purely (seed, params) → output and need not track
 * their own seed. exportHiRes is optional; if absent the harness re-simulates on
 * an N× offscreen surface for the same elapsed frames (see harness/export.ts).
 */
export interface GenerativeSystem<State = unknown> {
  id: string;
  title: string;
  blurb: string; // one line of character description
  schema: ParamSchema; // single source of truth for controls + presets
  tier: "canvas2d" | "webgl" | "three";

  /** Build initial State. Read every param from `params`; randomness via `rng`. */
  init(surface: RenderSurface, params: Params, rng: RNG): State;
  /** Advance the simulation by `dt` seconds. May mutate and/or return State. */
  step(state: State, dt: number): State;
  /** Draw the current State to the surface. Must scale to surface.width/height. */
  render(state: State, surface: RenderSurface): void;

  /** True once the sim has converged / finished (lets the harness stop stepping). */
  isDone?(state: State): boolean;

  /** Optional custom hi-res export (offscreen render at N× — not an upscale). */
  exportHiRes?(params: Params, rng: RNG, scale: number, baseWidth: number, baseHeight: number): Promise<Blob>;
}

/** Pull the default value out of a spec. */
export function defaultsOf(schema: ParamSchema): Params {
  const out: Params = {};
  for (const k in schema) out[k] = schema[k].default;
  return out;
}
