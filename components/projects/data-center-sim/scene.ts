// Data Center Sim — 3D isometric diorama renderer (three.js).
//
// Renders the DataCenter engine as a floating terrain plate you build on:
// server halls, hyperbolic cooling towers with rising steam, substations with
// transmission pylons, and network masts. Left-drag paints the selected tool,
// right-drag orbits, wheel zooms. Heat, throttling and failures are read from
// the engine each frame and reflected in glow, steam and charring.

import * as THREE from "three";
import {
  DataCenter,
  SPECS,
  CODE,
  AMBIENT,
  type BuildingType,
  type Tool,
  type Hud,
  type Toast,
} from "./engine";

export type Ctrl = { tool: Tool; paused: boolean; speed: number; heat: boolean };
export type SceneHandle = { dispose: () => void };

const CELL = 1.05;
const PAD = 1.3;
const SIM_HOURS_PER_SEC = 2.3;

const COL = {
  concrete: 0xc9c2b2,
  concreteDark: 0x8a8475,
  roof: 0x39362f,
  metal: 0x70737a,
  metalDark: 0x4a4c52,
  grass: 0x6f8a48,
  grassDark: 0x5c763b,
  soil: 0x6a513a,
  soilDark: 0x4c3a29,
  path: 0xb9b09a,
  led: 0x7fe6c0,
  warn: 0xff6a3a,
};

// ---- shared tiny textures ----
function softCircle(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,0.95)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.55)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createScene(opts: {
  container: HTMLElement;
  engine: DataCenter;
  getCtrl: () => Ctrl;
  onHud: (h: Hud) => void;
  onToasts: (t: Toast[]) => void;
}): SceneHandle {
  const { container, engine, getCtrl, onHud, onToasts } = opts;
  const W = engine.w;
  const H = engine.h;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(1.7, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.touchAction = "none";
  renderer.domElement.style.cursor = "crosshair";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  // ---- camera (orbit, hand-rolled) ----
  const camera = new THREE.PerspectiveCamera(29, 1, 0.5, 200);
  const target = new THREE.Vector3(0, 0.25, 0);
  const cam = { az: -0.72, pol: 0.88, rad: Math.max(W, H) * 2.05 };
  const RAD_MIN = Math.max(W, H) * 1.0;
  const RAD_MAX = Math.max(W, H) * 3.0;
  const placeCamera = () => {
    const r = cam.rad;
    const sp = Math.sin(cam.pol);
    camera.position.set(
      target.x + r * sp * Math.sin(cam.az),
      target.y + r * Math.cos(cam.pol),
      target.z + r * sp * Math.cos(cam.az)
    );
    camera.lookAt(target);
  };

  // ---- lights ----
  const hemi = new THREE.HemisphereLight(0xaec4e8, 0x4a3a2a, 0.75);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d8, 2.1);
  sun.position.set(W * 0.55, Math.max(W, H) * 1.2, H * 0.35);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera as THREE.OrthographicCamera;
  const span = Math.max(W, H) * 0.72 + PAD;
  sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span;
  sc.near = 1; sc.far = Math.max(W, H) * 3.5;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x88a6d8, 0.35);
  rim.position.set(-W * 0.5, H * 0.5, -H * 0.6);
  scene.add(rim);

  // ---- island ----
  const island = new THREE.Group();
  scene.add(island);

  const cellToWorld = (gx: number, gy: number) =>
    new THREE.Vector3((gx - (W - 1) / 2) * CELL, 0, (gy - (H - 1) / 2) * CELL);

  const plateW = W * CELL + PAD * 2;
  const plateD = H * CELL + PAD * 2;

  // grass top
  const grass = new THREE.Mesh(
    new THREE.BoxGeometry(plateW, 0.22, plateD),
    new THREE.MeshStandardMaterial({ color: COL.grass, roughness: 1 })
  );
  grass.position.y = -0.11;
  grass.receiveShadow = true;
  island.add(grass);
  // soil block
  const soil = new THREE.Mesh(
    new THREE.BoxGeometry(plateW - 0.25, 1.7, plateD - 0.25),
    new THREE.MeshStandardMaterial({ color: COL.soil, roughness: 1 })
  );
  soil.position.y = -0.22 - 0.85;
  island.add(soil);
  const soilBottom = new THREE.Mesh(
    new THREE.BoxGeometry(plateW - 0.7, 0.5, plateD - 0.7),
    new THREE.MeshStandardMaterial({ color: COL.soilDark, roughness: 1 })
  );
  soilBottom.position.y = -0.22 - 1.7 - 0.2;
  island.add(soilBottom);

  // faint grid lines on grass
  const gridGroup = new THREE.Group();
  const lineMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.07 });
  const halfW = (W * CELL) / 2;
  const halfD = (H * CELL) / 2;
  for (let i = 0; i <= W; i++) {
    const x = -halfW + i * CELL;
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, 0.005, -halfD),
      new THREE.Vector3(x, 0.005, halfD),
    ]);
    gridGroup.add(new THREE.Line(g, lineMat));
  }
  for (let j = 0; j <= H; j++) {
    const z = -halfD + j * CELL;
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-halfW, 0.005, z),
      new THREE.Vector3(halfW, 0.005, z),
    ]);
    gridGroup.add(new THREE.Line(g, lineMat));
  }
  island.add(gridGroup);

  // ---- heatmap overlay (per-cell quads) ----
  const heatGroup = new THREE.Group();
  heatGroup.visible = false;
  const heatTiles: THREE.Mesh[] = [];
  const heatGeo = new THREE.PlaneGeometry(CELL * 0.98, CELL * 0.98);
  for (let i = 0; i < W * H; i++) {
    const gx = i % W, gy = (i / W) | 0;
    const m = new THREE.Mesh(
      heatGeo,
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    m.rotation.x = -Math.PI / 2;
    const p = cellToWorld(gx, gy);
    m.position.set(p.x, 0.02, p.z);
    heatGroup.add(m);
    heatTiles.push(m);
  }
  island.add(heatGroup);

  // ---- materials factory ----
  const matConcrete = new THREE.MeshStandardMaterial({ color: COL.concrete, roughness: 0.85 });
  const matRoof = new THREE.MeshStandardMaterial({ color: COL.roof, roughness: 0.8 });
  const matMetal = new THREE.MeshStandardMaterial({ color: COL.metal, roughness: 0.5, metalness: 0.6 });
  const matMetalDark = new THREE.MeshStandardMaterial({ color: COL.metalDark, roughness: 0.6, metalness: 0.5 });
  const matTower = new THREE.MeshStandardMaterial({ color: 0xd2ccbd, roughness: 0.92, side: THREE.DoubleSide });
  const steamTex = softCircle();

  // ---- building builders ----
  type Anim = {
    kind: BuildingType;
    glowMesh?: THREE.Mesh; // emissive when hot
    led?: THREE.Mesh;
    blink?: THREE.Mesh;
    steam?: { spr: THREE.Sprite; t: number; sp: number; ox: number; oz: number }[];
    emitY?: number;
    dead?: boolean;
  };

  function box(w: number, h: number, d: number, mat: THREE.Material, y: number) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.y = y;
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  function makeDataHall(): { group: THREE.Group; anim: Anim } {
    const g = new THREE.Group();
    const bodyMat = matConcrete.clone();
    bodyMat.emissive = new THREE.Color(COL.warn);
    bodyMat.emissiveIntensity = 0;
    const body = box(0.82, 0.5, 0.82, bodyMat, 0.25);
    g.add(body);
    g.add(box(0.86, 0.05, 0.86, matRoof, 0.5 + 0.02));
    // rooftop condenser units
    for (let k = 0; k < 3; k++) {
      const u = box(0.18, 0.1, 0.18, matMetal, 0.57);
      u.position.x = -0.22 + k * 0.22;
      u.position.z = -0.16;
      g.add(u);
    }
    const vent = box(0.5, 0.08, 0.16, matMetalDark, 0.56);
    vent.position.z = 0.18;
    g.add(vent);
    // LED status strip
    const ledMat = new THREE.MeshStandardMaterial({
      color: COL.led, emissive: new THREE.Color(COL.led), emissiveIntensity: 1.1, roughness: 0.4,
    });
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.05, 0.025), ledMat);
    led.position.set(0, 0.3, 0.415);
    g.add(led);
    return { group: g, anim: { kind: "rack", glowMesh: body, led } };
  }

  function makeCoolingTower(): { group: THREE.Group; anim: Anim } {
    const g = new THREE.Group();
    // hyperbolic profile
    const pts: THREE.Vector2[] = [];
    const segs = 14;
    const Htow = 1.25;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const y = t * Htow;
      // concave: wide base, narrow waist ~0.78, slight flare at top
      const r = 0.46 - 0.24 * Math.sin(Math.min(t, 0.82) / 0.82 * Math.PI * 0.5) + 0.10 * Math.max(0, t - 0.82) / 0.18;
      pts.push(new THREE.Vector2(Math.max(0.12, r), y));
    }
    const tower = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), matTower);
    tower.castShadow = true;
    tower.receiveShadow = true;
    g.add(tower);
    // dark rim + inner basin disc near top
    const lipR = pts[pts.length - 1].x;
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(lipR, 0.025, 8, 28),
      matMetalDark
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = Htow;
    g.add(rim);
    const basin = new THREE.Mesh(
      new THREE.CircleGeometry(lipR * 0.94, 24),
      new THREE.MeshStandardMaterial({ color: 0x2a2a2c, roughness: 1 })
    );
    basin.rotation.x = -Math.PI / 2;
    basin.position.y = Htow - 0.03;
    g.add(basin);
    // base ring
    g.add(box(0.96, 0.06, 0.96, matMetalDark, 0.03));

    // steam sprites
    const steam: Anim["steam"] = [];
    const COUNT = 6;
    for (let i = 0; i < COUNT; i++) {
      const sm = new THREE.SpriteMaterial({
        map: steamTex, transparent: true, opacity: 0, depthWrite: false,
        blending: THREE.NormalBlending, color: 0xe9ebe6,
      });
      const spr = new THREE.Sprite(sm);
      spr.position.set(0, Htow + 0.2, 0);
      g.add(spr);
      steam.push({ spr, t: i / COUNT, sp: 0.5 + (i % 3) * 0.08, ox: 0, oz: 0 });
    }
    return { group: g, anim: { kind: "cooler", steam, emitY: Htow + 0.1 } };
  }

  function makeSubstation(): { group: THREE.Group; anim: Anim } {
    const g = new THREE.Group();
    g.add(box(0.9, 0.06, 0.9, new THREE.MeshStandardMaterial({ color: 0x6b6258, roughness: 1 }), 0.03));
    // transformers
    for (let k = 0; k < 2; k++) {
      const tr = box(0.26, 0.3, 0.3, matMetal, 0.21);
      tr.position.set(-0.18 + k * 0.36, 0, 0.16);
      g.add(tr);
      for (let b = 0; b < 3; b++) {
        const bush = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.14, 8), matMetalDark);
        bush.position.set(tr.position.x - 0.08 + b * 0.08, 0.43, 0.16);
        bush.castShadow = true;
        g.add(bush);
      }
    }
    // lattice pylon
    const pyMat = matMetalDark;
    const pylon = new THREE.Group();
    pylon.position.set(0.0, 0, -0.22);
    const legH = 0.95;
    for (let c = 0; c < 4; c++) {
      const ang = (c / 4) * Math.PI * 2 + Math.PI / 4;
      const leg = box(0.03, legH, 0.03, pyMat, legH / 2);
      const spread = 0.12;
      leg.position.x = Math.cos(ang) * spread * 0.4;
      leg.position.z = Math.sin(ang) * spread * 0.4;
      leg.position.y = legH / 2;
      pylon.add(leg);
    }
    const arm1 = box(0.5, 0.03, 0.03, pyMat, legH * 0.78);
    pylon.add(arm1);
    const arm2 = box(0.36, 0.03, 0.03, pyMat, legH * 0.95);
    pylon.add(arm2);
    g.add(pylon);
    // warning light
    const blinkMat = new THREE.MeshStandardMaterial({
      color: COL.warn, emissive: new THREE.Color(COL.warn), emissiveIntensity: 1.4, roughness: 0.5,
    });
    const blink = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), blinkMat);
    blink.position.set(0.18, 0.5, 0.16);
    g.add(blink);
    return { group: g, anim: { kind: "power", blink } };
  }

  function makeNetwork(): { group: THREE.Group; anim: Anim } {
    const g = new THREE.Group();
    g.add(box(0.64, 0.12, 0.64, new THREE.MeshStandardMaterial({ color: 0x47443d, roughness: 1 }), 0.06));
    // server cabinets cluster
    for (let k = 0; k < 4; k++) {
      const cab = box(0.16, 0.34, 0.16, matMetal, 0.29);
      cab.position.set(-0.12 + (k % 2) * 0.24, 0, -0.12 + ((k / 2) | 0) * 0.24);
      g.add(cab);
    }
    // mast
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.95, 8), matMetalDark);
    mast.position.set(0.22, 0.6, 0.2);
    mast.castShadow = true;
    g.add(mast);
    const dish = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.06, 16, 1, true), matConcrete);
    dish.position.set(0.22, 0.92, 0.2);
    dish.rotation.z = Math.PI * 0.62;
    g.add(dish);
    const blinkMat = new THREE.MeshStandardMaterial({
      color: 0x6cd0ff, emissive: new THREE.Color(0x6cd0ff), emissiveIntensity: 1.3, roughness: 0.4,
    });
    const blink = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), blinkMat);
    blink.position.set(0.22, 1.05, 0.2);
    g.add(blink);
    return { group: g, anim: { kind: "network", blink } };
  }

  function buildFor(type: BuildingType) {
    switch (type) {
      case "rack": return makeDataHall();
      case "cooler": return makeCoolingTower();
      case "power": return makeSubstation();
      case "network": return makeNetwork();
    }
  }

  // ---- placed building bookkeeping ----
  const builtCode = new Int8Array(W * H);
  const builtDead = new Uint8Array(W * H);
  const groups: (THREE.Group | null)[] = new Array(W * H).fill(null);
  const anims: (Anim | null)[] = new Array(W * H).fill(null);

  const disposeGroup = (g: THREE.Group) => {
    g.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry && m.geometry !== heatGeo) m.geometry.dispose?.();
      const mat = (m as any).material;
      if (mat && mat !== matConcrete && mat !== matRoof && mat !== matMetal && mat !== matMetalDark && mat !== matTower) {
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose?.());
        else mat.dispose?.();
      }
    });
  };

  const setHallDead = (anim: Anim, dead: boolean) => {
    if (!anim.glowMesh) return;
    const mat = anim.glowMesh.material as THREE.MeshStandardMaterial;
    mat.color.setHex(dead ? 0x2a2420 : COL.concrete);
    if (anim.led) (anim.led.material as THREE.MeshStandardMaterial).emissiveIntensity = dead ? 0 : 1.1;
    anim.dead = dead;
  };

  const syncBuildings = () => {
    for (let i = 0; i < W * H; i++) {
      const code = engine.grid[i];
      if (code !== builtCode[i]) {
        const old = groups[i];
        if (old) { island.remove(old); disposeGroup(old); groups[i] = null; anims[i] = null; }
        builtCode[i] = code;
        builtDead[i] = 0;
        const type = engine.typeAt(i);
        if (type) {
          const made = buildFor(type)!;
          const p = cellToWorld(i % W, (i / W) | 0);
          made.group.position.set(p.x, 0, p.z);
          island.add(made.group);
          groups[i] = made.group;
          anims[i] = made.anim;
        }
      }
      // dead-state changes (rack code stays the same)
      const dead = code === CODE.rack && engine.dead[i] ? 1 : 0;
      if (dead !== builtDead[i] && anims[i]) {
        builtDead[i] = dead;
        setHallDead(anims[i]!, !!dead);
      }
    }
  };

  // ---- hover / ghost ----
  const hoverPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(CELL, CELL),
    new THREE.MeshBasicMaterial({ color: 0x7fe6a0, transparent: true, opacity: 0.28, depthWrite: false })
  );
  hoverPlane.rotation.x = -Math.PI / 2;
  hoverPlane.position.y = 0.03;
  hoverPlane.visible = false;
  island.add(hoverPlane);
  const ghost = new THREE.Mesh(
    new THREE.BoxGeometry(0.82, 0.6, 0.82),
    new THREE.MeshBasicMaterial({ color: 0x7fe6a0, transparent: true, opacity: 0.18, depthWrite: false })
  );
  ghost.visible = false;
  island.add(ghost);

  // ---- pointer + orbit ----
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  const hover = { x: -1, y: -1, on: false };
  let painting = false;
  let paintErase = false;
  let rotating = false;
  let lastX = 0, lastY = 0;

  const pickCell = (e: PointerEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(ndc, camera);
    if (!ray.ray.intersectPlane(groundPlane, hit)) return null;
    const gx = Math.round(hit.x / CELL + (W - 1) / 2);
    const gy = Math.round(hit.z / CELL + (H - 1) / 2);
    if (gx < 0 || gy < 0 || gx >= W || gy >= H) return null;
    return { x: gx, y: gy };
  };

  const apply = (x: number, y: number, erase: boolean) => {
    const tool = getCtrl().tool;
    if (erase || tool === "bulldoze") engine.remove(x, y);
    else engine.place(x, y, tool as BuildingType);
    syncBuildings();
    onHud(engine.hud());
  };

  const onPointerDown = (e: PointerEvent) => {
    renderer.domElement.setPointerCapture(e.pointerId);
    if (e.button === 2 || e.button === 1) {
      rotating = true;
      lastX = e.clientX; lastY = e.clientY;
      renderer.domElement.style.cursor = "grabbing";
      return;
    }
    const c = pickCell(e);
    if (!c) return;
    painting = true;
    paintErase = false;
    hover.x = c.x; hover.y = c.y;
    apply(c.x, c.y, false);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (rotating) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      cam.az -= dx * 0.006;
      cam.pol = Math.max(0.22, Math.min(1.35, cam.pol - dy * 0.005));
      return;
    }
    const c = pickCell(e);
    if (!c) { hover.on = false; return; }
    const moved = c.x !== hover.x || c.y !== hover.y;
    hover.x = c.x; hover.y = c.y; hover.on = true;
    if (painting && moved) apply(c.x, c.y, paintErase);
  };
  const onPointerUp = (e: PointerEvent) => {
    painting = false;
    rotating = false;
    renderer.domElement.style.cursor = "crosshair";
    try { renderer.domElement.releasePointerCapture(e.pointerId); } catch {}
  };
  const onLeave = () => { hover.on = false; };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    cam.rad = Math.max(RAD_MIN, Math.min(RAD_MAX, cam.rad * (1 + Math.sign(e.deltaY) * 0.08)));
  };
  const onCtx = (e: Event) => e.preventDefault();

  const el = renderer.domElement;
  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  el.addEventListener("pointerleave", onLeave);
  el.addEventListener("wheel", onWheel, { passive: false });
  el.addEventListener("contextmenu", onCtx);

  // ---- resize ----
  const resize = () => {
    const r = container.getBoundingClientRect();
    const w = Math.max(1, r.width);
    const h = Math.max(1, r.height || (w * 0.62));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  // heat → color
  const heatColor = (t: number, out: THREE.Color) => {
    const x = Math.max(0, Math.min(1, (t - AMBIENT) / (95 - AMBIENT)));
    if (x < 0.5) {
      const k = x / 0.5;
      out.setRGB((0.16 + k * 0.7), (0.47 + k * 0.35), (0.78 - k * 0.47));
    } else {
      const k = (x - 0.5) / 0.5;
      out.setRGB((0.86 + k * 0.12), (0.82 - k * 0.66), (0.31 - k * 0.23));
    }
    return x;
  };

  // ---- main loop ----
  const clock = new THREE.Clock();
  let raf = 0;
  let hudAcc = 0;
  let cancelled = false;
  const tmpColor = new THREE.Color();

  const frame = () => {
    if (cancelled) return;
    const dt = Math.min(0.05, clock.getDelta());
    const ctrl = getCtrl();
    const time = clock.elapsedTime;

    if (!ctrl.paused) {
      engine.step(dt * SIM_HOURS_PER_SEC * ctrl.speed);
      syncBuildings();
    }

    // animate buildings from per-cell temperature
    for (let i = 0; i < W * H; i++) {
      const a = anims[i];
      if (!a) continue;
      const temp = engine.temp[i];
      if (a.kind === "rack") {
        if (a.glowMesh) {
          const mat = a.glowMesh.material as THREE.MeshStandardMaterial;
          const heat = Math.max(0, Math.min(1, (temp - 42) / 48));
          mat.emissiveIntensity = a.dead ? 0.5 + 0.5 * Math.sin(time * 6) : heat * 0.9;
        }
        if (a.led && !a.dead) {
          (a.led.material as THREE.MeshStandardMaterial).emissiveIntensity =
            0.5 + 0.5 * Math.abs(Math.sin(time * 2.5 + i));
        }
      } else if (a.kind === "cooler" && a.steam) {
        for (const s of a.steam) {
          s.t += dt * s.sp;
          if (s.t >= 1) {
            s.t -= 1;
            s.ox = (((i * 7 + s.sp * 53) % 10) / 10 - 0.5) * 0.18;
            s.oz = (((i * 13 + s.sp * 31) % 10) / 10 - 0.5) * 0.18;
          }
          const life = s.t;
          const y = (a.emitY ?? 1.3) + life * 1.25;
          s.spr.position.set(s.ox * (0.35 + life), y, s.oz * (0.35 + life));
          const sc = 0.34 + life * 0.78;
          s.spr.scale.set(sc, sc, sc);
          (s.spr.material as THREE.SpriteMaterial).opacity = Math.sin(life * Math.PI) * 0.4;
        }
      } else if (a.kind === "power" && a.blink) {
        (a.blink.material as THREE.MeshStandardMaterial).emissiveIntensity =
          0.6 + 0.8 * Math.abs(Math.sin(time * 3 + i));
      } else if (a.kind === "network" && a.blink) {
        (a.blink.material as THREE.MeshStandardMaterial).emissiveIntensity =
          0.5 + 0.7 * Math.abs(Math.sin(time * 4 + i));
      }
    }

    // heatmap overlay
    if (ctrl.heat) {
      if (!heatGroup.visible) heatGroup.visible = true;
      for (let i = 0; i < heatTiles.length; i++) {
        const mat = heatTiles[i].material as THREE.MeshBasicMaterial;
        const x = heatColor(engine.temp[i], tmpColor);
        mat.color.copy(tmpColor);
        mat.opacity = 0.1 + 0.5 * x;
      }
    } else if (heatGroup.visible) {
      heatGroup.visible = false;
    }

    // hover / ghost
    if (hover.on) {
      const tool = getCtrl().tool;
      const i = engine.idx(hover.x, hover.y);
      const occupied = engine.grid[i] !== CODE.empty;
      const erasing = tool === "bulldoze";
      let ok: boolean;
      if (erasing) ok = occupied;
      else ok = !occupied && engine.money >= SPECS[tool as BuildingType].cost;
      const p = cellToWorld(hover.x, hover.y);
      hoverPlane.visible = true;
      hoverPlane.position.set(p.x, 0.03, p.z);
      const col = erasing ? 0xff6a4a : ok ? 0x7fe6a0 : 0xff6a4a;
      (hoverPlane.material as THREE.MeshBasicMaterial).color.setHex(col);
      if (!erasing && ok) {
        ghost.visible = true;
        ghost.position.set(p.x, 0.3, p.z);
        (ghost.material as THREE.MeshBasicMaterial).color.setHex(col);
      } else {
        ghost.visible = false;
      }
    } else {
      hoverPlane.visible = false;
      ghost.visible = false;
    }

    placeCamera();
    renderer.render(scene, camera);

    hudAcc += dt;
    if (hudAcc > 0.12) {
      hudAcc = 0;
      onHud(engine.hud());
      const fresh = engine.drainToasts();
      if (fresh.length) onToasts(fresh);
    }

    raf = requestAnimationFrame(frame);
  };
  placeCamera();
  syncBuildings();
  raf = requestAnimationFrame(frame);

  return {
    dispose() {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("contextmenu", onCtx);
      for (const g of groups) if (g) { island.remove(g); disposeGroup(g); }
      steamTex.dispose();
      renderer.dispose();
      if (el.parentElement === container) container.removeChild(el);
    },
  };
}
