// Density-modulated Physarum — a faithful WebGL2 port of the agent model behind
// Sage Jenson's "36 Points" (technique: mxsage; reference reimplementation +
// constants from Etienne Jacob / Bleuje, CC BY-NC-SA). Ported so that parameter
// sets exported from that model IMPORT and run with the right structure.
//
// Per agent, with S = locally sensed trail (normalised by a scaling factor and
// clamped to [0,1]):
//
//     sensorDistance = SensorDistance0 + SD_amplitude·pow(S, SD_exponent)·pixelScale
//     moveDistance   = MoveDistance0   + MD_amplitude·pow(S, MD_exponent)·pixelScale
//     sensorAngle    = SensorAngle0    + SA_amplitude·pow(S, SA_exponent)
//     rotationAngle  = RotationAngle0  + RA_amplitude·pow(S, RA_exponent)
//
// Trail = prev + sqrt(min(count,100))·depositFactor, then 3×3 diffuse · decay.
// Display tone-maps the per-pixel particle COUNT (white on black). Particles
// continuously respawn (phase reinit) to keep the field alive. WebGL2 has no
// atomics, so the count is accumulated by additive point blending — equivalent.

import { createProgram, createTarget, getContext, type Target } from "./gl";

export interface MParams {
  agentTexW: number; // agents = agentTexW²
  spawn: "random" | "center" | "ring";
  // mxsage point data — 12 modulation params + 2 sensor biases + sensing scale
  SensorDistance0: number; SD_exponent: number; SD_amplitude: number;
  SensorAngle0: number; SA_exponent: number; SA_amplitude: number;
  RotationAngle0: number; RA_exponent: number; RA_amplitude: number;
  MoveDistance0: number; MD_exponent: number; MD_amplitude: number;
  SensorBias1: number; SensorBias2: number;
  defaultScalingFactor: number; // sensing normalisation
  // engine globals (per-point in our build so they can be dialled)
  depositFactor: number;
  decayFactor: number;
  exposure: number; // display brightness
  dot: number; // deposit splat size (1 = single pixel, like the original)
  steps: number; // sim steps per frame
}

// Defaults calibrated to the original's globals, rescaled for our particle count
// (~1M vs 5.77M) and resolution: depositFactor and pixelScale are derived so an
// imported point's SensorDistanceN / scaling factor mean the same thing.
export const M_DEFAULTS: MParams = {
  agentTexW: 1024,
  spawn: "random",
  SensorDistance0: 0, SD_exponent: 4, SD_amplitude: 0.3,
  SensorAngle0: 0.4, SA_exponent: 1, SA_amplitude: 0,
  RotationAngle0: 0.45, RA_exponent: 1, RA_amplitude: 0,
  MoveDistance0: 0.4, MD_exponent: 3, MD_amplitude: 0.1,
  SensorBias1: 0, SensorBias2: 0,
  defaultScalingFactor: 22,
  depositFactor: 0.0075, decayFactor: 0.78, exposure: 1.0, dot: 1, steps: 2,
};

const VERT = /* glsl */ `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

// Pass 1 — sense, modulate, move, respawn. One fragment per agent texel.
const UPDATE = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uAgents, uTrail;
uniform vec2 uRes;
uniform float uSD0, uSDE, uSDA, uSA0, uSAE, uSAA;
uniform float uRA0, uRAE, uRAA, uMD0, uMDE, uMDA;
uniform float uSB1, uSB2, uScaling, uPixelScale, uReinit, uFrame;
out vec4 outState;
float grid(vec2 p){ return texture(uTrail, fract(p / uRes)).r; }
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
void main() {
  ivec2 coord = ivec2(gl_FragCoord.xy);
  vec4 s = texelFetch(uAgents, coord, 0);
  vec2 pos = s.xy; float heading = s.z; float phase = s.w;
  vec2 dir = vec2(cos(heading), sin(heading));

  // sensed value driving the modulation (mxsage)
  float S = grid(pos + uSB2 * dir + vec2(0.0, uSB1)) * uScaling;
  S = clamp(S, 1e-9, 1.0);
  float sd = uSD0 + uSDA * pow(S, uSDE) * uPixelScale;
  float md = uMD0 + uMDA * pow(S, uMDE) * uPixelScale;
  float sa = uSA0 + uSAA * pow(S, uSAE);
  float ra = uRA0 + uRAA * pow(S, uRAE);

  float sL = grid(pos + sd * vec2(cos(heading - sa), sin(heading - sa)));
  float sM = grid(pos + sd * vec2(cos(heading),      sin(heading)));
  float sR = grid(pos + sd * vec2(cos(heading + sa), sin(heading + sa)));

  float nh = heading, rnd = hash(pos + uFrame);
  if (sM > sL && sM > sR) {}
  else if (sM < sL && sM < sR) nh = rnd < 0.5 ? heading - ra : heading + ra;
  else if (sR < sL) nh = heading - ra;
  else if (sL < sR) nh = heading + ra;

  vec2 npos = mod(pos + md * vec2(cos(nh), sin(nh)) + uRes, uRes);
  float nphase = fract(phase + uReinit);
  if (phase < uReinit) npos = vec2(hash(pos + uFrame * 1.7), hash(pos.yx + uFrame * 2.3)) * uRes;
  outState = vec4(npos, nh, nphase);
}`;

// Pass 2 — deposit: one point per agent, additive into the count buffer.
const DEP_VERT = /* glsl */ `#version 300 es
uniform sampler2D uAgents;
uniform float uAgentTexW, uDot;
uniform vec2 uRes;
void main() {
  int id = gl_VertexID, w = int(uAgentTexW);
  vec4 st = texelFetch(uAgents, ivec2(id % w, id / w), 0);
  gl_Position = vec4((st.xy / uRes) * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = uDot;
}`;
const DEP_FRAG = /* glsl */ `#version 300 es
precision highp float;
uniform float uDot;
out vec4 outColor;
void main() {
  float a = 1.0;
  if (uDot > 1.5) { float r = length(gl_PointCoord - 0.5) * 2.0; a = smoothstep(1.0, 0.0, r); }
  outColor = vec4(a, 0.0, 0.0, 0.0);
}`;

// Pass 3 — accumulate count into trail (sqrt response) + optional cursor food.
const ACCUM = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uCount, uTrail;
uniform vec2 uRes;
uniform float uDeposit;
uniform vec3 uMouse; // x, y, active
out vec4 outColor;
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  float count = texelFetch(uCount, c, 0).r;
  float prev = texelFetch(uTrail, c, 0).r;
  float added = sqrt(min(count, 100.0)) * uDeposit;
  if (uMouse.z > 0.5) {
    float dd = distance(gl_FragCoord.xy, uMouse.xy);
    added += exp(-(dd * dd) / (2.0 * 44.0 * 44.0)) * 0.5;
  }
  outColor = vec4(prev + added, 0.0, 0.0, 1.0);
}`;

// Pass 4 — 3×3 diffuse + decay.
const DIFFUSE = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uTrail; uniform vec2 uRes; uniform float uDecay;
out vec4 outColor;
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy), sz = ivec2(uRes);
  float s = 0.0;
  for (int dy = -1; dy <= 1; dy++)
    for (int dx = -1; dx <= 1; dx++)
      s += texelFetch(uTrail, (c + ivec2(dx, dy) + sz) % sz, 0).r;
  outColor = vec4((s / 9.0) * uDecay, 0.0, 0.0, 1.0);
}`;

// Pass 5 — display: tone-map per-pixel count (white on black, mxsage curve).
const DISPLAY = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uCount; uniform vec2 uRes; uniform float uCountNorm;
out vec4 frag;
void main() {
  float count = texture(uCount, gl_FragCoord.xy / uRes).r;
  float cc = max(0.0, (count - 1.0) / uCountNorm);
  float v = pow(tanh(7.5 * pow(cc, 0.3)), 8.5) * 1.1;
  frag = vec4(vec3(clamp(v, 0.0, 1.0)), 1.0);
}`;

export class PhysMod {
  readonly gl: WebGL2RenderingContext;
  readonly is3D = false as const;
  private res: number;
  private pixelScale: number;
  private p: MParams;
  private pUpdate: WebGLProgram; private pDep: WebGLProgram;
  private pAccum: WebGLProgram; private pDiff: WebGLProgram; private pDisp: WebGLProgram;
  private aA!: Target; private aB!: Target;
  private tA!: Target; private tB!: Target; private cnt!: Target;
  private vao: WebGLVertexArrayObject;
  private prevW: number; private prevSpawn: MParams["spawn"];
  private mx = 0; private my = 0; private mActive = false;
  paused = false;

  constructor(canvas: HTMLCanvasElement, res: number, params: MParams) {
    const gl = getContext(canvas);
    this.gl = gl;
    this.res = res;
    this.pixelScale = 250 * (res / 1280); // original used 250 at 1280px
    this.p = params;
    this.prevW = params.agentTexW;
    this.prevSpawn = params.spawn;
    canvas.width = res; canvas.height = res;
    this.pUpdate = createProgram(gl, VERT, UPDATE);
    this.pDep = createProgram(gl, DEP_VERT, DEP_FRAG);
    this.pAccum = createProgram(gl, VERT, ACCUM);
    this.pDiff = createProgram(gl, VERT, DIFFUSE);
    this.pDisp = createProgram(gl, VERT, DISPLAY);
    this.vao = gl.createVertexArray()!;
    this.tA = createTarget(gl, res, res, gl.RGBA16F, gl.HALF_FLOAT, null, gl.LINEAR);
    this.tB = createTarget(gl, res, res, gl.RGBA16F, gl.HALF_FLOAT, null, gl.LINEAR);
    this.cnt = createTarget(gl, res, res, gl.RGBA16F, gl.HALF_FLOAT, null, gl.NEAREST);
    this.reset();
  }

  private seed(): Float32Array {
    const w = this.p.agentTexW, n = w * w, r = this.res;
    const data = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      let x: number, y: number, a: number;
      if (this.p.spawn === "center") {
        const rad = Math.random() * r * 0.05, t = Math.random() * Math.PI * 2;
        x = r / 2 + Math.cos(t) * rad; y = r / 2 + Math.sin(t) * rad; a = Math.random() * Math.PI * 2;
      } else if (this.p.spawn === "ring") {
        const rad = r * 0.34, t = Math.random() * Math.PI * 2;
        x = r / 2 + Math.cos(t) * rad; y = r / 2 + Math.sin(t) * rad; a = t + Math.PI + (Math.random() - 0.5);
      } else {
        x = Math.random() * r; y = Math.random() * r; a = Math.random() * Math.PI * 2;
      }
      data[i * 4] = x; data[i * 4 + 1] = y; data[i * 4 + 2] = a;
      data[i * 4 + 3] = Math.random(); // respawn phase
    }
    return data;
  }

  reset() {
    const gl = this.gl, w = this.p.agentTexW;
    if (this.aA) {
      gl.deleteTexture(this.aA.tex); gl.deleteFramebuffer(this.aA.fbo);
      gl.deleteTexture(this.aB.tex); gl.deleteFramebuffer(this.aB.fbo);
    }
    this.aA = createTarget(gl, w, w, gl.RGBA32F, gl.FLOAT, this.seed());
    this.aB = createTarget(gl, w, w, gl.RGBA32F, gl.FLOAT, null);
    for (const t of [this.tA, this.tB, this.cnt]) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
      gl.viewport(0, 0, t.w, t.h);
      gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  setParams(p: MParams) {
    const reseed = p.agentTexW !== this.prevW || p.spawn !== this.prevSpawn;
    this.p = p; this.prevW = p.agentTexW; this.prevSpawn = p.spawn;
    if (reseed) this.reset();
  }

  setMouse(x: number, y: number, active: boolean) { this.mx = x; this.my = y; this.mActive = active; }

  private u(prog: WebGLProgram, n: string) { return this.gl.getUniformLocation(prog, n); }

  private step() {
    const gl = this.gl, p = this.p, r = this.res, w = p.agentTexW;
    gl.bindVertexArray(this.vao);

    // clear the per-frame count buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.cnt.fbo);
    gl.viewport(0, 0, r, r);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);

    // sense & move
    gl.useProgram(this.pUpdate);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.aB.fbo);
    gl.viewport(0, 0, w, w);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.aA.tex);
    gl.uniform1i(this.u(this.pUpdate, "uAgents"), 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.tA.tex);
    gl.uniform1i(this.u(this.pUpdate, "uTrail"), 1);
    gl.uniform2f(this.u(this.pUpdate, "uRes"), r, r);
    gl.uniform1f(this.u(this.pUpdate, "uSD0"), p.SensorDistance0);
    gl.uniform1f(this.u(this.pUpdate, "uSDE"), p.SD_exponent);
    gl.uniform1f(this.u(this.pUpdate, "uSDA"), p.SD_amplitude);
    gl.uniform1f(this.u(this.pUpdate, "uSA0"), p.SensorAngle0);
    gl.uniform1f(this.u(this.pUpdate, "uSAE"), p.SA_exponent);
    gl.uniform1f(this.u(this.pUpdate, "uSAA"), p.SA_amplitude);
    gl.uniform1f(this.u(this.pUpdate, "uRA0"), p.RotationAngle0);
    gl.uniform1f(this.u(this.pUpdate, "uRAE"), p.RA_exponent);
    gl.uniform1f(this.u(this.pUpdate, "uRAA"), p.RA_amplitude);
    gl.uniform1f(this.u(this.pUpdate, "uMD0"), p.MoveDistance0);
    gl.uniform1f(this.u(this.pUpdate, "uMDE"), p.MD_exponent);
    gl.uniform1f(this.u(this.pUpdate, "uMDA"), p.MD_amplitude);
    gl.uniform1f(this.u(this.pUpdate, "uSB1"), p.SensorBias1);
    gl.uniform1f(this.u(this.pUpdate, "uSB2"), p.SensorBias2);
    gl.uniform1f(this.u(this.pUpdate, "uScaling"), p.defaultScalingFactor);
    gl.uniform1f(this.u(this.pUpdate, "uPixelScale"), this.pixelScale);
    gl.uniform1f(this.u(this.pUpdate, "uReinit"), 0.001);
    gl.uniform1f(this.u(this.pUpdate, "uFrame"), Math.random() * 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // deposit count (additive)
    gl.useProgram(this.pDep);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.cnt.fbo);
    gl.viewport(0, 0, r, r);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.aB.tex);
    gl.uniform1i(this.u(this.pDep, "uAgents"), 0);
    gl.uniform1f(this.u(this.pDep, "uAgentTexW"), w);
    gl.uniform2f(this.u(this.pDep, "uRes"), r, r);
    gl.uniform1f(this.u(this.pDep, "uDot"), p.dot);
    gl.drawArrays(gl.POINTS, 0, w * w);
    gl.disable(gl.BLEND);

    // accumulate count -> trail (+ cursor food)
    gl.useProgram(this.pAccum);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.tB.fbo);
    gl.viewport(0, 0, r, r);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.cnt.tex);
    gl.uniform1i(this.u(this.pAccum, "uCount"), 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.tA.tex);
    gl.uniform1i(this.u(this.pAccum, "uTrail"), 1);
    gl.uniform2f(this.u(this.pAccum, "uRes"), r, r);
    gl.uniform1f(this.u(this.pAccum, "uDeposit"), p.depositFactor);
    gl.uniform3f(this.u(this.pAccum, "uMouse"), this.mx, this.my, this.mActive ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // diffuse + decay (tB -> tA)
    gl.useProgram(this.pDiff);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.tA.fbo);
    gl.viewport(0, 0, r, r);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tB.tex);
    gl.uniform1i(this.u(this.pDiff, "uTrail"), 0);
    gl.uniform2f(this.u(this.pDiff, "uRes"), r, r);
    gl.uniform1f(this.u(this.pDiff, "uDecay"), p.decayFactor);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    [this.aA, this.aB] = [this.aB, this.aA];
  }

  render() {
    const gl = this.gl;
    if (!this.paused) for (let i = 0; i < this.p.steps; i++) this.step();
    gl.useProgram(this.pDisp);
    gl.bindVertexArray(this.vao);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.res, this.res);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.cnt.tex);
    gl.uniform1i(this.u(this.pDisp, "uCount"), 0);
    gl.uniform2f(this.u(this.pDisp, "uRes"), this.res, this.res);
    gl.uniform1f(this.u(this.pDisp, "uCountNorm"), 140 / Math.max(0.05, this.p.exposure));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  agentCount() { return this.p.agentTexW * this.p.agentTexW; }

  dispose() {
    const gl = this.gl;
    for (const t of [this.aA, this.aB, this.tA, this.tB, this.cnt]) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fbo); }
    for (const pr of [this.pUpdate, this.pDep, this.pAccum, this.pDiff, this.pDisp]) gl.deleteProgram(pr);
    gl.deleteVertexArray(this.vao);
  }
}
