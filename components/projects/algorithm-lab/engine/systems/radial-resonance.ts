import type { Canvas2DSurface, GenerativeSystem, Params, RenderSurface, RNG } from "../core/types";
import { TAU, clamp } from "../core/math";

// Radial Resonance — concentric "sonar" rings and a polar lattice of diamond
// dots around a glowing molten core. KEY MOTION: the whole disc rotates in 3D
// around its horizontal axis — squashing from a face-on circle down to an
// edge-on line, then flipping open to the far side and tumbling on, with the
// dots gaining perspective depth (near = bigger/brighter, far = smaller/dimmer).

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
  blurb: "A sonar-ring diamond lattice that flips through 3D around a glowing core.",
  tier: "canvas2d",
  schema: {
    rings: { type: "int", min: 6, max: 40, default: 18, label: "Rings" },
    spokes: { type: "int", min: 6, max: 60, default: 24, label: "Spokes" },
    tiltSpeed: { type: "number", min: 0, max: 3, step: 0.01, default: 0.8, hot: true, label: "3D flip speed" },
    perspective: { type: "number", min: 0, max: 1, step: 0.01, default: 0.55, hot: true, label: "Perspective" },
    dotBase: { type: "number", min: 0.5, max: 6, step: 0.1, default: 1.2, hot: true, label: "Dot size" },
    dotGrowth: { type: "number", min: 0, max: 2.5, step: 0.05, default: 0.6, hot: true, label: "Dot growth" },
    waveSpeed: { type: "number", min: 0, max: 4, step: 0.05, default: 1.1, hot: true, label: "Ripple speed" },
    waveFreq: { type: "number", min: 0, max: 1.5, step: 0.01, default: 0.55, hot: true, label: "Ripple density" },
    rotate: { type: "number", min: -0.4, max: 0.4, step: 0.005, default: 0.03, hot: true, label: "Spin" },
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
    const p = state.params;

    // Cursor "Touch": lean the whole disc toward the pointer. Read defensively —
    // these live on the shared params object but are not in the schema.
    const ta = !!p.touchActive;
    const tx = (p.touchX as number) || 0;
    const ty = (p.touchY as number) || 0;
    const ts = (p.touchStrength as number) ?? 0.6;
    let cx = W / 2, cy = H / 2;
    if (ta) {
      const lean = clamp(ts, 0, 1.5) * 0.42; // how far the centre slides toward the cursor
      cx += (tx * W - cx) * lean;
      cy += (ty * H - cy) * lean;
    }
    const nr = p.rings as number;
    const ns = p.spokes as number;
    if (nr !== state.nr || ns !== state.ns) { state.nr = nr; state.ns = ns; state.phase = buildPhase(state.rng, nr, ns); }

    const chaos = P(state, "chaos");
    const t = state.tick * 0.016;
    const maxR = Math.min(W, H) * 0.46;
    const spacing = maxR / nr;
    const rot = state.tick * P(state, "rotate") * 0.02;

    // 3D tilt: the disc rotates around its horizontal axis. cosT is the vertical
    // foreshortening (1 = face-on circle, 0 = edge-on line, -1 = flipped/far side);
    // sinT gives each point's depth toward/away from the viewer.
    const tiltA = state.tick * P(state, "tiltSpeed") * 0.02 + Math.sin(t * 0.2) * 0.3 * chaos;
    const cosT = Math.cos(tiltA);
    const sinT = Math.sin(tiltA);
    const ringFlat = Math.max(0.04, Math.abs(cosT));
    const persp = P(state, "perspective");

    const ringC = hexToRgb(p.ringColor as string);
    const dotC = hexToRgb(p.dotColor as string);
    const coreC = hexToRgb(p.coreColor as string);

    // background
    ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    ctx.fillStyle = p.bg as string;
    ctx.fillRect(0, 0, W, H);

    // concentric "sonar" rings — squash with the 3D tilt (collapse to a line edge-on)
    ctx.lineWidth = 1.1;
    for (let i = 1; i <= nr; i++) {
      const r = i * spacing;
      const a = 0.5 + 0.14 * Math.sin(t * P(state, "waveSpeed") - i * 0.3);
      ctx.strokeStyle = rgba(ringC, clamp(a, 0.22, 0.66));
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * ringFlat, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.lineWidth = 0.7;
    for (let i = 0; i < nr; i++) {
      const r = (i + 0.5) * spacing;
      ctx.strokeStyle = rgba(ringC, 0.08);
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * ringFlat, 0, 0, TAU);
      ctx.stroke();
    }

    const glow = p.glow as boolean;
    if (glow) ctx.globalCompositeOperation = "lighter";

    // radial diamond lattice with the 3D tilt + perspective + outward ripple
    const wSpeed = P(state, "waveSpeed");
    const wFreq = P(state, "waveFreq");
    const dotBase = P(state, "dotBase");
    const dotGrowth = P(state, "dotGrowth");
    for (let i = 0; i < nr; i++) {
      const r = (i + 1) * spacing;
      const wave = Math.sin(t * wSpeed - i * wFreq);
      const bright = clamp(0.68 + 0.32 * wave, 0.3, 1);
      const baseSize = dotBase + i * dotGrowth;
      for (let j = 0; j < ns; j++) {
        const ph = state.phase[i * ns + j];
        const shimmer = 1 + Math.sin(t * 1.7 + ph) * 0.18 * chaos;
        const ang = (j / ns) * TAU + rot + Math.sin(t * 0.5 + ph) * 0.02 * chaos;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const x = cx + ca * r;                 // horizontal stays
        const y = cy + sa * r * cosT;          // vertical foreshortened by the tilt
        const depth = sa * sinT;               // -1 (far) .. +1 (near)
        const depthN = depth * 0.5 + 0.5;
        const sizeMul = 1 + persp * (depthN - 0.5);   // near dots a touch bigger
        const brightMul = 1 - persp * (1 - depthN) * 0.6; // far dots dimmer
        const size = baseSize * (0.82 + 0.32 * bright) * shimmer * sizeMul;
        if (size < 0.3) continue;
        const a = (glow ? 0.45 + 0.5 * bright : 0.6 + 0.35 * bright) * brightMul;
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

    // glowing molten core (a sphere — stays round through the flip). When touched,
    // the core swells and burns brighter so the ripple reads as originating at the
    // pointer the disc has leaned toward.
    const touchBoost = ta ? clamp(ts, 0, 1.5) : 0;
    const pulse = (1 + Math.sin(t * (1.2 + chaos)) * 0.18) * (1 + 0.6 * touchBoost);
    const coreR = spacing * 1.5 * pulse;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
    g.addColorStop(0, rgba(coreC, 1));
    g.addColorStop(0.45, rgba(coreC, 0.7));
    g.addColorStop(1, rgba(coreC, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, coreR, 0, TAU);
    ctx.fill();

    ctx.globalCompositeOperation = "source-over";
  },
};
