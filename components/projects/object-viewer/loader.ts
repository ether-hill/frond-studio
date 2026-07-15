// Object Viewer — glTF loading.
//
// Loads a Poly Haven model (glTF + external .bin + textures), centres it on the
// origin, normalises its longest dimension so lighting and the contact shadow
// stay consistent across wildly different objects, and returns a small handle
// the scene mounts on its turntable. Loads are cached so re-selecting an object
// is instant.

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { ObjectItem } from "./objects";

export type LoadedObject = {
  group: THREE.Group;
  update: (t: number) => void;
  dispose: () => void;
};

const TARGET_SIZE = 3.2; // longest dimension in world units after normalising

const _loader = new GLTFLoader();
const _cache = new Map<string, Promise<THREE.Group>>();

export function loadGltfScene(url: string): Promise<THREE.Group> {
  let p = _cache.get(url);
  if (!p) {
    p = new Promise<THREE.Group>((resolve, reject) => {
      _loader.load(url, (g) => resolve(g.scene), undefined, reject);
    });
    _cache.set(url, p);
  }
  return p;
}

export function buildObject(source: THREE.Group, item: ObjectItem): LoadedObject {
  const model = source.clone(true);

  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
      const fix = (mat: THREE.Material) => {
        const s = mat as THREE.MeshStandardMaterial;
        if (s.map) s.map.colorSpace = THREE.SRGBColorSpace;
      };
      const mat = m.material as THREE.Material | THREE.Material[];
      Array.isArray(mat) ? mat.forEach(fix) : mat && fix(mat);
    }
  });

  // centre + normalise
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = TARGET_SIZE / maxDim;
  model.position.sub(center);

  const inner = new THREE.Group();
  inner.add(model);
  inner.scale.setScalar(scale);
  inner.rotation.y = item.yaw ?? 0;
  inner.rotation.x = item.pitch ?? 0;

  const g = new THREE.Group();
  g.add(inner);

  return {
    group: g,
    // objects rest on their shadow — the turntable does the motion
    update: () => {},
    dispose: () => {
      model.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose();
          const mat = m.material as THREE.Material | THREE.Material[];
          Array.isArray(mat) ? mat.forEach((x) => x.dispose()) : mat?.dispose();
        }
      });
    },
  };
}
