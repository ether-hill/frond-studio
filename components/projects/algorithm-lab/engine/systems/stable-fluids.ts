// ─────────────────────────────────────────────────────────────────────────────
// Stable Fluids — Jos Stam (1999), GPU ping-pong implementation (WebGL2).
//
// A semi-Lagrangian, divergence-free incompressible fluid solved on float
// textures. Each step advects velocity along its own field (back-trace), then
// projects it divergence-free via a Jacobi pressure solve, adds vorticity
// confinement to restore the swirling curl detail numerical diffusion erodes,
// and finally advects a coloured dye through the resulting flow. Pointer drags
// inject both force (velocity) and dye.
//
// This is the substrate the other field systems can sample from. The solver is
// the textbook GPU pipeline (advect → diffuse → divergence → pressure → project
// → vorticity → advect dye); fields live as RGBA16F render targets enabled via
// EXT_color_buffer_float. If that extension is missing we warn and degrade to a
// no-op render rather than crash.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  GenerativeSystem,
  ParamSchema,
  Params,
  RenderSurface,
  RNG,
  WebGLSurface,
} from "../core/types";
import { clamp } from "../core/math";
import { fieldToRgb, getPalette, PALETTE_IDS } from "../core/color";

// ── A double-buffered float framebuffer (ping-pong) ──────────────────────────
interface DoubleFBO {
  read: FBO;
  write: FBO;
  swap(): void;
}
interface FBO {
  tex: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
}

// ── State ────────────────────────────────────────────────────────────────────
interface State {
  params: Params; // live HOT reference
  rng: RNG;
  gl: WebGL2RenderingContext;
  canvas: HTMLCanvasElement;

  ok: boolean; // false if WebGL setup failed → render is a no-op

  // programs (keyed uniform-location maps)
  progs: {
    advect: Prog;
    divergence: Prog;
    pressure: Prog;
    gradient: Prog;
    curl: Prog;
    vorticity: Prog;
    splat: Prog;
    display: Prog;
  };

  quad: WebGLVertexArrayObject;

  // sim resolution (square) and dye resolution
  simW: number;
  simH: number;

  velocity: DoubleFBO; // RG = velocity
  dye: DoubleFBO; // RGB = dye colour
  pressure: DoubleFBO; // R  = pressure
  divergenceFBO: FBO; // R  = divergence
  curlFBO: FBO; // R  = curl (vorticity scalar)

  // pointer interaction
  pointers: PointerState[];

  acc: number; // time accumulator for fixed sub-steps
  tick: number; // monotonic frame counter driving the auto-chaos
}

interface PointerState {
  id: number;
  down: boolean;
  moved: boolean;
  // texture-space coords [0,1]
  x: number;
  y: number;
  px: number;
  py: number;
  dx: number;
  dy: number;
  color: [number, number, number];
}

interface Prog {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

// ── Schema ───────────────────────────────────────────────────────────────────
const schema: ParamSchema = {
  simResolution: {
    type: "int",
    min: 128,
    max: 512,
    default: 256,
    hot: false, // re-allocates textures → requires reset
    label: "sim resolution",
  },
  viscosity: {
    type: "number",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.0,
    hot: true,
    label: "viscosity",
  },
  dyeDissipation: {
    type: "number",
    min: 0.9,
    max: 1.0,
    step: 0.001,
    default: 0.997, // slower fade → colour builds up into a rich churn
    hot: true,
    label: "dye dissipation",
  },
  velocityDissipation: {
    type: "number",
    min: 0.9,
    max: 1.0,
    step: 0.001,
    default: 0.995,
    hot: true,
    label: "velocity dissipation",
  },
  pressureIterations: {
    type: "int",
    min: 10,
    max: 60,
    default: 28,
    hot: true,
    label: "pressure iterations",
  },
  vorticity: {
    type: "number",
    min: 0,
    max: 50,
    step: 0.5,
    default: 40, // cranked high → lots of curl & swirl by default
    hot: true,
    label: "vorticity",
  },
  forceStrength: {
    type: "number",
    min: 1000,
    max: 12000,
    step: 100,
    default: 9000, // more energetic motion
    hot: true,
    label: "force strength",
  },
  dyeStrength: {
    type: "number",
    min: 0.05,
    max: 1.0,
    step: 0.01,
    default: 0.6, // brighter, livelier ink
    hot: true,
    label: "dye strength",
  },
  chaos: {
    type: "number",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.85, // scales auto-splat rate/strength + the param wander
    hot: true,
    label: "chaos",
  },
  palette: {
    type: "select",
    options: PALETTE_IDS,
    default: "azurite",
    hot: true,
    label: "palette",
  },
};

// ── Shaders (GLSL ES 3.00) ────────────────────────────────────────────────────

// A shared vertex shader producing texcoords + neighbour offsets.
const VERT = `#version 300 es
precision highp float;
in vec2 aPos;
out vec2 vUv;
out vec2 vL;
out vec2 vR;
out vec2 vT;
out vec2 vB;
uniform vec2 uTexel;
void main() {
  vUv = aPos * 0.5 + 0.5;
  vL = vUv - vec2(uTexel.x, 0.0);
  vR = vUv + vec2(uTexel.x, 0.0);
  vT = vUv + vec2(0.0, uTexel.y);
  vB = vUv - vec2(0.0, uTexel.y);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const ADVECT_FRAG = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexel;     // 1 / sim resolution
uniform float uDt;
uniform float uDissipation;
void main() {
  // back-trace position one timestep along the velocity field
  vec2 coord = vUv - uDt * texture(uVelocity, vUv).xy * uTexel;
  vec4 result = texture(uSource, coord);
  outColor = uDissipation * result;
}`;

const DIVERGENCE_FRAG = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
in vec2 vL, vR, vT, vB;
out vec4 outColor;
uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).x;
  float R = texture(uVelocity, vR).x;
  float T = texture(uVelocity, vT).y;
  float B = texture(uVelocity, vB).y;
  // reflect velocity at the domain boundary (free-slip-ish walls)
  vec2 c = texture(uVelocity, vUv).xy;
  if (vL.x < 0.0) L = -c.x;
  if (vR.x > 1.0) R = -c.x;
  if (vT.y > 1.0) T = -c.y;
  if (vB.y < 0.0) B = -c.y;
  float div = 0.5 * (R - L + T - B);
  outColor = vec4(div, 0.0, 0.0, 1.0);
}`;

const PRESSURE_FRAG = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
in vec2 vL, vR, vT, vB;
out vec4 outColor;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main() {
  float L = texture(uPressure, vL).x;
  float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x;
  float B = texture(uPressure, vB).x;
  float div = texture(uDivergence, vUv).x;
  // Jacobi iteration of ∇²p = div
  float p = (L + R + T + B - div) * 0.25;
  outColor = vec4(p, 0.0, 0.0, 1.0);
}`;

const GRADIENT_FRAG = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
in vec2 vL, vR, vT, vB;
out vec4 outColor;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main() {
  float L = texture(uPressure, vL).x;
  float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x;
  float B = texture(uPressure, vB).x;
  vec2 vel = texture(uVelocity, vUv).xy;
  vel -= vec2(R - L, T - B) * 0.5; // subtract pressure gradient → divergence-free
  outColor = vec4(vel, 0.0, 1.0);
}`;

const CURL_FRAG = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
in vec2 vL, vR, vT, vB;
out vec4 outColor;
uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).y;
  float R = texture(uVelocity, vR).y;
  float T = texture(uVelocity, vT).x;
  float B = texture(uVelocity, vB).x;
  float curl = 0.5 * ((R - L) - (T - B));
  outColor = vec4(curl, 0.0, 0.0, 1.0);
}`;

const VORTICITY_FRAG = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
in vec2 vL, vR, vT, vB;
out vec4 outColor;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float uCurlStrength;
uniform float uDt;
void main() {
  float L = texture(uCurl, vL).x;
  float R = texture(uCurl, vR).x;
  float T = texture(uCurl, vT).x;
  float B = texture(uCurl, vB).x;
  float C = texture(uCurl, vUv).x;
  // gradient of |curl| → confinement force direction
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= uCurlStrength * C;
  force.y *= -1.0;
  vec2 vel = texture(uVelocity, vUv).xy;
  vel += force * uDt;
  vel = clamp(vel, vec2(-1000.0), vec2(1000.0));
  outColor = vec4(vel, 0.0, 1.0);
}`;

const SPLAT_FRAG = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uTarget;
uniform float uAspect;
uniform vec3 uColor;
uniform vec2 uPoint;
uniform float uRadius;
void main() {
  vec2 p = vUv - uPoint;
  p.x *= uAspect;
  vec3 splat = exp(-dot(p, p) / uRadius) * uColor;
  vec3 base = texture(uTarget, vUv).xyz;
  outColor = vec4(base + splat, 1.0);
}`;

const DISPLAY_FRAG = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uDye;
uniform sampler2D uRamp;  // 1D palette ramp (256x1)
uniform float uTint;      // 0 = raw dye, 1 = full palette tint by magnitude
void main() {
  vec3 dye = texture(uDye, vUv).rgb;
  float mag = clamp(length(dye) * 0.9, 0.0, 1.0);
  vec3 ramp = texture(uRamp, vec2(mag, 0.5)).rgb;
  // blend raw dye colour with palette ramp so injected hues stay legible but
  // the whole field reads in the chosen palette.
  vec3 col = mix(dye, ramp * (0.25 + mag), uTint);
  // subtle tone curve
  col = col / (col + vec3(0.6)) * 1.6;
  outColor = vec4(col, 1.0);
}`;

// ── GL helpers ────────────────────────────────────────────────────────────────
function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  src: string,
): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error("[stable-fluids] shader compile failed:\n" + gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

function createProgram(
  gl: WebGL2RenderingContext,
  fragSrc: string,
  uniformNames: string[],
): Prog | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERT);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.bindAttribLocation(program, 0, "aPos");
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("[stable-fluids] program link failed:\n" + gl.getProgramInfoLog(program));
    return null;
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  const uniforms: Record<string, WebGLUniformLocation | null> = {};
  for (const n of uniformNames) uniforms[n] = gl.getUniformLocation(program, n);
  return { program, uniforms };
}

function createFBO(
  gl: WebGL2RenderingContext,
  w: number,
  h: number,
  internalFormat: number,
  format: number,
  type: number,
): FBO {
  const tex = gl.createTexture() as WebGLTexture;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

  const fbo = gl.createFramebuffer() as WebGLFramebuffer;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.viewport(0, 0, w, h);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  return { tex, fbo, width: w, height: h };
}

function createDoubleFBO(
  gl: WebGL2RenderingContext,
  w: number,
  h: number,
  internalFormat: number,
  format: number,
  type: number,
): DoubleFBO {
  let a = createFBO(gl, w, h, internalFormat, format, type);
  let b = createFBO(gl, w, h, internalFormat, format, type);
  return {
    get read() {
      return a;
    },
    get write() {
      return b;
    },
    swap() {
      const t = a;
      a = b;
      b = t;
    },
  };
}

// ── init ──────────────────────────────────────────────────────────────────────
function init(surface: RenderSurface, params: Params, rng: RNG): State {
  const s = surface as WebGLSurface;
  const gl = s.gl;
  const canvas = s.canvas;

  // Float render targets. Prefer RGBA16F (widely renderable); needs the ext.
  const ext = gl.getExtension("EXT_color_buffer_float");
  const internalFormat = gl.RGBA16F;
  const format = gl.RGBA;
  const texType = gl.HALF_FLOAT;
  if (!ext) {
    console.warn(
      "[stable-fluids] EXT_color_buffer_float unavailable — fluid render disabled.",
    );
  }
  // Linear filtering of half-float colour buffers is universal in WebGL2 core.

  const stateBase: State = {
    params,
    rng,
    gl,
    canvas,
    ok: false,
    // placeholders; filled below if setup succeeds
    progs: null as unknown as State["progs"],
    quad: null as unknown as WebGLVertexArrayObject,
    simW: 0,
    simH: 0,
    velocity: null as unknown as DoubleFBO,
    dye: null as unknown as DoubleFBO,
    pressure: null as unknown as DoubleFBO,
    divergenceFBO: null as unknown as FBO,
    curlFBO: null as unknown as FBO,
    pointers: [],
    acc: 0,
    tick: 0,
  };

  if (!ext) {
    // Degrade gracefully: still attach pointer listeners (harmless) and return.
    attachPointerListeners(stateBase);
    return stateBase;
  }

  // ── fullscreen quad VAO ──
  const quad = gl.createVertexArray() as WebGLVertexArrayObject;
  gl.bindVertexArray(quad);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  // ── programs ──
  const advect = createProgram(gl, ADVECT_FRAG, [
    "uVelocity",
    "uSource",
    "uTexel",
    "uDt",
    "uDissipation",
  ]);
  const divergence = createProgram(gl, DIVERGENCE_FRAG, ["uVelocity", "uTexel"]);
  const pressure = createProgram(gl, PRESSURE_FRAG, ["uPressure", "uDivergence", "uTexel"]);
  const gradient = createProgram(gl, GRADIENT_FRAG, ["uPressure", "uVelocity", "uTexel"]);
  const curl = createProgram(gl, CURL_FRAG, ["uVelocity", "uTexel"]);
  const vorticity = createProgram(gl, VORTICITY_FRAG, [
    "uVelocity",
    "uCurl",
    "uCurlStrength",
    "uDt",
    "uTexel",
  ]);
  const splat = createProgram(gl, SPLAT_FRAG, [
    "uTarget",
    "uAspect",
    "uColor",
    "uPoint",
    "uRadius",
    "uTexel",
  ]);
  const display = createProgram(gl, DISPLAY_FRAG, ["uDye", "uRamp", "uTint", "uTexel"]);

  if (
    !advect ||
    !divergence ||
    !pressure ||
    !gradient ||
    !curl ||
    !vorticity ||
    !splat ||
    !display
  ) {
    console.error("[stable-fluids] program setup failed — render disabled.");
    attachPointerListeners(stateBase);
    return stateBase;
  }

  // ── sim resolution (square) ──
  const simRes = clamp(Math.round(asNum(params.simResolution, 256)), 64, 1024) | 0;
  const simW = simRes;
  const simH = simRes;

  // R-channel buffers can still be RGBA16F (we only read .x); keeps it simple.
  const velocity = createDoubleFBO(gl, simW, simH, internalFormat, format, texType);
  const dye = createDoubleFBO(gl, simW, simH, internalFormat, format, texType);
  const pressureFbo = createDoubleFBO(gl, simW, simH, internalFormat, format, texType);
  const divergenceFBO = createFBO(gl, simW, simH, internalFormat, format, texType);
  const curlFBO = createFBO(gl, simW, simH, internalFormat, format, texType);

  const state: State = {
    ...stateBase,
    ok: true,
    progs: { advect, divergence, pressure, gradient, curl, vorticity, splat, display },
    quad,
    simW,
    simH,
    velocity,
    dye,
    pressure: pressureFbo,
    divergenceFBO,
    curlFBO,
  };

  // Build the palette ramp texture (256×1) for the display tint.
  state.rampTex = buildRampTexture(gl, asStr(params.palette, "azurite"));
  state.rampPaletteId = asStr(params.palette, "azurite");

  // ── seed a few initial dye blobs deterministically via rng ──
  seedInitialDye(state);

  attachPointerListeners(state);
  return state;
}

// ── ramp texture for the display shader (cached by palette id) ────────────────
function buildRampTexture(gl: WebGL2RenderingContext, paletteId: string): WebGLTexture {
  const palette = getPalette(paletteId);
  const N = 256;
  const data = new Uint8Array(N * 4);
  for (let i = 0; i < N; i++) {
    const [r, g, b] = fieldToRgb(i / (N - 1), palette);
    data[i * 4 + 0] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  const tex = gl.createTexture() as WebGLTexture;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, N, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

// State carries two optional ramp fields; declare via augmentation in-module.
interface State {
  rampTex?: WebGLTexture;
  rampPaletteId?: string;
}

// ── pointer listeners ─────────────────────────────────────────────────────────
function attachPointerListeners(state: State): void {
  const canvas = state.canvas;
  const rng = state.rng;

  const toTexCoords = (clientX: number, clientY: number): [number, number] => {
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / Math.max(1, rect.width);
    const y = 1 - (clientY - rect.top) / Math.max(1, rect.height); // flip: GL origin bottom-left
    return [clamp(x, 0, 1), clamp(y, 0, 1)];
  };

  const findOrCreate = (id: number): PointerState => {
    let p = state.pointers.find((q) => q.id === id);
    if (!p) {
      p = {
        id,
        down: false,
        moved: false,
        x: 0,
        y: 0,
        px: 0,
        py: 0,
        dx: 0,
        dy: 0,
        color: randomDyeColor(rng),
      };
      state.pointers.push(p);
    }
    return p;
  };

  canvas.addEventListener("pointerdown", (e: PointerEvent) => {
    const [x, y] = toTexCoords(e.clientX, e.clientY);
    const p = findOrCreate(e.pointerId);
    p.down = true;
    p.moved = true; // emit one splat on press
    p.x = x;
    p.y = y;
    p.px = x;
    p.py = y;
    p.dx = 0;
    p.dy = 0;
    p.color = randomDyeColor(rng);
  });

  canvas.addEventListener("pointermove", (e: PointerEvent) => {
    const p = state.pointers.find((q) => q.id === e.pointerId);
    if (!p || !p.down) return;
    const [x, y] = toTexCoords(e.clientX, e.clientY);
    p.px = p.x;
    p.py = p.y;
    p.x = x;
    p.y = y;
    p.dx = x - p.px;
    p.dy = y - p.py;
    p.moved = true;
  });

  const release = (e: PointerEvent) => {
    const p = state.pointers.find((q) => q.id === e.pointerId);
    if (p) p.down = false;
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("pointerleave", release);
}

// ── a vivid RGB triple from an explicit hue [0,1) (HSV with S=V=1) ────────────
function dyeColorFromHue(h: number, amp: number): [number, number, number] {
  const hh = ((h % 1) + 1) % 1;
  const i = Math.floor(hh * 6);
  const f = hh * 6 - i;
  const q = 1 - f;
  let r = 0,
    g = 0,
    b = 0;
  switch (i % 6) {
    case 0:
      r = 1;
      g = f;
      b = 0;
      break;
    case 1:
      r = q;
      g = 1;
      b = 0;
      break;
    case 2:
      r = 0;
      g = 1;
      b = f;
      break;
    case 3:
      r = 0;
      g = q;
      b = 1;
      break;
    case 4:
      r = f;
      g = 0;
      b = 1;
      break;
    default:
      r = 1;
      g = 0;
      b = q;
      break;
  }
  return [r * amp, g * amp, b * amp];
}

// ── deterministic dye colour from rng (HSV-ish in linear-ish RGB) ─────────────
function randomDyeColor(rng: RNG): [number, number, number] {
  // pick a hue, convert to a vivid RGB triple; values are dye amounts (>1 ok).
  const h = rng.next();
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const q = 1 - f;
  let r = 0,
    g = 0,
    b = 0;
  switch (i % 6) {
    case 0:
      r = 1;
      g = f;
      b = 0;
      break;
    case 1:
      r = q;
      g = 1;
      b = 0;
      break;
    case 2:
      r = 0;
      g = 1;
      b = f;
      break;
    case 3:
      r = 0;
      g = q;
      b = 1;
      break;
    case 4:
      r = f;
      g = 0;
      b = 1;
      break;
    default:
      r = 1;
      g = 0;
      b = q;
      break;
  }
  const amp = 0.15 + rng.next() * 0.1;
  return [r * amp, g * amp, b * amp];
}

// ── seed initial dye blobs (deterministic) ────────────────────────────────────
function seedInitialDye(state: State): void {
  const { gl, rng } = state;
  const n = 3 + rng.int(0, 2);
  for (let i = 0; i < n; i++) {
    const x = rng.range(0.2, 0.8);
    const y = rng.range(0.2, 0.8);
    const color = randomDyeColor(rng);
    splat(state, x, y, 0, 0, color, true);
    // a gentle initial swirl
    const ang = rng.range(0, Math.PI * 2);
    splat(state, x, y, Math.cos(ang) * 0.0008, Math.sin(ang) * 0.0008, [0, 0, 0], false);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

// ── draw a fullscreen quad with the bound program ─────────────────────────────
function blit(state: State, target: FBO | null): void {
  const gl = state.gl;
  if (target) {
    gl.viewport(0, 0, target.width, target.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
  } else {
    gl.viewport(0, 0, state.canvas.width, state.canvas.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  gl.bindVertexArray(state.quad);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function texel(state: State): [number, number] {
  return [1 / state.simW, 1 / state.simH];
}

// ── a single splat into velocity (force) and dye (colour) ─────────────────────
// If `dyeOnly` we only paint dye; otherwise (dx,dy) drive a velocity splat too.
function splat(
  state: State,
  x: number,
  y: number,
  dx: number,
  dy: number,
  color: [number, number, number],
  dyeOnly: boolean,
): void {
  const gl = state.gl;
  const p = state.progs.splat;
  const [tx, ty] = texel(state);
  const aspect = state.simW / state.simH;
  // auto-chaos drive: continuously wander force & dye strength over time
  // (sin(tick)+rng) scaled by chaos so the agitation pulses and never settles.
  const chaos = clamp(asNum(state.params.chaos, 0.85), 0, 1);
  const t = state.tick;
  const dyeWander =
    1 + chaos * (0.4 * Math.sin(t * 0.04 + 1.3) + 0.35 * (state.rng.next() - 0.5) * 2);
  const forceWander =
    1 + chaos * (0.5 * Math.sin(t * 0.025) + 0.5 * (state.rng.next() - 0.5) * 2);
  const dyeStrength = Math.max(0, asNum(state.params.dyeStrength, 0.6) * dyeWander);
  const forceStrength = Math.max(0, asNum(state.params.forceStrength, 9000) * forceWander);

  gl.useProgram(p.program);
  gl.uniform2f(p.uniforms.uTexel, tx, ty);
  gl.uniform1f(p.uniforms.uAspect, aspect);
  gl.uniform2f(p.uniforms.uPoint, x, y);
  gl.uniform1f(p.uniforms.uRadius, 0.0002); // gaussian falloff radius²

  if (!dyeOnly) {
    // velocity splat: direction = pointer delta * force
    gl.uniform1i(p.uniforms.uTarget, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, state.velocity.read.tex);
    gl.uniform3f(p.uniforms.uColor, dx * forceStrength, dy * forceStrength, 0);
    blit(state, state.velocity.write);
    state.velocity.swap();
  }

  // dye splat
  gl.uniform1i(p.uniforms.uTarget, 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, state.dye.read.tex);
  gl.uniform3f(
    p.uniforms.uColor,
    color[0] * dyeStrength * 6,
    color[1] * dyeStrength * 6,
    color[2] * dyeStrength * 6,
  );
  blit(state, state.dye.write);
  state.dye.swap();
}

// ── process queued pointer input each frame ───────────────────────────────────
function applyPointerInput(state: State): void {
  for (const p of state.pointers) {
    if (p.down && p.moved) {
      splat(state, p.x, p.y, p.dx, p.dy, p.color, false);
      p.moved = false;
      p.dx = 0;
      p.dy = 0;
    }
  }
}

// ── auto-injection: keep the fluid perpetually agitated & swirling ────────────
// Every frame we fire several dye+force splats at rng-chosen positions with
// rng-chosen directions and a tick-rotated rainbow hue. Count and strength scale
// with the `chaos` param so the field is never calm.
function applyAutoInjection(state: State): void {
  const rng = state.rng;
  const chaos = clamp(asNum(state.params.chaos, 0.85), 0, 1);
  if (chaos <= 0) return;

  const t = state.tick;
  // base hue marches forward each frame → a shifting rainbow of injected ink.
  const baseHue = (t * 0.013) % 1;

  // 1..~6 splats per frame, biased by chaos.
  const count = 1 + Math.floor(chaos * 5 + rng.next() * (1 + chaos * 2));

  for (let i = 0; i < count; i++) {
    // rng-chosen position, kept off the very edges.
    const x = rng.range(0.08, 0.92);
    const y = rng.range(0.08, 0.92);

    // rng-chosen direction, magnitude wandered by sin(tick)+rng and chaos.
    const ang = rng.range(0, Math.PI * 2);
    const speed =
      (0.0006 + 0.0026 * chaos) *
      (0.5 + 0.5 * Math.abs(Math.sin(t * 0.05 + i * 1.7))) *
      (0.4 + rng.next() * 1.4);
    const dx = Math.cos(ang) * speed;
    const dy = Math.sin(ang) * speed;

    // tick-rotated hue, fanned out per-splat with a little rng jitter.
    const hue = baseHue + i / Math.max(1, count) + rng.next() * 0.12;
    const amp = (0.18 + rng.next() * 0.16) * (0.4 + chaos);
    const color = dyeColorFromHue(hue, amp);

    splat(state, x, y, dx, dy, color, false);
  }
}

// ── step (fixed sub-dt accumulation) ──────────────────────────────────────────
function step(state: State, dt: number): State {
  if (!state.ok) return state;

  // refresh palette ramp if the (hot) palette changed
  const palId = asStr(state.params.palette, "azurite");
  if (palId !== state.rampPaletteId) {
    const gl = state.gl;
    if (state.rampTex) gl.deleteTexture(state.rampTex);
    state.rampTex = buildRampTexture(gl, palId);
    state.rampPaletteId = palId;
  }

  // accumulate and run fixed sub-steps for stability across variable frame dt
  const fixed = 1 / 60;
  state.acc += Math.min(dt, 0.05); // clamp huge frame gaps
  let guard = 0;
  while (state.acc >= fixed && guard < 4) {
    simulate(state, fixed);
    state.acc -= fixed;
    guard++;
  }
  if (guard === 0) {
    // ensure we always advance at least a little even on very fast frames
    simulate(state, Math.max(dt, 1e-3));
    state.acc = 0;
  }
  return state;
}

function simulate(state: State, dt: number): void {
  const gl = state.gl;
  const { progs } = state;
  const [tx, ty] = texel(state);

  // advance the internal frame clock that drives all the auto-chaos.
  state.tick += 1;

  // auto-injection first so the new ink/force participates in this step.
  applyAutoInjection(state);
  applyPointerInput(state);

  // ── 1. curl ──
  gl.useProgram(progs.curl.program);
  gl.uniform2f(progs.curl.uniforms.uTexel, tx, ty);
  bindTex(gl, progs.curl.uniforms.uVelocity, 0, state.velocity.read.tex);
  blit(state, state.curlFBO);

  // ── 2. vorticity confinement (wandered over time for restless curl) ──
  const chaos = clamp(asNum(state.params.chaos, 0.85), 0, 1);
  const t = state.tick;
  const vortBase = asNum(state.params.vorticity, 40);
  // continuous wander: sin(tick) + rng, scaled by chaos. Kept positive & high.
  const vortWander =
    1 + chaos * (0.55 * Math.sin(t * 0.03) + 0.45 * (state.rng.next() - 0.5) * 2);
  const vort = clamp(vortBase * vortWander, 0, 80);
  gl.useProgram(progs.vorticity.program);
  gl.uniform2f(progs.vorticity.uniforms.uTexel, tx, ty);
  gl.uniform1f(progs.vorticity.uniforms.uCurlStrength, vort);
  gl.uniform1f(progs.vorticity.uniforms.uDt, dt);
  bindTex(gl, progs.vorticity.uniforms.uVelocity, 0, state.velocity.read.tex);
  bindTex(gl, progs.vorticity.uniforms.uCurl, 1, state.curlFBO.tex);
  blit(state, state.velocity.write);
  state.velocity.swap();

  // ── 3. divergence ──
  gl.useProgram(progs.divergence.program);
  gl.uniform2f(progs.divergence.uniforms.uTexel, tx, ty);
  bindTex(gl, progs.divergence.uniforms.uVelocity, 0, state.velocity.read.tex);
  blit(state, state.divergenceFBO);

  // ── 4. pressure solve (Jacobi) ──
  // clear pressure to zero start each frame for a clean solve
  clearFBO(gl, state.pressure.read, 0, 0, 0, 1);
  const iters = clamp(Math.round(asNum(state.params.pressureIterations, 28)), 1, 200) | 0;
  gl.useProgram(progs.pressure.program);
  gl.uniform2f(progs.pressure.uniforms.uTexel, tx, ty);
  for (let i = 0; i < iters; i++) {
    bindTex(gl, progs.pressure.uniforms.uPressure, 0, state.pressure.read.tex);
    bindTex(gl, progs.pressure.uniforms.uDivergence, 1, state.divergenceFBO.tex);
    blit(state, state.pressure.write);
    state.pressure.swap();
  }

  // ── 5. subtract pressure gradient (project) ──
  gl.useProgram(progs.gradient.program);
  gl.uniform2f(progs.gradient.uniforms.uTexel, tx, ty);
  bindTex(gl, progs.gradient.uniforms.uPressure, 0, state.pressure.read.tex);
  bindTex(gl, progs.gradient.uniforms.uVelocity, 1, state.velocity.read.tex);
  blit(state, state.velocity.write);
  state.velocity.swap();

  // ── 6. advect velocity (with velocity dissipation; viscosity damps too) ──
  const visc = asNum(state.params.viscosity, 0);
  const velDiss =
    asNum(state.params.velocityDissipation, 0.995) * (1 - visc * 0.05);
  gl.useProgram(progs.advect.program);
  gl.uniform2f(progs.advect.uniforms.uTexel, tx, ty);
  gl.uniform1f(progs.advect.uniforms.uDt, dt * state.simW); // dt in grid cells
  gl.uniform1f(progs.advect.uniforms.uDissipation, velDiss);
  bindTex(gl, progs.advect.uniforms.uVelocity, 0, state.velocity.read.tex);
  bindTex(gl, progs.advect.uniforms.uSource, 1, state.velocity.read.tex);
  blit(state, state.velocity.write);
  state.velocity.swap();

  // ── 7. advect dye ──
  const dyeDiss = asNum(state.params.dyeDissipation, 0.985);
  gl.useProgram(progs.advect.program);
  gl.uniform1f(progs.advect.uniforms.uDissipation, dyeDiss);
  bindTex(gl, progs.advect.uniforms.uVelocity, 0, state.velocity.read.tex);
  bindTex(gl, progs.advect.uniforms.uSource, 1, state.dye.read.tex);
  blit(state, state.dye.write);
  state.dye.swap();
}

// ── render the dye to the default framebuffer ─────────────────────────────────
function render(state: State, surface: RenderSurface): void {
  const s = surface as WebGLSurface;
  const gl = s.gl;
  if (!state.ok) {
    // graceful: clear to a neutral background so the canvas isn't garbage
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, s.canvas.width, s.canvas.height);
    gl.clearColor(0.05, 0.06, 0.08, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return;
  }

  const p = state.progs.display;
  gl.useProgram(p.program);
  gl.uniform2f(p.uniforms.uTexel, ...texel(state));
  gl.uniform1f(p.uniforms.uTint, 0.6);
  bindTex(gl, p.uniforms.uDye, 0, state.dye.read.tex);
  if (state.rampTex) bindTex(gl, p.uniforms.uRamp, 1, state.rampTex);
  blit(state, null);
}

function isDone(): boolean {
  return false; // continuous, interactive
}

// ── small GL utilities ────────────────────────────────────────────────────────
function bindTex(
  gl: WebGL2RenderingContext,
  loc: WebGLUniformLocation | null,
  unit: number,
  tex: WebGLTexture,
): void {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  if (loc) gl.uniform1i(loc, unit);
}

function clearFBO(
  gl: WebGL2RenderingContext,
  fbo: FBO,
  r: number,
  g: number,
  b: number,
  a: number,
): void {
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.fbo);
  gl.viewport(0, 0, fbo.width, fbo.height);
  gl.clearColor(r, g, b, a);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

// ── param coercion (Params values are number|boolean|string) ──────────────────
function asNum(v: Params[string] | undefined, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function asStr(v: Params[string] | undefined, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}

// ── export ────────────────────────────────────────────────────────────────────
export const stableFluids: GenerativeSystem<State> = {
  id: "stable-fluids",
  title: "Stable Fluids",
  blurb: "Ink-in-water advection — a substrate for the other systems.",
  tier: "webgl",
  schema,
  init,
  step,
  render,
  isDone,
};
