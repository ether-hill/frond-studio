// GPU Gray–Scott reaction–diffusion — the engine behind the Algorithms page's
// "Reaction–Diffusion" system. Two chemicals (U, V) live in an RGBA16F texture;
// a fragment shader runs the Gray–Scott update with a 9-tap Laplacian on a
// toroidal grid, ping-ponging A↔B. The trick that makes it interesting rather
// than a flat field of identical spots is SPATIALLY-VARYING feed/kill: feed and
// kill ramp with radius, so a single frame crosses several Turing regimes
// (rings → labyrinth → spots → stripes) and self-organises into radial,
// sunburst and bullseye structures. The display pass maps V through a duo / tri
// / rainbow palette. Implements the same Eng interface as Physarum.

import { getContext, createProgram, createTarget, hexToRgb, type Target } from "./gl";
import { FULLSCREEN_VERT } from "./shaders";

export interface RDParams {
  feed: number; // base feed rate F
  kill: number; // base kill rate k
  feedAmp: number; // radial feed modulation (the variety knob)
  killAmp: number; // radial kill modulation
  dU: number; // U diffusion
  dV: number; // V diffusion
  dt: number; // timestep
  feedMid: number; // radius (0..~1.4) where the radial ramp crosses zero
  stepsPerFrame: number;
  seedMode: "center" | "random" | "ring";
  palette: "duo" | "tri" | "rainbow";
  t0: number; // ink threshold low (display contrast)
  t1: number; // ink threshold high
  bg: string;
  lo: string;
  hi: string;
  hueScale: number; // rainbow band frequency
  hueShift: number; // rainbow hue offset
}

export const RD_DEFAULTS: RDParams = {
  feed: 0.0367,
  kill: 0.0649,
  feedAmp: 0.02,
  killAmp: 0.006,
  dU: 1.0,
  dV: 0.5,
  dt: 1.0,
  feedMid: 0.62,
  stepsPerFrame: 16,
  seedMode: "center",
  palette: "tri",
  t0: 0.14,
  t1: 0.34,
  bg: "#04060a",
  lo: "#1fbf52",
  hi: "#ff3b1f",
  hueScale: 5,
  hueShift: 0,
};

// Presets tuned to the reference looks: Mitosis (radial heat-map labyrinth),
// Coral (red/cream Turing worms), Bloom (pink colony from a seed), Sunburst
// (radial green-on-purple stripes), Rainbow (multicolour worms), Cells (soft
// dividing bubbles).
export type RDPreset = { name: string; params: RDParams };
const mk = (o: Partial<RDParams>): RDParams => ({ ...RD_DEFAULTS, ...o });
export const RD_PRESETS: RDPreset[] = [
  { name: "Mitosis", params: mk({}) },
  {
    name: "Coral",
    params: mk({ feed: 0.0545, kill: 0.062, feedAmp: 0, killAmp: 0, seedMode: "random", palette: "duo", bg: "#5a0c0c", hi: "#f3ece0", t0: 0.2, t1: 0.36, stepsPerFrame: 18 }),
  },
  {
    name: "Bloom",
    params: mk({ feed: 0.039, kill: 0.0585, feedAmp: 0.006, killAmp: 0, feedMid: 0.2, seedMode: "center", palette: "duo", bg: "#f6f3ee", hi: "#d6418f", t0: 0.12, t1: 0.3, stepsPerFrame: 14 }),
  },
  {
    name: "Sunburst",
    params: mk({ feed: 0.0535, kill: 0.062, feedAmp: 0.013, killAmp: 0.001, feedMid: 0.55, seedMode: "center", palette: "duo", bg: "#7b2ff7", hi: "#3dff6a", t0: 0.16, t1: 0.34, stepsPerFrame: 18 }),
  },
  {
    name: "Rainbow",
    params: mk({ feed: 0.058, kill: 0.062, feedAmp: 0, killAmp: 0, seedMode: "random", palette: "rainbow", bg: "#000000", hueScale: 6, t0: 0.12, t1: 0.34, stepsPerFrame: 18 }),
  },
  {
    name: "Cells",
    params: mk({ feed: 0.03, kill: 0.062, feedAmp: 0.004, killAmp: 0, seedMode: "random", palette: "duo", bg: "#03070c", hi: "#46e8ff", t0: 0.18, t1: 0.4, stepsPerFrame: 16 }),
  },
];

const SIM_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uState;
uniform vec2 uRes;
uniform float uFeed, uKill, uFeedAmp, uKillAmp, uDU, uDV, uDt, uFeedMid;
uniform vec2 uMouse;       // 0..1
uniform float uBrush;      // radius in uv
uniform float uMouseDown;  // 1 when painting
vec2 S(vec2 off){ return texture(uState, vUv + off / uRes).xy; }
void main() {
  vec2 s = texture(uState, vUv).xy;
  // 9-tap Laplacian (orthogonal 0.2, diagonal 0.05, centre -1)
  vec2 lap = -1.0 * s
    + 0.2  * (S(vec2(1.0,0.0)) + S(vec2(-1.0,0.0)) + S(vec2(0.0,1.0)) + S(vec2(0.0,-1.0)))
    + 0.05 * (S(vec2(1.0,1.0)) + S(vec2(-1.0,1.0)) + S(vec2(1.0,-1.0)) + S(vec2(-1.0,-1.0)));
  float U = s.x, V = s.y;
  // spatially-varying feed / kill — the source of the radial variety
  float r = length(vUv - 0.5) * 2.0;
  float F = uFeed + uFeedAmp * (r - uFeedMid);
  float K = uKill + uKillAmp * (r - uFeedMid);
  float uvv = U * V * V;
  U += (uDU * lap.x - uvv + F * (1.0 - U)) * uDt;
  V += (uDV * lap.y + uvv - (F + K) * V) * uDt;
  if (uMouseDown > 0.5 && distance(vUv, uMouse) < uBrush) V = 0.92;
  o = vec4(clamp(U, 0.0, 1.0), clamp(V, 0.0, 1.0), 0.0, 1.0);
}`;

const SEED_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform float uSeedMode; // 0 center, 1 random, 2 ring
uniform float uRandom;
vec2 hash22(vec2 p){
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}
void main() {
  float V = 0.0;
  float r = length(vUv - 0.5);
  if (uSeedMode < 0.5) {
    if (r < 0.045) V = 1.0;
  } else if (uSeedMode < 1.5) {
    for (int i = 0; i < 30; i++) {
      vec2 q = hash22(vec2(float(i) + 1.0, uRandom * 57.0 + 3.0));
      if (distance(vUv, q) < 0.02) V = 1.0;
    }
  } else {
    if (abs(r - 0.3) < 0.013) V = 1.0;
  }
  o = vec4(1.0, V, 0.0, 1.0);
}`;

const DISPLAY_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uState;
uniform int uMode; // 0 duo, 1 tri, 2 rainbow
uniform vec3 uBg, uLo, uHi;
uniform float uT0, uT1, uHueScale, uHueShift;
vec3 hsv2rgb(float h){
  vec3 p = abs(fract(h + vec3(0.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0);
  return clamp(p - 1.0, 0.0, 1.0);
}
void main() {
  float v = texture(uState, vUv).y;
  float t = smoothstep(uT0, uT1, v);
  vec3 col;
  if (uMode == 0) {
    col = mix(uBg, uHi, t);
  } else if (uMode == 1) {
    col = t < 0.5 ? mix(uBg, uLo, t * 2.0) : mix(uLo, uHi, (t - 0.5) * 2.0);
  } else {
    float h = fract(v * uHueScale + uHueShift);
    col = mix(uBg, hsv2rgb(h), t);
  }
  o = vec4(col, 1.0);
}`;

const SEED_INDEX = { center: 0, random: 1, ring: 2 } as const;
const PALETTE_INDEX = { duo: 0, tri: 1, rainbow: 2 } as const;

export class ReactionDiffusion {
  readonly gl: WebGL2RenderingContext;
  readonly is3D = false as const;
  paused = false;

  private res: number;
  private p: RDParams;
  private progSim: WebGLProgram;
  private progSeed: WebGLProgram;
  private progDisplay: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private a!: Target;
  private b!: Target;
  private prevSeed: RDParams["seedMode"];
  private hueShift: number;
  private mouseX = 0.5;
  private mouseY = 0.5;
  private mouseDown = false;

  constructor(canvas: HTMLCanvasElement, res: number, params: RDParams) {
    const gl = getContext(canvas);
    this.gl = gl;
    this.res = res;
    this.p = params;
    this.prevSeed = params.seedMode;
    this.hueShift = params.hueShift;
    canvas.width = res;
    canvas.height = res;

    this.progSim = createProgram(gl, FULLSCREEN_VERT, SIM_FRAG);
    this.progSeed = createProgram(gl, FULLSCREEN_VERT, SEED_FRAG);
    this.progDisplay = createProgram(gl, FULLSCREEN_VERT, DISPLAY_FRAG);
    this.vao = gl.createVertexArray()!;

    this.a = createTarget(gl, res, res, gl.RGBA16F, gl.HALF_FLOAT, null, gl.LINEAR);
    this.b = createTarget(gl, res, res, gl.RGBA16F, gl.HALF_FLOAT, null, gl.LINEAR);
    this.reset();
  }

  private u(prog: WebGLProgram, name: string) {
    return this.gl.getUniformLocation(prog, name);
  }

  reset() {
    const gl = this.gl;
    gl.bindVertexArray(this.vao);
    gl.useProgram(this.progSeed);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.a.fbo);
    gl.viewport(0, 0, this.res, this.res);
    gl.uniform1f(this.u(this.progSeed, "uSeedMode"), SEED_INDEX[this.p.seedMode]);
    gl.uniform1f(this.u(this.progSeed, "uRandom"), Math.random());
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // a fresh random hue offset per reset keeps the rainbow scene from repeating
    this.hueShift = this.p.hueShift + Math.random();
  }

  setParams(p: RDParams) {
    const reseed = p.seedMode !== this.prevSeed;
    this.p = p;
    this.prevSeed = p.seedMode;
    if (reseed) this.reset();
  }

  setMouse(x: number, y: number, active: boolean) {
    this.mouseX = x / this.res;
    this.mouseY = 1.0 - y / this.res;
    this.mouseDown = active;
  }

  private step() {
    const gl = this.gl;
    const p = this.p;
    gl.bindVertexArray(this.vao);
    gl.useProgram(this.progSim);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.b.fbo);
    gl.viewport(0, 0, this.res, this.res);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.a.tex);
    gl.uniform1i(this.u(this.progSim, "uState"), 0);
    gl.uniform2f(this.u(this.progSim, "uRes"), this.res, this.res);
    gl.uniform1f(this.u(this.progSim, "uFeed"), p.feed);
    gl.uniform1f(this.u(this.progSim, "uKill"), p.kill);
    gl.uniform1f(this.u(this.progSim, "uFeedAmp"), p.feedAmp);
    gl.uniform1f(this.u(this.progSim, "uKillAmp"), p.killAmp);
    gl.uniform1f(this.u(this.progSim, "uDU"), p.dU);
    gl.uniform1f(this.u(this.progSim, "uDV"), p.dV);
    gl.uniform1f(this.u(this.progSim, "uDt"), p.dt);
    gl.uniform1f(this.u(this.progSim, "uFeedMid"), p.feedMid);
    gl.uniform2f(this.u(this.progSim, "uMouse"), this.mouseX, this.mouseY);
    gl.uniform1f(this.u(this.progSim, "uBrush"), 0.03);
    gl.uniform1f(this.u(this.progSim, "uMouseDown"), this.mouseDown ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    [this.a, this.b] = [this.b, this.a];
  }

  render() {
    const gl = this.gl;
    const p = this.p;
    if (!this.paused) {
      const steps = Math.max(1, Math.round(p.stepsPerFrame));
      for (let i = 0; i < steps; i++) this.step();
    }
    gl.useProgram(this.progDisplay);
    gl.bindVertexArray(this.vao);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.res, this.res);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.a.tex);
    gl.uniform1i(this.u(this.progDisplay, "uState"), 0);
    gl.uniform1i(this.u(this.progDisplay, "uMode"), PALETTE_INDEX[this.p.palette]);
    gl.uniform3fv(this.u(this.progDisplay, "uBg"), hexToRgb(p.bg));
    gl.uniform3fv(this.u(this.progDisplay, "uLo"), hexToRgb(p.lo));
    gl.uniform3fv(this.u(this.progDisplay, "uHi"), hexToRgb(p.hi));
    gl.uniform1f(this.u(this.progDisplay, "uT0"), p.t0);
    gl.uniform1f(this.u(this.progDisplay, "uT1"), p.t1);
    gl.uniform1f(this.u(this.progDisplay, "uHueScale"), p.hueScale);
    gl.uniform1f(this.u(this.progDisplay, "uHueShift"), this.hueShift);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  dispose() {
    const gl = this.gl;
    for (const t of [this.a, this.b]) {
      gl.deleteTexture(t.tex);
      gl.deleteFramebuffer(t.fbo);
    }
    for (const pr of [this.progSim, this.progSeed, this.progDisplay]) gl.deleteProgram(pr);
    gl.deleteVertexArray(this.vao);
  }
}
