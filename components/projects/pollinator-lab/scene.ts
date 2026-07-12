// Pollinator Lab — studio viewer runtime (three.js).
//
// A soft-lit turntable: the creature sits on an invisible ground that catches a
// contact shadow, lit by a RoomEnvironment PBR probe plus a key/fill/rim rig so
// iridescence and clearcoat read properly. The model spins on Y — driven either
// by dragging the canvas (with inertia) or the 360° slider, which stay in sync.
// Vertical drag tilts the camera; wheel zooms. Swapping species pops the new
// build in with a short scale/drop transition. Everything frames automatically
// to the creature's bounding sphere so bats and bees both sit centred.

import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildCreature, type Creature } from "./models";
import type { ModelSpec } from "./species";

export type ViewerHandle = {
  setSpecies: (spec: ModelSpec) => void;
  /** Set turntable angle in degrees (from the slider). */
  setYaw: (deg: number) => void;
  /** Register a callback that fires when drag changes the angle. */
  onYaw: (cb: (deg: number) => void) => void;
  /** Reset orbit tilt / zoom to the default framing. */
  resetView: () => void;
  resize: () => void;
  dispose: () => void;
};

const DEG = Math.PI / 180;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const norm360 = (d: number) => ((d % 360) + 360) % 360;

export function createViewer(container: HTMLElement, initial: ModelSpec): ViewerHandle {
  // ---- renderer ----
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
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
  const key = new THREE.DirectionalLight(0xfff4e2, 2.1);
  key.position.set(3.5, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 8;
  key.shadow.bias = -0.0006;
  const sc = key.shadow.camera;
  sc.near = 0.5; sc.far = 40; sc.left = -6; sc.right = 6; sc.top = 6; sc.bottom = -6;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdfeaff, 0.6);
  fill.position.set(-4, 2, 3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 1.2);
  rim.position.set(-2, 4, -5);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));

  // ---- ground contact shadow ----
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.ShadowMaterial({ opacity: 0.22 })
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

  let creature: Creature | null = null;
  let popStart = -1; // time the current creature was mounted (for scale-in)
  let popBase = 1;

  // orbit state
  let yaw = 0; // degrees — model rotation
  let yawVel = 0;
  let pitch = 12; // degrees — camera elevation
  let dist = 8; // set per-creature on frame()
  let baseDist = 8;
  let target = new THREE.Vector3(0, 0, 0);
  let yawCb: ((d: number) => void) | null = null;

  // ---- framing: fit camera to the creature's bounds ----
  function frame(c: Creature) {
    // reset to measure at yaw 0
    const prevY = pivot.rotation.y;
    pivot.rotation.y = 0;
    const box = new THREE.Box3().setFromObject(c.group);
    pivot.rotation.y = prevY;
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const r = Math.max(sphere.radius, 0.5);
    target.set(0, sphere.center.y, 0);
    const fov = camera.fov * DEG;
    baseDist = (r / Math.sin(fov / 2)) * 1.5;
    dist = baseDist;
    // drop ground to the creature's feet
    ground.position.y = box.min.y - 0.02;
    key.target.position.copy(target);
    key.target.updateMatrixWorld();
    scene.add(key.target);
  }

  function mountCreature(spec: ModelSpec, animate: boolean) {
    const c = buildCreature(spec);
    // synchronous swap — dispose the old creature before adding the new one so
    // there is never more than one in the scene
    if (creature) {
      pivot.remove(creature.group);
      creature.dispose();
      creature = null;
    }
    frame(c);
    popBase = c.group.scale.x;
    popStart = animate ? clock.getElapsedTime() : -1;
    pivot.add(c.group);
    creature = c;
    yaw = norm360(c.yaw0 / DEG);
    pivot.rotation.y = yaw * DEG;
    yawCb?.(yaw);
  }

  mountCreature(initial, false);

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
    pitch = clamp(pitch + dy * 0.25, -12, 60);
    yawCb?.(yaw);
  };
  const onUp = (e: PointerEvent) => {
    dragging = false;
    canvas.style.cursor = "grab";
    try { canvas.releasePointerCapture(e.pointerId); } catch {}
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    dist = clamp(dist * (1 + Math.sign(e.deltaY) * 0.08), baseDist * 0.55, baseDist * 1.8);
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

    // inertia when released
    if (!dragging && Math.abs(yawVel) > 0.01) {
      yaw = norm360(yaw + yawVel);
      yawVel *= 0.94;
      yawCb?.(yaw);
    } else if (!dragging) {
      yawVel = 0;
    }
    pivot.rotation.y = yaw * DEG;

    // camera on a fixed azimuth, orbiting the target by pitch/dist
    const ph = pitch * DEG;
    camera.position.set(
      target.x + Math.sin(0) * Math.cos(ph) * dist,
      target.y + Math.sin(ph) * dist,
      target.z + Math.cos(0) * Math.cos(ph) * dist
    );
    camera.lookAt(target);

    creature?.update(t);

    // scale-in pop when a new creature is mounted
    if (creature && popStart >= 0) {
      const p = Math.min(1, (t - popStart) / 0.4);
      const ease = 1 - Math.pow(1 - p, 3);
      creature.group.scale.setScalar(popBase * (0.6 + 0.4 * ease));
      if (p >= 1) { creature.group.scale.setScalar(popBase); popStart = -1; }
    }

    renderer.render(scene, camera);
  }
  tick();

  return {
    setSpecies: (spec) => mountCreature(spec, true),
    setYaw: (deg) => { yaw = norm360(deg); yawVel = 0; },
    onYaw: (cb) => { yawCb = cb; cb(yaw); },
    resetView: () => { pitch = 12; dist = baseDist; yawVel = 0; },
    resize,
    dispose: () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("wheel", onWheel);
      creature?.dispose();
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
      envRT.texture.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (canvas.parentElement === container) container.removeChild(canvas);
    },
  };
}
