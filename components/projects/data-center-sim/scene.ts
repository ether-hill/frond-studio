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
  // data-center campus palette (after the reference render)
  glass: 0x9fc6e6, // blue skylight glazing
  navy: 0x2c3a54, // dark-blue cladding
  siding: 0xd2d6da, // light metal cladding
  white: 0xeef1f4,
  asphalt: 0x3a3b40,
  solar: 0x1b2440, // roof solar panels
  water: 0x3f6f8f,
  turf: 0x4f8a3f, // sports pitch
  track: 0xb0503a, // running track
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

  // the buildable data-center grid sits in the centre of a larger plot; the ring
  // around it is the surrounding neighbourhood (houses, school, roads, playground)
  const NEIGHBOR = 6.5;
  const innerHalfW = (W * CELL) / 2;
  const innerHalfD = (H * CELL) / 2;
  const plateHalfW = innerHalfW + NEIGHBOR;
  const plateHalfD = innerHalfD + NEIGHBOR;
  const plateW = plateHalfW * 2;
  const plateD = plateHalfD * 2;
  const plateR = Math.max(plateHalfW, plateHalfD);

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
  const camera = new THREE.PerspectiveCamera(29, 1, 0.5, 260);
  const target = new THREE.Vector3(0, 0.25, 0);
  const cam = { az: -0.72, pol: 0.86, rad: plateR * 2.15 };
  const RAD_MIN = plateR * 0.95;
  const RAD_MAX = plateR * 3.4;
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
  sun.position.set(plateHalfW * 0.7, plateR * 1.5, plateHalfD * 0.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera as THREE.OrthographicCamera;
  const span = plateR + 1;
  sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span;
  sc.near = 1; sc.far = plateR * 5;
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

  // shared campus materials (data-hall + office + roads, after the reference)
  const matSiding = new THREE.MeshStandardMaterial({ color: COL.siding, roughness: 0.6, metalness: 0.2 });
  const matNavy = new THREE.MeshStandardMaterial({ color: COL.navy, roughness: 0.55, metalness: 0.2 });
  const matWhite = new THREE.MeshStandardMaterial({ color: COL.white, roughness: 0.7 });
  const matGlass = new THREE.MeshStandardMaterial({
    color: COL.glass, roughness: 0.12, metalness: 0.5,
    emissive: new THREE.Color(COL.glass), emissiveIntensity: 0.16,
  });
  const matAsphalt = new THREE.MeshStandardMaterial({ color: COL.asphalt, roughness: 1 });
  const matSolar = new THREE.MeshStandardMaterial({ color: COL.solar, roughness: 0.35, metalness: 0.4 });
  const matRoofLight = new THREE.MeshStandardMaterial({ color: 0xc4c7c9, roughness: 0.9 });
  const matSteel = new THREE.MeshStandardMaterial({ color: 0xcfd4d8, roughness: 0.3, metalness: 0.7 });

  // ================= surrounding community =================
  // Houses, a school, roads and a playground ring the data center — the people
  // who actually live with the noise. Markers over homes appear as sentiment falls.
  const community = new THREE.Group();
  island.add(community);
  const communityMarkers: { mesh: THREE.Object3D; threshold: number; baseY: number }[] = [];
  const bgRotors: THREE.Object3D[] = []; // background wind-turbine rotors

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x2c2c2f, roughness: 1 });
  const wallMats = [0xd8cdbb, 0xcbb89f, 0xc3cbcd, 0xd7c3b0, 0xcad2c4, 0xbcc3cb].map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 })
  );
  const roofMats = [0x8a4b3a, 0x6b6f77, 0x7a5a44, 0x515b67, 0x9a5a48].map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 })
  );
  const winMat = new THREE.MeshStandardMaterial({
    color: 0xffd98a, emissive: new THREE.Color(0xffcf7a), emissiveIntensity: 0.7, roughness: 0.6,
  });
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x4f7d3a, roughness: 1 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 1 });
  const markerMat = new THREE.MeshStandardMaterial({
    color: 0xff4632, emissive: new THREE.Color(0xff4632), emissiveIntensity: 1.5, roughness: 0.5,
  });

  const cbox = (w: number, h: number, d: number, mat: THREE.Material, cast = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.castShadow = cast;
    m.receiveShadow = true;
    return m;
  };

  let seedN = 1;
  const makeHouse = () => {
    const s = seedN++;
    const g = new THREE.Group();
    const wall = wallMats[s % wallMats.length];
    const roof = roofMats[(s * 3) % roofMats.length];
    const bw = 0.9 + (s % 3) * 0.12;
    const bh = 0.5 + (s % 2) * 0.14;
    const bd = 0.9;
    const body = cbox(bw, bh, bd, wall);
    body.position.y = bh / 2;
    g.add(body);
    const roofM = new THREE.Mesh(new THREE.ConeGeometry(bw * 0.82, 0.4, 4), roof);
    roofM.rotation.y = Math.PI / 4;
    roofM.position.y = bh + 0.2;
    roofM.castShadow = true;
    g.add(roofM);
    const win = cbox(0.22, 0.2, 0.03, winMat, false);
    win.position.set(0, bh * 0.5, bd / 2 + 0.02);
    g.add(win);
    // rooftop solar panels on many homes (as in the reference)
    if (s % 3 !== 0) {
      const panel = cbox(bw * 0.6, 0.02, 0.32, matSolar, false);
      panel.position.set(0, bh + 0.16, bd * 0.2);
      panel.rotation.x = -0.5;
      g.add(panel);
    }
    // discontent marker (hidden until sentiment drops past this house's threshold)
    const marker = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.3, 4), markerMat);
    marker.rotation.y = Math.PI / 4;
    marker.position.y = bh + 0.75;
    marker.visible = false;
    g.add(marker);
    communityMarkers.push({ mesh: marker, threshold: 0.15 + ((s * 0.17) % 0.72), baseY: bh + 0.75 });
    return g;
  };

  const makeTree = () => {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.3, 6), trunkMat);
    trunk.position.y = 0.15;
    trunk.castShadow = true;
    g.add(trunk);
    const foliage = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.6, 7), foliageMat);
    foliage.position.y = 0.55;
    foliage.castShadow = true;
    g.add(foliage);
    return g;
  };

  // roads: a perimeter loop between the plant and the homes
  const rRoadW = innerHalfW + 1.3;
  const rRoadD = innerHalfD + 1.3;
  const roadY = 0.012;
  const addRoad = (w: number, d: number, x: number, z: number) => {
    const m = cbox(w, 0.02, d, roadMat, false);
    m.position.set(x, roadY, z);
    community.add(m);
  };
  addRoad(rRoadW * 2 + 0.6, 0.6, 0, -rRoadD);
  addRoad(rRoadW * 2 + 0.6, 0.6, 0, rRoadD);
  addRoad(0.6, rRoadD * 2 + 0.6, -rRoadW, 0);
  addRoad(0.6, rRoadD * 2 + 0.6, rRoadW, 0);

  // house rows on all four sides, facing the plant
  const houseRow = (
    axis: "z" | "x", fixed: number, from: number, to: number, step: number, rotY: number
  ) => {
    for (let p = from; p <= to; p += step) {
      const h = makeHouse();
      if (axis === "z") h.position.set(p, 0, fixed);
      else h.position.set(fixed, 0, p);
      h.rotation.y = rotY + (seedN % 2 ? 0.1 : -0.12);
      community.add(h);
    }
  };
  // the neighbourhood lines the FRONT (+z); the coast is behind the plant
  houseRow("z", innerHalfD + 3.2, -innerHalfW - 0.6, innerHalfW + 0.6, 2.1, Math.PI);
  houseRow("z", innerHalfD + 5.3, -innerHalfW - 1.4, innerHalfW - 1.4, 2.1, Math.PI);

  // ---- security fence hugging the data-center campus ----
  const fence = new THREE.Group();
  const fenceMat = new THREE.MeshStandardMaterial({
    color: 0x30343a, transparent: true, opacity: 0.4, side: THREE.DoubleSide, roughness: 0.9, metalness: 0.3,
  });
  const fh = 0.5;
  const fxW = innerHalfW + 0.7;
  const fzD = innerHalfD + 0.7;
  const fencePanel = (w: number, x: number, z: number, vertical: boolean) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, fh), fenceMat);
    p.position.set(x, fh / 2, z);
    if (vertical) p.rotation.y = Math.PI / 2;
    fence.add(p);
  };
  fencePanel(fxW * 2, 0, -fzD, false);
  fencePanel(fxW * 2, 0, fzD, false);
  fencePanel(fzD * 2, -fxW, 0, true);
  fencePanel(fzD * 2, fxW, 0, true);
  const postGeo = new THREE.CylinderGeometry(0.02, 0.02, fh + 0.08, 6);
  const addPost = (x: number, z: number) => { const p = new THREE.Mesh(postGeo, matMetalDark); p.position.set(x, fh / 2, z); p.castShadow = true; fence.add(p); };
  for (let x = -fxW; x <= fxW + 0.01; x += 1.5) { addPost(x, -fzD); addPost(x, fzD); }
  for (let z = -fzD + 1.5; z <= fzD - 0.01; z += 1.5) { addPost(-fxW, z); addPost(fxW, z); }
  community.add(fence);

  // ---- plant office + truck yard (left of the campus) ----
  const campus = new THREE.Group();
  campus.position.set(-(innerHalfW + 3.6), 0, 0);
  // two-storey office: navy ground floor, white upper, rooftop units
  const office = new THREE.Group();
  office.position.set(0, 0, 2.2);
  const oLower = cbox(1.5, 0.5, 1.0, matNavy); oLower.position.y = 0.25; office.add(oLower);
  const oUpper = cbox(1.4, 0.42, 0.92, matWhite); oUpper.position.y = 0.71; office.add(oUpper);
  for (let k = 0; k < 3; k++) { const u = cbox(0.18, 0.1, 0.18, matMetal); u.position.set(-0.4 + k * 0.4, 0.98, 0); office.add(u); }
  for (let k = 0; k < 4; k++) { const w = cbox(0.12, 0.18, 0.02, winMat, false); w.position.set(-0.5 + k * 0.33, 0.72, 0.47); office.add(w); }
  const oGlass = cbox(1.2, 0.16, 0.02, matGlass, false); oGlass.position.set(0, 0.3, 0.51); office.add(oGlass);
  campus.add(office);
  // parking lot with painted stalls
  const lot = cbox(2.0, 0.02, 1.7, matAsphalt, false); lot.position.set(0, 0.012, -0.4); campus.add(lot);
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xd9dde2, roughness: 1 });
  for (let k = 0; k < 6; k++) { const st = cbox(0.02, 0.005, 0.5, stripeMat, false); st.position.set(-0.75 + k * 0.3, 0.02, -0.65); campus.add(st); }
  // a few articulated trucks
  const makeTruck = (trailer: number) => {
    const t = new THREE.Group();
    const cab = cbox(0.34, 0.26, 0.24, matWhite); cab.position.set(0.55, 0.13, 0); t.add(cab);
    const box2 = cbox(0.75, 0.34, 0.3, new THREE.MeshStandardMaterial({ color: trailer, roughness: 0.7 })); box2.position.set(-0.05, 0.2, 0); t.add(box2);
    return t;
  };
  const truckCols = [0x2f5aa8, 0xe7eaee, 0x2f5aa8];
  for (let k = 0; k < 3; k++) { const tr = makeTruck(truckCols[k]); tr.position.set(0, 0.02, -0.9 + k * 0.42); tr.rotation.y = Math.PI / 2; campus.add(tr); }
  community.add(campus);

  // ---- community sports field (right of the campus) ----
  const sports = new THREE.Group();
  sports.position.set(innerHalfW + 4.2, 0, -0.5);
  const track = cbox(3.0, 0.02, 4.4, new THREE.MeshStandardMaterial({ color: COL.track, roughness: 1 }), false); track.position.y = 0.011; sports.add(track);
  const pitch = cbox(2.4, 0.02, 3.6, new THREE.MeshStandardMaterial({ color: COL.turf, roughness: 1 }), false); pitch.position.y = 0.014; sports.add(pitch);
  const sportLineMat = new THREE.MeshStandardMaterial({ color: 0xeef2f0, roughness: 1 });
  const midline = cbox(2.3, 0.004, 0.04, sportLineMat, false); midline.position.y = 0.016; sports.add(midline);
  const circle = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.38, 24), sportLineMat); circle.rotation.x = -Math.PI / 2; circle.position.y = 0.016; sports.add(circle);
  community.add(sports);

  // hard-court (tennis) next to the pitch
  const court = new THREE.Group();
  court.position.set(innerHalfW + 4.2, 0, 3.2);
  court.add((() => { const m = cbox(1.4, 0.02, 2.0, new THREE.MeshStandardMaterial({ color: 0x3a6b8c, roughness: 1 }), false); m.position.y = 0.012; return m; })());
  court.add((() => { const m = cbox(1.0, 0.004, 0.03, sportLineMat, false); m.position.y = 0.016; return m; })());
  community.add(court);

  // parked cars in the office lot
  const makeCar = (c: number) => {
    const car = new THREE.Group();
    car.add((() => { const b = cbox(0.32, 0.1, 0.16, new THREE.MeshStandardMaterial({ color: c, roughness: 0.35, metalness: 0.5 })); b.position.y = 0.06; return b; })());
    car.add((() => { const cab = cbox(0.18, 0.08, 0.14, new THREE.MeshStandardMaterial({ color: c, roughness: 0.35, metalness: 0.5 })); cab.position.set(-0.01, 0.14, 0); return cab; })());
    return car;
  };
  const carCols = [0x22252b, 0x2f3742, 0x7a1f1f, 0xcfd3d6, 0x203a5a, 0x3a3d42];
  for (let k = 0; k < 6; k++) {
    const car = makeCar(carCols[k % carCols.length]);
    car.position.set(-(innerHalfW + 4.2), 0.02, -1.1 + k * 0.34);
    car.rotation.y = Math.PI / 2;
    community.add(car);
  }

  // solar farm — rows of tilted panels (left-back of the plot)
  const solarFarm = new THREE.Group();
  solarFarm.position.set(-(innerHalfW + 3.9), 0, -3.6);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      const post = cbox(0.02, 0.14, 0.02, matMetalDark, false); post.position.set(c * 0.58, 0.07, r * 0.5); solarFarm.add(post);
      const panel = cbox(0.5, 0.02, 0.34, matSolar, false); panel.position.set(c * 0.58, 0.2, r * 0.5); panel.rotation.x = -0.5; solarFarm.add(panel);
    }
  }
  community.add(solarFarm);

  // container / generator yard — rows of grey units (left-front)
  const yard = new THREE.Group();
  yard.position.set(-(innerHalfW + 3.9), 0, 3.4);
  const contCols = [0x8a8f95, 0x6f757c, 0x9aa0a6, 0x556070];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      const unit = cbox(0.5, 0.24, 0.26, new THREE.MeshStandardMaterial({ color: contCols[(r + c) % contCols.length], roughness: 0.85 }));
      unit.position.set(c * 0.58, 0.12, r * 0.34);
      yard.add(unit);
    }
  }
  community.add(yard);

  // ---- coastline behind the plant: sea, beach, background wind turbines ----
  // water occupies the back band of the plot; a sandy beach fronts it
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(plateW * 0.98, 5.4),
    new THREE.MeshStandardMaterial({ color: COL.water, roughness: 0.25, metalness: 0.1 })
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, 0.006, -(innerHalfD + 4.0));
  community.add(sea);
  const beach = cbox(plateW * 0.94, 0.02, 1.6, new THREE.MeshStandardMaterial({ color: 0xd8c48e, roughness: 1 }), false);
  beach.position.set(0, 0.014, -(innerHalfD + 1.5));
  community.add(beach);

  const makeBgTurbine = () => {
    const g = new THREE.Group();
    const th = 2.6;
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.11, th, 12), matWhite);
    tower.position.y = th / 2; tower.castShadow = true; g.add(tower);
    const nac = cbox(0.16, 0.14, 0.36, matWhite); nac.position.set(0, th, 0.05); g.add(nac);
    const rotor = new THREE.Group(); rotor.position.set(0, th, 0.24);
    rotor.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), matWhite));
    for (let b = 0; b < 3; b++) {
      const holder = new THREE.Group(); holder.rotation.z = (b * Math.PI * 2) / 3;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, 0.03), matWhite); blade.position.y = 0.55; blade.castShadow = true; holder.add(blade);
      rotor.add(holder);
    }
    g.add(rotor);
    return { group: g, rotor };
  };
  for (let k = 0; k < 5; k++) {
    const { group, rotor } = makeBgTurbine();
    group.position.set(-plateHalfW + 2 + (k * (plateW - 4)) / 4, 0, -(innerHalfD + 3.4 + (k % 2) * 1.4));
    community.add(group);
    bgRotors.push(rotor);
  }

  // ---- street lights along the perimeter road ----
  const lampEmit = new THREE.MeshStandardMaterial({ color: 0xffe6b0, emissive: new THREE.Color(0xffe0a0), emissiveIntensity: 0.8, roughness: 0.6 });
  const makeLamp = () => {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.7, 6), matMetalDark); pole.position.y = 0.35; pole.castShadow = true; g.add(pole);
    const arm = cbox(0.16, 0.02, 0.02, matMetalDark, false); arm.position.set(0.07, 0.68, 0); g.add(arm);
    const lamp = cbox(0.06, 0.03, 0.05, lampEmit, false); lamp.position.set(0.14, 0.66, 0); g.add(lamp);
    return g;
  };
  for (let p = -rRoadW + 0.6; p <= rRoadW - 0.5; p += 2.4) {
    const a = makeLamp(); a.position.set(p, 0, rRoadD + 0.35); community.add(a);
    const b = makeLamp(); b.position.set(p, 0, -rRoadD - 0.35); b.rotation.y = Math.PI; community.add(b);
  }

  // school — a longer block with a bright roof, a small yard and a flagpole
  const school = new THREE.Group();
  const schoolBody = cbox(3.0, 0.7, 1.1, wallMats[2]);
  schoolBody.position.y = 0.35;
  school.add(schoolBody);
  school.add((() => { const r = cbox(3.1, 0.08, 1.2, new THREE.MeshStandardMaterial({ color: 0xb5443a, roughness: 0.9 })); r.position.y = 0.72; return r; })());
  for (let k = 0; k < 5; k++) { const w = cbox(0.28, 0.26, 0.03, winMat, false); w.position.set(-1.0 + k * 0.5, 0.4, 0.56); school.add(w); }
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 6), matMetalDark);
  pole.position.set(-1.7, 0.5, 0.6); school.add(pole);
  const flag = cbox(0.35, 0.22, 0.02, new THREE.MeshStandardMaterial({ color: 0x4a90d0, roughness: 0.8 }), false);
  flag.position.set(-1.52, 0.9, 0.6); school.add(flag);
  school.position.set(innerHalfW + 3.9, 0, -3.4);
  community.add(school);
  communityMarkers.push({ mesh: (() => { const m = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.36, 4), markerMat); m.rotation.y = Math.PI / 4; m.position.set(school.position.x, 1.15, school.position.z); m.visible = false; community.add(m); return m; })(), threshold: 0.35, baseY: 1.15 });

  // playground — sandbox, slide, swing frame, in bright colours
  const playground = new THREE.Group();
  const sand = cbox(2.0, 0.04, 1.6, new THREE.MeshStandardMaterial({ color: 0xd9c48c, roughness: 1 }), false);
  sand.position.y = 0.02; playground.add(sand);
  const slide = cbox(0.3, 0.06, 0.9, new THREE.MeshStandardMaterial({ color: 0x3fb6a6, roughness: 0.7 }));
  slide.position.set(-0.5, 0.28, 0); slide.rotation.x = 0.5; playground.add(slide);
  const slideTop = cbox(0.4, 0.5, 0.4, new THREE.MeshStandardMaterial({ color: 0xe0a63a, roughness: 0.8 }));
  slideTop.position.set(-0.5, 0.25, -0.55); playground.add(slideTop);
  const swingA = cbox(0.05, 0.6, 0.05, matMetal); swingA.position.set(0.6, 0.3, -0.35); playground.add(swingA);
  const swingB = cbox(0.05, 0.6, 0.05, matMetal); swingB.position.set(0.6, 0.3, 0.35); playground.add(swingB);
  const swingBar = cbox(0.05, 0.05, 0.8, matMetal); swingBar.position.set(0.6, 0.58, 0); playground.add(swingBar);
  playground.position.set(0, 0, innerHalfD + 6.0);
  community.add(playground);

  // scattered trees around the neighbourhood
  const treeSpots: [number, number][] = [
    [-plateHalfW + 1.6, plateHalfD - 1.5], [plateHalfW - 1.5, plateHalfD - 1.4],
    [-(innerHalfW + 5.6), innerHalfD + 3], [innerHalfW + 5.6, innerHalfD + 3],
    [-3.4, innerHalfD + 4.4], [3.6, innerHalfD + 4.2], [-innerHalfW - 1.2, innerHalfD + 4.8],
    [innerHalfW + 1.4, innerHalfD + 4.8], [-plateHalfW + 1.8, innerHalfD + 1], [plateHalfW - 1.8, innerHalfD + 1],
  ];
  for (const [tx, tz] of treeSpots) { const t = makeTree(); t.position.set(tx, 0, tz); community.add(t); }

  // ---- noise ripples spreading from the plant across the neighbourhood ----
  const rippleGroup = new THREE.Group();
  island.add(rippleGroup);
  const rippleGeo = new THREE.RingGeometry(0.85, 1.0, 56);
  const ripples: { mesh: THREE.Mesh; phase: number }[] = [];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(
      rippleGeo,
      new THREE.MeshBasicMaterial({
        color: 0xffd24a, transparent: true, opacity: 0, depthWrite: false,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.05;
    rippleGroup.add(m);
    ripples.push({ mesh: m, phase: i / 5 });
  }

  // ---- lingering methane smog hanging over the town ----
  const townSmog = new THREE.Group();
  island.add(townSmog);
  const smogPuffs: { spr: THREE.Sprite; ph: number; bx: number; by: number; bz: number }[] = [];
  {
    const cols = 6, rows = 3;
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const sm = new THREE.SpriteMaterial({ map: steamTex, transparent: true, opacity: 0, depthWrite: false, color: 0x8f8a7e });
        const spr = new THREE.Sprite(sm);
        const bx = -plateHalfW + 2 + (c / (cols - 1)) * (plateW - 4);
        const bz = innerHalfD + 2.2 + r * 1.9;
        const by = 1.5 + (idx % 2 ? 0.25 : 0);
        const scx = 3.2 + (idx % 3) * 0.8;
        spr.scale.set(scx, scx * 0.5, 1);
        spr.position.set(bx, by, bz);
        townSmog.add(spr);
        smogPuffs.push({ spr, ph: idx / (cols * rows), bx, by, bz });
        idx++;
      }
    }
  }

  // ---- building builders ----
  type Anim = {
    kind: BuildingType;
    glowMesh?: THREE.Mesh; // emissive when hot
    led?: THREE.Mesh;
    blink?: THREE.Mesh;
    rotor?: THREE.Object3D; // spinning wind-turbine rotor
    steam?: { spr: THREE.Sprite; t: number; sp: number; ox: number; oz: number }[];
    smog?: { spr: THREE.Sprite; t: number; sp: number; ox: number; oz: number }[];
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
    // dark-blue lower walls, light-metal upper walls, flat light-grey roof
    g.add(box(0.9, 0.16, 0.9, matNavy, 0.08));
    const bodyMat = matSiding.clone();
    bodyMat.emissive = new THREE.Color(COL.warn);
    bodyMat.emissiveIntensity = 0;
    const body = box(0.86, 0.26, 0.86, bodyMat, 0.29);
    g.add(body);
    g.add(box(0.92, 0.05, 0.92, matRoofLight, 0.44)); // flat roof deck
    // grid of skylight panels across the roof (the reference's paneled look)
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const sky = box(0.24, 0.015, 0.24, matGlass, 0.475);
        sky.position.set(-0.28 + c * 0.28, 0, -0.28 + r * 0.28);
        sky.castShadow = false;
        g.add(sky);
      }
    }
    // a few rooftop HVAC units along the front edge
    for (let k = 0; k < 3; k++) {
      const u = box(0.1, 0.07, 0.1, matMetal, 0.49);
      u.position.set(-0.3 + k * 0.3, 0, 0.4);
      g.add(u);
    }
    // vent stacks
    for (let k = 0; k < 2; k++) {
      const v = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 8), matMetalDark);
      v.position.set(-0.34 + k * 0.68, 0.54, -0.4);
      v.castShadow = true;
      g.add(v);
    }
    // loading-bay doors along the front (+z)
    for (let k = 0; k < 4; k++) {
      const door = box(0.15, 0.18, 0.02, matMetal, 0.11);
      door.position.set(-0.3 + k * 0.2, 0, 0.46);
      door.castShadow = false;
      g.add(door);
    }
    // LED status strip
    const ledMat = new THREE.MeshStandardMaterial({
      color: COL.led, emissive: new THREE.Color(COL.led), emissiveIntensity: 1.1, roughness: 0.4,
    });
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.02), ledMat);
    led.position.set(0, 0.3, 0.455);
    g.add(led);
    return { group: g, anim: { kind: "rack", glowMesh: body, led } };
  }

  function makeCoolingPlant(): { group: THREE.Group; anim: Anim } {
    const g = new THREE.Group();
    g.add(box(0.94, 0.06, 0.94, matMetalDark, 0.03)); // concrete pad
    // low equipment shed
    const shed = box(0.6, 0.28, 0.44, matSiding, 0.15);
    shed.position.set(-0.02, 0, -0.22);
    g.add(shed);
    // silver pressure tanks (cylinder + domed cap)
    for (let k = 0; k < 3; k++) {
      const x = -0.24 + k * 0.24;
      const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.34, 14), matSteel);
      tb.position.set(x, 0.26, 0.2);
      tb.castShadow = true;
      g.add(tb);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), matSteel);
      cap.position.set(x, 0.43, 0.2);
      g.add(cap);
    }
    // tall thin exhaust stacks behind the tanks
    const stackTops: number[] = [];
    for (let k = 0; k < 3; k++) {
      const x = -0.2 + k * 0.2;
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.045, 0.66, 10), matSteel);
      st.position.set(x, 0.53, -0.2);
      st.castShadow = true;
      g.add(st);
      stackTops.push(x);
    }
    // steam rising from the stacks — the drifting plume that reaches the homes
    const steam: Anim["steam"] = [];
    const COUNT = 7;
    const emitY = 0.9;
    for (let i = 0; i < COUNT; i++) {
      const sm = new THREE.SpriteMaterial({
        map: steamTex, transparent: true, opacity: 0, depthWrite: false,
        blending: THREE.NormalBlending, color: 0xeef0ec,
      });
      const spr = new THREE.Sprite(sm);
      spr.position.set(stackTops[i % stackTops.length], emitY, -0.2);
      g.add(spr);
      steam.push({ spr, t: i / COUNT, sp: 0.45 + (i % 3) * 0.07, ox: stackTops[i % stackTops.length], oz: -0.2 });
    }
    return { group: g, anim: { kind: "cooler", steam, emitY } };
  }

  function makeGasTurbine(): { group: THREE.Group; anim: Anim } {
    const g = new THREE.Group();
    g.add(box(0.94, 0.06, 0.94, matMetalDark, 0.03)); // pad
    // silver turbine hall
    const hall = box(0.46, 0.34, 0.66, matSiding, 0.18);
    hall.position.set(0.2, 0, 0.0);
    g.add(hall);
    // HRSG / heat-recovery cylinders alongside
    for (let k = 0; k < 2; k++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.4, 12), matSteel);
      c.position.set(-0.12, 0.26, -0.16 + k * 0.32);
      c.castShadow = true;
      g.add(c);
    }
    // a row of tall exhaust stacks — the emissions source
    const stackX: number[] = [];
    for (let k = 0; k < 5; k++) {
      const x = -0.36 + k * 0.12;
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.038, 0.95, 10), matSteel);
      st.position.set(x, 0.55, -0.34);
      st.castShadow = true;
      g.add(st);
      // little cap
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 10), matMetalDark);
      cap.position.set(x, 1.03, -0.34);
      g.add(cap);
      stackX.push(x);
    }
    // smoggy plume from the stacks
    const smog: Anim["smog"] = [];
    const COUNT = 8;
    const emitY = 1.05;
    for (let i = 0; i < COUNT; i++) {
      const sm = new THREE.SpriteMaterial({
        map: steamTex, transparent: true, opacity: 0, depthWrite: false,
        blending: THREE.NormalBlending, color: 0x9a9488,
      });
      const spr = new THREE.Sprite(sm);
      const sx = stackX[i % stackX.length];
      spr.position.set(sx, emitY, -0.34);
      g.add(spr);
      smog.push({ spr, t: i / COUNT, sp: 0.32 + (i % 3) * 0.05, ox: sx, oz: -0.34 });
    }
    return { group: g, anim: { kind: "power", smog, emitY } };
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
      case "cooler": return makeCoolingPlant();
      case "power": return makeGasTurbine();
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
  const rippleColA = new THREE.Color(0xffd24a);
  const rippleColB = new THREE.Color(0xff3b2f);
  const rippleCol = new THREE.Color();
  const hemiBase = hemi.intensity;

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
          const y = (a.emitY ?? 0.9) + life * 1.5;
          // rise and drift toward the homes (+z), like the plumes in the reference
          s.spr.position.set(s.ox * 0.5 + life * 0.18, y, -0.2 + life * 0.9);
          const sc = 0.4 + life * 1.15;
          s.spr.scale.set(sc, sc, sc);
          (s.spr.material as THREE.SpriteMaterial).opacity = Math.sin(life * Math.PI) * 0.45;
        }
      } else if (a.kind === "power" && a.smog) {
        for (const s of a.smog) {
          s.t += dt * s.sp;
          if (s.t >= 1) s.t -= 1;
          const life = s.t;
          const y = (a.emitY ?? 1.05) + life * 1.7;
          // rise and drift toward the town (+z), lingering
          s.spr.position.set(s.ox + life * 0.35, y, s.oz + life * 1.4);
          const sc = 0.35 + life * 1.5;
          s.spr.scale.set(sc, sc, sc);
          (s.spr.material as THREE.SpriteMaterial).opacity = Math.sin(life * Math.PI) * 0.5;
        }
      } else if (a.kind === "network" && a.blink) {
        (a.blink.material as THREE.MeshStandardMaterial).emissiveIntensity =
          0.5 + 0.7 * Math.abs(Math.sin(time * 4 + i));
      }
    }

    // ---- noise ripples, community sentiment markers & mood ----
    const noiseNorm = Math.max(0, Math.min(1, (engine.noise - 42) / (100 - 42)));
    const rippleMax = 2.5 + noiseNorm * (plateR - 2);
    rippleCol.copy(rippleColA).lerp(rippleColB, noiseNorm);
    for (const r of ripples) {
      r.phase += dt * (0.12 + noiseNorm * 0.28);
      if (r.phase > 1) r.phase -= 1;
      const rad = 1 + r.phase * rippleMax;
      r.mesh.scale.set(rad, rad, 1);
      const mat = r.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = noiseNorm < 0.05 ? 0 : (1 - r.phase) * noiseNorm * 0.5;
      mat.color.copy(rippleCol);
    }

    for (const r of bgRotors) r.rotation.z += dt * 1.1;

    // lingering methane smog over the town
    const methaneNorm = Math.max(0, Math.min(1, engine.methane / 90));
    for (const p of smogPuffs) {
      const drift = Math.sin(time * 0.12 + p.ph * 6.283) * 0.5;
      p.spr.position.set(p.bx + drift, p.by + Math.sin(time * 0.4 + p.ph * 6.283) * 0.12, p.bz);
      (p.spr.material as THREE.SpriteMaterial).opacity = methaneNorm * (0.16 + 0.1 * Math.sin(time * 0.25 + p.ph * 6.283));
    }

    const discontent = 1 - engine.sentiment / 100;
    for (const m of communityMarkers) {
      const on = discontent > m.threshold;
      if (m.mesh.visible !== on) m.mesh.visible = on;
      if (on) m.mesh.position.y = m.baseY + 0.1 + Math.sin(time * 3 + m.threshold * 12) * 0.07;
    }
    // the whole plot dims a little as the community turns against the site
    hemi.intensity = hemiBase - discontent * 0.22;

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
      // community + ripples
      const disposeTree = (root: THREE.Object3D) =>
        root.traverse((o) => {
          const m = o as THREE.Mesh;
          m.geometry?.dispose?.();
          const mm = (o as unknown as { material?: THREE.Material | THREE.Material[] }).material;
          if (Array.isArray(mm)) mm.forEach((x) => x.dispose());
          else mm?.dispose();
        });
      disposeTree(community);
      disposeTree(rippleGroup);
      disposeTree(townSmog);
      steamTex.dispose();
      renderer.dispose();
      if (el.parentElement === container) container.removeChild(el);
    },
  };
}
