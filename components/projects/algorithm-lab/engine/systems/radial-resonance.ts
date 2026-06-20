import type { Canvas2DSurface, GenerativeSystem, Params, RenderSurface, RNG } from "../core/types";
import { TAU, clamp } from "../core/math";

// Radial Resonance — concentric "sonar" rings and a polar lattice of diamond
// dots growing outward around a glowing molten core, with a ripple of light
// travelling out through the lattice. Inspired by a polar-grid generative loop.

interface State {
  params: Params;
  rng: RNG;
  tick: number;
  phase: Float32Array; // per-dot phase offset (deterministic shimmer)
  nr: number;
  ns: number;
}

const P = (s: State, k: string) => s.params[k] as number;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const rgba = (c: [number, number, number], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${clamp(a, 0, 1)})`;

function buildPhase(rng: RNG, nr: number, ns: number): Float32Array {
  const out = new Float32Array(nr * ns);
  for (let i = 0; i < out.length; i++) out[i] = rng.next() * TAU;
  return out;
}

export const radialResonance: GenerativeSystem<State> = {
  id: "radial-resonance",
  title: "Radial Resonance",
  blurb: "Sonar rings + a radial diamond lattice around a glowing core.",
  tier: "canvas2d",
  schema: {
    rings: { type: "int", min: 6, max: 40, default: 18, label: "Rings" },
    spokes: { type: "int", min: 6, max: 60, default: 24, label: "Spokes" },
    flatten: { type: "number", min: 0.4, max: 1, step: 0.01, default: 0.78, hot: true, label: "Flatten" },
    dotBase: { type: "number", min: 0.5, max: 6, step: 0.1, default: 1.2, hot: true, label: "Dot size" },
    dotGrowth: { type: "number", min: 0, max: 2.5, step: 0.05, default: 0.6, hot: true, label: "Dot growth" },
    waveSpeed: { type: "number", min: 0, max: 4, step: 0.05, default: 1.1, hot: true, label: "Ripple speed" },
    waveFreq: { type: "number", min: 0, max: 1.5, step: 0.01, default: 0.55, hot: true, label: "Ripple density" },
    rotate: { type: "number", min: -0.4, max: 0.4, step: 0.005, default: 0.04, hot: true, label: "Rotation" },
    glow: { type: "bool", default: true, hot: true, label: "Glow" },
    chaos: { type: "number", min: 0, max: 1, step: 0.01, default: 0.4, hot: true, label: "Chaos" },
    bg: { type: "color", default: "#0a0d0e", hot: true, label: "Background" },
    ringColor: { type: "color", default: "#3aa99e", hot: true, label: "Ring colour" },
    dotColor: { type: "color", default: "#e0683a", hot: true, label: "Dot colour" },
    coreColor: { type: "color", default: "#ff5a2a", hot: true, label: "Core colour" },
  },

  init(_surface: RenderSurface, params: Params, rng: RNG): State {
    const nr = params.rings as number;
    const ns = params.spokes as number;
    return { params, rng, tick: 0, phase: buildPhase(rng, nr, ns), nr, ns };
  },

  step(state: State): State {
    state.tick += 1;
    return state;
  },

  isDone(): boolean { return false; },

  render(state: State, surface: RenderSurface): void {
    const s = surface as Canvas2DSurface;
    const { ctx } = s;
    const W = s.width, H = s.height;
    const cx = W / 2, cy = H / 2;
    const p = state.params;
    const nr = p.rings as number;
    const ns = p.spokes as number;
    if (nr !== state.nr || ns !== state.ns) { state.nr = nr; state.ns = ns; state.phase = buildPhase(state.rng, nr, ns); }

    const chaos = P(state, "chaos");
    const t = state.tick * 0.016;
    const flatten = P(state, "flatten") + Math.sin(t * 0.4) * 0.04 * chaos; // gentle breathing of the ellipse
    const maxR = Math.min(W, H) * 0.45;
    const spacing = maxR / nr;
    const rot = state.tick * P(state, "rotate") * 0.02 + Math.sin(t * 0.3) * 0.4 * chaos;

    const ringC = hexToRgb(p.ringColor as string);
    const dotC = hexToRgb(p.dotColor as string);
    const coreC = hexToRgb(p.coreColor as string);

    // background
    ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    ctx.fillStyle = p.bg as string;
    ctx.fillRect(0, 0, W, H);

    // concentric "sonar" rings — the dominant structure. A bold teal ellipse on
    // every dot ring, plus faint half-step rings for a soft moiré shimmer.
    ctx.lineWidth = 1.1;
    for (let i = 1; i <= nr; i++) {
      const r = i * spacing;
      const a = 0.5 + 0.14 * Math.sin(t * P(state, "waveSpeed") - i * 0.3);
      ctx.strokeStyle = rgba(ringC, clamp(a, 0.22, 0.66));
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * flatten, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.lineWidth = 0.7;
    for (let i = 0; i < nr; i++) {
      const r = (i + 0.5) * spacing;
      ctx.strokeStyle = rgba(ringC, 0.08);
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * flatten, 0, 0, TAU);
      ctx.stroke();
    }

    const glow = p.glow as boolean;
    if (glow) ctx.globalCompositeOperation = "lighter";

    // radial diamond lattice with an outward ripple of light
    const wSpeed = P(state, "waveSpeed");
    const wFreq = P(state, "waveFreq");
    const dotBase = P(state, "dotBase");
    const dotGrowth = P(state, "dotGrowth");
    for (let i = 0; i < nr; i++) {
      const r = (i + 1) * spacing;
      // gentle ripple travelling outward — keeps inner rings visible (no blow-out)
      const wave = Math.sin(t * wSpeed - i * wFreq);
      const bright = clamp(0.68 + 0.32 * wave, 0.3, 1);
      const baseSize = dotBase + i * dotGrowth;
      for (let j = 0; j < ns; j++) {
        const ph = state.phase[i * ns + j];
        const shimmer = 1 + Math.sin(t * 1.7 + ph) * 0.18 * chaos;
        const ang = (j / ns) * TAU + rot + Math.sin(t * 0.5 + ph) * 0.025 * chaos;
        const x = cx + Math.cos(ang) * r;
        const y = cy + Math.sin(ang) * r * flatten;
        const size = baseSize * (0.82 + 0.32 * bright) * shimmer;
        if (size < 0.3) continue;
        const a = glow ? 0.45 + 0.5 * bright : 0.6 + 0.35 * bright;
        ctx.fillStyle = rgba(dotC, a);
        ctx.beginPath(); // diamond
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x - size, y);
        ctx.closePath();
        ctx.fill();
      }
    }

    // glowing molten core
    const pulse = 1 + Math.sin(t * (1.2 + chaos)) * 0.18;
    const coreR = spacing * 1.5 * pulse;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
    g.addColorStop(0, rgba(coreC, 1));
    g.addColorStop(0.45, rgba(coreC, 0.7));
    g.addColorStop(1, rgba(coreC, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, coreR, coreR * flatten, 0, 0, TAU);
    ctx.fill();

    ctx.globalCompositeOperation = "source-over";
  },
};
