// Render Inspector — a faithful recreation, in vanilla three.js, of Faraz Shaikh's
// "ThreeJS WebGPU Inspector in React-Three-Fiber" demo
// (https://farazzshaikh.com/demos/demo-2026-r3f-inspector).
//
// The original is React-Three-Fiber + three's WebGPU/TSL pipeline. This studio
// runs vanilla three.js on WebGL2, so this is an original reimplementation of the
// same scene: a glass (transmission) solid spinning in front of glowing emissive
// 3D text, lit by an environment, grounded with a soft shadow, and finished with a
// selective bloom — every knob below driven live by the control panel, with a
// renderer "inspector" readout. Concept & design © Faraz Shaikh; code original.

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

export type Shape = "Torus Knot" | "Icosahedron" | "Tetrahedron";

export type Params = {
  text: string;
  spin: boolean;
  speed: number;
  roughness: number;
  thickness: number;
  shape: Shape;
  textColor: string;
  bloom: number;
};

export const DEFAULTS: Params = {
  text: "Hello, world!",
  spin: true,
  speed: 0.6,
  roughness: 0.08,
  thickness: 0.25,
  shape: "Torus Knot",
  textColor: "#ff2a2a",
  bloom: 0.3,
};

export type Info = { calls: number; tris: number; geometries: number; textures: number; programs: number };

export type Handle = {
  params: Params;
  dispose: () => void;
  exportPNG: () => void;
  info: () => Info;
  setFps: (cb: (fps: number) => void) => void;
  backendLabel: string;
};

function buildGeometry(shape: Shape): THREE.BufferGeometry {
  switch (shape) {
    case "Torus Knot": return new THREE.TorusKnotGeometry(1, 0.4, 256, 48);
    case "Icosahedron": return new THREE.IcosahedronGeometry(1.5, 0);
    case "Tetrahedron": return new THREE.TetrahedronGeometry(1.5, 0);
  }
}

export function createScene(container: HTMLElement, initial: Params): Handle {
  const params: Params = { ...initial };

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.info.autoReset = false; // accumulate across the composer's passes
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.touchAction = "none";
  container.appendChild(canvas);
  const backendLabel = renderer.capabilities.isWebGL2 ? "WebGL2" : "WebGL";

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#252525");

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 2.2, 12);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 2, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 4;
  controls.maxDistance = 16;
  controls.update();

  // environment (reflections / refractions for the glass)
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new RoomEnvironment();
  const envRT = pmrem.fromScene(envScene, 0.04);
  scene.environment = envRT.texture;

  // key light for the grounded contact shadow
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(2, 9, 3);
  key.target.position.set(0, 1.4, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 12;
  key.shadow.bias = -0.0005;
  const sc = key.shadow.camera;
  sc.near = 0.5; sc.far = 30; sc.left = -5; sc.right = 5; sc.top = 5; sc.bottom = -5;
  scene.add(key, key.target);
  scene.add(new THREE.AmbientLight(0xffffff, 0.15));

  // soft "contact" shadow on a transparent ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.ShadowMaterial({ opacity: 0.55 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);

  // glass solid
  const glassMat = new THREE.MeshPhysicalMaterial({
    transmission: 1,
    metalness: 0,
    roughness: params.roughness,
    thickness: params.thickness,
    ior: 1.35,
    envMapIntensity: 1.1,
    clearcoat: 0.5,
    clearcoatRoughness: 0.18,
  });
  let geom = buildGeometry(params.shape);
  const solid = new THREE.Mesh(geom, glassMat);
  solid.position.set(0, 2, 0);
  solid.castShadow = true;
  scene.add(solid);

  // glowing text behind the glass, drawn to a canvas texture on a flat plane.
  // Robust + perfectly sized for any string; the HDR colour tint (>1) keeps it
  // bright so the selective bloom pass turns it into a glow.
  const textGroup = new THREE.Group();
  textGroup.position.set(0, 2, -2.6);
  scene.add(textGroup);
  const textMat = new THREE.MeshBasicMaterial({
    transparent: true,
    toneMapped: false,
    depthWrite: false,
    color: new THREE.Color(2.4, 2.4, 2.4),
  });
  const textPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), textMat);
  textGroup.add(textPlane);

  const TEXT_H = 1.35; // world height of the text band
  const rebuildText = () => {
    const text = params.text || " ";
    const fontPx = 180;
    const pad = 48;
    const c = document.createElement("canvas");
    const cx = c.getContext("2d")!;
    const fontSpec = `700 ${fontPx}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
    cx.font = fontSpec;
    const wTxt = Math.max(2, Math.ceil(cx.measureText(text).width));
    c.width = wTxt + pad * 2;
    c.height = fontPx + pad * 2;
    cx.font = fontSpec; // resizing the canvas resets context state
    cx.textAlign = "center";
    cx.textBaseline = "middle";
    cx.fillStyle = params.textColor;
    cx.fillText(text, c.width / 2, c.height / 2);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    if (textMat.map) textMat.map.dispose();
    textMat.map = tex;
    textMat.needsUpdate = true;
    textPlane.scale.set(TEXT_H * (c.width / c.height), TEXT_H, 1);
  };
  rebuildText();

  // ---- post: selective bloom ----
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), params.bloom, 0.4, 1.0);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  const resize = () => {
    const r = container.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  // track param changes that need a rebuild
  let lastShape = params.shape;
  let lastText = params.text;
  let lastColor = params.textColor;

  let fpsCb: ((n: number) => void) | null = null;
  let frames = 0, fpsAcc = 0;
  const clock = new THREE.Clock();
  let raf = 0;
  let cancelled = false;

  const frame = () => {
    if (cancelled) return;
    const dt = Math.min(0.05, clock.getDelta());

    if (params.shape !== lastShape) {
      lastShape = params.shape;
      const ng = buildGeometry(params.shape);
      solid.geometry.dispose();
      solid.geometry = ng;
      geom = ng;
    }
    if (params.text !== lastText) { lastText = params.text; rebuildText(); }
    if (params.textColor !== lastColor) { lastColor = params.textColor; rebuildText(); }

    glassMat.roughness = params.roughness;
    glassMat.thickness = params.thickness;
    bloomPass.strength = params.bloom;

    if (params.spin) {
      solid.rotation.z += dt * params.speed;
      solid.rotation.x += dt * params.speed;
    }

    controls.update();
    renderer.info.reset();
    composer.render();

    frames++; fpsAcc += dt;
    if (fpsAcc >= 0.5) { if (fpsCb) fpsCb(Math.round(frames / fpsAcc)); frames = 0; fpsAcc = 0; }

    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return {
    params,
    backendLabel,
    setFps(cb) { fpsCb = cb; },
    info() {
      const i = renderer.info;
      return {
        calls: i.render.calls,
        tris: i.render.triangles,
        geometries: i.memory.geometries,
        textures: i.memory.textures,
        programs: i.programs?.length ?? 0,
      };
    },
    exportPNG() {
      composer.render();
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url; a.download = `render-inspector-${Date.now()}.png`; a.click();
    },
    dispose() {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      composer.dispose();
      glassMat.dispose();
      textMat.map?.dispose();
      textMat.dispose();
      solid.geometry.dispose();
      textPlane.geometry.dispose();
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (canvas.parentElement === container) container.removeChild(canvas);
    },
  };
}
