// Object Viewer — studio viewer runtime (three.js).
//
// A soft-lit turntable: the object sits on an invisible ground that catches a
// contact shadow, lit by a RoomEnvironment PBR probe plus a key/fill/rim rig so
// the photoreal glTF materials read properly. The object spins on Y — driven
// either by dragging the canvas (with inertia) or the 360° slider, which stay in
// sync. Vertical drag tilts the camera; wheel zooms. Selecting an object loads
// its glTF and pops it in. Everything frames automatically to the object's
// bounding sphere, so a pocket watch and a treasure chest both sit centred.

import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildObject, loadGltfScene, type LoadedObject } from "./loader";
import type { ObjectItem } from "./objects";

export type ViewerHandle = {
  setObject: (item: ObjectItem) => void;
  /** Set turntable angle in degrees (from the slider). */
  setYaw: (deg: number) => void;
  /** Register a callback that fires when drag changes the angle. */
  onYaw: (cb: (deg: number) => void) => void;
  /** Fires true while an object is loading. */
  onLoading: (cb: (loading: boolean) => void) => void;
  /** Reset orbit tilt / zoom to the default framing. */
  resetView: () => void;
  resize: () => void;
  dispose: () => void;
};

const DEG = Math.PI / 180;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const norm360 = (d: number) => ((d % 360) + 360) % 360;

export function createViewer(container: HTMLElement, initial: ObjectItem): ViewerHandle {
  // ---- renderer ----
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.touchAction = "none";
  canvas.style.cursor = "grab";
  // defensive: never leave a stale canvas behind (React StrictMode can mount
  // this effect twice in dev; two transparent canvases would composite)
  container.querySelectorAll("canvas").forEach((c) => c.remove());
  container.appendChild(canvas);

  const scene = new THREE.Scene();

  // ---- environment (soft studio reflections) ----
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new RoomEnvironment();
  const envRT = pmrem.fromScene(envScene, 0.04);
  scene.environment = envRT.texture;

  // ---- lights ----
  const key = new THREE.DirectionalLight(0xfff4e2, 2.2);
  key.position.set(3.5, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 8;
  key.shadow.bias = -0.0006;
  const sc = key.shadow.camera;
  sc.near = 0.5; sc.far = 40; sc.left = -6; sc.right = 6; sc.top = 6; sc.bottom = -6;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xdfeaff, 0.6);
  fill.position.set(-4, 2, 3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 1.3);
  rim.position.set(-2, 4, -5);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, 0.3));

  // ---- ground contact shadow ----
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.ShadowMaterial({ opacity: 0.24 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // ---- camera ----
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);

  // ---- turntable pivot ----
  const pivot = new THREE.Group();
  scene.add(pivot);

  const clock = new THREE.Clock();

  let obj: LoadedObject | null = null;
  let popStart = -1;
  let popBase = 1;
  let mountToken = 0;
  let loadingCb: ((l: boolean) => void) | null = null;

  // orbit state
  let yaw = 0;
  let yawVel = 0;
  let pitch = 12;
  let dist = 8;
  let baseDist = 8;
  const target = new THREE.Vector3(0, 0, 0);
  let yawCb: ((d: number) => void) | null = null;

  function frame(o: LoadedObject) {
    const prevY = pivot.rotation.y;
    pivot.rotation.y = 0;
    const box = new THREE.Box3().setFromObject(o.group);
    pivot.rotation.y = prevY;
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const r = Math.max(sphere.radius, 0.5);
    target.set(0, sphere.center.y, 0);
    const fov = camera.fov * DEG;
    baseDist = (r / Math.sin(fov / 2)) * 1.45;
    dist = baseDist;
    ground.position.y = box.min.y - 0.01;
    key.target.position.copy(target);
    key.target.updateMatrixWorld();
  }

  function install(o: LoadedObject) {
    if (obj) {
      pivot.remove(obj.group);
      obj.dispose();
      obj = null;
    }
    frame(o);
    popBase = o.group.scale.x;
    popStart = clock.getElapsedTime();
    pivot.add(o.group);
    obj = o;
    yaw = 0;
    pivot.rotation.y = 0;
    yawCb?.(0);
  }

  async function mountObject(item: ObjectItem) {
    const token = ++mountToken;
    loadingCb?.(true);
    try {
      const src = await loadGltfScene(item.gltf);
      if (token !== mountToken) return;
      install(buildObject(src, item));
    } catch {
      // leave the previous object in place on failure
    } finally {
      if (token === mountToken) loadingCb?.(false);
    }
  }

  void mountObject(initial);

  // ---- pointer interaction ----
  let dragging = false;
  let lastX = 0, lastY = 0;
  const onDown = (e: PointerEvent) => {
    dragging = true;
    lastX = e.clientX; lastY = e.clientY;
    yawVel = 0;
    canvas.style.cursor = "grabbing";
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    yaw = norm360(yaw - dx * 0.4);
    yawVel = -dx * 0.4;
    pitch = clamp(pitch + dy * 0.25, -20, 70);
    yawCb?.(yaw);
  };
  const onUp = (e: PointerEvent) => {
    dragging = false;
    canvas.style.cursor = "grab";
    try { canvas.releasePointerCapture(e.pointerId); } catch {}
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    dist = clamp(dist * (1 + Math.sign(e.deltaY) * 0.08), baseDist * 0.5, baseDist * 1.9);
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  // ---- resize ----
  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  // ---- render loop ----
  let raf = 0;
  function tick() {
    raf = requestAnimationFrame(tick);
    const t = clock.getElapsedTime();

    if (!dragging && Math.abs(yawVel) > 0.01) {
      yaw = norm360(yaw + yawVel);
      yawVel *= 0.94;
      yawCb?.(yaw);
    } else if (!dragging) {
      yawVel = 0;
    }
    pivot.rotation.y = yaw * DEG;

    const ph = pitch * DEG;
    camera.position.set(target.x, target.y + Math.sin(ph) * dist, target.z + Math.cos(ph) * dist);
    camera.lookAt(target);

    obj?.update(t);

    if (obj && popStart >= 0) {
      const p = Math.min(1, (t - popStart) / 0.4);
      const ease = 1 - Math.pow(1 - p, 3);
      obj.group.scale.setScalar(popBase * (0.7 + 0.3 * ease));
      if (p >= 1) { obj.group.scale.setScalar(popBase); popStart = -1; }
    }

    renderer.render(scene, camera);
  }
  tick();

  return {
    setObject: (item) => void mountObject(item),
    setYaw: (deg) => { yaw = norm360(deg); yawVel = 0; },
    onYaw: (cb) => { yawCb = cb; cb(yaw); },
    onLoading: (cb) => { loadingCb = cb; },
    resetView: () => { pitch = 12; dist = baseDist; yawVel = 0; },
    resize,
    dispose: () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("wheel", onWheel);
      obj?.dispose();
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
      envRT.texture.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (canvas.parentElement === container) container.removeChild(canvas);
    },
  };
}
