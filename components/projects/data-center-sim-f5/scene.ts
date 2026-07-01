// Data Center Sim F5 — 3D diorama renderer (three.js).
//
// A floating high-desert plateau you build on: white server halls with glass
// strips, chiller plants with spinning fans, grid substations under a lattice
// pylon, tilted solar arrays, battery containers and a fiber mast. The whole
// scene lives on the engine's clock — the sun arcs overhead, dusk floods the
// plate orange, stars come out, windows and status LEDs glow, solar panels go
// dark. Left-drag paints the selected tool, right-drag orbits, wheel zooms.

import * as THREE from "three";
import {
  DataCenterF5,
  SPECS,
  CODE,
  ambientAt,
  solarFactorAt,
  type BuildingType,
  type Tool,
  type Hud,
  type Toast,
} from "./engine";

export type Ctrl = { tool: Tool; paused: boolean; speed: number; heat: boolean };
export type SceneHandle = { dispose: () => void };

const CELL = 1.05;
const SIM_HOURS_PER_SEC = 2.4;
const APRON = 5.6; // desert ring around the buildable pad

// ---- palette ----
const COL = {
  sandTop: 0xd8b98a,
  sandDark: 0xc4a171,
  strataA: 0xb98a5e,
  strataB: 0x9a6b47,
  strataC: 0x7c5236,
  rock: 0xa88a68,
  scrub: 0x7d8455,
  scrubDry: 0x9a9060,
  cactus: 0x5f7d4a,
  pad: 0xb9b2a4,
  padLine: 0x8f887a,
  road: 0x6b6257,
  white: 0xe8eaec,
  siding: 0xcdd2d6,
  navy: 0x2a3850,
  graphite: 0x3c3f45,
  metal: 0x7d8188,
  metalDark: 0x53565c,
  glass: 0x8fc3e8,
  solarCell: 0x16223e,
  ledOk: 0x59e0a0,
  ledWarn: 0xf0b64e,
  ledBad: 0xff5f45,
  beacon: 0xff4838,
  window: 0xffd98a,
};

// deterministic scatter
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function softCircleTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,0.95)");
  grad.addColorStop(0.45, "rgba(255,255,255,0.5)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createScene(opts: {
  container: HTMLElement;
  engine: DataCenterF5;
  getCtrl: () => Ctrl;
  onHud: (h: Hud) => void;
  onToasts: (t: Toast[]) => void;
}): SceneHandle {
  const { container, engine, getCtrl, onHud, onToasts } = opts;
  const W = engine.w;
  const H = engine.h;

  const padHalfW = (W * CELL) / 2;
  const padHalfD = (H * CELL) / 2;
  const plateHalfW = padHalfW + APRON;
  const plateHalfD = padHalfD + APRON * 0.82;
  const plateR = Math.max(plateHalfW, plateHalfD);

  // ---- renderer ----
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(1.6, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.touchAction = "none";
  renderer.domElement.style.cursor = "crosshair";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0e1a);
  scene.fog = new THREE.Fog(0x0a0e1a, plateR * 3.2, plateR * 9);

  // ---- camera (hand-rolled orbit) ----
  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 420);
  const target = new THREE.Vector3(0, 0.35, 0);
  const cam = { az: -0.68, pol: 0.92, rad: plateR * 2.25 };
  const RAD_MIN = plateR * 0.9;
  const RAD_MAX = plateR * 3.6;
  const placeCamera = () => {
    const sp = Math.sin(cam.pol);
    camera.position.set(
      target.x + cam.rad * sp * Math.sin(cam.az),
      target.y + cam.rad * Math.cos(cam.pol),
      target.z + cam.rad * sp * Math.cos(cam.az)
    );
    camera.lookAt(target);
  };
  placeCamera();

  // ---- lights ----
  const hemi = new THREE.HemisphereLight(0xbdd6f2, 0x8a6f50, 0.7);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2dc, 1.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 4;
  sun.shadow.camera.far = 120;
  const sc = plateR * 1.35;
  sun.shadow.camera.left = -sc;
  sun.shadow.camera.right = sc;
  sun.shadow.camera.top = sc;
  sun.shadow.camera.bottom = -sc;
  sun.shadow.bias = -0.0006;
  scene.add(sun, sun.target);
  const moon = new THREE.DirectionalLight(0x9fb4de, 0.0);
  scene.add(moon);
  const fill = new THREE.AmbientLight(0x30364a, 0.35);
  scene.add(fill);

  // ---- sky bodies & stars ----
  const glow = softCircleTexture();
  const sunSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glow, color: 0xffe9b0, transparent: true, depthWrite: false, fog: false })
  );
  sunSprite.scale.setScalar(plateR * 1.35);
  scene.add(sunSprite);
  const moonSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glow, color: 0xcfdcf5, transparent: true, depthWrite: false, fog: false })
  );
  moonSprite.scale.setScalar(plateR * 0.55);
  scene.add(moonSprite);

  const starRng = mulberry32(1234);
  const starN = 340;
  const starPos = new Float32Array(starN * 3);
  for (let i = 0; i < starN; i++) {
    const az = starRng() * Math.PI * 2;
    const el = Math.asin(0.08 + starRng() * 0.92);
    const r = plateR * 7.5;
    starPos[i * 3] = r * Math.cos(el) * Math.sin(az);
    starPos[i * 3 + 1] = r * Math.sin(el);
    starPos[i * 3 + 2] = r * Math.cos(el) * Math.cos(az);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    size: plateR * 0.16,
    map: glow,
    color: 0xdfe8ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    sizeAttenuation: true,
    fog: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.frustumCulled = false;
  scene.add(stars);

  // =====================================================================
  // TERRAIN — floating desert plate with strata sides
  // =====================================================================
  const world = new THREE.Group();
  scene.add(world);

  const rng = mulberry32(20260701);

  // ground texture: sand, wash, campus pad + grid, road — one canvas does it all
  const texW = 1024;
  const texH = Math.round((texW * plateHalfD) / plateHalfW);
  const gc = document.createElement("canvas");
  gc.width = texW;
  gc.height = texH;
  const g = gc.getContext("2d")!;
  const px = (wx: number) => ((wx + plateHalfW) / (plateHalfW * 2)) * texW;
  const pz = (wz: number) => ((wz + plateHalfD) / (plateHalfD * 2)) * texH;

  // sand base + speckle
  g.fillStyle = "#d8b98a";
  g.fillRect(0, 0, texW, texH);
  for (let i = 0; i < 5200; i++) {
    const a = rng();
    g.fillStyle = a < 0.5 ? "rgba(160,120,74,0.16)" : "rgba(240,220,180,0.14)";
    const s = 1 + rng() * 2.6;
    g.fillRect(rng() * texW, rng() * texH, s, s);
  }
  // dry wash meandering across the north apron
  g.strokeStyle = "rgba(150,110,70,0.5)";
  g.lineWidth = texW * 0.016;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(0, pz(-plateHalfD * 0.62));
  for (let x = 0; x <= 1; x += 0.1) {
    g.lineTo(x * texW, pz(-plateHalfD * 0.62 + Math.sin(x * 9.2) * 0.9 + Math.sin(x * 3.1) * 0.7));
  }
  g.stroke();
  g.strokeStyle = "rgba(120,86,52,0.35)";
  g.lineWidth = texW * 0.006;
  g.stroke();
  // access road from the east edge to the pad
  g.fillStyle = "#6b6257";
  const roadZ0 = pz(-1.1), roadZ1 = pz(1.1);
  g.fillRect(px(padHalfW), roadZ0, texW - px(padHalfW), roadZ1 - roadZ0);
  g.strokeStyle = "rgba(235,225,200,0.75)";
  g.lineWidth = 2;
  g.setLineDash([14, 12]);
  g.beginPath();
  g.moveTo(px(padHalfW), (roadZ0 + roadZ1) / 2);
  g.lineTo(texW, (roadZ0 + roadZ1) / 2);
  g.stroke();
  g.setLineDash([]);
  // campus pad
  const padX0 = px(-padHalfW - 0.35), padX1 = px(padHalfW + 0.35);
  const padZ0 = pz(-padHalfD - 0.35), padZ1 = pz(padHalfD + 0.35);
  g.fillStyle = "#b9b2a4";
  g.fillRect(padX0, padZ0, padX1 - padX0, padZ1 - padZ0);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = rng() < 0.5 ? "rgba(140,132,118,0.18)" : "rgba(230,225,214,0.16)";
    g.fillRect(padX0 + rng() * (padX1 - padX0), padZ0 + rng() * (padZ1 - padZ0), 2, 2);
  }
  // tile grid lines
  g.strokeStyle = "rgba(120,112,98,0.55)";
  g.lineWidth = 1.5;
  for (let ix = 0; ix <= W; ix++) {
    const wx = -padHalfW + ix * CELL;
    g.beginPath();
    g.moveTo(px(wx), pz(-padHalfD));
    g.lineTo(px(wx), pz(padHalfD));
    g.stroke();
  }
  for (let iy = 0; iy <= H; iy++) {
    const wz = -padHalfD + iy * CELL;
    g.beginPath();
    g.moveTo(px(-padHalfW), pz(wz));
    g.lineTo(px(padHalfW), pz(wz));
    g.stroke();
  }
  // pad border
  g.strokeStyle = "rgba(90,84,72,0.8)";
  g.lineWidth = 3;
  g.strokeRect(padX0, padZ0, padX1 - padX0, padZ1 - padZ0);

  const groundTex = new THREE.CanvasTexture(gc);
  groundTex.colorSpace = THREE.SRGBColorSpace;
  groundTex.anisotropy = 4;

  const topMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.96, metalness: 0 });
  const top = new THREE.Mesh(new THREE.PlaneGeometry(plateHalfW * 2, plateHalfD * 2), topMat);
  top.rotation.x = -Math.PI / 2;
  top.receiveShadow = true;
  world.add(top);

  // strata slabs under the top
  const strataDefs = [
    { s: 1.0, h: 0.85, y: -0.425, c: COL.strataA },
    { s: 0.9, h: 0.8, y: -1.2, c: COL.strataB },
    { s: 0.72, h: 0.9, y: -2.0, c: COL.strataC },
    { s: 0.45, h: 0.9, y: -2.8, c: COL.strataC },
  ];
  for (const d of strataDefs) {
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(plateHalfW * 2 * d.s, d.h, plateHalfD * 2 * d.s),
      new THREE.MeshStandardMaterial({ color: d.c, roughness: 1 })
    );
    slab.position.y = d.y;
    world.add(slab);
  }
  // hanging rocks beneath
  const hangGeo = new THREE.DodecahedronGeometry(1, 0);
  const hangMat = new THREE.MeshStandardMaterial({ color: COL.strataC, roughness: 1 });
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(hangGeo, hangMat);
    m.position.set(
      (rng() - 0.5) * plateHalfW * 1.1,
      -3.3 - rng() * 1.4,
      (rng() - 0.5) * plateHalfD * 1.1
    );
    m.scale.set(0.5 + rng() * 0.8, 0.7 + rng() * 1.1, 0.5 + rng() * 0.8);
    m.rotation.set(rng() * 3, rng() * 3, rng() * 3);
    world.add(m);
  }

  // ---- desert scatter (kept off the pad and road) ----
  const clearOfPad = (x: number, z: number) =>
    !(Math.abs(x) < padHalfW + 0.9 && Math.abs(z) < padHalfD + 0.9) &&
    !(x > padHalfW && Math.abs(z) < 1.4); // road corridor

  const scatterPoint = (): [number, number] => {
    for (let tries = 0; tries < 20; tries++) {
      const x = (rng() * 2 - 1) * (plateHalfW - 0.6);
      const z = (rng() * 2 - 1) * (plateHalfD - 0.6);
      if (clearOfPad(x, z)) return [x, z];
    }
    return [plateHalfW - 1, plateHalfD - 1];
  };

  const rockGeo = new THREE.DodecahedronGeometry(0.16, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: COL.rock, roughness: 1 });
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, 70);
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = new THREE.Vector3();
    for (let i = 0; i < 70; i++) {
      const [x, z] = scatterPoint();
      e.set(rng() * 3, rng() * 3, rng() * 3);
      q.setFromEuler(e);
      const sc2 = 0.5 + rng() * 1.7;
      s.set(sc2, sc2 * (0.55 + rng() * 0.5), sc2);
      m.compose(new THREE.Vector3(x, 0.04, z), q, s);
      rocks.setMatrixAt(i, m);
    }
  }
  world.add(rocks);

  const bushGeo = new THREE.IcosahedronGeometry(0.14, 0);
  const bushMat = new THREE.MeshStandardMaterial({ color: COL.scrub, roughness: 1, flatShading: true });
  const bushDryMat = new THREE.MeshStandardMaterial({ color: COL.scrubDry, roughness: 1, flatShading: true });
  for (const [mat, count] of [
    [bushMat, 30],
    [bushDryMat, 22],
  ] as const) {
    const bushes = new THREE.InstancedMesh(bushGeo, mat, count);
    bushes.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    for (let i = 0; i < count; i++) {
      const [x, z] = scatterPoint();
      e.set(0, rng() * 3, 0);
      q.setFromEuler(e);
      const sc2 = 0.6 + rng() * 1.1;
      m.compose(
        new THREE.Vector3(x, 0.09 * sc2, z),
        q,
        new THREE.Vector3(sc2, sc2 * 0.8, sc2)
      );
      bushes.setMatrixAt(i, m);
    }
    world.add(bushes);
  }

  // a few saguaro cacti
  const cactusMat = new THREE.MeshStandardMaterial({ color: COL.cactus, roughness: 0.9 });
  const trunkGeo = new THREE.CapsuleGeometry(0.07, 0.5, 4, 8);
  const armGeo = new THREE.CapsuleGeometry(0.045, 0.2, 4, 8);
  for (let i = 0; i < 6; i++) {
    const [x, z] = scatterPoint();
    const cactus = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, cactusMat);
    trunk.position.y = 0.32;
    trunk.castShadow = true;
    cactus.add(trunk);
    const arms = 1 + Math.floor(rng() * 2);
    for (let a = 0; a < arms; a++) {
      const arm = new THREE.Mesh(armGeo, cactusMat);
      const side = a === 0 ? 1 : -1;
      arm.position.set(side * 0.13, 0.3 + rng() * 0.18, 0);
      arm.rotation.z = side * -0.5;
      arm.castShadow = true;
      cactus.add(arm);
    }
    const s = 0.8 + rng() * 0.7;
    cactus.scale.setScalar(s);
    cactus.position.set(x, 0, z);
    cactus.rotation.y = rng() * Math.PI * 2;
    world.add(cactus);
  }

  // distant floating mesas for depth
  const mesas: THREE.Group[] = [];
  const mesaDefs = [
    { x: -plateR * 3.4, y: -3.6, z: -plateR * 2.4, s: 0.3 },
    { x: plateR * 3.9, y: -4.6, z: -plateR * 1.5, s: 0.22 },
    { x: plateR * 1.7, y: -5.6, z: plateR * 3.6, s: 0.17 },
  ];
  for (const d of mesaDefs) {
    const mesa = new THREE.Group();
    const topM = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.5, 0.7, 9),
      new THREE.MeshStandardMaterial({ color: COL.sandDark, roughness: 1 })
    );
    mesa.add(topM);
    const mid = new THREE.Mesh(
      new THREE.CylinderGeometry(3.0, 2.4, 1.4, 9),
      new THREE.MeshStandardMaterial({ color: COL.strataB, roughness: 1 })
    );
    mid.position.y = -1.0;
    mesa.add(mid);
    const tail = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 0.8, 1.6, 9),
      new THREE.MeshStandardMaterial({ color: COL.strataC, roughness: 1 })
    );
    tail.position.y = -2.4;
    mesa.add(tail);
    mesa.position.set(d.x, d.y, d.z);
    mesa.scale.setScalar(d.s * plateR * 0.28);
    mesa.userData.baseY = d.y;
    mesa.userData.phase = rng() * Math.PI * 2;
    mesas.push(mesa);
    scene.add(mesa);
  }

  // =====================================================================
  // BUILDINGS
  // =====================================================================
  const tileX = (gx: number) => (gx - W / 2 + 0.5) * CELL;
  const tileZ = (gy: number) => (gy - H / 2 + 0.5) * CELL;

  // shared materials
  const mWhite = new THREE.MeshStandardMaterial({ color: COL.white, roughness: 0.55 });
  const mSiding = new THREE.MeshStandardMaterial({ color: COL.siding, roughness: 0.6 });
  const mNavy = new THREE.MeshStandardMaterial({ color: COL.navy, roughness: 0.5 });
  const mGraphite = new THREE.MeshStandardMaterial({ color: COL.graphite, roughness: 0.8 });
  const mMetal = new THREE.MeshStandardMaterial({ color: COL.metal, roughness: 0.4, metalness: 0.5 });
  const mMetalDark = new THREE.MeshStandardMaterial({ color: COL.metalDark, roughness: 0.5, metalness: 0.4 });
  const mPad = new THREE.MeshStandardMaterial({ color: 0xa8a296, roughness: 0.95 });

  // dynamic registries the animator walks each frame
  type Spinner = { mesh: THREE.Object3D; speed: number };
  const fans: Spinner[] = [];
  const windowMats: THREE.MeshStandardMaterial[] = [];
  const statusLeds: { mat: THREE.MeshStandardMaterial; tile: number }[] = [];
  const panelMats: THREE.MeshStandardMaterial[] = [];
  const chargeBars: THREE.Mesh[] = [];
  const beaconMats: THREE.MeshStandardMaterial[] = [];

  const basePad = (g2: THREE.Group, w = 0.98, d = 0.86) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), mPad);
    p.position.y = 0.025;
    p.receiveShadow = true;
    g2.add(p);
  };
  const box = (
    g2: THREE.Group,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    x = 0,
    y = 0,
    z = 0
  ) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    g2.add(m);
    return m;
  };

  function makeHall(tile: number): THREE.Group {
    const g2 = new THREE.Group();
    basePad(g2);
    box(g2, 0.9, 0.34, 0.74, mWhite, 0, 0.05 + 0.17, 0);
    box(g2, 0.92, 0.05, 0.76, mNavy, 0, 0.05 + 0.05, 0); // plinth band
    const roof = box(g2, 0.86, 0.045, 0.7, mGraphite, 0, 0.05 + 0.34 + 0.022, 0);
    for (let v = 0; v < 3; v++) {
      box(g2, 0.1, 0.07, 0.14, mMetalDark, -0.26 + v * 0.26, roof.position.y + 0.055, -0.14);
    }
    // glass strip along the south face, glows at night
    const winMat = new THREE.MeshStandardMaterial({
      color: COL.glass,
      roughness: 0.15,
      metalness: 0.1,
      emissive: COL.window,
      emissiveIntensity: 0.1,
    });
    windowMats.push(winMat);
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.1, 0.02), winMat);
    win.position.set(0, 0.24, 0.376);
    g2.add(win);
    // intake grills on the north face
    for (let v = 0; v < 4; v++) {
      box(g2, 0.12, 0.16, 0.015, mMetalDark, -0.3 + v * 0.2, 0.22, -0.376);
    }
    // status LED
    const ledMat = new THREE.MeshStandardMaterial({
      color: COL.ledOk,
      emissive: COL.ledOk,
      emissiveIntensity: 1.4,
    });
    statusLeds.push({ mat: ledMat, tile });
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), ledMat);
    led.position.set(0.41, 0.44, 0.33);
    g2.add(led);
    return g2;
  }

  function makeChiller(): THREE.Group {
    const g2 = new THREE.Group();
    basePad(g2);
    box(g2, 0.88, 0.22, 0.66, mSiding, 0, 0.05 + 0.11, 0);
    box(g2, 0.9, 0.04, 0.68, mNavy, 0, 0.05 + 0.02, 0);
    // two fan cowls with spinning blades
    for (const fx of [-0.21, 0.21]) {
      const cowl = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.185, 0.07, 20), mMetalDark);
      cowl.position.set(fx, 0.05 + 0.22 + 0.035, 0);
      cowl.castShadow = true;
      g2.add(cowl);
      const inner = new THREE.Mesh(
        new THREE.CircleGeometry(0.15, 20),
        new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.9 })
      );
      inner.rotation.x = -Math.PI / 2;
      inner.position.set(fx, cowl.position.y + 0.037, 0);
      g2.add(inner);
      const blades = new THREE.Group();
      for (let b = 0; b < 3; b++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.012, 0.045), mMetal);
        blade.rotation.y = (b / 3) * Math.PI;
        blades.add(blade);
      }
      blades.position.set(fx, cowl.position.y + 0.045, 0);
      g2.add(blades);
      fans.push({ mesh: blades, speed: 0 });
    }
    // coolant pipe run
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 10), mNavy);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(0, 0.09, 0.36);
    g2.add(pipe);
    return g2;
  }

  function makeSubstation(): THREE.Group {
    const g2 = new THREE.Group();
    basePad(g2);
    // transformer with fins
    const tr = box(g2, 0.34, 0.26, 0.28, mMetal, -0.2, 0.05 + 0.13, 0.16);
    for (let f = 0; f < 4; f++) {
      box(g2, 0.02, 0.2, 0.3, mMetalDark, tr.position.x - 0.19 + f * 0.017, tr.position.y, 0.16);
    }
    // bushings
    for (const bx of [-0.28, -0.2, -0.12]) {
      const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.1, 8), mWhite);
      ins.position.set(bx, 0.05 + 0.26 + 0.05, 0.16);
      g2.add(ins);
    }
    // lattice pylon
    const py = new THREE.Group();
    const legMat = mMetalDark;
    for (const [lx, lz] of [
      [-0.12, -0.12],
      [0.12, -0.12],
      [-0.12, 0.12],
      [0.12, 0.12],
    ]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.028, 1.1, 0.028), legMat);
      leg.position.set(lx * 0.7, 0.55, lz * 0.7);
      leg.rotation.z = -lx * 0.16;
      leg.rotation.x = lz * 0.16;
      leg.castShadow = true;
      py.add(leg);
    }
    for (let ring = 0; ring < 3; ring++) {
      const y = 0.3 + ring * 0.32;
      const w2 = 0.19 - ring * 0.045;
      const band = new THREE.Mesh(new THREE.BoxGeometry(w2 * 2, 0.02, w2 * 2), legMat);
      band.position.y = y;
      py.add(band);
    }
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.03, 0.03), legMat);
    arm.position.y = 1.04;
    py.add(arm);
    for (const ax of [-0.26, 0, 0.26]) {
      const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.09, 6), mWhite);
      ins.position.set(ax, 0.985, 0);
      py.add(ins);
    }
    py.position.set(0.18, 0.05, -0.14);
    g2.add(py);
    return g2;
  }

  function makeSolar(): THREE.Group {
    const g2 = new THREE.Group();
    basePad(g2, 0.98, 0.9);
    for (let row = 0; row < 3; row++) {
      const z = -0.26 + row * 0.28;
      const panelMat = new THREE.MeshStandardMaterial({
        color: COL.solarCell,
        roughness: 0.25,
        metalness: 0.35,
        emissive: 0x2a4a80,
        emissiveIntensity: 0.0,
      });
      panelMats.push(panelMat);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.018, 0.2), panelMat);
      panel.position.set(0, 0.14, z);
      panel.rotation.x = -0.42; // tilted toward the southern sun
      panel.castShadow = true;
      g2.add(panel);
      for (const lx of [-0.3, 0.3]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.11, 0.02), mMetalDark);
        leg.position.set(lx, 0.055 + 0.05, z + 0.03);
        g2.add(leg);
      }
    }
    return g2;
  }

  function makeBattery(): THREE.Group {
    const g2 = new THREE.Group();
    basePad(g2);
    for (const bx of [-0.22, 0.22]) {
      box(g2, 0.36, 0.24, 0.68, mWhite, bx, 0.05 + 0.12, 0);
      box(g2, 0.37, 0.03, 0.69, mNavy, bx, 0.05 + 0.015, 0);
      // vent slits
      for (let v = 0; v < 3; v++) {
        box(g2, 0.3, 0.012, 0.015, mMetalDark, bx, 0.13 + v * 0.05, 0.345);
      }
    }
    // charge bar (green strip whose length tracks stored energy)
    const barMat = new THREE.MeshStandardMaterial({
      color: COL.ledOk,
      emissive: COL.ledOk,
      emissiveIntensity: 1.1,
    });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.035, 0.02), barMat);
    bar.position.set(0, 0.05 + 0.26, 0.36);
    g2.add(bar);
    chargeBars.push(bar);
    return g2;
  }

  function makeUplink(): THREE.Group {
    const g2 = new THREE.Group();
    basePad(g2);
    box(g2, 0.3, 0.24, 0.24, mSiding, -0.24, 0.05 + 0.12, 0.2);
    // mast
    const mastSegs = [
      { r: 0.045, h: 0.55, y: 0.32 },
      { r: 0.032, h: 0.45, y: 0.8 },
      { r: 0.02, h: 0.4, y: 1.2 },
    ];
    for (const s of mastSegs) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(s.r * 0.8, s.r, s.h, 8), mMetalDark);
      seg.position.set(0.1, s.y, -0.1);
      seg.castShadow = true;
      g2.add(seg);
    }
    // dishes
    for (const d of [
      { y: 0.72, ry: 0.6 },
      { y: 0.98, ry: -1.8 },
    ]) {
      const dish = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.6), mWhite);
      dish.position.set(0.1, d.y, -0.1);
      dish.rotation.set(Math.PI / 2.4, d.ry, 0);
      dish.castShadow = true;
      g2.add(dish);
    }
    // blinking beacon
    const beaconMat = new THREE.MeshStandardMaterial({
      color: COL.beacon,
      emissive: COL.beacon,
      emissiveIntensity: 1.2,
    });
    beaconMats.push(beaconMat);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), beaconMat);
    beacon.position.set(0.1, 1.44, -0.1);
    g2.add(beacon);
    return g2;
  }

  const FACTORY: Record<BuildingType, (tile: number) => THREE.Group> = {
    hall: (t) => makeHall(t),
    chiller: () => makeChiller(),
    substation: () => makeSubstation(),
    solar: () => makeSolar(),
    battery: () => makeBattery(),
    uplink: () => makeUplink(),
  };

  const buildingsGroup = new THREE.Group();
  world.add(buildingsGroup);
  const tileObjs: (THREE.Group | null)[] = new Array(engine.n).fill(null);
  const lastGrid = new Int8Array(engine.n).fill(-1);
  const lastDead = new Uint8Array(engine.n).fill(0);

  const disposeObject = (obj: THREE.Object3D) => {
    obj.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
    });
  };

  const charMat = new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 1 });

  function rebuildTile(i: number) {
    const old = tileObjs[i];
    if (old) {
      buildingsGroup.remove(old);
      disposeObject(old);
      // drop any registry entries pointing into the removed subtree
      const inOld = (o: THREE.Object3D) => {
        let p: THREE.Object3D | null = o;
        while (p) {
          if (p === old) return true;
          p = p.parent;
        }
        return false;
      };
      for (let k = fans.length - 1; k >= 0; k--) if (inOld(fans[k].mesh)) fans.splice(k, 1);
      for (let k = chargeBars.length - 1; k >= 0; k--) if (inOld(chargeBars[k])) chargeBars.splice(k, 1);
      // material registries: rebuild from scratch is overkill; mark by flag instead
      tileObjs[i] = null;
    }
    const type = engine.typeAt(i);
    if (!type) return;
    const g2 = FACTORY[type](i);
    const gx = i % W;
    const gy = (i / W) | 0;
    g2.position.set(tileX(gx), 0, tileZ(gy));
    // subtle deterministic rotation jitter per tile keeps rows from looking stamped
    g2.rotation.y = (((i * 2654435761) >>> 16) % 7) * 0.006 - 0.018;
    if (engine.dead[i]) {
      g2.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) mesh.material = charMat;
      });
    }
    buildingsGroup.add(g2);
    tileObjs[i] = g2;
  }

  function syncGrid() {
    for (let i = 0; i < engine.n; i++) {
      if (engine.grid[i] !== lastGrid[i] || engine.dead[i] !== lastDead[i]) {
        lastGrid[i] = engine.grid[i];
        lastDead[i] = engine.dead[i];
        rebuildTile(i);
      }
    }
  }

  // prune material registries when their meshes left the scene
  function pruneRegistries() {
    const alive = (m: THREE.Material) => {
      let found = false;
      buildingsGroup.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh && mesh.material === m) found = true;
      });
      return found;
    };
    for (let k = windowMats.length - 1; k >= 0; k--) if (!alive(windowMats[k])) { windowMats[k].dispose(); windowMats.splice(k, 1); }
    for (let k = panelMats.length - 1; k >= 0; k--) if (!alive(panelMats[k])) { panelMats[k].dispose(); panelMats.splice(k, 1); }
    for (let k = beaconMats.length - 1; k >= 0; k--) if (!alive(beaconMats[k])) { beaconMats[k].dispose(); beaconMats.splice(k, 1); }
    for (let k = statusLeds.length - 1; k >= 0; k--) if (!alive(statusLeds[k].mat)) { statusLeds[k].mat.dispose(); statusLeds.splice(k, 1); }
  }
  let pruneTimer = 0;

  // =====================================================================
  // HEATMAP overlay (instanced tile quads, thermal-camera style)
  // =====================================================================
  const heatGeo = new THREE.PlaneGeometry(CELL * 0.98, CELL * 0.98);
  heatGeo.rotateX(-Math.PI / 2);
  const heatMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });
  const heatMesh = new THREE.InstancedMesh(heatGeo, heatMat, engine.n);
  heatMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(engine.n * 3), 3);
  {
    const m = new THREE.Matrix4();
    for (let i = 0; i < engine.n; i++) {
      const gx = i % W;
      const gy = (i / W) | 0;
      m.setPosition(tileX(gx), 0.065, tileZ(gy));
      heatMesh.setMatrixAt(i, m);
    }
  }
  heatMesh.visible = false;
  heatMesh.renderOrder = 5;
  world.add(heatMesh);

  const heatColor = new THREE.Color();
  function heatRamp(t: number, out: THREE.Color) {
    // 15° → deep blue, 40° → teal, 60° → amber, 80°+ → red/white
    const x = Math.max(0, Math.min(1, (t - 15) / 70));
    if (x < 0.35) out.setRGB(0.05 + x * 0.3, 0.1 + x * 0.8, 0.45 + x * 0.6);
    else if (x < 0.65) {
      const k = (x - 0.35) / 0.3;
      out.setRGB(0.16 + k * 0.75, 0.38 + k * 0.28, 0.66 - k * 0.5);
    } else {
      const k = (x - 0.65) / 0.35;
      out.setRGB(0.91 + k * 0.09, 0.66 - k * 0.45, 0.16 + k * 0.1);
    }
  }
  function updateHeatmap() {
    for (let i = 0; i < engine.n; i++) {
      heatRamp(engine.temp[i], heatColor);
      heatMesh.setColorAt(i, heatColor);
    }
    heatMesh.instanceColor!.needsUpdate = true;
  }

  // =====================================================================
  // GHOST preview + hover
  // =====================================================================
  const ghostOk = new THREE.MeshBasicMaterial({
    color: 0x6fe6a8,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const ghostBad = new THREE.MeshBasicMaterial({
    color: 0xf06a54,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const ghosts = new Map<Tool, THREE.Group>();
  function ghostFor(tool: Tool): THREE.Group {
    let g2 = ghosts.get(tool);
    if (g2) return g2;
    if (tool === "bulldoze") {
      g2 = new THREE.Group();
      const q = new THREE.Mesh(new THREE.PlaneGeometry(CELL * 0.92, CELL * 0.92), ghostBad);
      q.rotation.x = -Math.PI / 2;
      q.position.y = 0.07;
      g2.add(q);
    } else {
      g2 = FACTORY[tool as BuildingType](-1);
      g2.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.material = ghostOk;
          mesh.castShadow = false;
          mesh.receiveShadow = false;
        }
      });
      // the ghost factory call pushed dynamic entries — remove them (tile -1 / tail entries)
      for (let k = fans.length - 1; k >= 0; k--) {
        let p: THREE.Object3D | null = fans[k].mesh;
        let inGhost = false;
        while (p) { if (p === g2) inGhost = true; p = p.parent; }
        if (inGhost) fans.splice(k, 1);
      }
      for (let k = chargeBars.length - 1; k >= 0; k--) {
        let p: THREE.Object3D | null = chargeBars[k];
        let inGhost = false;
        while (p) { if (p === g2) inGhost = true; p = p.parent; }
        if (inGhost) chargeBars.splice(k, 1);
      }
      for (let k = statusLeds.length - 1; k >= 0; k--) if (statusLeds[k].tile === -1) statusLeds.splice(k, 1);
    }
    g2.visible = false;
    world.add(g2);
    ghosts.set(tool, g2);
    return g2;
  }
  let activeGhost: THREE.Group | null = null;

  // =====================================================================
  // INPUT — paint / orbit / zoom
  // =====================================================================
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hitPoint = new THREE.Vector3();

  let painting = false;
  let orbiting = false;
  let lastPX = 0;
  let lastPY = 0;
  let hoverTile = -1;

  const tileFromEvent = (e: PointerEvent): number => {
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (!ray.ray.intersectPlane(groundPlane, hitPoint)) return -1;
    const gx = Math.floor((hitPoint.x + padHalfW) / CELL);
    const gy = Math.floor((hitPoint.z + padHalfD) / CELL);
    if (gx < 0 || gy < 0 || gx >= W || gy >= H) return -1;
    return engine.idx(gx, gy);
  };

  const applyTool = (tile: number) => {
    if (tile < 0) return;
    const gx = tile % W;
    const gy = (tile / W) | 0;
    const tool = getCtrl().tool;
    if (tool === "bulldoze") engine.remove(gx, gy);
    else engine.place(gx, gy, tool);
  };

  const onPointerDown = (e: PointerEvent) => {
    renderer.domElement.setPointerCapture(e.pointerId);
    if (e.button === 2) {
      orbiting = true;
      lastPX = e.clientX;
      lastPY = e.clientY;
    } else if (e.button === 0) {
      painting = true;
      applyTool(tileFromEvent(e));
    }
  };
  const onPointerMove = (e: PointerEvent) => {
    if (orbiting) {
      cam.az -= (e.clientX - lastPX) * 0.006;
      cam.pol = Math.max(0.32, Math.min(1.28, cam.pol - (e.clientY - lastPY) * 0.005));
      lastPX = e.clientX;
      lastPY = e.clientY;
      placeCamera();
      return;
    }
    hoverTile = tileFromEvent(e);
    if (painting) applyTool(hoverTile);
  };
  const onPointerUp = (e: PointerEvent) => {
    painting = false;
    orbiting = false;
    try {
      renderer.domElement.releasePointerCapture(e.pointerId);
    } catch {}
  };
  const onPointerLeave = () => {
    hoverTile = -1;
    painting = false;
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    cam.rad = Math.max(RAD_MIN, Math.min(RAD_MAX, cam.rad * (1 + e.deltaY * 0.0011)));
    placeCamera();
  };
  const onContext = (e: Event) => e.preventDefault();

  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("pointerleave", onPointerLeave);
  renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
  renderer.domElement.addEventListener("contextmenu", onContext);

  // =====================================================================
  // DAY / NIGHT
  // =====================================================================
  const skyNight = new THREE.Color(0x10172b);
  const skyDay = new THREE.Color(0x9cc4e8);
  const skyDusk = new THREE.Color(0xe8946a);
  const hemiSkyDay = new THREE.Color(0xbdd6f2);
  const hemiSkyNight = new THREE.Color(0x2a3350);
  const sunWarm = new THREE.Color(0xffd9a0);
  const sunNoon = new THREE.Color(0xfff4e0);
  const skyCol = new THREE.Color();
  const tmpCol = new THREE.Color();

  function updateDayNight(hour: number) {
    // sun path: rises east (+x) at 6:00, sets west at 18:00
    const sunAngle = ((hour - 6) / 12) * Math.PI; // 0..π across daytime
    const elev = Math.sin(sunAngle);
    const day = Math.max(0, Math.min(1, elev * 2.4 + 0.08)); // daylight amount
    const dusk = Math.max(0, 1 - Math.abs(elev) * 4.5) * (hour > 3 && hour < 21 ? 1 : 0);

    const sunDir = new THREE.Vector3(
      Math.cos(sunAngle),
      Math.max(elev, -0.4),
      -0.35 + 0.15 * Math.sin(sunAngle)
    ).normalize();
    sun.position.copy(sunDir).multiplyScalar(60);
    sun.target.position.set(0, 0, 0);
    sun.intensity = 1.45 * Math.max(0, elev) + 0.02;
    sun.color.copy(sunNoon).lerp(sunWarm, Math.max(0, 1 - elev * 2.2));
    sunSprite.position.copy(sunDir).multiplyScalar(plateR * 6.4);
    (sunSprite.material as THREE.SpriteMaterial).opacity = Math.max(0, elev * 1.6 + 0.12);
    (sunSprite.material as THREE.SpriteMaterial).color
      .copy(new THREE.Color(0xffe9b0))
      .lerp(new THREE.Color(0xff9a5a), Math.max(0, 1 - elev * 2.5));

    // moon opposite the sun
    const moonDir = sunDir.clone().multiplyScalar(-1);
    moonDir.y = Math.max(moonDir.y, 0.18);
    moonDir.normalize();
    moon.position.copy(moonDir).multiplyScalar(50);
    moon.intensity = 0.6 * (1 - day);
    moonSprite.position.copy(moonDir).multiplyScalar(plateR * 6.8);
    (moonSprite.material as THREE.SpriteMaterial).opacity = (1 - day) * 0.9;

    // sky + fog + hemisphere
    skyCol.copy(skyNight).lerp(skyDay, day);
    if (dusk > 0.02) skyCol.lerp(skyDusk, dusk * 0.55);
    (scene.background as THREE.Color).copy(skyCol);
    scene.fog!.color.copy(skyCol);
    hemi.color.copy(hemiSkyNight).lerp(hemiSkyDay, day);
    hemi.intensity = 0.48 + 0.42 * day;
    fill.intensity = 0.42 + 0.06 * day;

    // stars
    starMat.opacity = Math.max(0, 1 - day * 2.2) * 0.9;

    return { day, dusk, elev };
  }

  // =====================================================================
  // MAIN LOOP
  // =====================================================================
  let raf = 0;
  let disposed = false;
  let lastT = performance.now();
  let hudTimer = 0;
  let heatTimer = 0;
  let clockT = 0; // wall-clock seconds for pulses/spins

  const animate = () => {
    if (disposed) return;
    raf = requestAnimationFrame(animate);
    const now = performance.now();
    const wall = Math.min(0.1, (now - lastT) / 1000);
    lastT = now;
    clockT += wall;

    const ctrl = getCtrl();
    const simDt = ctrl.paused ? 0 : wall * SIM_HOURS_PER_SEC * ctrl.speed;
    if (simDt > 0) engine.step(simDt);

    syncGrid();
    pruneTimer += wall;
    if (pruneTimer > 2.5) {
      pruneTimer = 0;
      pruneRegistries();
    }

    const hour = engine.time % 24;
    const { day } = updateDayNight(hour);
    const night = 1 - day;

    // mesas drift
    for (const mesa of mesas) {
      mesa.position.y = mesa.userData.baseY + Math.sin(clockT * 0.28 + mesa.userData.phase) * 0.18;
      mesa.rotation.y += wall * 0.008;
    }

    // ---- building dynamics ----
    const hudNow = engine.hud();
    const fanRate = ctrl.paused ? 0 : (5 + 9 * Math.min(1, (hudNow.maxTemp - 20) / 50)) * ctrl.speed;
    for (const f of fans) f.mesh.rotation.y += wall * fanRate;

    for (const m of windowMats) m.emissiveIntensity = 0.08 + 1.25 * night;
    for (const m of panelMats) m.emissiveIntensity = 0.14 * day * solarFactorAt(engine.time);
    const blink = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(clockT * 5.2));
    for (const m of beaconMats) m.emissiveIntensity = blink * (0.5 + 0.9 * night);

    for (const led of statusLeds) {
      if (led.tile < 0) continue;
      const tv = engine.temp[led.tile];
      const c = engine.dead[led.tile] ? 0x000000 : tv < 45 ? COL.ledOk : tv < 62 ? COL.ledWarn : COL.ledBad;
      tmpCol.setHex(c);
      led.mat.color.copy(tmpCol);
      led.mat.emissive.copy(tmpCol);
      led.mat.emissiveIntensity = engine.dead[led.tile] ? 0 : 1.1 + 0.7 * night;
    }

    const battFrac = hudNow.battCap > 0 ? engine.battCharge / hudNow.battCap : 0;
    for (const bar of chargeBars) {
      bar.scale.x = Math.max(0.04, battFrac);
      bar.position.x = -0.3 * (1 - bar.scale.x);
    }

    // heatmap
    heatMesh.visible = ctrl.heat;
    if (ctrl.heat) {
      heatTimer += wall;
      if (heatTimer > 0.18) {
        heatTimer = 0;
        updateHeatmap();
      }
    }

    // ghost preview
    const tool = getCtrl().tool;
    const g2 = ghostFor(tool);
    if (activeGhost && activeGhost !== g2) activeGhost.visible = false;
    activeGhost = g2;
    if (hoverTile >= 0 && !orbiting) {
      const gx = hoverTile % W;
      const gy = (hoverTile / W) | 0;
      g2.visible = true;
      g2.position.set(tileX(gx), 0, tileZ(gy));
      const occupied = engine.grid[hoverTile] !== CODE.empty;
      let ok: boolean;
      if (tool === "bulldoze") ok = occupied;
      else ok = !occupied && engine.money >= SPECS[tool as BuildingType].cost;
      g2.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) mesh.material = ok ? ghostOk : ghostBad;
      });
    } else {
      g2.visible = false;
    }

    // HUD + toasts out to React
    hudTimer += wall;
    if (hudTimer > 0.25) {
      hudTimer = 0;
      onHud(hudNow);
    }
    const fresh = engine.drainToasts();
    if (fresh.length) onToasts(fresh);

    renderer.render(scene, camera);
  };

  // ---- resize ----
  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  syncGrid();
  updateDayNight(engine.time % 24);
  animate();

  // debug/testing handle (used by automated captures; harmless in prod)
  (window as unknown as Record<string, unknown>).__f5 = { engine, scene, renderer, sun, moon, hemi, fill, sunSprite, moonSprite, stars };

  return {
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("contextmenu", onContext);
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = (mesh as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) mat.dispose();
      });
      groundTex.dispose();
      glow.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}
