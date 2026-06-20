// ─────────────────────────────────────────────────────────────────────────────
// Reaction–Diffusion on a Surface — Turing patterns wrapping 3D geometry.
//
// Gray–Scott runs entirely on the GPU in texture space: two ping-pong float
// render targets hold (A, B) in the R/G channels. A sim shader does the
// reaction-diffusion update with a 9-point (4/8 neighbour) Laplacian, several
// sub-steps per frame. The B field is then sampled by the mesh's material in
// UV space and colour-mapped through a two-colour gradient — animal-coat
// patterning wrapping a sphere / torus / displaced "blob". Spatially-varying
// feed/kill (varyFK) lets ONE surface grow several distinct "zoologies" at once.
//
// This is the ONE system permitted to import three directly.
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from "three";
import type {
  GenerativeSystem,
  ParamSchema,
  Params,
  RNG,
  RenderSurface,
  ThreeSurface,
} from "../core/types";

// ── Param schema ─────────────────────────────────────────────────────────────
// F / k / Da / Db / substeps / colours / rotate are HOT — they feed the live sim
// uniforms / look. mesh & simRes are COLD (require a re-init / reset).
const schema: ParamSchema = {
  F: { type: "number", min: 0.01, max: 0.09, step: 0.0005, default: 0.037, hot: true, label: "Feed (F)" },
  k: { type: "number", min: 0.03, max: 0.07, step: 0.0005, default: 0.06, hot: true, label: "Kill (k)" },
  Da: { type: "number", min: 0.2, max: 1.4, step: 0.01, default: 1.0, hot: true, label: "Diffuse A" },
  Db: { type: "number", min: 0.1, max: 0.9, step: 0.01, default: 0.5, hot: true, label: "Diffuse B" },
  mesh: { type: "select", options: ["sphere", "torus", "blob"], default: "sphere", label: "Mesh" },
  varyFK: { type: "bool", default: true, hot: true, label: "Vary F/k (multi-zoology)" },
  simRes: { type: "int", min: 256, max: 512, default: 512, label: "Sim resolution" },
  substeps: { type: "int", min: 2, max: 24, default: 12, hot: true, label: "Sub-steps / frame" },
  colorA: { type: "color", default: "#0a1418", hot: true, label: "Colour A (low B)" },
  colorB: { type: "color", default: "#e9c46a", hot: true, label: "Colour B (high B)" },
  rotate: { type: "number", min: -1, max: 1, step: 0.01, default: 0.12, hot: true, label: "Rotate speed" },
  chaos: { type: "number", min: 0, max: 1, step: 0.01, default: 1.0, hot: true, label: "Chaos" },
};

// ── Param accessors ──────────────────────────────────────────────────────────
const num = (p: Params, key: string, fallback: number): number => {
  const v = p[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
};
const int = (p: Params, key: string, fallback: number): number => {
  return Math.round(num(p, key, fallback));
};
const str = (p: Params, key: string, fallback: string): string => {
  const v = p[key];
  return typeof v === "string" ? v : fallback;
};
const bool = (p: Params, key: string, fallback: boolean): boolean => {
  const v = p[key];
  return typeof v === "boolean" ? v : fallback;
};
const clampNum = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;
const hexToColor = (hex: string, fallback: string): THREE.Color => {
  try {
    return new THREE.Color(hex);
  } catch {
    return new THREE.Color(fallback);
  }
};

// Pull the base hue out of a hex colour so the rainbow cycle starts from the
// user's chosen tint rather than an arbitrary point.
const hexToHue = (hex: string, fallback: number): number => {
  try {
    const hsl = { h: 0, s: 0, l: 0 };
    new THREE.Color(hex).getHSL(hsl);
    return hsl.h;
  } catch {
    return fallback;
  }
};

// ── Seed points (rng-placed B blobs written into the sim init) ────────────────
const MAX_SEEDS = 24;

// ── State ────────────────────────────────────────────────────────────────────
interface State {
  params: Params; // live HOT reference

  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  mesh: THREE.Mesh;
  surfaceMat: THREE.ShaderMaterial;

  // Gray–Scott ping-pong.
  res: number;
  rtA: THREE.WebGLRenderTarget;
  rtB: THREE.WebGLRenderTarget;
  simScene: THREE.Scene;
  simCamera: THREE.OrthographicCamera;
  simMat: THREE.ShaderMaterial;
  simQuad: THREE.Mesh;

  frame: number;
  time: number;
  meshKind: string;

  // Chaos engine.
  tick: number; // internal morphing clock (advances with chaos)
  rng: RNG; // kept live for reseed jolts & wander noise
  nextReseed: number; // tick value at which the next seed-jolt fires
  wanderF: number; // smoothed random-walk offsets on F / k
  wanderK: number;
  hueA: number; // animated base hues for the two coat colours
  hueB: number;
  seedMat: THREE.ShaderMaterial; // persistent material for reseed jolts
  seedVecs: THREE.Vector3[];
}

// ── Shaders ──────────────────────────────────────────────────────────────────

// Sim (Gray–Scott) — runs over a fullscreen quad, sampling the previous RT.
const SIM_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// Wrap sampling so patterns flow across the UV seam (sphere/torus are periodic
// in U). We wrap U and clamp V (poles) — good enough for coherent coats.
const SIM_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform sampler2D uPrev;
  uniform vec2  uTexel;     // 1 / resolution
  uniform float uF;
  uniform float uK;
  uniform float uDa;
  uniform float uDb;
  uniform float uDt;
  uniform float uVaryFK;    // 0 or 1
  uniform float uSpaceTime; // migrating phase for the spatial F/k modulation
  uniform float uChaos;     // 0..1 — amplifies spatial wander

  vec2 sampleAB(vec2 uv) {
    // wrap U (seam), clamp V (poles)
    uv.x = fract(uv.x);
    uv.y = clamp(uv.y, 0.0, 1.0);
    return texture2D(uPrev, uv).xy;
  }

  void main() {
    vec2 c  = sampleAB(vUv);
    vec2 n  = sampleAB(vUv + vec2(0.0,  uTexel.y));
    vec2 s  = sampleAB(vUv + vec2(0.0, -uTexel.y));
    vec2 e  = sampleAB(vUv + vec2( uTexel.x, 0.0));
    vec2 w  = sampleAB(vUv + vec2(-uTexel.x, 0.0));
    vec2 ne = sampleAB(vUv + vec2( uTexel.x,  uTexel.y));
    vec2 nw = sampleAB(vUv + vec2(-uTexel.x,  uTexel.y));
    vec2 se = sampleAB(vUv + vec2( uTexel.x, -uTexel.y));
    vec2 sw = sampleAB(vUv + vec2(-uTexel.x, -uTexel.y));

    // 9-point Laplacian (Gray–Scott canonical weights).
    vec2 lap = (n + s + e + w) * 0.2 + (ne + nw + se + sw) * 0.05 - c;

    float A = c.x;
    float B = c.y;

    float F = uF;
    float K = uK;
    if (uVaryFK > 0.5) {
      // Smooth spatial gradients in F/k → several Turing regimes on one surface.
      // The whole modulation slowly MIGRATES & rotates (uSpaceTime) so the
      // distinct zoologies drift across the surface instead of sitting still.
      float ph = uSpaceTime;
      // rotate the uv field about (0.5, 0.5) so bands sweep around
      vec2 q = vUv - 0.5;
      float ca = cos(ph * 0.17);
      float sa = sin(ph * 0.17);
      vec2 r = vec2(ca * q.x - sa * q.y, sa * q.x + ca * q.y) + 0.5;
      float gx = fract(r.x + ph * 0.05);
      float gy = clamp(r.y + 0.12 * sin(ph * 0.23), 0.0, 1.0);
      float amp = 0.5 + 0.5 * uChaos;
      float wobble = sin(gx * 6.2831 + ph) * 0.5 + 0.5;
      F = mix(0.022, 0.058, gy) + (wobble - 0.5) * 0.010 * amp
          + 0.006 * amp * sin((gx + gy) * 12.566 + ph * 1.7);
      K = mix(0.050, 0.065, gx) + (sin(gy * 9.4247 + ph * 0.8) * 0.5) * 0.004 * amp
          + 0.0035 * amp * cos(gx * 15.7 - ph * 1.1);
      // keep both clamped inside the live Turing regime
      F = clamp(F, 0.010, 0.090);
      K = clamp(K, 0.045, 0.070);
    }

    float reaction = A * B * B;
    float dA = uDa * lap.x - reaction + F * (1.0 - A);
    float dB = uDb * lap.y + reaction - (F + K) * B;

    A = clamp(A + dA * uDt, 0.0, 1.0);
    B = clamp(B + dB * uDt, 0.0, 1.0);

    gl_FragColor = vec4(A, B, 0.0, 1.0);
  }
`;

// Seed shader — for the initial fill it sets A=1 everywhere and B=1 inside a
// handful of rng-placed disks. For a "jolt" (uInject = 1) it instead samples the
// LIVE field and only paints fresh B blobs on top, so new pattern fronts erupt
// without wiping the existing coat.
const SEED_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform int   uSeedCount;
  uniform vec3  uSeeds[${MAX_SEEDS}]; // xy = uv centre, z = radius
  uniform float uInject;              // 0 = full reseed, 1 = additive jolt
  uniform sampler2D uPrev;            // live field (used when uInject == 1)

  void main() {
    vec2 ab = texture2D(uPrev, vUv).xy;
    float A = mix(1.0, ab.x, uInject);
    float B = mix(0.0, ab.y, uInject);
    for (int i = 0; i < ${MAX_SEEDS}; i++) {
      if (i >= uSeedCount) break;
      vec3 sd = uSeeds[i];
      // distance with U-wrap so seeds straddling the seam still register
      float dx = abs(vUv.x - sd.x);
      dx = min(dx, 1.0 - dx);
      float dy = vUv.y - sd.y;
      float d = length(vec2(dx, dy));
      if (d < sd.z) { B = 1.0; A = mix(A, 0.5, 0.5); }
    }
    gl_FragColor = vec4(A, B, 0.0, 1.0);
  }
`;

// Surface material — samples B from the sim RT in UV space, maps through a
// two-colour gradient with a touch of shading for legibility.
const SURF_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SURF_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  varying vec3 vNormal;

  uniform sampler2D uField;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uContrast; // pulsing edge sharpness for the pattern

  void main() {
    float B = texture2D(uField, vUv).y;
    // sharpen the pattern — edge width pulses with uContrast for extra life
    float lo = mix(0.26, 0.10, uContrast);
    float hi = mix(0.42, 0.58, uContrast);
    float t = smoothstep(lo, hi, B);
    vec3 base = mix(uColorA, uColorB, t);

    // gentle hemispheric shading so the 3D form stays readable
    vec3 N = normalize(vNormal);
    float light = 0.55 + 0.45 * clamp(dot(N, normalize(vec3(0.4, 0.7, 0.6))), 0.0, 1.0);

    gl_FragColor = vec4(base * light, 1.0);
  }
`;

// ── Geometry builders ────────────────────────────────────────────────────────
function buildGeometry(kind: string): THREE.BufferGeometry {
  if (kind === "torus") {
    return new THREE.TorusGeometry(0.95, 0.4, 180, 360);
  }
  if (kind === "blob") {
    // Sphere with smooth radial vertex displacement — keeps clean sphere UVs.
    const geo = new THREE.SphereGeometry(1.15, 256, 256);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n = v.clone().normalize();
      const disp =
        0.16 * Math.sin(n.x * 3.0 + 1.3) * Math.cos(n.y * 3.0) +
        0.10 * Math.sin(n.z * 4.0 + 0.7) +
        0.07 * Math.cos(n.x * 5.0 - n.y * 2.0);
      v.addScaledVector(n, disp);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }
  // default: sphere
  return new THREE.SphereGeometry(1.25, 256, 256);
}

// ── Sim helpers ──────────────────────────────────────────────────────────────
function makeRenderTarget(res: number): THREE.WebGLRenderTarget {
  const type = THREE.HalfFloatType; // robust across WebGL2 devices
  return new THREE.WebGLRenderTarget(res, res, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.RepeatWrapping, // wrap U for the seam
    wrapT: THREE.ClampToEdgeWrapping,
    type,
    format: THREE.RGBAFormat,
    depthBuffer: false,
    stencilBuffer: false,
  });
}

// Build the persistent seed material + its seed-vector array (reused for both
// the initial fill and the running reseed jolts).
function makeSeedMaterial(): { mat: THREE.ShaderMaterial; vecs: THREE.Vector3[] } {
  const vecs: THREE.Vector3[] = [];
  for (let i = 0; i < MAX_SEEDS; i++) vecs.push(new THREE.Vector3(0, 0, 0));
  const mat = new THREE.ShaderMaterial({
    vertexShader: SIM_VERT,
    fragmentShader: SEED_FRAG,
    uniforms: {
      uSeedCount: { value: 0 },
      uSeeds: { value: vecs },
      uInject: { value: 0 },
      uPrev: { value: null as THREE.Texture | null },
    },
    depthTest: false,
    depthWrite: false,
  });
  return { mat, vecs };
}

// Initial seed: full reseed (A=1 everywhere, B blobs) written into both targets.
function seedField(state: State, rng: RNG): void {
  const count = rng.int(6, 12);
  for (let i = 0; i < MAX_SEEDS; i++) {
    state.seedVecs[i].set(
      rng.next(), // u
      rng.range(0.12, 0.88), // v (avoid pole pinch)
      i < count ? rng.range(0.02, 0.06) : 0, // radius
    );
  }
  const su = state.seedMat.uniforms;
  su.uSeedCount.value = count;
  su.uInject.value = 0;
  su.uPrev.value = null;

  const renderer = state.renderer;
  const prevMat = state.simQuad.material as THREE.Material;
  state.simQuad.material = state.seedMat;
  renderer.setRenderTarget(state.rtA);
  renderer.render(state.simScene, state.simCamera);
  renderer.setRenderTarget(state.rtB);
  renderer.render(state.simScene, state.simCamera);
  renderer.setRenderTarget(null);
  state.simQuad.material = prevMat;
}

// Reseed jolt: additively inject a few fresh B blobs into the LIVE field so new
// pattern fronts keep erupting without wiping what's already there.
function reseedJolt(state: State, rng: RNG): void {
  const count = rng.int(3, 8);
  for (let i = 0; i < MAX_SEEDS; i++) {
    state.seedVecs[i].set(
      rng.next(),
      rng.range(0.1, 0.9),
      i < count ? rng.range(0.015, 0.05) : 0,
    );
  }
  const su = state.seedMat.uniforms;
  su.uSeedCount.value = count;
  su.uInject.value = 1;
  su.uPrev.value = state.rtA.texture; // read current front buffer

  const renderer = state.renderer;
  const prevTarget = renderer.getRenderTarget();
  const prevAutoClear = renderer.autoClear;
  renderer.autoClear = false;
  const prevMat = state.simQuad.material as THREE.Material;
  state.simQuad.material = state.seedMat;
  // render into the back buffer, then swap so rtA holds the jolted field
  renderer.setRenderTarget(state.rtB);
  renderer.render(state.simScene, state.simCamera);
  const tmp = state.rtA;
  state.rtA = state.rtB;
  state.rtB = tmp;
  state.simQuad.material = prevMat;
  renderer.setRenderTarget(prevTarget);
  renderer.autoClear = prevAutoClear;
}

// ── Camera / scene wiring ────────────────────────────────────────────────────
function setupCamera(surface: ThreeSurface): THREE.PerspectiveCamera {
  const aspect = surface.width > 0 && surface.height > 0 ? surface.width / surface.height : 1;
  const cam = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
  cam.position.set(0, 0, 4.2);
  cam.lookAt(0, 0, 0);
  return cam;
}

// ── System ───────────────────────────────────────────────────────────────────
export const rdSurface: GenerativeSystem<State> = {
  id: "rd-surface",
  title: "Reaction–Diffusion on a Surface",
  blurb: "Turing patterns wrapping 3D geometry — animal-coat patterning.",
  tier: "three",
  schema,

  init(surface: RenderSurface, params: Params, rng: RNG): State {
    const s = surface as ThreeSurface;
    const renderer = s.renderer as THREE.WebGLRenderer;

    renderer.setClearColor(new THREE.Color("#07090c"), 1);
    renderer.autoClear = true;

    const res = Math.max(64, Math.min(1024, int(params, "simRes", 512)));
    const meshKind = str(params, "mesh", "sphere");

    // ── Sim scene (fullscreen quad) ──
    const simScene = new THREE.Scene();
    const simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const rtA = makeRenderTarget(res);
    const rtB = makeRenderTarget(res);

    const simMat = new THREE.ShaderMaterial({
      vertexShader: SIM_VERT,
      fragmentShader: SIM_FRAG,
      uniforms: {
        uPrev: { value: rtA.texture },
        uTexel: { value: new THREE.Vector2(1 / res, 1 / res) },
        uF: { value: num(params, "F", 0.037) },
        uK: { value: num(params, "k", 0.06) },
        uDa: { value: num(params, "Da", 1.0) },
        uDb: { value: num(params, "Db", 0.5) },
        uDt: { value: 1.0 },
        uVaryFK: { value: bool(params, "varyFK", true) ? 1 : 0 },
        uSpaceTime: { value: 0 },
        uChaos: { value: num(params, "chaos", 0.85) },
      },
      depthTest: false,
      depthWrite: false,
    });

    const simQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMat);
    simQuad.frustumCulled = false;
    simScene.add(simQuad);

    // ── Display scene ──
    const scene = new THREE.Scene();
    const camera = setupCamera(s);

    const surfaceMat = new THREE.ShaderMaterial({
      vertexShader: SURF_VERT,
      fragmentShader: SURF_FRAG,
      uniforms: {
        uField: { value: rtA.texture },
        uColorA: { value: hexToColor(str(params, "colorA", "#0a1418"), "#0a1418") },
        uColorB: { value: hexToColor(str(params, "colorB", "#e9c46a"), "#e9c46a") },
        uContrast: { value: 0.5 },
      },
    });

    const geometry = buildGeometry(meshKind);
    const mesh = new THREE.Mesh(geometry, surfaceMat);
    scene.add(mesh);

    const seed = makeSeedMaterial();

    const state: State = {
      params,
      renderer,
      scene,
      camera,
      mesh,
      surfaceMat,
      res,
      rtA,
      rtB,
      simScene,
      simCamera,
      simMat,
      simQuad,
      frame: 0,
      time: 0,
      meshKind,
      tick: 0,
      rng,
      nextReseed: rng.range(1.5, 4.0),
      wanderF: 0,
      wanderK: 0,
      hueA: hexToHue(str(params, "colorA", "#0a1418"), 0.55),
      hueB: hexToHue(str(params, "colorB", "#e9c46a"), 0.12),
      seedMat: seed.mat,
      seedVecs: seed.vecs,
    };

    // Seed the initial B field into both targets.
    seedField(state, rng);

    return state;
  },

  step(state: State, dt: number): State {
    const p = state.params;
    const safeDt = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.1) : 1 / 60;
    state.time += safeDt;
    state.frame++;

    const chaos = Math.max(0, Math.min(1, num(p, "chaos", 0.85)));
    const rng = state.rng;

    // The internal morphing clock runs faster with chaos so the whole circus
    // speeds up as the user dials it in.
    state.tick += safeDt * (0.4 + chaos * 1.6);
    const tick = state.tick;

    // ── 1. MORPHING REGIME ──────────────────────────────────────────────────
    // Continuously WANDER F and k around the user's chosen base values, mixing
    // smooth multi-frequency sines with a clamped random walk. This keeps the
    // Turing pattern endlessly drifting between spots / stripes / mazes /
    // mitosis instead of ever settling.
    const baseF = num(p, "F", 0.037);
    const baseK = num(p, "k", 0.06);

    // random walk (decays toward 0, kicked by rng) scaled by chaos
    state.wanderF += (rng.next() - 0.5) * 0.6 * safeDt * chaos;
    state.wanderK += (rng.next() - 0.5) * 0.6 * safeDt * chaos;
    state.wanderF *= 0.96;
    state.wanderK *= 0.96;
    state.wanderF = Math.max(-1, Math.min(1, state.wanderF));
    state.wanderK = Math.max(-1, Math.min(1, state.wanderK));

    const oscF =
      Math.sin(tick * 0.37) * 0.6 +
      Math.sin(tick * 0.91 + 1.7) * 0.4 +
      state.wanderF;
    const oscK =
      Math.cos(tick * 0.29) * 0.6 +
      Math.sin(tick * 0.67 + 0.5) * 0.4 +
      state.wanderK;

    // wander amplitudes (scaled by chaos), then clamp into the live regime
    const liveF = clampNum(baseF + oscF * 0.022 * chaos, 0.01, 0.09);
    const liveK = clampNum(baseK + oscK * 0.011 * chaos, 0.045, 0.07);

    // Refresh live HOT uniforms.
    const u = state.simMat.uniforms;
    u.uF.value = liveF;
    u.uK.value = liveK;
    u.uDa.value = num(p, "Da", 1.0);
    u.uDb.value = num(p, "Db", 0.5);
    u.uVaryFK.value = bool(p, "varyFK", true) ? 1 : 0;
    u.uChaos.value = chaos;
    u.uDt.value = 1.0;

    // ── 2. SPATIAL CHAOS ────────────────────────────────────────────────────
    // Advance the migrating phase so the spatial F/k modulation rotates & drifts
    // across the surface (the zoologies wander).
    u.uSpaceTime.value = tick * (0.5 + chaos * 1.5);

    // ── 4. COLOUR CHURN ─────────────────────────────────────────────────────
    // Cycle both coat hues through the rainbow (offset so A & B stay distinct),
    // and pulse the pattern contrast. Vivid saturation.
    const hueRate = (0.02 + chaos * 0.12) * safeDt * 6.0;
    state.hueA = (state.hueA + hueRate) % 1;
    state.hueB = (state.hueB + hueRate * 1.3 + 1) % 1;
    const satA = 0.45 + 0.45 * chaos;
    const satB = 0.6 + 0.4 * chaos;
    (state.surfaceMat.uniforms.uColorA.value as THREE.Color).setHSL(
      state.hueA,
      satA,
      0.12 + 0.06 * Math.sin(tick * 0.5),
    );
    (state.surfaceMat.uniforms.uColorB.value as THREE.Color).setHSL(
      state.hueB,
      satB,
      0.55 + 0.12 * Math.sin(tick * 0.8 + 1.1),
    );
    state.surfaceMat.uniforms.uContrast.value =
      0.5 + 0.5 * Math.sin(tick * (0.6 + chaos)) * (0.4 + 0.6 * chaos);

    // ── 3. RESEED JOLTS ─────────────────────────────────────────────────────
    // Occasionally inject fresh B blobs so new pattern fronts keep erupting.
    if (tick >= state.nextReseed) {
      reseedJolt(state, rng);
      // sooner & more frequent jolts as chaos rises
      const gap = (4.5 - chaos * 3.2) * rng.range(0.6, 1.4);
      state.nextReseed = tick + Math.max(0.4, gap);
    }

    // Sub-steps: each is one Gray–Scott iteration, ping-ponging the RTs.
    // More substeps with chaos → faster evolution.
    const baseSub = Math.max(1, Math.min(48, int(p, "substeps", 12)));
    const substeps = Math.max(1, Math.min(48, Math.round(baseSub * (1 + chaos))));
    const renderer = state.renderer;
    const prevTarget = renderer.getRenderTarget();
    const prevAutoClear = renderer.autoClear;
    renderer.autoClear = false;

    for (let i = 0; i < substeps; i++) {
      // read from rtA, write to rtB
      u.uPrev.value = state.rtA.texture;
      renderer.setRenderTarget(state.rtB);
      renderer.render(state.simScene, state.simCamera);
      // swap
      const tmp = state.rtA;
      state.rtA = state.rtB;
      state.rtB = tmp;
    }

    renderer.setRenderTarget(prevTarget);
    renderer.autoClear = prevAutoClear;

    // The mesh samples the most-recent field (rtA after the final swap).
    state.surfaceMat.uniforms.uField.value = state.rtA.texture;

    // ── 5. FASTER & SPIN ────────────────────────────────────────────────────
    // Lively tumble on two axes; spin speeds up with chaos and wobbles in time.
    const rotate = num(p, "rotate", 0.12);
    const spin = rotate * (1 + chaos * 2.5);
    state.mesh.rotation.y += spin * safeDt;
    state.mesh.rotation.x += spin * (0.4 + 0.3 * Math.sin(tick * 0.3)) * safeDt;
    state.mesh.rotation.z += spin * 0.18 * chaos * safeDt;

    return state;
  },

  render(state: State, surface: RenderSurface): void {
    const s = surface as ThreeSurface;
    const renderer = state.renderer as THREE.WebGLRenderer;

    // Keep camera aspect in sync with the surface size.
    const aspect = s.width > 0 && s.height > 0 ? s.width / s.height : 1;
    if (Math.abs(state.camera.aspect - aspect) > 1e-4) {
      state.camera.aspect = aspect;
      state.camera.updateProjectionMatrix();
    }

    // Ensure the field uniform points at the current front buffer.
    state.surfaceMat.uniforms.uField.value = state.rtA.texture;

    renderer.setRenderTarget(null);
    renderer.render(state.scene, state.camera);
  },

  isDone(_state: State): boolean {
    return false;
  },
};
