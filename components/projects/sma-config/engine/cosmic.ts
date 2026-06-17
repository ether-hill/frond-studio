// Monte Carlo Physarum Machine (MCPM) — Elek, Burchett, Prochaska, Forbes.
//   Polyphorm (IEEE VIS 2020) · "Monte Carlo Physarum Machine" (Artificial Life 2022)
//   Rhizome Cosmology — https://elek.pub/projects/Rhizome-Cosmology/
//
// Galaxies are STATIONARY food sources that continuously emit a deposit field.
// A swarm of ~1M agents senses that field in 3D and migrates toward it, laying
// a reinforcing trace — so filaments grow between galaxy nodes and voids open up:
// the cosmic web. Rendered as an additive point cloud (blue filaments grading to
// white, bright galaxy nodes with a warm minority) through a bloom pipeline for
// the characteristic nebulous glow.

import { createProgram, createTarget, hexToRgb, getContext, type Target } from "./gl";
import type { Engine } from "./algo";

const VOX = 64;            // deposit volume resolution (tiled-slice atlas)
const TILES = 8;
const ATLAS = VOX * TILES; // 512
const AW = 1024;           // AW² agents ≈ 1.05M
const GW = 16;             // GW² galaxies = 256 nodes

const COMMON = /* glsl */ `
const float VOX = ${VOX}.0;
ivec2 voxelToAtlas(vec3 v) {
  ivec3 iv = ivec3(floor(mod(v, VOX)));
  int tx = iv.z % ${TILES};
  int ty = iv.z / ${TILES};
  return ivec2(tx * ${VOX} + iv.x, ty * ${VOX} + iv.y);
}
float sampleVol(sampler2D vol, vec3 p) { return texelFetch(vol, voxelToAtlas(p), 0).r; }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
`;

const QUAD = /* glsl */ `#version 300 es
out vec2 vUv;
void main(){ vec2 p=vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2)); vUv=p; gl_Position=vec4(p*2.0-1.0,0.0,1.0); }`;

// sense the deposit field in a cone, steer toward the strongest, step, MRT pos+dir
const UPDATE = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uPos, uDir, uVol;
uniform float uSensorDist, uTurn, uStep, uCone, uFrame, uJitter;
layout(location = 0) out vec4 outPos;
layout(location = 1) out vec4 outDir;
${COMMON}
void main(){
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec3 p = texelFetch(uPos, c, 0).xyz;
  vec3 d = normalize(texelFetch(uDir, c, 0).xyz);
  vec3 a = abs(d.y) < 0.99 ? vec3(0.0,1.0,0.0) : vec3(1.0,0.0,0.0);
  vec3 u = normalize(cross(d, a));
  vec3 v = cross(d, u);
  float tc = tan(uCone);
  vec3 dU = normalize(d + v*tc), dD = normalize(d - v*tc);
  vec3 dL = normalize(d + u*tc), dR = normalize(d - u*tc);
  float sF = sampleVol(uVol, p + d * uSensorDist);
  float sU = sampleVol(uVol, p + dU * uSensorDist);
  float sD = sampleVol(uVol, p + dD * uSensorDist);
  float sL = sampleVol(uVol, p + dL * uSensorDist);
  float sR = sampleVol(uVol, p + dR * uSensorDist);
  vec3 best = d; float bv = sF;
  if (sU > bv) { bv = sU; best = dU; }
  if (sD > bv) { bv = sD; best = dD; }
  if (sL > bv) { bv = sL; best = dL; }
  if (sR > bv) { bv = sR; best = dR; }
  vec3 nd = normalize(mix(d, best, uTurn));
  vec3 j = vec3(hash(p.xy+uFrame), hash(p.yz+uFrame*1.3), hash(p.zx+uFrame*0.7)) - 0.5;
  nd = normalize(nd + j * uJitter);
  vec3 np = mod(p + nd * uStep, VOX);
  outPos = vec4(np, 1.0);
  outDir = vec4(nd, 0.0);
}`;

// deposit points (agents or galaxies) into the volume
const DEPOSIT_V = /* glsl */ `#version 300 es
uniform sampler2D uPts;
uniform float uW;
${COMMON}
void main(){
  int id = gl_VertexID; int w = int(uW);
  vec3 p = texelFetch(uPts, ivec2(id % w, id / w), 0).xyz;
  vec2 clip = (vec2(voxelToAtlas(p)) + 0.5) / ${ATLAS}.0 * 2.0 - 1.0;
  gl_Position = vec4(clip, 0.0, 1.0);
  gl_PointSize = 1.0;
}`;
const DEPOSIT_F = /* glsl */ `#version 300 es
precision highp float;
uniform float uAmt;
out vec4 o;
void main(){ o = vec4(uAmt, 0.0, 0.0, 0.0); }`;

const DECAY = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uVol;
uniform float uDecay, uDiffuse;
out vec4 o;
${COMMON}
void main(){
  ivec2 a = ivec2(gl_FragCoord.xy);
  int tx = a.x / ${VOX}, vx = a.x - tx * ${VOX};
  int ty = a.y / ${VOX}, vy = a.y - ty * ${VOX};
  int vz = ty * ${TILES} + tx;
  vec3 base = vec3(float(vx), float(vy), float(vz));
  float sum = 0.0;
  for (int dz=-1; dz<=1; dz++) for (int dy=-1; dy<=1; dy++) for (int dx=-1; dx<=1; dx++)
    sum += sampleVol(uVol, base + vec3(dx,dy,dz));
  float blur = sum / 27.0;
  float orig = sampleVol(uVol, base);
  o = vec4(mix(orig, blur, uDiffuse) * uDecay, 0.0, 0.0, 1.0);
}`;

// project + draw agents as soft additive points coloured by local density
const AGENTS_V = /* glsl */ `#version 300 es
uniform sampler2D uPos, uVol;
uniform float uYaw, uPitch, uDist, uFocal, uPointBase;
out float vDens; out float vDepth;
${COMMON}
void main(){
  int w = ${AW};
  vec3 p = texelFetch(uPos, ivec2(gl_VertexID % w, gl_VertexID / w), 0).xyz;
  vDens = sampleVol(uVol, p);
  vec3 q = p / VOX - 0.5;
  float cy=cos(uYaw), sy=sin(uYaw);
  q = vec3(q.x*cy + q.z*sy, q.y, -q.x*sy + q.z*cy);
  float cp=cos(uPitch), sp=sin(uPitch);
  q = vec3(q.x, q.y*cp - q.z*sp, q.y*sp + q.z*cp);
  float camZ = q.z + uDist;
  gl_Position = vec4(q.x*uFocal, q.y*uFocal, 0.0, camZ);
  gl_PointSize = clamp(uPointBase * uFocal / camZ, 1.0, 4.0);
  vDepth = clamp((q.z + 0.6) / 1.2, 0.0, 1.0);
}`;
const AGENTS_F = /* glsl */ `#version 300 es
precision highp float;
in float vDens; in float vDepth;
uniform vec3 uLo, uHi;
uniform float uExposure;
out vec4 frag;
void main(){
  vec2 pc = gl_PointCoord - 0.5;
  float fall = exp(-dot(pc, pc) * 5.0);
  float dn = vDens / (vDens + 5.0);        // compress unbounded density to 0..1
  vec3 col = mix(uLo, uHi, smoothstep(0.15, 0.78, dn));
  float b = (0.013 + dn * 0.7) * (0.45 + 0.55 * vDepth) * uExposure;
  frag = vec4(col * b * fall, 1.0);
}`;

// galaxies — bright nodes, a warm minority
const GAL_V = /* glsl */ `#version 300 es
uniform sampler2D uPos;
uniform float uYaw, uPitch, uDist, uFocal, uPointBase;
out float vWarm;
${COMMON}
void main(){
  int w = ${GW};
  vec4 g = texelFetch(uPos, ivec2(gl_VertexID % w, gl_VertexID / w), 0);
  vWarm = g.w;
  vec3 q = g.xyz / VOX - 0.5;
  float cy=cos(uYaw), sy=sin(uYaw);
  q = vec3(q.x*cy + q.z*sy, q.y, -q.x*sy + q.z*cy);
  float cp=cos(uPitch), sp=sin(uPitch);
  q = vec3(q.x, q.y*cp - q.z*sp, q.y*sp + q.z*cp);
  float camZ = q.z + uDist;
  gl_Position = vec4(q.x*uFocal, q.y*uFocal, 0.0, camZ);
  gl_PointSize = clamp(uPointBase * 3.0 * uFocal / camZ, 2.0, 9.0);
}`;
const GAL_F = /* glsl */ `#version 300 es
precision highp float;
in float vWarm;
uniform vec3 uHi, uWarmCol;
uniform float uExposure;
out vec4 frag;
void main(){
  vec2 pc = gl_PointCoord - 0.5;
  float r = length(pc);
  float fall = exp(-r * r * 7.0) + 0.4 * exp(-r * r * 1.5);
  vec3 col = mix(uHi, uWarmCol, vWarm);
  frag = vec4(col * fall * 1.5 * uExposure, 1.0);
}`;

// bloom: bright-pass downsample, separable blur, composite + tonemap
const DOWN = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv; uniform sampler2D uTex; uniform float uThresh; out vec4 o;
void main(){ vec3 c = texture(uTex, vUv).rgb; float l = max(max(c.r,c.g),c.b); o = vec4(c * smoothstep(uThresh, uThresh + 0.4, l), 1.0); }`;
const BLUR = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv; uniform sampler2D uTex; uniform vec2 uDir; out vec4 o;
void main(){
  vec3 s = texture(uTex, vUv).rgb * 0.227;
  s += texture(uTex, vUv + uDir * 1.384).rgb * 0.316;
  s += texture(uTex, vUv - uDir * 1.384).rgb * 0.316;
  s += texture(uTex, vUv + uDir * 3.231).rgb * 0.070;
  s += texture(uTex, vUv - uDir * 3.231).rgb * 0.070;
  o = vec4(s, 1.0);
}`;
const COMPOSITE = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv; uniform sampler2D uHDR, uBloom; uniform vec3 uBg; uniform float uBloomStr; out vec4 frag;
void main(){
  vec3 hdr = texture(uHDR, vUv).rgb + texture(uBloom, vUv).rgb * uBloomStr;
  vec3 col = vec3(1.0) - exp(-hdr);          // tonemap
  col = pow(col, vec3(0.85));
  frag = vec4(uBg + col, 1.0);
}`;

interface AgentSet { pos: WebGLTexture; dir: WebGLTexture; fbo: WebGLFramebuffer; }

export interface CosmicParams {
  sensorDist: number; turnSpeed: number; stepSize: number; deposit: number;
  decay: number; diffuse: number; intensity: number;
  bg: string; lo: string; hi: string;
}

export class Cosmic implements Engine {
  readonly is3D = true;
  paused = false;
  private gl: WebGL2RenderingContext;
  private res: number;
  private p: CosmicParams;
  yaw = 0.6; pitch = 0.28;
  private autoYaw = true;

  private progUpdate: WebGLProgram; private progDeposit: WebGLProgram; private progDecay: WebGLProgram;
  private progAgents: WebGLProgram; private progGal: WebGLProgram;
  private progDown: WebGLProgram; private progBlur: WebGLProgram; private progComp: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private setA!: AgentSet; private setB!: AgentSet;
  private volA!: Target; private volB!: Target;
  private galaxies!: WebGLTexture;
  private hdr!: Target; private bloomA!: Target; private bloomB!: Target;

  constructor(canvas: HTMLCanvasElement, res: number, params: CosmicParams) {
    const gl = getContext(canvas);
    this.gl = gl; this.res = res; this.p = params;
    canvas.width = res; canvas.height = res;
    this.progUpdate = createProgram(gl, QUAD, UPDATE);
    this.progDeposit = createProgram(gl, DEPOSIT_V, DEPOSIT_F);
    this.progDecay = createProgram(gl, QUAD, DECAY);
    this.progAgents = createProgram(gl, AGENTS_V, AGENTS_F);
    this.progGal = createProgram(gl, GAL_V, GAL_F);
    this.progDown = createProgram(gl, QUAD, DOWN);
    this.progBlur = createProgram(gl, QUAD, BLUR);
    this.progComp = createProgram(gl, QUAD, COMPOSITE);
    this.vao = gl.createVertexArray()!;
    this.volA = createTarget(gl, ATLAS, ATLAS, gl.RGBA16F, gl.HALF_FLOAT, null, gl.NEAREST);
    this.volB = createTarget(gl, ATLAS, ATLAS, gl.RGBA16F, gl.HALF_FLOAT, null, gl.NEAREST);
    this.hdr = createTarget(gl, res, res, gl.RGBA16F, gl.HALF_FLOAT, null, gl.LINEAR);
    const half = Math.max(2, res >> 1);
    this.bloomA = createTarget(gl, half, half, gl.RGBA16F, gl.HALF_FLOAT, null, gl.LINEAR);
    this.bloomB = createTarget(gl, half, half, gl.RGBA16F, gl.HALF_FLOAT, null, gl.LINEAR);
    this.reset();
  }

  private makeSet(pos: Float32Array, dir: Float32Array): AgentSet {
    const gl = this.gl;
    const mk = (data: Float32Array | null) => {
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, AW, AW, 0, gl.RGBA, gl.FLOAT, data);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    const p = mk(pos); const d = mk(dir);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, p, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, d, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { pos: p, dir: d, fbo };
  }

  // anisotropic gaussian — an elongated blob like the reference renders
  private gaussianPoint(): [number, number, number] {
    const g = () => { let s = 0; for (let i = 0; i < 3; i++) s += Math.random(); return (s / 3 - 0.5) * 2; };
    const x = VOX / 2 + g() * VOX * 0.36;
    const y = VOX / 2 + g() * VOX * 0.23;
    const z = VOX / 2 + g() * VOX * 0.30;
    return [Math.min(VOX - 1, Math.max(0, x)), Math.min(VOX - 1, Math.max(0, y)), Math.min(VOX - 1, Math.max(0, z))];
  }

  reset() {
    const gl = this.gl;
    if (this.setA) for (const s of [this.setA, this.setB]) { gl.deleteTexture(s.pos); gl.deleteTexture(s.dir); gl.deleteFramebuffer(s.fbo); }
    if (this.galaxies) gl.deleteTexture(this.galaxies);

    // galaxies — stationary nodes; a warm minority
    const gd = new Float32Array(GW * GW * 4);
    for (let i = 0; i < GW * GW; i++) {
      const [x, y, z] = this.gaussianPoint();
      gd[i * 4] = x; gd[i * 4 + 1] = y; gd[i * 4 + 2] = z;
      gd[i * 4 + 3] = Math.random() < 0.16 ? 1 : 0;
    }
    this.galaxies = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.galaxies);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, GW, GW, 0, gl.RGBA, gl.FLOAT, gd);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    // agents — seeded in the same blob, random headings
    const n = AW * AW;
    const pos = new Float32Array(n * 4);
    const dir = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const [x, y, z] = this.gaussianPoint();
      pos[i * 4] = x; pos[i * 4 + 1] = y; pos[i * 4 + 2] = z; pos[i * 4 + 3] = 1;
      const t = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      dir[i * 4] = Math.sin(ph) * Math.cos(t); dir[i * 4 + 1] = Math.sin(ph) * Math.sin(t); dir[i * 4 + 2] = Math.cos(ph); dir[i * 4 + 3] = 0;
    }
    this.setA = this.makeSet(pos, dir);
    this.setB = this.makeSet(pos.slice(), dir.slice());
    for (const v of [this.volA, this.volB]) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, v.fbo); gl.viewport(0, 0, v.w, v.h);
      gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  setParams(p: CosmicParams) { this.p = p; }
  setView(yaw: number, pitch: number) { this.yaw = yaw; this.pitch = pitch; this.autoYaw = false; }
  agentCount() { return AW * AW; }
  private u(prog: WebGLProgram, n: string) { return this.gl.getUniformLocation(prog, n); }

  private depositPoints(ptsTex: WebGLTexture, w: number, amt: number) {
    const gl = this.gl;
    gl.useProgram(this.progDeposit);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.volA.fbo);
    gl.viewport(0, 0, ATLAS, ATLAS);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, ptsTex);
    gl.uniform1i(this.u(this.progDeposit, "uPts"), 0);
    gl.uniform1f(this.u(this.progDeposit, "uW"), w);
    gl.uniform1f(this.u(this.progDeposit, "uAmt"), amt);
    gl.drawArrays(gl.POINTS, 0, w * w);
  }

  private step() {
    const gl = this.gl; const p = this.p;
    gl.bindVertexArray(this.vao);

    // 1) sense & move
    gl.useProgram(this.progUpdate);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.setB.fbo);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.viewport(0, 0, AW, AW);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.setA.pos); gl.uniform1i(this.u(this.progUpdate, "uPos"), 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.setA.dir); gl.uniform1i(this.u(this.progUpdate, "uDir"), 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.volA.tex); gl.uniform1i(this.u(this.progUpdate, "uVol"), 2);
    gl.uniform1f(this.u(this.progUpdate, "uSensorDist"), p.sensorDist);
    gl.uniform1f(this.u(this.progUpdate, "uTurn"), Math.min(0.95, Math.max(0.05, p.turnSpeed / 90)));
    gl.uniform1f(this.u(this.progUpdate, "uStep"), p.stepSize);
    gl.uniform1f(this.u(this.progUpdate, "uCone"), 0.45);
    gl.uniform1f(this.u(this.progUpdate, "uJitter"), 0.06);
    gl.uniform1f(this.u(this.progUpdate, "uFrame"), Math.random() * 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

    // 2) deposit: agent trace + strong stationary galaxy field
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    this.depositPoints(this.setB.pos, AW, p.deposit);
    this.depositPoints(this.galaxies, GW, 0.15);
    gl.disable(gl.BLEND);

    // 3) diffuse + decay
    gl.useProgram(this.progDecay);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.volB.fbo);
    gl.viewport(0, 0, ATLAS, ATLAS);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.volA.tex);
    gl.uniform1i(this.u(this.progDecay, "uVol"), 0);
    gl.uniform1f(this.u(this.progDecay, "uDecay"), p.decay);
    gl.uniform1f(this.u(this.progDecay, "uDiffuse"), p.diffuse);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    [this.setA, this.setB] = [this.setB, this.setA];
    [this.volA, this.volB] = [this.volB, this.volA];
  }

  render() {
    const gl = this.gl; const p = this.p;
    if (!this.paused) { this.step(); if (this.autoYaw) this.yaw += 0.0026; }
    gl.bindVertexArray(this.vao);
    const lo = hexToRgb(p.lo), hi = hexToRgb(p.hi);
    const setCam = (prog: WebGLProgram) => {
      gl.uniform1f(this.u(prog, "uYaw"), this.yaw);
      gl.uniform1f(this.u(prog, "uPitch"), this.pitch);
      gl.uniform1f(this.u(prog, "uDist"), 2.1);
      gl.uniform1f(this.u(prog, "uFocal"), 1.9);
    };

    // --- HDR scene: additive points on black ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.hdr.fbo);
    gl.viewport(0, 0, this.res, this.res);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);

    gl.useProgram(this.progAgents);
    setCam(this.progAgents);
    gl.uniform1f(this.u(this.progAgents, "uPointBase"), 1.6);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.setA.pos); gl.uniform1i(this.u(this.progAgents, "uPos"), 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.volA.tex); gl.uniform1i(this.u(this.progAgents, "uVol"), 1);
    gl.uniform3fv(this.u(this.progAgents, "uLo"), lo);
    gl.uniform3fv(this.u(this.progAgents, "uHi"), hi);
    gl.uniform1f(this.u(this.progAgents, "uExposure"), p.intensity);
    gl.drawArrays(gl.POINTS, 0, AW * AW);

    gl.useProgram(this.progGal);
    setCam(this.progGal);
    gl.uniform1f(this.u(this.progGal, "uPointBase"), 1.6);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.galaxies); gl.uniform1i(this.u(this.progGal, "uPos"), 0);
    gl.uniform3fv(this.u(this.progGal, "uHi"), hi);
    gl.uniform3fv(this.u(this.progGal, "uWarmCol"), [1.0, 0.82, 0.32]);
    gl.uniform1f(this.u(this.progGal, "uExposure"), p.intensity);
    gl.drawArrays(gl.POINTS, 0, GW * GW);
    gl.disable(gl.BLEND);

    // --- bloom: bright-pass downsample, separable blur ---
    const hw = this.bloomA.w, hh = this.bloomA.h;
    gl.useProgram(this.progDown);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomA.fbo); gl.viewport(0, 0, hw, hh);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.hdr.tex); gl.uniform1i(this.u(this.progDown, "uTex"), 0);
    gl.uniform1f(this.u(this.progDown, "uThresh"), 0.18);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    for (let i = 0; i < 2; i++) {
      gl.useProgram(this.progBlur);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomB.fbo); gl.viewport(0, 0, hw, hh);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.bloomA.tex); gl.uniform1i(this.u(this.progBlur, "uTex"), 0);
      gl.uniform2f(this.u(this.progBlur, "uDir"), 1 / hw, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomA.fbo); gl.viewport(0, 0, hw, hh);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.bloomB.tex);
      gl.uniform2f(this.u(this.progBlur, "uDir"), 0, 1 / hh);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    // --- composite + tonemap to screen ---
    gl.useProgram(this.progComp);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.res, this.res);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.hdr.tex); gl.uniform1i(this.u(this.progComp, "uHDR"), 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.bloomA.tex); gl.uniform1i(this.u(this.progComp, "uBloom"), 1);
    gl.uniform3fv(this.u(this.progComp, "uBg"), hexToRgb(p.bg));
    gl.uniform1f(this.u(this.progComp, "uBloomStr"), 1.1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  dispose() {
    const gl = this.gl;
    for (const s of [this.setA, this.setB]) { gl.deleteTexture(s.pos); gl.deleteTexture(s.dir); gl.deleteFramebuffer(s.fbo); }
    for (const t of [this.volA, this.volB, this.hdr, this.bloomA, this.bloomB]) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fbo); }
    gl.deleteTexture(this.galaxies);
    for (const pr of [this.progUpdate, this.progDeposit, this.progDecay, this.progAgents, this.progGal, this.progDown, this.progBlur, this.progComp]) gl.deleteProgram(pr);
    gl.deleteVertexArray(this.vao);
  }
}
