import { createProgram, createTarget, hexToRgb, getContext, type Target } from "./gl";
import {
  FULLSCREEN_VERT,
  UPDATE_FRAG,
  DEPOSIT_VERT,
  DEPOSIT_FRAG,
  FOOD_FRAG,
  DECAY_FRAG,
  DISPLAY_FRAG,
  MAX_FOOD,
} from "./shaders";

export interface Params {
  agentTexW: number; // agents = agentTexW^2 (power of two)
  sensorAngle: number; // degrees
  sensorDist: number; // px
  turnSpeed: number; // degrees
  stepSize: number; // px
  deposit: number;
  decay: number; // 0..1
  diffuse: number; // 0..1
  stepsPerFrame: number;
  intensity: number;
  gamma: number;
  bg: string;
  lo: string;
  hi: string;
  spawn: "center" | "ring" | "random";
  // multi-species / interaction
  species: number; // 1..3
  avoid: number; // cross-species repulsion 0..1
  mouseFood: number; // food strength (0 = disabled)
  foodRadius: number; // px
  displayMode: "palette" | "rgb";
  colR: string;
  colG: string;
  colB: string;
}

export const DEFAULTS: Params = {
  agentTexW: 1024, // ~1,000,000 agents
  sensorAngle: 22,
  sensorDist: 9,
  turnSpeed: 28,
  stepSize: 1.0,
  deposit: 0.18,
  decay: 0.93,
  diffuse: 0.45,
  stepsPerFrame: 1,
  intensity: 1.4,
  gamma: 0.8,
  bg: "#07060c",
  lo: "#3a1d6e",
  hi: "#f7d774",
  spawn: "ring",
  species: 1,
  avoid: 0,
  mouseFood: 0,
  foodRadius: 36,
  displayMode: "palette",
  colR: "#ff2d6b",
  colG: "#22e0c8",
  colB: "#ffd23d",
};

const D2R = Math.PI / 180;

export class Physarum {
  readonly gl: WebGL2RenderingContext;
  private res: number;
  private p: Params;

  private progUpdate: WebGLProgram;
  private progDeposit: WebGLProgram;
  private progFood: WebGLProgram;
  private progDecay: WebGLProgram;
  private progDisplay: WebGLProgram;

  private agentsA!: Target;
  private agentsB!: Target;
  private trailA!: Target;
  private trailB!: Target;
  private vao: WebGLVertexArrayObject;

  paused = false;
  private mouseX = 0;
  private mouseY = 0;
  private mouseActive = false;
  private foodBuf = new Float32Array(MAX_FOOD * 3);

  private prevAgentTexW: number;
  private prevSpawn: Params["spawn"];
  private prevSpecies: number;

  constructor(canvas: HTMLCanvasElement, res: number, params: Params) {
    const gl = getContext(canvas);
    this.gl = gl;
    this.res = res;
    this.p = params;
    this.prevAgentTexW = params.agentTexW;
    this.prevSpawn = params.spawn;
    this.prevSpecies = params.species;
    canvas.width = res;
    canvas.height = res;

    this.progUpdate = createProgram(gl, FULLSCREEN_VERT, UPDATE_FRAG);
    this.progDeposit = createProgram(gl, DEPOSIT_VERT, DEPOSIT_FRAG);
    this.progFood = createProgram(gl, FULLSCREEN_VERT, FOOD_FRAG);
    this.progDecay = createProgram(gl, FULLSCREEN_VERT, DECAY_FRAG);
    this.progDisplay = createProgram(gl, FULLSCREEN_VERT, DISPLAY_FRAG);

    this.vao = gl.createVertexArray()!;
    this.initTrails();
    this.reset();
  }

  private initTrails() {
    const gl = this.gl;
    const r = this.res;
    this.trailA = createTarget(gl, r, r, gl.RGBA16F, gl.HALF_FLOAT, null, gl.LINEAR);
    this.trailB = createTarget(gl, r, r, gl.RGBA16F, gl.HALF_FLOAT, null, gl.LINEAR);
  }

  private seedAgents(): Float32Array {
    const w = this.p.agentTexW;
    const n = w * w;
    const data = new Float32Array(n * 4);
    const r = this.res;
    const species = Math.max(1, Math.round(this.p.species));
    for (let i = 0; i < n; i++) {
      let x: number, y: number, a: number;
      if (this.p.spawn === "center") {
        const rad = Math.random() * r * 0.04;
        const t = Math.random() * Math.PI * 2;
        x = r / 2 + Math.cos(t) * rad;
        y = r / 2 + Math.sin(t) * rad;
        a = Math.random() * Math.PI * 2;
      } else if (this.p.spawn === "ring") {
        const rad = r * 0.36;
        const t = Math.random() * Math.PI * 2;
        x = r / 2 + Math.cos(t) * rad;
        y = r / 2 + Math.sin(t) * rad;
        a = t + Math.PI + (Math.random() - 0.5);
      } else {
        x = Math.random() * r;
        y = Math.random() * r;
        a = Math.random() * Math.PI * 2;
      }
      data[i * 4] = x;
      data[i * 4 + 1] = y;
      data[i * 4 + 2] = a;
      data[i * 4 + 3] = i % species; // species index
    }
    return data;
  }

  reset() {
    const gl = this.gl;
    const w = this.p.agentTexW;
    if (this.agentsA) {
      gl.deleteTexture(this.agentsA.tex);
      gl.deleteFramebuffer(this.agentsA.fbo);
      gl.deleteTexture(this.agentsB.tex);
      gl.deleteFramebuffer(this.agentsB.fbo);
    }
    const seed = this.seedAgents();
    this.agentsA = createTarget(gl, w, w, gl.RGBA32F, gl.FLOAT, seed);
    this.agentsB = createTarget(gl, w, w, gl.RGBA32F, gl.FLOAT, null);
    for (const t of [this.trailA, this.trailB]) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
      gl.viewport(0, 0, t.w, t.h);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  setParams(p: Params) {
    const reseed =
      p.agentTexW !== this.prevAgentTexW ||
      p.spawn !== this.prevSpawn ||
      p.species !== this.prevSpecies;
    this.p = p;
    this.prevAgentTexW = p.agentTexW;
    this.prevSpawn = p.spawn;
    this.prevSpecies = p.species;
    if (reseed) this.reset();
  }

  setMouse(x: number, y: number, active: boolean) {
    this.mouseX = x;
    this.mouseY = y;
    this.mouseActive = active;
  }

  private u(prog: WebGLProgram, name: string): WebGLUniformLocation | null {
    return this.gl.getUniformLocation(prog, name);
  }

  private step() {
    const gl = this.gl;
    const p = this.p;
    const r = this.res;
    const w = p.agentTexW;
    gl.bindVertexArray(this.vao);

    // --- Pass 1: sense & move (agentsA -> agentsB) ---
    gl.useProgram(this.progUpdate);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.agentsB.fbo);
    gl.viewport(0, 0, w, w);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.agentsA.tex);
    gl.uniform1i(this.u(this.progUpdate, "uAgents"), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.trailA.tex);
    gl.uniform1i(this.u(this.progUpdate, "uTrail"), 1);
    gl.uniform2f(this.u(this.progUpdate, "uRes"), r, r);
    gl.uniform1f(this.u(this.progUpdate, "uSensorAngle"), p.sensorAngle * D2R);
    gl.uniform1f(this.u(this.progUpdate, "uSensorDist"), p.sensorDist);
    gl.uniform1f(this.u(this.progUpdate, "uTurnSpeed"), p.turnSpeed * D2R);
    gl.uniform1f(this.u(this.progUpdate, "uStepSize"), p.stepSize);
    gl.uniform1f(this.u(this.progUpdate, "uFrame"), Math.random() * 1000);
    gl.uniform1f(this.u(this.progUpdate, "uAvoid"), p.avoid);
    // touch: a sense-only scent at the cursor (attracts agents, nothing visible)
    gl.uniform2f(this.u(this.progUpdate, "uMouse"), this.mouseX, this.mouseY);
    gl.uniform1f(this.u(this.progUpdate, "uMouseStr"), this.mouseActive && p.mouseFood > 0 ? p.mouseFood : 0);
    gl.uniform1f(this.u(this.progUpdate, "uMouseRad"), Math.max(1, p.foodRadius));
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // --- Pass 2: deposit (agentsB -> trailA, additive) ---
    gl.useProgram(this.progDeposit);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.trailA.fbo);
    gl.viewport(0, 0, r, r);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.agentsB.tex);
    gl.uniform1i(this.u(this.progDeposit, "uAgents"), 0);
    gl.uniform1f(this.u(this.progDeposit, "uAgentTexW"), w);
    gl.uniform2f(this.u(this.progDeposit, "uRes"), r, r);
    gl.uniform1f(this.u(this.progDeposit, "uDeposit"), p.deposit);
    gl.drawArrays(gl.POINTS, 0, w * w);

    // --- Optional: food (audio spectrum), additive onto trailA. The cursor is no
    // longer deposited here — it's a sense-only scent in the update pass, so it
    // attracts the slime without drawing a visible orb. ---
    const food = this.foodBuf;
    let n = 0;
    if (n > 0) {
      for (let k = n * 3; k < food.length; k++) food[k] = 0;
      gl.useProgram(this.progFood);
      gl.uniform2f(this.u(this.progFood, "uRes"), r, r);
      gl.uniform1i(this.u(this.progFood, "uCount"), n);
      gl.uniform3fv(this.u(this.progFood, "uPoints"), food);
      gl.uniform1f(this.u(this.progFood, "uRadius"), p.foodRadius);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.disable(gl.BLEND);

    // --- Pass 3: diffuse + decay (trailA -> trailB) ---
    gl.useProgram(this.progDecay);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.trailB.fbo);
    gl.viewport(0, 0, r, r);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.trailA.tex);
    gl.uniform1i(this.u(this.progDecay, "uTrail"), 0);
    gl.uniform2f(this.u(this.progDecay, "uRes"), r, r);
    gl.uniform1f(this.u(this.progDecay, "uDecay"), p.decay);
    gl.uniform1f(this.u(this.progDecay, "uDiffuse"), p.diffuse);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // swap
    [this.agentsA, this.agentsB] = [this.agentsB, this.agentsA];
    [this.trailA, this.trailB] = [this.trailB, this.trailA];
  }

  render() {
    const gl = this.gl;
    if (!this.paused) {
      for (let i = 0; i < this.p.stepsPerFrame; i++) this.step();
    }
    // --- Pass 4: display trailA -> screen ---
    gl.useProgram(this.progDisplay);
    gl.bindVertexArray(this.vao);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.res, this.res);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.trailA.tex);
    gl.uniform1i(this.u(this.progDisplay, "uTrail"), 0);
    gl.uniform1i(this.u(this.progDisplay, "uMode"), this.p.displayMode === "rgb" ? 1 : 0);
    gl.uniform3fv(this.u(this.progDisplay, "uBg"), hexToRgb(this.p.bg));
    gl.uniform3fv(this.u(this.progDisplay, "uLo"), hexToRgb(this.p.lo));
    gl.uniform3fv(this.u(this.progDisplay, "uHi"), hexToRgb(this.p.hi));
    gl.uniform3fv(this.u(this.progDisplay, "uColR"), hexToRgb(this.p.colR));
    gl.uniform3fv(this.u(this.progDisplay, "uColG"), hexToRgb(this.p.colG));
    gl.uniform3fv(this.u(this.progDisplay, "uColB"), hexToRgb(this.p.colB));
    gl.uniform1f(this.u(this.progDisplay, "uIntensity"), this.p.intensity);
    gl.uniform1f(this.u(this.progDisplay, "uGamma"), this.p.gamma);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  agentCount(): number {
    return this.p.agentTexW * this.p.agentTexW;
  }

  readonly is3D = false as const;

  dispose() {
    const gl = this.gl;
    for (const t of [this.agentsA, this.agentsB, this.trailA, this.trailB]) {
      gl.deleteTexture(t.tex);
      gl.deleteFramebuffer(t.fbo);
    }
    for (const pr of [this.progUpdate, this.progDeposit, this.progFood, this.progDecay, this.progDisplay]) {
      gl.deleteProgram(pr);
    }
    gl.deleteVertexArray(this.vao);
  }
}
