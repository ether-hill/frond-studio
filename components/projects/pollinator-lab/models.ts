// Pollinator Lab — procedural creature builders.
//
// Every pollinator is generated in code from its `ModelSpec`: no meshes are
// loaded. Each builder returns a group centred on the origin plus an `update`
// hook the viewer calls each frame to flutter wings and let the body breathe.
// Materials lean on MeshPhysicalMaterial — iridescence for orchid bees and
// jewel beetles, clearcoat for hard shells, sheen for fur — so the studio
// environment does the heavy lifting and everything stays GPU-cheap.

import * as THREE from "three";
import type { ModelSpec } from "./species";

export type Creature = {
  group: THREE.Group;
  /** Called every frame. t = seconds, flap intensity is 0..1. */
  update: (t: number) => void;
  dispose: () => void;
  /** Natural facing offset (radians about Y) that puts the "hero" side at camera. */
  yaw0: number;
};

// --- disposable bookkeeping ------------------------------------------------

class Junk {
  geos: THREE.BufferGeometry[] = [];
  mats: THREE.Material[] = [];
  texs: THREE.Texture[] = [];
  g<T extends THREE.BufferGeometry>(x: T): T { this.geos.push(x); return x; }
  m<T extends THREE.Material>(x: T): T { this.mats.push(x); return x; }
  t<T extends THREE.Texture>(x: T): T { this.texs.push(x); return x; }
  dispose() {
    this.geos.forEach((x) => x.dispose());
    this.mats.forEach((x) => x.dispose());
    this.texs.forEach((x) => x.dispose());
  }
}

// --- materials -------------------------------------------------------------

function bodyMaterial(j: Junk, spec: ModelSpec, color = spec.body): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({
    color,
    roughness: spec.iridescent ? 0.28 : spec.fuzzy ? 0.9 : 0.45,
    metalness: spec.metalness ?? (spec.iridescent ? 0.9 : 0.2),
    clearcoat: spec.clearcoat ? 1 : 0,
    clearcoatRoughness: 0.12,
  });
  if (spec.iridescent) {
    m.iridescence = 1;
    m.iridescenceIOR = 1.9;
    m.iridescenceThicknessRange = [120, 500];
  }
  if (spec.fuzzy) {
    m.sheen = 1;
    m.sheenRoughness = 0.75;
    m.sheenColor = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.5);
  }
  return j.m(m);
}

const solid = (j: Junk, color: number, rough = 0.5, metal = 0.1) =>
  j.m(new THREE.MeshPhysicalMaterial({ color, roughness: rough, metalness: metal }));

// --- canvas wing painter ---------------------------------------------------

type WingKind = "membrane" | "tiger-fore" | "tiger-hind" | "eyespot" | "band" | "feather";

function paintWing(j: Junk, kind: WingKind, spec: ModelSpec): THREE.CanvasTexture {
  const S = 256;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  g.clearRect(0, 0, S, S);
  const hex = (n: number) => "#" + n.toString(16).padStart(6, "0");

  // wing silhouette (right wing, hinge on the left edge). We paint into a
  // teardrop/leaf and let the transparent plane cut it out.
  const silhouette = (round: number) => {
    g.beginPath();
    g.moveTo(6, S * 0.5);
    g.bezierCurveTo(S * 0.1, S * (0.5 - round), S * 0.7, 6, S * 0.86, S * 0.28);
    g.bezierCurveTo(S * 0.99, S * 0.44, S * 0.99, S * 0.6, S * 0.84, S * 0.78);
    g.bezierCurveTo(S * 0.6, S * 0.98, S * 0.18, S * (0.5 + round), 6, S * 0.5);
    g.closePath();
  };

  if (kind === "membrane" || kind === "feather") {
    silhouette(0.36);
    const grad = g.createLinearGradient(0, 0, S, 0);
    const base = kind === "feather" ? spec.wing ?? 0xcfd8df : spec.wing ?? 0xb9c9d6;
    grad.addColorStop(0, "rgba(255,255,255,0.42)");
    grad.addColorStop(1, hex(base) + "66");
    g.fillStyle = grad;
    g.fill();
    // veins
    g.strokeStyle = "rgba(70,80,95,0.35)";
    g.lineWidth = 1.4;
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.moveTo(8, S * 0.5);
      const yy = S * (0.2 + i * 0.12);
      g.quadraticCurveTo(S * 0.5, S * 0.5, S * 0.9, yy);
      g.stroke();
    }
  } else if (kind === "tiger-fore") {
    silhouette(0.34);
    g.fillStyle = hex(spec.wingB ?? 0xf3ead2);
    g.fill();
    g.save();
    silhouette(0.34);
    g.clip();
    g.fillStyle = hex(spec.wingA ?? 0x6b4a33);
    // organic chocolate blotches
    const blobs = [[0.28, 0.4, 0.16], [0.55, 0.3, 0.13], [0.5, 0.62, 0.15], [0.75, 0.5, 0.12], [0.36, 0.7, 0.1], [0.8, 0.32, 0.09]];
    blobs.forEach(([x, y, r]) => {
      g.beginPath();
      g.ellipse(x * S, y * S, r * S, r * S * 0.8, 0.4, 0, Math.PI * 2);
      g.fill();
    });
    g.restore();
  } else if (kind === "tiger-hind") {
    silhouette(0.42);
    g.fillStyle = hex(spec.accent ?? 0xe86a2a);
    g.fill();
    g.save();
    silhouette(0.42);
    g.clip();
    g.fillStyle = "#171015";
    [[0.4, 0.36, 0.08], [0.62, 0.3, 0.07], [0.55, 0.6, 0.09], [0.75, 0.52, 0.07], [0.36, 0.62, 0.07]].forEach(([x, y, r]) => {
      g.beginPath();
      g.arc(x * S, y * S, r * S, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "rgba(40,60,120,0.5)";
      g.lineWidth = 3;
      g.stroke();
    });
    g.restore();
  } else if (kind === "eyespot") {
    silhouette(0.32);
    const grad = g.createLinearGradient(0, 0, S, S);
    grad.addColorStop(0, hex(spec.wingA ?? 0xbfe0a8));
    grad.addColorStop(1, hex(spec.wingB ?? 0xd9ecc4));
    g.fillStyle = grad;
    g.fill();
    // leading edge tint
    g.strokeStyle = hex(spec.accent ?? 0xf0b8c8);
    g.lineWidth = 7;
    silhouette(0.32);
    g.stroke();
    // eyespot
    const ex = S * 0.6, ey = S * 0.42;
    g.fillStyle = "rgba(90,70,40,0.5)";
    g.beginPath(); g.ellipse(ex, ey, 20, 13, 0.3, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#f6f2df";
    g.beginPath(); g.ellipse(ex, ey, 11, 7, 0.3, 0, Math.PI * 2); g.fill();
  } else if (kind === "band") {
    silhouette(0.3);
    g.fillStyle = hex(spec.wingA ?? 0x8a7458);
    g.fill();
    g.save();
    silhouette(0.3);
    g.clip();
    g.fillStyle = hex(spec.wingB ?? 0xe0913f);
    for (let i = 0; i < 4; i++) {
      g.fillRect(0, S * (0.32 + i * 0.11), S, S * 0.05);
    }
    g.restore();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return j.t(tex);
}

function wingMesh(j: Junk, tex: THREE.CanvasTexture, w: number, h: number): THREE.Mesh {
  const geo = j.g(new THREE.PlaneGeometry(w, h, 1, 1));
  const mat = j.m(
    new THREE.MeshPhysicalMaterial({
      map: tex,
      transparent: true,
      side: THREE.DoubleSide,
      roughness: 0.6,
      metalness: 0,
      transmission: 0.15,
      depthWrite: false,
    })
  );
  // hinge on the -X edge of the plane: shift geometry so x=0 is the root
  geo.translate(w / 2, 0, 0);
  return new THREE.Mesh(geo, mat);
}

// small helper: a bent leg made of two thin cylinders
function leg(j: Junk, mat: THREE.Material, len: number): THREE.Group {
  const grp = new THREE.Group();
  const thigh = new THREE.Mesh(j.g(new THREE.CylinderGeometry(0.035, 0.028, len * 0.55, 6)), mat);
  thigh.position.y = -len * 0.275;
  const shin = new THREE.Mesh(j.g(new THREE.CylinderGeometry(0.026, 0.018, len * 0.6, 6)), mat);
  shin.position.set(0, -len * 0.55 - len * 0.25, len * 0.14);
  shin.rotation.x = 0.5;
  grp.add(thigh, shin);
  return grp;
}

// =========================================================================
//  BEE
// =========================================================================
function buildBee(j: Junk, spec: ModelSpec): Creature {
  const g = new THREE.Group();
  const body = bodyMaterial(j, spec);
  const dark = solid(j, spec.accent ?? 0x120f14, 0.5, 0.1);

  // thorax — compact, fuzzy, sits high and forward
  const thorax = new THREE.Mesh(j.g(new THREE.SphereGeometry(0.5, 32, 24)), body);
  thorax.scale.set(1.05, 1.0, 1.0);
  thorax.position.set(0.12, 0.02, 0);
  g.add(thorax);

  // abdomen — a tapered teardrop pointing back, overlapping the thorax
  const abdoMat = bodyMaterial(j, spec, spec.body2 ?? spec.body);
  const abdoPts: THREE.Vector2[] = [];
  for (let i = 0; i <= 12; i++) {
    const u = i / 12;
    // fat near the waist, tapering to a point at the tail
    const r = Math.sin(u * Math.PI * 0.92) * 0.46 * (1 - u * 0.25) + 0.02;
    abdoPts.push(new THREE.Vector2(r, u * 1.4));
  }
  const abdo = new THREE.Mesh(j.g(new THREE.LatheGeometry(abdoPts, 28)), abdoMat);
  abdo.rotation.z = Math.PI / 2; // point down -X
  abdo.position.set(-0.28, -0.02, 0);
  g.add(abdo);

  // banding — stripes wrapped around the abdomen
  {
    const bandMat = solid(j, spec.accent ?? (spec.pattern === "bands" ? 0xf1ead9 : 0x140f0a), 0.7, 0.05);
    const rings = spec.pattern === "bands" ? 3 : 2;
    for (let i = 0; i < rings; i++) {
      const rr = 0.4 - i * 0.09;
      const ring = new THREE.Mesh(j.g(new THREE.TorusGeometry(rr, 0.05, 8, 26)), bandMat);
      ring.rotation.y = Math.PI / 2;
      ring.position.x = -0.42 - i * 0.34;
      ring.scale.set(1, 0.92, 0.92);
      g.add(ring);
    }
  }

  // head — smaller than the thorax, tucked to the front
  const head = new THREE.Mesh(j.g(new THREE.SphereGeometry(0.33, 28, 22)), body);
  head.scale.set(0.9, 0.96, 1.0);
  head.position.set(0.6, 0.0, 0);
  g.add(head);

  // wrap-around compound eyes
  const eyeGeo = j.g(new THREE.SphereGeometry(0.15, 16, 14));
  for (const sz of [1, -1]) {
    const eye = new THREE.Mesh(eyeGeo, dark);
    eye.scale.set(0.62, 1.15, 0.7);
    eye.position.set(0.66, 0.06, sz * 0.22);
    g.add(eye);
  }

  // antennae — elbowed, out front
  for (const sz of [1, -1]) {
    const ant = new THREE.Mesh(j.g(new THREE.CylinderGeometry(0.016, 0.012, 0.42, 6)), dark);
    ant.position.set(0.86, 0.2, sz * 0.1);
    ant.rotation.z = -0.7;
    ant.rotation.x = sz * 0.25;
    g.add(ant);
  }

  // legs
  const legMat = dark;
  for (let i = 0; i < 3; i++) {
    for (const sz of [1, -1]) {
      const L = leg(j, legMat, 0.6);
      L.position.set(0.32 - i * 0.34, -0.34, sz * 0.34);
      L.rotation.z = sz * 0.42;
      L.rotation.x = (i - 1) * sz * 0.3;
      g.add(L);
    }
  }

  // wings (2 pairs) — translucent, hinged at top of thorax, swept back
  const wingTex = paintWing(j, "membrane", spec);
  const wings: THREE.Group[] = [];
  for (const sz of [1, -1]) {
    const fore = new THREE.Group();
    const fw = wingMesh(j, wingTex, 1.5, 0.62);
    fore.add(fw);
    fore.position.set(0.05, 0.5, sz * 0.18);
    fore.rotation.y = sz * 0.5;
    fore.rotation.z = 0.12;
    fore.rotation.x = -sz * 0.15;
    g.add(fore);
    wings.push(fore);

    const hind = new THREE.Group();
    const hw = wingMesh(j, wingTex, 1.0, 0.5);
    hind.add(hw);
    hind.position.set(-0.1, 0.42, sz * 0.16);
    hind.rotation.y = sz * 0.9;
    hind.rotation.z = 0.05;
    g.add(hind);
    wings.push(hind);
  }

  const s = spec.scale ?? 1;
  g.scale.setScalar(s);

  return {
    group: g,
    yaw0: -0.35,
    update: (t) => {
      const flap = Math.sin(t * 22) * 0.28 + 0.1;
      wings.forEach((w, i) => {
        const sz = i < 2 ? 1 : -1;
        w.rotation.x = (i < 2 ? -1 : 1) * (0.12) - flap * 0.5 * (i % 2 === 0 ? 1 : 0.7);
      });
      g.position.y = Math.sin(t * 2.1) * 0.05;
      g.rotation.z = Math.sin(t * 1.3) * 0.02;
    },
    dispose: () => {},
  };
}

// =========================================================================
//  MOTH  (wings spread, facing +Z)
// =========================================================================
function buildMoth(j: Junk, spec: ModelSpec): Creature {
  const g = new THREE.Group();
  const fur = bodyMaterial(j, { ...spec, fuzzy: true }, spec.body);
  const dark = solid(j, 0x2a2018, 0.7, 0.05);

  // furry thorax
  const thorax = new THREE.Mesh(j.g(new THREE.SphereGeometry(0.4, 24, 18)), fur);
  thorax.scale.set(0.9, 0.9, 1.1);
  g.add(thorax);

  // tapered abdomen toward -Z
  const abdo = new THREE.Mesh(j.g(new THREE.CylinderGeometry(0.32, 0.1, 1.15, 16)), fur);
  abdo.rotation.x = Math.PI / 2;
  abdo.position.z = -0.72;
  g.add(abdo);

  // head + eyes
  const head = new THREE.Mesh(j.g(new THREE.SphereGeometry(0.24, 20, 16)), fur);
  head.position.z = 0.42;
  g.add(head);
  const eyeGeo = j.g(new THREE.SphereGeometry(0.1, 12, 10));
  for (const sx of [1, -1]) {
    const e = new THREE.Mesh(eyeGeo, dark);
    e.position.set(sx * 0.16, 0.02, 0.5);
    g.add(e);
  }

  // feathery antennae
  for (const sx of [1, -1]) {
    const shaft = new THREE.Group();
    const rod = new THREE.Mesh(j.g(new THREE.CylinderGeometry(0.015, 0.01, 0.6, 5)), dark);
    rod.position.y = 0.3;
    shaft.add(rod);
    for (let k = 1; k < 7; k++) {
      const barb = new THREE.Mesh(j.g(new THREE.CylinderGeometry(0.006, 0.004, 0.14, 4)), dark);
      barb.position.set(0.06, k * 0.08, 0);
      barb.rotation.z = -0.9;
      shaft.add(barb.clone());
      const barb2 = barb.clone();
      barb2.position.x = -0.06;
      barb2.rotation.z = 0.9;
      shaft.add(barb2);
    }
    shaft.position.set(sx * 0.12, 0.18, 0.56);
    shaft.rotation.x = -0.7;
    shaft.rotation.z = sx * 0.5;
    g.add(shaft);
  }

  // wings: forewings (upper, larger) + hindwings (lower), spread along ±X
  const foreTex = paintWing(j, spec.pattern === "tiger" ? "tiger-fore" : spec.pattern === "eyespots" ? "eyespot" : "band", spec);
  const hindTex = paintWing(j, spec.pattern === "tiger" ? "tiger-hind" : spec.pattern === "eyespots" ? "eyespot" : "band", spec);
  const wings: THREE.Group[] = [];
  const fscale = spec.pattern === "eyespots" ? 1.15 : 1;
  for (const sx of [1, -1]) {
    const fore = new THREE.Group();
    const fw = wingMesh(j, foreTex, 1.7 * fscale, 1.0 * fscale);
    fw.rotation.z = 0.15;
    fore.add(fw);
    fore.position.set(sx * 0.18, 0.08, 0.16);
    fore.scale.x = sx;
    fore.rotation.x = -0.18;
    g.add(fore);
    wings.push(fore);

    const hind = new THREE.Group();
    const hw = wingMesh(j, hindTex, 1.2 * fscale, 0.95);
    if (spec.pattern === "eyespots") hw.scale.y = 1.5; // luna tails
    hw.rotation.z = -0.1;
    hind.add(hw);
    hind.position.set(sx * 0.14, -0.05, -0.28);
    hind.scale.x = sx;
    hind.rotation.x = -0.1;
    g.add(hind);
    wings.push(hind);
  }

  const sc = spec.scale ?? 1;
  g.scale.setScalar(sc);

  return {
    group: g,
    yaw0: 0,
    update: (t) => {
      const flap = Math.sin(t * 6) * 0.12;
      wings.forEach((w, i) => {
        const rest = i % 2 === 0 ? 0 : -0.05;
        w.rotation.y = (w.scale.x > 0 ? 1 : -1) * (rest + flap);
      });
      g.position.y = Math.sin(t * 1.6) * 0.04;
    },
    dispose: () => {},
  };
}

// =========================================================================
//  BEETLE
// =========================================================================
function buildBeetle(j: Junk, spec: ModelSpec): Creature {
  const g = new THREE.Group();
  const shell = bodyMaterial(j, spec);
  const shell2 = bodyMaterial(j, spec, spec.body2 ?? spec.body);
  const dark = solid(j, spec.accent ?? 0x1a1410, 0.4, 0.2);

  // domed elytra: a broad flattened oval, split into two halves by a seam.
  // Both halves share the primary shell; body2 only tints the very edges.
  for (const sz of [1, -1]) {
    const half = new THREE.Mesh(
      j.g(new THREE.SphereGeometry(0.72, 40, 28, 0, Math.PI * 2, 0, Math.PI / 2)),
      shell
    );
    half.scale.set(1.55, 0.78, 0.66);
    half.position.set(-0.24, 0.05, sz * 0.3);
    g.add(half);
  }
  // dark seam down the middle, sunk just into the shell crest
  const seam = new THREE.Mesh(j.g(new THREE.BoxGeometry(2.05, 0.04, 0.05)), dark);
  seam.position.set(-0.24, 0.44, 0);
  g.add(seam);
  // subtle edge tint / underbody
  const under = new THREE.Mesh(j.g(new THREE.SphereGeometry(0.72, 28, 18)), shell2);
  under.scale.set(1.56, 0.5, 0.72);
  under.position.set(-0.24, 0.0, 0);
  g.add(under);
  const belly = new THREE.Mesh(j.g(new THREE.SphereGeometry(0.68, 20, 14)), dark);
  belly.scale.set(1.5, 0.34, 0.62);
  belly.position.set(-0.24, -0.12, 0);
  g.add(belly);

  // pronotum (shield behind head) — same shell, distinctly smaller
  const pron = new THREE.Mesh(j.g(new THREE.SphereGeometry(0.46, 30, 22)), shell);
  pron.scale.set(0.62, 0.6, 1.0);
  pron.position.set(0.66, 0.06, 0);
  g.add(pron);

  // head
  const head = new THREE.Mesh(j.g(new THREE.SphereGeometry(0.3, 22, 16)), dark);
  head.scale.set(0.9, 0.8, 0.95);
  head.position.set(1.0, 0.02, 0);
  g.add(head);

  // eyes
  const eyeGeo = j.g(new THREE.SphereGeometry(0.08, 12, 10));
  for (const sz of [1, -1]) {
    const e = new THREE.Mesh(eyeGeo, solid(j, 0x0a0a0a, 0.3, 0));
    e.position.set(1.05, 0.08, sz * 0.22);
    g.add(e);
  }

  // antennae (clubbed)
  for (const sz of [1, -1]) {
    const a = new THREE.Mesh(j.g(new THREE.CylinderGeometry(0.02, 0.016, 0.42, 6)), dark);
    a.position.set(1.16, 0.02, sz * 0.16);
    a.rotation.z = -1.1;
    a.rotation.y = sz * 0.5;
    g.add(a);
  }

  // 6 sturdy legs
  const legMat = dark;
  for (let i = 0; i < 3; i++) {
    for (const sz of [1, -1]) {
      const L = leg(j, legMat, 0.8);
      L.position.set(0.55 - i * 0.55, -0.28, sz * 0.5);
      L.rotation.z = sz * 0.5;
      L.rotation.x = (i - 1) * sz * 0.25;
      g.add(L);
    }
  }

  const sc = spec.scale ?? 1;
  g.scale.setScalar(sc);

  return {
    group: g,
    yaw0: -0.4,
    update: (t) => {
      g.position.y = Math.sin(t * 1.8) * 0.02;
      g.rotation.z = Math.sin(t * 1.1) * 0.015;
    },
    dispose: () => {},
  };
}

// =========================================================================
//  HUMMINGBIRD
// =========================================================================
function buildHummingbird(j: Junk, spec: ModelSpec): Creature {
  const g = new THREE.Group();
  const body = bodyMaterial(j, spec);
  const belly = bodyMaterial(j, spec, spec.body2 ?? spec.body);
  const gorget = solid(j, spec.accent ?? 0xd23a2f, 0.3, 0.6);
  (gorget as THREE.MeshPhysicalMaterial).iridescence = 1;
  (gorget as THREE.MeshPhysicalMaterial).iridescenceThicknessRange = [80, 300];
  const dark = solid(j, 0x1b1712, 0.5, 0.1);

  // body — a streamlined teardrop (fat chest tapering to the tail) built as a
  // lathe so head and body read as one bird, not two balls
  const bodyPts: THREE.Vector2[] = [];
  for (let i = 0; i <= 16; i++) {
    const u = i / 16;
    const r = Math.sin(Math.pow(u, 0.85) * Math.PI) * 0.42 + 0.02;
    bodyPts.push(new THREE.Vector2(r, u * 1.7));
  }
  const torso = new THREE.Mesh(j.g(new THREE.LatheGeometry(bodyPts, 28)), body);
  torso.rotation.z = -Math.PI / 2; // fat end (chest) toward +X
  torso.position.set(-0.85, 0.0, 0);
  g.add(torso);
  // belly underside sheen
  const bel = new THREE.Mesh(j.g(new THREE.SphereGeometry(0.4, 26, 18)), belly);
  bel.scale.set(1.5, 0.66, 0.86);
  bel.position.set(-0.2, -0.18, 0);
  g.add(bel);

  // head — small, set on a short neck up and forward
  const head = new THREE.Mesh(j.g(new THREE.SphereGeometry(0.28, 26, 20)), body);
  head.scale.set(0.95, 0.95, 0.95);
  head.position.set(0.66, 0.24, 0);
  g.add(head);
  // gorget — the iridescent throat patch, on the front underside of the head
  const throat = new THREE.Mesh(j.g(new THREE.SphereGeometry(0.24, 22, 16)), gorget);
  throat.scale.set(0.85, 0.95, 0.8);
  throat.position.set(0.72, 0.06, 0);
  g.add(throat);

  // eyes
  for (const sz of [1, -1]) {
    const e = new THREE.Mesh(j.g(new THREE.SphereGeometry(0.055, 12, 10)), solid(j, 0x0a0a0a, 0.3, 0));
    e.position.set(0.76, 0.3, sz * 0.17);
    g.add(e);
  }

  // long needle bill
  const bill = new THREE.Mesh(j.g(new THREE.CylinderGeometry(0.028, 0.01, 1.0, 8)), dark);
  bill.rotation.z = Math.PI / 2 - 0.12;
  bill.position.set(1.34, 0.26, 0);
  g.add(bill);

  // tail — a fan of individual feathers angled down and back
  const featherMat = bodyMaterial(j, spec, spec.body2 ?? spec.body);
  for (let i = -2; i <= 2; i++) {
    const f = new THREE.Mesh(j.g(new THREE.BoxGeometry(0.85, 0.02, 0.12)), featherMat);
    f.position.set(-1.55, -0.12, i * 0.11);
    f.rotation.z = 0.28;
    f.rotation.y = i * 0.12;
    g.add(f);
  }

  // wings — long, swept back and up, hinged at the shoulder
  const wingTex = paintWing(j, "feather", spec);
  const wings: THREE.Group[] = [];
  for (const sz of [1, -1]) {
    const w = new THREE.Group();
    const wm = wingMesh(j, wingTex, 1.9, 0.5);
    wm.rotation.z = 0.05;
    w.add(wm);
    w.position.set(0.0, 0.34, sz * 0.22);
    w.rotation.y = sz * 0.6;
    w.rotation.z = 0.5;
    g.add(w);
    wings.push(w);
  }

  const sc = spec.scale ?? 1;
  g.scale.setScalar(sc);

  return {
    group: g,
    yaw0: -0.4,
    update: (t) => {
      const flap = Math.sin(t * 30) * 0.5;
      wings.forEach((w, i) => {
        w.rotation.x = (i === 0 ? -1 : 1) * flap;
      });
      g.position.y = Math.sin(t * 3.0) * 0.04;
    },
    dispose: () => {},
  };
}

// =========================================================================
//  BAT  (wings spread, facing +Z)
// =========================================================================
function buildBat(j: Junk, spec: ModelSpec): Creature {
  const g = new THREE.Group();
  const fur = bodyMaterial(j, { ...spec, fuzzy: true }, spec.body);
  const fur2 = bodyMaterial(j, { ...spec, fuzzy: true }, spec.body2 ?? spec.body);
  const membMat = j.m(
    new THREE.MeshStandardMaterial({
      color: spec.wing ?? 0x4a352a,
      roughness: 0.82,
      metalness: 0,
      side: THREE.DoubleSide,
    })
  );
  const eyeMat = solid(j, 0x120c08, 0.35, 0);

  // body
  const torso = new THREE.Mesh(j.g(new THREE.CapsuleGeometry(0.32, 0.6, 8, 16)), fur);
  torso.rotation.x = Math.PI / 2;
  torso.position.z = -0.1;
  g.add(torso);

  // head with snout
  const head = new THREE.Mesh(j.g(new THREE.SphereGeometry(0.3, 24, 18)), fur);
  head.position.z = 0.55;
  g.add(head);
  const snout = new THREE.Mesh(j.g(new THREE.ConeGeometry(0.16, 0.34, 14)), fur2);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, -0.02, 0.82);
  g.add(snout);

  // ears
  for (const sx of [1, -1]) {
    const ear = new THREE.Mesh(j.g(new THREE.ConeGeometry(0.12, 0.34, 10)), fur2);
    ear.position.set(sx * 0.17, 0.28, 0.5);
    ear.rotation.z = sx * 0.2;
    ear.rotation.x = -0.2;
    g.add(ear);
  }
  // eyes — small, matte, set into the face
  for (const sx of [1, -1]) {
    const e = new THREE.Mesh(j.g(new THREE.SphereGeometry(0.045, 10, 8)), eyeMat);
    e.position.set(sx * 0.13, 0.06, 0.74);
    g.add(e);
  }

  // A bat wing membrane: a right-hand wing built in the XZ plane, hinged at the
  // shoulder (origin). The leading edge runs out +X along the arm; the trailing
  // edge scallops back between four elongated finger bones to the body.
  const armLen = 1.25;
  const fingerTips = [
    new THREE.Vector2(armLen, 0.18),
    new THREE.Vector2(armLen * 0.96, -0.5),
    new THREE.Vector2(armLen * 0.74, -1.0),
    new THREE.Vector2(armLen * 0.42, -1.28),
  ];
  const knuckle = new THREE.Vector2(armLen, 0.05);
  const membraneShape = new THREE.Shape();
  membraneShape.moveTo(0, 0.08); // shoulder
  membraneShape.lineTo(knuckle.x, knuckle.y); // leading edge to wrist
  // scalloped trailing edge through the fingertips
  membraneShape.quadraticCurveTo(fingerTips[0].x + 0.1, fingerTips[0].y, fingerTips[0].x, fingerTips[0].y);
  for (let i = 1; i < fingerTips.length; i++) {
    const prev = fingerTips[i - 1];
    const cur = fingerTips[i];
    const mx = (prev.x + cur.x) / 2;
    const my = (prev.y + cur.y) / 2 - 0.16; // dip inward for the scallop
    membraneShape.quadraticCurveTo(mx, my, cur.x, cur.y);
  }
  membraneShape.quadraticCurveTo(0.2, -0.9, 0, -0.15); // trailing edge back to body
  membraneShape.closePath();
  const membGeo = j.g(new THREE.ShapeGeometry(membraneShape, 24));

  const wings: THREE.Group[] = [];
  for (const sx of [1, -1]) {
    const wing = new THREE.Group();

    const memb = new THREE.Mesh(membGeo, membMat);
    memb.rotation.x = -Math.PI / 2; // lay the XY shape into the XZ plane
    wing.add(memb);

    // arm bone along the leading edge
    const arm = new THREE.Mesh(j.g(new THREE.CylinderGeometry(0.045, 0.03, armLen, 6)), fur2);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(armLen / 2, 0.01, 0.06);
    wing.add(arm);
    // finger bones fanning to each fingertip
    for (const tip of fingerTips) {
      const len = Math.hypot(tip.x - knuckle.x, tip.y - knuckle.y);
      const bone = new THREE.Mesh(j.g(new THREE.CylinderGeometry(0.02, 0.012, len, 5)), fur2);
      const mid = new THREE.Vector2((knuckle.x + tip.x) / 2, (knuckle.y + tip.y) / 2);
      bone.position.set(mid.x, 0.005, -mid.y);
      bone.rotation.x = Math.PI / 2;
      bone.rotation.y = -Math.atan2(tip.y - knuckle.y, tip.x - knuckle.x);
      wing.add(bone);
    }

    wing.position.set(sx * 0.26, 0.14, 0.05);
    wing.scale.x = sx;
    g.add(wing);
    wings.push(wing);
  }

  // little clawed feet trailing behind
  for (const sx of [1, -1]) {
    const f = new THREE.Mesh(j.g(new THREE.CylinderGeometry(0.03, 0.02, 0.3, 6)), fur2);
    f.position.set(sx * 0.14, -0.08, -0.72);
    f.rotation.x = -0.5;
    g.add(f);
  }

  const sc = spec.scale ?? 1;
  g.scale.setScalar(sc);

  return {
    group: g,
    yaw0: 0,
    update: (t) => {
      const flap = Math.sin(t * 5) * 0.22;
      wings.forEach((w) => {
        w.rotation.z = (w.scale.x > 0 ? 1 : -1) * (0.05 + flap);
        w.rotation.y = flap * 0.15;
      });
      g.position.y = Math.sin(t * 1.5) * 0.05;
    },
    dispose: () => {},
  };
}

// --- dispatch --------------------------------------------------------------

export function buildCreature(spec: ModelSpec): Creature {
  const j = new Junk();
  let c: Creature;
  switch (spec.kind) {
    case "moth": c = buildMoth(j, spec); break;
    case "beetle": c = buildBeetle(j, spec); break;
    case "hummingbird": c = buildHummingbird(j, spec); break;
    case "bat": c = buildBat(j, spec); break;
    default: c = buildBee(j, spec); break;
  }
  const origDispose = c.dispose;
  c.dispose = () => {
    origDispose();
    c.group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      // geometries/materials tracked in Junk; nothing else to free here
      void mesh;
    });
    j.dispose();
  };
  return c;
}
