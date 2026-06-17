// Tero Adaptive Network — the slime-mould transport model from
//   Tero, Takagi, Saigusa, Ito, Bebber, Fricker, Yumiki, Kobayashi, Nakagaki,
//   "Rules for Biologically Inspired Adaptive Network Design," Science 327 (2010).
//
// A lattice of tubes; each tube's conductivity D adapts to the flux Q flowing
// through it (high flux → thicken, low flux → atrophy). Pressures come from a
// Poisson/Kirchhoff solve (Jacobi relaxation on the GPU) with a current injected
// between a cycling pair of food sources. Optimized vein networks emerge — the
// same model that reproduced the Tokyo rail network and solves mazes.

import { createProgram, createTarget, hexToRgb, getContext, type Target } from "./gl";
import type { Engine, Preset } from "./algo";

const N = 96; // lattice nodes per side — small enough that the Jacobi solve converges

const QUAD = /* glsl */ `#version 300 es
out vec2 vUv;
void main(){ vec2 p=vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2)); vUv=p; gl_Position=vec4(p*2.0-1.0,0.0,1.0); }`;

// Jacobi step for the pressure field. Conductivity texture: R = tube to +x, G = tube to +y.
const JACOBI = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uPress, uCond;
uniform vec2 uSource, uSink;
uniform float uI0;
out vec4 o;
void main(){
  ivec2 c = ivec2(gl_FragCoord.xy);
  if (c == ivec2(uSink)) { o = vec4(0.0); return; } // Dirichlet anchor
  float Dr = (c.x < ${N - 1}) ? texelFetch(uCond, c, 0).r : 0.0;
  float Dl = (c.x > 0) ? texelFetch(uCond, c - ivec2(1,0), 0).r : 0.0;
  float Du = (c.y < ${N - 1}) ? texelFetch(uCond, c, 0).g : 0.0;
  float Dd = (c.y > 0) ? texelFetch(uCond, c - ivec2(0,1), 0).g : 0.0;
  float pr = (c.x < ${N - 1}) ? texelFetch(uPress, c + ivec2(1,0), 0).r : 0.0;
  float pl = (c.x > 0) ? texelFetch(uPress, c - ivec2(1,0), 0).r : 0.0;
  float pu = (c.y < ${N - 1}) ? texelFetch(uPress, c + ivec2(0,1), 0).r : 0.0;
  float pd = (c.y > 0) ? texelFetch(uPress, c - ivec2(0,1), 0).r : 0.0;
  float num = Dr*pr + Dl*pl + Du*pu + Dd*pd;
  float den = Dr + Dl + Du + Dd;
  float S = (c == ivec2(uSource)) ? uI0 : 0.0;
  o = vec4((num + S) / max(den, 1e-4), 0.0, 0.0, 1.0);
}`;

// Update conductivity from flux: dD/dt = f(|Q|) - D, with f(Q)=Q^mu/(1+Q^mu).
const COND = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uCond, uPress;
uniform float uMu, uDt;
out vec4 o;
void main(){
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec2 D = texelFetch(uCond, c, 0).rg;
  float pc = texelFetch(uPress, c, 0).r;
  float pr = (c.x < ${N - 1}) ? texelFetch(uPress, c + ivec2(1,0), 0).r : pc;
  float pu = (c.y < ${N - 1}) ? texelFetch(uPress, c + ivec2(0,1), 0).r : pc;
  float Qx = D.x * (pc - pr);
  float Qy = D.y * (pc - pu);
  float ax = pow(abs(Qx), uMu); float fx = ax / (1.0 + ax);
  float ay = pow(abs(Qy), uMu); float fy = ay / (1.0 + ay);
  float nx = D.x + uDt * (fx - D.x);
  float ny = D.y + uDt * (fy - D.y);
  // light lateral smoothing — suppresses the checkerboard mode and merges tubes
  vec2 sm = D;
  sm += texelFetch(uCond, ivec2(min(c.x + 1, ${N - 1}), c.y), 0).rg;
  sm += texelFetch(uCond, ivec2(max(c.x - 1, 0), c.y), 0).rg;
  sm += texelFetch(uCond, ivec2(c.x, min(c.y + 1, ${N - 1})), 0).rg;
  sm += texelFetch(uCond, ivec2(c.x, max(c.y - 1, 0)), 0).rg;
  sm /= 5.0;
  nx = mix(nx, sm.x, 0.18);
  ny = mix(ny, sm.y, 0.18);
  if (c.x >= ${N - 1}) nx = 0.0;
  if (c.y >= ${N - 1}) ny = 0.0;
  o = vec4(max(nx, 0.004), max(ny, 0.004), 0.0, 1.0);
}`;

const DISPLAY = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uCond;
uniform vec3 uBg, uLo, uHi;
uniform float uIntensity, uGamma;
out vec4 frag;
void main(){
  vec2 px = 1.5 / vec2(textureSize(uCond, 0));
  vec2 D = vec2(0.0);
  for (int dy = -1; dy <= 1; dy++)
    for (int dx = -1; dx <= 1; dx++)
      D += texture(uCond, vUv + vec2(float(dx), float(dy)) * px).rg;
  D /= 9.0;
  float m = pow(clamp((D.x + D.y) * uIntensity, 0.0, 1.0), uGamma);
  vec3 col = mix(uBg, uLo, smoothstep(0.0, 0.5, m));
  col = mix(col, uHi, smoothstep(0.5, 1.0, m));
  frag = vec4(col, 1.0);
}`;

export interface TeroParams {
  mu: number; dt: number; iters: number; foods: number;
  bg: string; lo: string; hi: string; intensity: number; gamma: number;
}

export const TERO_DEFAULTS: TeroParams = {
  mu: 2.3, dt: 0.16, iters: 60, foods: 12,
  bg: "#04060a", lo: "#0b3552", hi: "#ffd98a", intensity: 1.3, gamma: 0.75,
};

export const TERO_PRESETS: Preset[] = [
  { id: "veins", label: "Veins", blurb: "Tero (2010) adaptive network — leaf-vein transport web between food sources.", params: { mu: 2.3, dt: 0.16, foods: 12, lo: "#0b3552", hi: "#ffd98a" } },
  { id: "delta", label: "Delta", blurb: "Tero (2010) — few sources, braided river-delta channels.", params: { mu: 1.3, dt: 0.26, foods: 6, lo: "#10324f", hi: "#7df3ff" } },
  { id: "roots", label: "Roots", blurb: "Tero (2010) — many sources, fine root-like filigree.", params: { mu: 2.4, dt: 0.12, foods: 18, lo: "#241038", hi: "#ffb0e6" } },
  { id: "mesh", label: "Mesh", blurb: "Tero (2010) — redundant mesh that hasn't fully pruned.", params: { mu: 1.0, dt: 0.3, foods: 20, lo: "#143a1f", hi: "#c9ffa0" } },
];

export class TeroNetwork implements Engine {
  readonly is3D = false;
  paused = false;
  private gl: WebGL2RenderingContext;
  private res: number;
  private p: TeroParams;
  private condA!: Target; private condB!: Target;
  private prsA!: Target; private prsB!: Target;
  private vao: WebGLVertexArrayObject;
  private progJacobi: WebGLProgram; private progCond: WebGLProgram; private progDisplay: WebGLProgram;
  private foods: [number, number][] = [];
  private prevFoods: number;
  private frame = 0;
  private src: [number, number] = [0, 0];
  private sink: [number, number] = [0, 0];

  constructor(canvas: HTMLCanvasElement, res: number, params: TeroParams) {
    const gl = getContext(canvas);
    this.gl = gl; this.res = res; this.p = params;
    this.prevFoods = params.foods;
    canvas.width = res; canvas.height = res;
    this.progJacobi = createProgram(gl, QUAD, JACOBI);
    this.progCond = createProgram(gl, QUAD, COND);
    this.progDisplay = createProgram(gl, QUAD, DISPLAY);
    this.vao = gl.createVertexArray()!;
    this.condA = createTarget(gl, N, N, gl.RGBA16F, gl.HALF_FLOAT, null, gl.LINEAR);
    this.condB = createTarget(gl, N, N, gl.RGBA16F, gl.HALF_FLOAT, null, gl.LINEAR);
    this.prsA = createTarget(gl, N, N, gl.RGBA16F, gl.HALF_FLOAT, null, gl.NEAREST);
    this.prsB = createTarget(gl, N, N, gl.RGBA16F, gl.HALF_FLOAT, null, gl.NEAREST);
    this.reset();
  }

  reset() {
    const gl = this.gl;
    // seed conductivity: small uniform + noise
    const data = new Float32Array(N * N * 4);
    for (let i = 0; i < N * N; i++) {
      data[i * 4] = 0.05 + Math.random() * 0.05;
      data[i * 4 + 1] = 0.05 + Math.random() * 0.05;
    }
    gl.bindTexture(gl.TEXTURE_2D, this.condA.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, N, N, 0, gl.RGBA, gl.FLOAT, data);
    for (const t of [this.prsA, this.prsB]) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo); gl.viewport(0, 0, N, N);
      gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // scatter food sources
    const count = Math.max(2, Math.round(this.p.foods));
    this.foods = [];
    for (let i = 0; i < count; i++) {
      this.foods.push([Math.floor((0.1 + Math.random() * 0.8) * N), Math.floor((0.1 + Math.random() * 0.8) * N)]);
    }
    this.frame = 0;
    this.src = this.foods[0];
    this.sink = this.foods[1 % this.foods.length];
  }

  setParams(p: TeroParams) {
    const reseed = Math.round(p.foods) !== Math.round(this.prevFoods);
    this.prevFoods = p.foods;
    this.p = p;
    if (reseed) this.reset();
  }
  agentCount() { return N * N; }
  private u(prog: WebGLProgram, n: string) { return this.gl.getUniformLocation(prog, n); }

  private step() {
    const gl = this.gl; const p = this.p;
    gl.bindVertexArray(this.vao);
    // cycle the source/sink pair slowly so the pressure solve can converge and a
    // consistent flux can thicken the connecting tubes
    if (this.frame % 24 === 0) {
      const n = this.foods.length;
      const si = Math.floor(Math.random() * n);
      let ki = Math.floor(Math.random() * n); if (ki === si) ki = (ki + 1) % n;
      this.src = this.foods[si]; this.sink = this.foods[ki];
    }
    this.frame++;
    const src = this.src; const sink = this.sink;

    // Jacobi relaxation of the pressure field (warm-started from last frame)
    const iters = Math.max(4, Math.round(p.iters));
    gl.useProgram(this.progJacobi);
    gl.viewport(0, 0, N, N);
    gl.uniform2f(this.u(this.progJacobi, "uSource"), src[0], src[1]);
    gl.uniform2f(this.u(this.progJacobi, "uSink"), sink[0], sink[1]);
    gl.uniform1f(this.u(this.progJacobi, "uI0"), 4.0); // current strength → flux magnitude
    gl.uniform1i(this.u(this.progJacobi, "uCond"), 1);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.condA.tex);
    for (let i = 0; i < iters; i++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.prsB.fbo);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.prsA.tex);
      gl.uniform1i(this.u(this.progJacobi, "uPress"), 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      [this.prsA, this.prsB] = [this.prsB, this.prsA];
    }

    // adapt conductivity to the resulting flux
    gl.useProgram(this.progCond);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.condB.fbo);
    gl.viewport(0, 0, N, N);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.condA.tex);
    gl.uniform1i(this.u(this.progCond, "uCond"), 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.prsA.tex);
    gl.uniform1i(this.u(this.progCond, "uPress"), 1);
    gl.uniform1f(this.u(this.progCond, "uMu"), p.mu);
    gl.uniform1f(this.u(this.progCond, "uDt"), p.dt);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    [this.condA, this.condB] = [this.condB, this.condA];
  }

  render() {
    const gl = this.gl;
    if (!this.paused) this.step();
    gl.useProgram(this.progDisplay);
    gl.bindVertexArray(this.vao);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.res, this.res);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.condA.tex);
    gl.uniform1i(this.u(this.progDisplay, "uCond"), 0);
    gl.uniform3fv(this.u(this.progDisplay, "uBg"), hexToRgb(this.p.bg));
    gl.uniform3fv(this.u(this.progDisplay, "uLo"), hexToRgb(this.p.lo));
    gl.uniform3fv(this.u(this.progDisplay, "uHi"), hexToRgb(this.p.hi));
    gl.uniform1f(this.u(this.progDisplay, "uIntensity"), this.p.intensity);
    gl.uniform1f(this.u(this.progDisplay, "uGamma"), this.p.gamma);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  dispose() {
    const gl = this.gl;
    for (const t of [this.condA, this.condB, this.prsA, this.prsB]) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fbo); }
    for (const pr of [this.progJacobi, this.progCond, this.progDisplay]) gl.deleteProgram(pr);
    gl.deleteVertexArray(this.vao);
  }
}
