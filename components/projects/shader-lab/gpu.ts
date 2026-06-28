// Shader Lab — real-time GLSL flow-field, driven live by a control panel.
//
// In the spirit of the modern three.js "WebGPU + control panel" creative-coding
// workflow, but rendered on a rock-solid WebGL2 fragment-shader path so it runs
// for every visitor. A single full-screen triangle runs an original domain-warped
// fractal-noise field; every parameter below is a uniform the panel mutates live.

import * as THREE from "three";

export type Params = {
  // pattern
  speed: number;
  scale: number;
  warp: number;
  octaves: number;
  ridged: boolean;
  flowX: number;
  flowY: number;
  // colour
  paletteIndex: number;
  hue: number;
  saturation: number;
  brightness: number;
  contrast: number;
  // scene
  mouseInfluence: number;
  vignette: number;
  grain: number;
  paused: boolean;
};

// IQ-style cosine palettes: colour = a + b * cos(2π (c·t + d))
export const PALETTES: { name: string; a: number[]; b: number[]; c: number[]; d: number[] }[] = [
  { name: "Studio",  a: [0.5, 0.45, 0.4], b: [0.45, 0.4, 0.32], c: [1, 1, 1],   d: [0.3, 0.2, 0.12] },
  { name: "Aurora",  a: [0.5, 0.5, 0.5],  b: [0.5, 0.5, 0.5],   c: [1, 1, 1],   d: [0.0, 0.33, 0.67] },
  { name: "Ember",   a: [0.5, 0.32, 0.22],b: [0.5, 0.35, 0.22], c: [1, 1, 0.6], d: [0.0, 0.1, 0.2] },
  { name: "Iris",    a: [0.5, 0.5, 0.55], b: [0.5, 0.45, 0.5],  c: [1, 1, 1],   d: [0.5, 0.2, 0.28] },
  { name: "Magma",   a: [0.5, 0.2, 0.12], b: [0.5, 0.32, 0.2],  c: [1, 1, 1],   d: [0.0, 0.15, 0.3] },
  { name: "Ink",     a: [0.42, 0.42, 0.45],b: [0.4, 0.4, 0.43], c: [1, 1, 1],   d: [0.2, 0.22, 0.28] },
];

export const DEFAULTS: Params = {
  speed: 0.26,
  scale: 3.0,
  warp: 1.7,
  octaves: 5,
  ridged: false,
  flowX: 0.03,
  flowY: 0.016,
  paletteIndex: 0,
  hue: 0.0,
  saturation: 1.12,
  brightness: 1.0,
  contrast: 1.06,
  mouseInfluence: 1.0,
  vignette: 0.6,
  grain: 0.05,
  paused: false,
};

export function randomized(): Params {
  const r = (a: number, b: number) => a + Math.random() * (b - a);
  return {
    speed: +r(0.1, 0.55).toFixed(2),
    scale: +r(1.6, 6).toFixed(2),
    warp: +r(0.6, 3).toFixed(2),
    octaves: Math.round(r(4, 7)),
    ridged: Math.random() < 0.4,
    flowX: +r(-0.05, 0.05).toFixed(3),
    flowY: +r(-0.04, 0.04).toFixed(3),
    paletteIndex: Math.floor(Math.random() * PALETTES.length),
    hue: +r(0, 1).toFixed(2),
    saturation: +r(0.7, 1.4).toFixed(2),
    brightness: +r(0.9, 1.12).toFixed(2),
    contrast: +r(0.92, 1.28).toFixed(2),
    mouseInfluence: +r(0.3, 1.4).toFixed(2),
    vignette: +r(0.3, 0.8).toFixed(2),
    grain: +r(0, 0.1).toFixed(2),
    paused: false,
  };
}

const VERT = /* glsl */ `
precision highp float;
in vec3 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;
in vec2 vUv;
out vec4 frag;

uniform float uTime, uSpeed, uScale, uWarp, uOctaves, uRidged;
uniform float uHue, uSat, uBright, uContrast, uMouseInf, uVignette, uGrain;
uniform vec2  uRes, uMouse, uFlow;
uniform vec3  uPalA, uPalB, uPalC, uPalD;

// precision-stable hash (Dave Hoskins) — holds up at the large coordinates
// the fractal accumulates over many octaves, so noise cells don't facet
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  // quintic smoothstep → C2-continuous, no visible cell faceting
  f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash(i), b = hash(i + vec2(1, 0));
  float c = hash(i + vec2(0, 1)), d = hash(i + vec2(1, 1));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5, tot = 0.0;
  for (int i = 0; i < 8; i++) {
    if (float(i) >= uOctaves) break;
    float n = vnoise(p);
    n = mix(n, abs(n * 2.0 - 1.0), uRidged);
    s += a * n; tot += a;
    p = p * 2.02 + vec2(11.3, 7.7);
    a *= 0.5;
  }
  return s / max(tot, 1e-4);
}
vec3 pal(float t) { return uPalA + uPalB * cos(6.28318 * (uPalC * t + uPalD)); }

void main() {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * asp * uScale;
  float t = uTime * uSpeed;
  p += uFlow * uTime;

  vec2 m = (uMouse - 0.5) * asp * uScale;
  p += (m - p) * clamp(uMouseInf, 0.0, 2.0) * 0.12 * exp(-length(m - p) * 0.35);

  vec2 q = vec2(fbm(p + vec2(0.0, t * 0.25)), fbm(p + vec2(3.1, -t * 0.18)));
  vec2 r = vec2(fbm(p + uWarp * q + vec2(1.7, 9.2)),
                fbm(p + uWarp * q + vec2(8.3, 2.8) - t * 0.1));
  float n = fbm(p + uWarp * r + 0.4 * t);

  vec3 col = pal(n + uHue);
  col += 0.10 * length(r - q);

  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(l), col, uSat);
  col *= uBright;
  col = (col - 0.5) * uContrast + 0.5;

  float vig = smoothstep(1.35, 0.25, length((uv - 0.5) * asp));
  col = mix(col * 0.18, col, mix(1.0, vig, clamp(uVignette, 0.0, 1.0)));

  // animated grain
  float g = hash(uv * uRes + fract(uTime) * 91.7) - 0.5;
  col += g * uGrain;

  col = clamp(col, 0.0, 1.0);
  frag = vec4(col, 1.0);
}
`;

export type Handle = {
  params: Params;
  dispose: () => void;
  exportPNG: () => void;
  backendLabel: string;
  setFps: ((cb: (fps: number) => void) => void);
};

export function createPlayground(container: HTMLElement, initial: Params): Handle {
  const params: Params = { ...initial };

  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.touchAction = "none";
  container.appendChild(canvas);

  const backendLabel = renderer.capabilities.isWebGL2 ? "WebGL2" : "WebGL";

  const scene = new THREE.Scene();
  const camera = new THREE.Camera();

  const uniforms: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uFlow: { value: new THREE.Vector2(params.flowX, params.flowY) },
    uSpeed: { value: params.speed },
    uScale: { value: params.scale },
    uWarp: { value: params.warp },
    uOctaves: { value: params.octaves },
    uRidged: { value: params.ridged ? 1 : 0 },
    uHue: { value: params.hue },
    uSat: { value: params.saturation },
    uBright: { value: params.brightness },
    uContrast: { value: params.contrast },
    uMouseInf: { value: params.mouseInfluence },
    uVignette: { value: params.vignette },
    uGrain: { value: params.grain },
    uPalA: { value: new THREE.Vector3() },
    uPalB: { value: new THREE.Vector3() },
    uPalC: { value: new THREE.Vector3() },
    uPalD: { value: new THREE.Vector3() },
  };

  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  scene.add(quad);

  // pointer (smoothed)
  const targetMouse = new THREE.Vector2(0.5, 0.5);
  const onMove = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    targetMouse.set((e.clientX - rect.left) / rect.width, 1 - (e.clientY - rect.top) / rect.height);
  };
  canvas.addEventListener("pointermove", onMove);

  const resize = () => {
    const r = container.getBoundingClientRect();
    const w = Math.max(1, r.width);
    const h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    (uniforms.uRes.value as THREE.Vector2).set(w, h);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  let fpsCb: ((fps: number) => void) | null = null;
  let frames = 0, fpsT = 0, lastFps = 0;

  const clock = new THREE.Clock();
  let raf = 0;
  let cancelled = false;
  const tmp = new THREE.Vector3();

  const frame = () => {
    if (cancelled) return;
    const dt = Math.min(0.05, clock.getDelta());

    // smooth mouse
    (uniforms.uMouse.value as THREE.Vector2).lerp(targetMouse, 0.08);

    if (!params.paused) (uniforms.uTime.value as number) += dt;

    // push params → uniforms
    uniforms.uSpeed.value = params.speed;
    uniforms.uScale.value = params.scale;
    uniforms.uWarp.value = params.warp;
    uniforms.uOctaves.value = params.octaves;
    uniforms.uRidged.value = params.ridged ? 1 : 0;
    uniforms.uHue.value = params.hue;
    uniforms.uSat.value = params.saturation;
    uniforms.uBright.value = params.brightness;
    uniforms.uContrast.value = params.contrast;
    uniforms.uMouseInf.value = params.mouseInfluence;
    uniforms.uVignette.value = params.vignette;
    uniforms.uGrain.value = params.grain;
    (uniforms.uFlow.value as THREE.Vector2).set(params.flowX, params.flowY);

    const pal = PALETTES[params.paletteIndex] ?? PALETTES[0];
    (uniforms.uPalA.value as THREE.Vector3).fromArray(pal.a);
    (uniforms.uPalB.value as THREE.Vector3).fromArray(pal.b);
    (uniforms.uPalC.value as THREE.Vector3).fromArray(pal.c);
    (uniforms.uPalD.value as THREE.Vector3).fromArray(pal.d);
    void tmp;

    renderer.render(scene, camera);

    frames++; fpsT += dt;
    if (fpsT >= 0.5) {
      lastFps = Math.round(frames / fpsT);
      frames = 0; fpsT = 0;
      if (fpsCb) fpsCb(lastFps);
    }

    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return {
    params,
    backendLabel,
    setFps(cb) { fpsCb = cb; },
    exportPNG() {
      renderer.render(scene, camera);
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `shader-lab-${Date.now()}.png`;
      a.click();
    },
    dispose() {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      quad.geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (canvas.parentElement === container) container.removeChild(canvas);
    },
  };
}
