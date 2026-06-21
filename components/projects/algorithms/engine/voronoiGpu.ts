// GPU Voronoi — the engine behind the Algorithms page's "Voronoi" system.
//
// Inspired by Raven Kwok's cellular work (Skyline, Algorithmic Menagerie, the
// 1194D^3 finite-subdivision pieces): the seeds are drifting *agents*, the cells
// carry organic membranes, and a second Worley layer keyed off each cell gives
// the recursive, nested-subdivision look — "self-organised but interconnected
// cellular structures" that breathe and morph.
//
// The diagram itself is computed with the Jump Flooding Algorithm: seeds are
// stamped into a float texture, then ~log2(res) ping-pong passes propagate the
// nearest-seed coordinate to every pixel. A display pass reads that field and
// renders cell colour, a radial nucleus, the Worley sub-detail and the membrane.
// Implements the same Eng interface as Physarum / ReactionDiffusion.

import { getContext, createProgram, createTarget, hexToRgb, type Target } from "./gl";
import { FULLSCREEN_VERT } from "./shaders";

export interface VParams {
  seeds: number; // cell count
  drift: number; // agent motion amount
  relax: number; // 0 random … 1 even (blue-noise grid)
  membrane: number; // edge thickness (px)
  cellGlow: number; // radial nucleus falloff 0..1
  subdiv: number; // sub-cellular Worley amount 0..1
  subScale: number; // Worley frequency
  pulse: number; // breathing amount
  palette: "iridescent" | "ink" | "tissue" | "circuit" | "plasma";
  sat: number; // saturation for procedural hues
  bg: string;
  edge: string;
  cellA: string;
  cellB: string;
}

export const V_DEFAULTS: VParams = {
  seeds: 240,
  drift: 1.0,
  relax: 0.45,
  membrane: 2.4,
  cellGlow: 0.62,
  subdiv: 0.5,
  subScale: 7,
  pulse: 0.5,
  palette: "iridescent",
  sat: 0.72,
  bg: "#04050a",
  edge: "#05060c",
  cellA: "#1b2a6b",
  cellB: "#7df3ff",
};

const PALETTE_INDEX = { iridescent: 0, ink: 1, tissue: 2, circuit: 3, plasma: 4 } as const;

export type VPreset = { name: string; params: VParams };
const mk = (o: Partial<VParams>): VParams => ({ ...V_DEFAULTS, ...o });
export const V_PRESETS: VPreset[] = [
  { name: "Menagerie", params: mk({}) },
  { name: "Ink Division", params: mk({ palette: "ink", seeds: 320, relax: 0.5, membrane: 2.0, cellGlow: 0.34, subdiv: 0.7, subScale: 9, bg: "#000000", edge: "#000000", cellA: "#f4f1ea", cellB: "#f4f1ea", drift: 0.7 }) },
  { name: "Tissue", params: mk({ palette: "tissue", seeds: 200, relax: 0.4, membrane: 3.4, cellGlow: 0.78, subdiv: 0.4, subScale: 6, pulse: 0.8, bg: "#0a0204", edge: "#2a0710", cellA: "#7a1330", cellB: "#ff8a6a", sat: 0.7 }) },
  { name: "Circuit", params: mk({ palette: "circuit", seeds: 360, relax: 0.62, membrane: 1.8, cellGlow: 0.2, subdiv: 0.55, subScale: 10, bg: "#02080a", edge: "#39ffd0", cellA: "#031416", cellB: "#06343a", drift: 0.5 }) },
  { name: "Plasma", params: mk({ palette: "plasma", seeds: 180, relax: 0.3, membrane: 2.2, cellGlow: 0.5, subdiv: 0.35, subScale: 5, pulse: 1.0, drift: 1.4, sat: 0.9 }) },
  { name: "Stained Glass", params: mk({ palette: "iridescent", seeds: 130, relax: 0.5, membrane: 4.5, cellGlow: 0.4, subdiv: 0.15, subScale: 4, bg: "#05040a", edge: "#000000", sat: 0.85, drift: 0.6 }) },
];

// ── Seed stamp: write each agent into the JFA field at its pixel ────────────
const STAMP_VERT = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uSeedData;
uniform float uDataW;
uniform vec2 uRes;
out vec3 vSeed;
void main() {
  int id = gl_VertexID;
  int w = int(uDataW);
  ivec2 t = ivec2(id % w, id / w);
  vec4 s = texelFetch(uSeedData, t, 0);
  vSeed = vec3(s.xy, s.z);
  vec2 p = (s.xy + 0.5) / uRes;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = 1.0;
}`;
const STAMP_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec3 vSeed;
out vec4 o;
void main() { o = vec4(vSeed.xy, vSeed.z, 1.0); }`;

// ── Jump flooding: propagate nearest seed at decreasing step sizes ──────────
const JFA_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uStep;
void main() {
  vec2 px = vUv * uRes;
  vec4 best = vec4(0.0);
  float bd = 1.0e20;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 off = vec2(float(i), float(j)) * uStep;
      vec4 s = texture(uTex, vUv + off / uRes);
      if (s.w > 0.5) {
        float d = distance(px, s.xy);
        if (d < bd) { bd = d; best = s; }
      }
    }
  }
  o = best;
}`;

const DISPLAY_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uTex;   // JFA field: xy = nearest seed px, z = cell hue, w = valid
uniform vec2 uRes;
uniform int uMode;
uniform vec3 uBg, uEdge, uCellA, uCellB;
uniform float uMembrane, uCellGlow, uSubdiv, uSubScale, uPulse, uSat, uCellR, uTime;

vec3 hsv2rgb(vec3 c) {
  vec3 p = abs(fract(c.x + vec3(0.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0);
  return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}
vec2 hash22(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}
// Worley (cellular) noise for the nested sub-division detail.
float worley(vec2 p) {
  vec2 n = floor(p), f = fract(p);
  float md = 1.0;
  for (int j = -1; j <= 1; j++)
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 d = g + hash22(n + g) - f;
      md = min(md, dot(d, d));
    }
  return sqrt(md);
}

void main() {
  vec2 px = vUv * uRes;
  vec4 c = texture(uTex, vUv);
  vec2 seed = c.xy;
  float hue = c.z;
  float dist1 = distance(px, seed);

  // Membrane: a neighbour in a different cell (different seed) marks an edge.
  float e = 0.0;
  for (int k = 0; k < 8; k++) {
    float a = float(k) / 8.0 * 6.2831853;
    vec2 dir = vec2(cos(a), sin(a)) * uMembrane;
    vec2 ns = texture(uTex, vUv + dir / uRes).xy;
    if (distance(ns, seed) > 1.5) e += 1.0;
  }
  float edge = smoothstep(0.5, 4.0, e);

  // Radial nucleus — bright at the seed, falling toward the rim.
  float f = clamp(dist1 / uCellR, 0.0, 1.0);
  float breathe = 1.0 + uPulse * 0.18 * sin(uTime * 1.3 + hue * 31.0);
  float lum = mix(1.0, 1.0 - uCellGlow, f) * breathe;

  // Nested sub-cells: a Worley field offset per parent cell.
  float w = worley(vUv * uSubScale * 6.0 + hue * 53.0);
  lum *= mix(1.0, smoothstep(0.0, 0.5, w) * 0.7 + 0.45, uSubdiv);

  vec3 cell;
  if (uMode == 0) {                       // iridescent
    cell = hsv2rgb(vec3(fract(hue + uTime * 0.015), uSat, 1.0)) * lum;
  } else if (uMode == 1) {                // ink — light cells, dark membranes
    cell = mix(uCellA, uCellB, hue) * lum;
  } else if (uMode == 2) {                // tissue — warm by cell
    cell = mix(uCellA, uCellB, smoothstep(0.0, 1.0, hue) * (1.0 - f * 0.5)) * lum;
  } else if (uMode == 3) {                // circuit — dark cells, glowing rim
    cell = mix(uCellA, uCellB, hue) * lum;
  } else {                                // plasma
    cell = hsv2rgb(vec3(fract(hue + f * 0.5 + uTime * 0.04), uSat, 1.0)) * lum;
  }

  vec3 col;
  if (uMode == 3) {
    col = cell + uEdge * edge * (0.7 + 0.5 * breathe); // additive glow membranes
  } else {
    col = mix(cell, uEdge, edge);
  }
  col = mix(uBg, col, c.w);               // background where (never) unfilled
  o = vec4(col, 1.0);
}`;

export class VoronoiGpu {
  readonly gl: WebGL2RenderingContext;
  readonly is3D = false as const;
  paused = false;

  private res: number;
  private p: VParams;
  private progStamp: WebGLProgram;
  private progJfa: WebGLProgram;
  private progDisplay: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private a!: Target;
  private b!: Target;
  private seedData!: Target;
  private dataW = 0;
  private n = 0;
  private prevSeeds = -1;
  private t0: number;
  // per-agent motion state
  private bx: Float32Array = new Float32Array(0);
  private by: Float32Array = new Float32Array(0);
  private amp: Float32Array = new Float32Array(0);
  private sp: Float32Array = new Float32Array(0);
  private ph: Float32Array = new Float32Array(0);
  private hue: Float32Array = new Float32Array(0);
  private buf: Float32Array = new Float32Array(0);

  constructor(canvas: HTMLCanvasElement, res: number, params: VParams) {
    const gl = getContext(canvas);
    this.gl = gl;
    this.res = res;
    this.p = params;
    this.t0 = performance.now();
    canvas.width = res;
    canvas.height = res;

    this.progStamp = createProgram(gl, STAMP_VERT, STAMP_FRAG);
    this.progJfa = createProgram(gl, FULLSCREEN_VERT, JFA_FRAG);
    this.progDisplay = createProgram(gl, FULLSCREEN_VERT, DISPLAY_FRAG);
    this.vao = gl.createVertexArray()!;

    this.a = createTarget(gl, res, res, gl.RGBA32F, gl.FLOAT, null, gl.NEAREST);
    this.b = createTarget(gl, res, res, gl.RGBA32F, gl.FLOAT, null, gl.NEAREST);
    this.reset();
  }

  private u(prog: WebGLProgram, name: string) {
    return this.gl.getUniformLocation(prog, name);
  }

  reset() {
    const gl = this.gl;
    const N = Math.max(8, Math.round(this.p.seeds));
    this.n = N;
    this.prevSeeds = N;
    // seed-data texture sized to hold N agents
    this.dataW = Math.ceil(Math.sqrt(N));
    const cap = this.dataW * this.dataW;
    this.buf = new Float32Array(cap * 4);
    this.bx = new Float32Array(N);
    this.by = new Float32Array(N);
    this.amp = new Float32Array(N);
    this.sp = new Float32Array(N);
    this.ph = new Float32Array(N);
    this.hue = new Float32Array(N);

    // Blue-noise-ish layout: a jittered grid, jitter shrinking with `relax`.
    const cols = Math.ceil(Math.sqrt(N));
    const cell = this.res / cols;
    const jit = (1 - Math.min(1, Math.max(0, this.p.relax))) * cell * 0.95;
    for (let i = 0; i < N; i++) {
      const gx = i % cols, gy = Math.floor(i / cols);
      this.bx[i] = (gx + 0.5) * cell + (Math.random() - 0.5) * jit;
      this.by[i] = (gy + 0.5) * cell + (Math.random() - 0.5) * jit;
      this.amp[i] = cell * (0.12 + Math.random() * 0.35);
      this.sp[i] = 0.15 + Math.random() * 0.5;
      this.ph[i] = Math.random() * Math.PI * 2;
      this.hue[i] = Math.random();
    }
    if (this.seedData) {
      gl.deleteTexture(this.seedData.tex);
      gl.deleteFramebuffer(this.seedData.fbo);
    }
    this.seedData = createTarget(gl, this.dataW, this.dataW, gl.RGBA32F, gl.FLOAT, this.buf, gl.NEAREST);
  }

  setParams(p: VParams) {
    const reseed = Math.round(p.seeds) !== this.prevSeeds;
    this.p = p;
    if (reseed) this.reset();
  }

  setMouse() {}

  private uploadSeeds(t: number) {
    const gl = this.gl;
    const N = this.n, b = this.buf, R = this.res;
    const drift = this.p.drift;
    for (let i = 0; i < N; i++) {
      const a = this.amp[i] * drift;
      let x = this.bx[i] + Math.cos(this.ph[i] + t * this.sp[i]) * a;
      let y = this.by[i] + Math.sin(this.ph[i] * 1.3 + t * this.sp[i] * 0.9) * a;
      x = Math.min(R - 1, Math.max(0, x));
      y = Math.min(R - 1, Math.max(0, y));
      b[i * 4] = x;
      b[i * 4 + 1] = y;
      b[i * 4 + 2] = this.hue[i];
      b[i * 4 + 3] = 1;
    }
    gl.bindTexture(gl.TEXTURE_2D, this.seedData.tex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.dataW, this.dataW, gl.RGBA, gl.FLOAT, b);
  }

  private buildField(t: number) {
    const gl = this.gl;
    this.uploadSeeds(t);
    gl.bindVertexArray(this.vao);

    // clear field to invalid, then stamp the agents
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.a.fbo);
    gl.viewport(0, 0, this.res, this.res);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.progStamp);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.seedData.tex);
    gl.uniform1i(this.u(this.progStamp, "uSeedData"), 0);
    gl.uniform1f(this.u(this.progStamp, "uDataW"), this.dataW);
    gl.uniform2f(this.u(this.progStamp, "uRes"), this.res, this.res);
    gl.drawArrays(gl.POINTS, 0, this.n);

    // jump flooding: step = res/2, res/4, … 1
    gl.useProgram(this.progJfa);
    gl.uniform2f(this.u(this.progJfa, "uRes"), this.res, this.res);
    let step = this.res >> 1;
    while (step >= 1) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.b.fbo);
      gl.viewport(0, 0, this.res, this.res);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.a.tex);
      gl.uniform1i(this.u(this.progJfa, "uTex"), 0);
      gl.uniform1f(this.u(this.progJfa, "uStep"), step);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      [this.a, this.b] = [this.b, this.a];
      step >>= 1;
    }
  }

  render() {
    const gl = this.gl;
    const p = this.p;
    const t = (performance.now() - this.t0) / 1000;
    if (!this.paused) this.buildField(t);

    gl.useProgram(this.progDisplay);
    gl.bindVertexArray(this.vao);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.res, this.res);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.a.tex);
    gl.uniform1i(this.u(this.progDisplay, "uTex"), 0);
    gl.uniform2f(this.u(this.progDisplay, "uRes"), this.res, this.res);
    gl.uniform1i(this.u(this.progDisplay, "uMode"), PALETTE_INDEX[p.palette]);
    gl.uniform3fv(this.u(this.progDisplay, "uBg"), hexToRgb(p.bg));
    gl.uniform3fv(this.u(this.progDisplay, "uEdge"), hexToRgb(p.edge));
    gl.uniform3fv(this.u(this.progDisplay, "uCellA"), hexToRgb(p.cellA));
    gl.uniform3fv(this.u(this.progDisplay, "uCellB"), hexToRgb(p.cellB));
    gl.uniform1f(this.u(this.progDisplay, "uMembrane"), p.membrane);
    gl.uniform1f(this.u(this.progDisplay, "uCellGlow"), p.cellGlow);
    gl.uniform1f(this.u(this.progDisplay, "uSubdiv"), p.subdiv);
    gl.uniform1f(this.u(this.progDisplay, "uSubScale"), p.subScale);
    gl.uniform1f(this.u(this.progDisplay, "uPulse"), p.pulse);
    gl.uniform1f(this.u(this.progDisplay, "uSat"), p.sat);
    // average cell radius for the nucleus gradient
    gl.uniform1f(this.u(this.progDisplay, "uCellR"), (this.res / Math.sqrt(this.n)) * 0.62);
    gl.uniform1f(this.u(this.progDisplay, "uTime"), t);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  dispose() {
    const gl = this.gl;
    for (const tg of [this.a, this.b, this.seedData]) {
      gl.deleteTexture(tg.tex);
      gl.deleteFramebuffer(tg.fbo);
    }
    for (const pr of [this.progStamp, this.progJfa, this.progDisplay]) gl.deleteProgram(pr);
    gl.deleteVertexArray(this.vao);
  }
}

// ── RANDOMISE — wide-diversity Voronoi scene ────────────────────────────────
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
function hsl(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, bb = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; bb = x; }
  else if (h < 240) { g = x; bb = c; } else if (h < 300) { r = x; bb = c; } else { r = c; bb = x; }
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return "#" + to(r) + to(g) + to(bb);
}

export function randomVoronoiParams(): VParams {
  const palette = pick<VParams["palette"]>(["iridescent", "iridescent", "ink", "tissue", "circuit", "plasma"]);
  const hue = rnd(0, 360);
  return {
    ...V_DEFAULTS,
    seeds: Math.round(rnd(110, 380)),
    drift: rnd(0.4, 1.6),
    relax: rnd(0.25, 0.7),
    membrane: rnd(1.6, 4.5),
    cellGlow: rnd(0.25, 0.85),
    subdiv: rnd(0.1, 0.8),
    subScale: rnd(4, 11),
    pulse: rnd(0.2, 1.0),
    palette,
    sat: rnd(0.6, 0.95),
    bg: palette === "ink" ? "#000000" : hsl(hue + 200, rnd(0.4, 0.8), rnd(0.03, 0.08)),
    edge: palette === "circuit" ? hsl(hue, rnd(0.8, 1), rnd(0.55, 0.7)) : palette === "ink" ? "#000000" : hsl(hue, rnd(0.3, 0.7), rnd(0.02, 0.07)),
    cellA: palette === "ink" ? "#f4f1ea" : hsl(hue + rnd(-20, 20), rnd(0.5, 0.9), rnd(0.18, 0.35)),
    cellB: palette === "ink" ? "#f4f1ea" : hsl(hue + rnd(120, 220), rnd(0.6, 1), rnd(0.5, 0.66)),
  };
}
