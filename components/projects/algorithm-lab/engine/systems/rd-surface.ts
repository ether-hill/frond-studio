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
const hexToColor = (hex: string, fallback: string): THREE.Color => {
  try {
    return new THREE.Color(hex);
  } catch {
    return new THREE.Color(fallback);
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
      float gx = vUv.x;
      float gy = vUv.y;
      float wobble = sin(gx * 6.2831) * 0.5 + 0.5;
      F = mix(0.022, 0.058, gy) + (wobble - 0.5) * 0.010;
      K = mix(0.050, 0.065, gx) + (sin(gy * 9.4247) * 0.5) * 0.004;
    }

    float reaction = A * B * B;
    float dA = uDa * lap.x - reaction + F * (1.0 - A);
    float dB = uDb * lap.y + reaction - (F + K) * B;

    A = clamp(A + dA * uDt, 0.0, 1.0);
    B = clamp(B + dB * uDt, 0.0, 1.0);

    gl_FragColor = vec4(A, B, 0.0, 1.0);
  }
`;

// Seed shader — fills A=1 everywhere, B=1 inside a handful of rng-placed disks.
const SEED_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform int   uSeedCount;
  uniform vec3  uSeeds[${MAX_SEEDS}]; // xy = uv centre, z = radius

  void main() {
    float B = 0.0;
    for (int i = 0; i < ${MAX_SEEDS}; i++) {
      if (i >= uSeedCount) break;
      vec3 sd = uSeeds[i];
      // distance with U-wrap so seeds straddling the seam still register
      float dx = abs(vUv.x - sd.x);
      dx = min(dx, 1.0 - dx);
      float dy = vUv.y - sd.y;
      float d = length(vec2(dx, dy));
      if (d < sd.z) B = 1.0;
    }
    gl_FragColor = vec4(1.0, B, 0.0, 1.0);
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

  void main() {
    float B = texture2D(uField, vUv).y;
    // sharpen the pattern a little so spots/stripes read crisply
    float t = smoothstep(0.18, 0.5, B);
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

function seedField(state: State, rng: RNG): void {
  const seeds = new Float32Array(MAX_SEEDS * 3);
  const count = rng.int(6, 12);
  for (let i = 0; i < count; i++) {
    seeds[i * 3 + 0] = rng.next(); // u
    seeds[i * 3 + 1] = rng.range(0.12, 0.88); // v (avoid pole pinch)
    seeds[i * 3 + 2] = rng.range(0.02, 0.06); // radius
  }

  const seedVecs: THREE.Vector3[] = [];
  for (let i = 0; i < MAX_SEEDS; i++) {
    seedVecs.push(new THREE.Vector3(seeds[i * 3], seeds[i * 3 + 1], seeds[i * 3 + 2]));
  }

  const seedMat = new THREE.ShaderMaterial({
    vertexShader: SIM_VERT,
    fragmentShader: SEED_FRAG,
    uniforms: {
      uSeedCount: { value: count },
      uSeeds: { value: seedVecs },
    },
    depthTest: false,
    depthWrite: false,
  });

  const prevMat = state.simQuad.material as THREE.Material;
  state.simQuad.material = seedMat;
  state.renderer.setRenderTarget(state.rtA);
  state.renderer.render(state.simScene, state.simCamera);
  state.renderer.setRenderTarget(state.rtB);
  state.renderer.render(state.simScene, state.simCamera);
  state.renderer.setRenderTarget(null);
  state.simQuad.material = prevMat;
  seedMat.dispose();
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
      },
    });

    const geometry = buildGeometry(meshKind);
    const mesh = new THREE.Mesh(geometry, surfaceMat);
    scene.add(mesh);

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

    // Refresh live HOT uniforms.
    const u = state.simMat.uniforms;
    u.uF.value = num(p, "F", 0.037);
    u.uK.value = num(p, "k", 0.06);
    u.uDa.value = num(p, "Da", 1.0);
    u.uDb.value = num(p, "Db", 0.5);
    u.uVaryFK.value = bool(p, "varyFK", true) ? 1 : 0;
    u.uDt.value = 1.0;

    // Colours (HOT).
    (state.surfaceMat.uniforms.uColorA.value as THREE.Color).set(
      hexToColor(str(p, "colorA", "#0a1418"), "#0a1418"),
    );
    (state.surfaceMat.uniforms.uColorB.value as THREE.Color).set(
      hexToColor(str(p, "colorB", "#e9c46a"), "#e9c46a"),
    );

    // Sub-steps: each is one Gray–Scott iteration, ping-ponging the RTs.
    const substeps = Math.max(1, Math.min(48, int(p, "substeps", 12)));
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

    // Slow rotation.
    const rotate = num(p, "rotate", 0.12);
    state.mesh.rotation.y += rotate * safeDt;
    state.mesh.rotation.x += rotate * 0.35 * safeDt;

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
