/**
 * The living marsh — a dusk wetland scene drawn on 2D canvas: layered cattail
 * silhouettes swaying, a low sun with a shimmering reflection, a basking
 * turtle on a log, another swimming a slow patrol, fireflies over the reeds,
 * and pointer-driven ripples on the water. Self-contained dusk palette (the
 * scene is a framed visual, like the site's other project windows).
 *
 * Everything is cheap by design: ~60 precomputed reeds, a dozen glow points,
 * a bounded pool of ripple rings — comfortably 60fps on integrated GPUs.
 */

export type MarshHandle = { dispose: () => void };

type Reed = { x: number; base: number; h: number; phase: number; sway: number; w: number; head: number; layer: 0 | 1 };
type Ring = { x: number; y: number; r: number; max: number; a: number };
type Fly = { x: number; y: number; p1: number; p2: number; p3: number };

const SKY_TOP = "#241b12";
const SKY_LOW = "#4d3420";
const SUN = "rgba(255, 196, 120,";
const WATER_TOP = "#2b241a";
const WATER_DEEP = "#0d1611";
const SIL_BACK = "rgba(16, 22, 16, 0.75)";
const SIL_FRONT = "#0a100b";
const GLINT = "rgba(255, 214, 150,";

export function createMarsh(canvas: HTMLCanvasElement): MarshHandle {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { dispose: () => {} };

  const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  let w = 0, h = 0, dpr = 1;
  let horizon = 0;
  let raf = 0;
  let t = Math.PI * 40; // arbitrary start phase so the scene doesn't begin at zero
  let disposed = false;

  let reeds: Reed[] = [];
  let flies: Fly[] = [];
  const rings: Ring[] = [];
  const pointer = { x: -1e4, y: -1e4, lastRipple: 0 };

  const rand = (a: number, b: number) => a + Math.random() * (b - a);

  function build() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = Math.max(1, rect.width);
    h = Math.max(1, rect.height);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    horizon = h * 0.52;

    reeds = [];
    const backN = Math.round(w / 34);
    const frontN = Math.round(w / 46);
    for (let i = 0; i < backN; i++) {
      reeds.push({
        x: rand(0, w), base: horizon + rand(2, h * 0.1), h: rand(h * 0.16, h * 0.3),
        phase: rand(0, Math.PI * 2), sway: rand(0.5, 1), w: rand(1.4, 2.2), head: rand(8, 14), layer: 0,
      });
    }
    for (let i = 0; i < frontN; i++) {
      const left = Math.random() < 0.62; // reeds cluster toward the left bank
      reeds.push({
        x: left ? rand(-10, w * 0.34) : rand(w * 0.72, w + 10),
        base: h + rand(-6, 18), h: rand(h * 0.34, h * 0.56),
        phase: rand(0, Math.PI * 2), sway: rand(0.8, 1.5), w: rand(2.6, 4.2), head: rand(14, 24), layer: 1,
      });
    }
    reeds.sort((a, b) => a.layer - b.layer);

    flies = [];
    for (let i = 0; i < 12; i++) {
      flies.push({ x: rand(0, 1), y: rand(0, 1), p1: rand(0, 9), p2: rand(0, 9), p3: rand(0.4, 1.6) });
    }
  }

  function addRing(x: number, y: number, max: number, a: number) {
    if (y < horizon + 4) return;
    if (rings.length > 28) rings.shift();
    rings.push({ x, y, r: 2, max, a });
  }

  // ---- drawing ---------------------------------------------------------

  function drawSkyAndWater() {
    const sky = ctx!.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, SKY_TOP);
    sky.addColorStop(1, SKY_LOW);
    ctx!.fillStyle = sky;
    ctx!.fillRect(0, 0, w, horizon + 1);

    // low sun
    const sx = w * 0.3, sy = horizon - h * 0.045;
    const glow = ctx!.createRadialGradient(sx, sy, 0, sx, sy, h * 0.36);
    glow.addColorStop(0, `${SUN}0.55)`);
    glow.addColorStop(0.25, `${SUN}0.18)`);
    glow.addColorStop(1, `${SUN}0)`);
    ctx!.fillStyle = glow;
    ctx!.fillRect(0, 0, w, horizon + 1);
    ctx!.fillStyle = `${SUN}0.85)`;
    ctx!.beginPath();
    ctx!.arc(sx, sy, h * 0.032, 0, Math.PI * 2);
    ctx!.fill();

    // distant treeline
    ctx!.fillStyle = SIL_BACK;
    ctx!.beginPath();
    ctx!.moveTo(0, horizon);
    for (let x = 0; x <= w; x += 26) {
      const y = horizon - 6 - Math.abs(Math.sin(x * 0.021) * 14 + Math.sin(x * 0.0034) * 20);
      ctx!.lineTo(x, y);
    }
    ctx!.lineTo(w, horizon);
    ctx!.closePath();
    ctx!.fill();

    const water = ctx!.createLinearGradient(0, horizon, 0, h);
    water.addColorStop(0, WATER_TOP);
    water.addColorStop(0.35, "#17201a");
    water.addColorStop(1, WATER_DEEP);
    ctx!.fillStyle = water;
    ctx!.fillRect(0, horizon, w, h - horizon);

    // sun reflection column — shimmering streaks
    const bandH = h - horizon;
    for (let i = 0; i < 16; i++) {
      const fy = horizon + (i / 16) * bandH * 0.8 + 6;
      const shim = Math.sin(t * 1.3 + i * 1.7) * 0.5 + 0.5;
      const wdt = (h * 0.05 + i * 3.4) * (0.7 + shim * 0.5);
      ctx!.fillStyle = `${GLINT}${(0.11 - i * 0.006) * (0.5 + shim * 0.5)})`;
      ctx!.fillRect(sx - wdt / 2 + Math.sin(t + i) * 4, fy, wdt, 1.6);
    }

    // ambient drifting ripple lines
    ctx!.strokeStyle = "rgba(238, 226, 200, 0.05)";
    ctx!.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      const fy = horizon + ((i + 0.5) / 9) * bandH;
      const drift = Math.sin(t * 0.35 + i * 2.1) * 14;
      const lw = w * (0.12 + ((i * 37) % 10) / 18);
      const fx = ((i * 211) % w) + drift;
      ctx!.beginPath();
      ctx!.moveTo(fx - lw / 2, fy);
      ctx!.quadraticCurveTo(fx, fy + 2.5, fx + lw / 2, fy);
      ctx!.stroke();
    }
  }

  function drawRings() {
    for (let i = rings.length - 1; i >= 0; i--) {
      const g = rings[i];
      g.r += g.max * 0.014;
      const life = 1 - g.r / g.max;
      if (life <= 0) { rings.splice(i, 1); continue; }
      const squash = 0.36; // perspective ellipse
      ctx!.strokeStyle = `rgba(240, 228, 200, ${g.a * life})`;
      ctx!.lineWidth = 1.2;
      ctx!.beginPath();
      ctx!.ellipse(g.x, g.y, g.r, g.r * squash, 0, 0, Math.PI * 2);
      ctx!.stroke();
      if (g.r > 8) {
        ctx!.strokeStyle = `rgba(240, 228, 200, ${g.a * life * 0.5})`;
        ctx!.beginPath();
        ctx!.ellipse(g.x, g.y, g.r * 0.62, g.r * 0.62 * squash, 0, 0, Math.PI * 2);
        ctx!.stroke();
      }
    }
  }

  function drawBasker() {
    // log + basking turtle, right third of the water
    const lx = w * 0.72, ly = horizon + (h - horizon) * 0.42;
    const breathe = 1 + Math.sin(t * 0.9) * 0.012;
    ctx!.save();
    ctx!.translate(lx, ly);

    // log
    ctx!.fillStyle = SIL_FRONT;
    ctx!.beginPath();
    ctx!.ellipse(0, 8, w * 0.085, 7, -0.03, 0, Math.PI * 2);
    ctx!.fill();
    ctx!.beginPath(); // snag branch
    ctx!.moveTo(w * 0.07, 4);
    ctx!.quadraticCurveTo(w * 0.095, -26, w * 0.088, -34);
    ctx!.quadraticCurveTo(w * 0.092, -24, w * 0.078, 6);
    ctx!.closePath();
    ctx!.fill();

    // turtle silhouette on the log
    ctx!.scale(1, breathe);
    ctx!.beginPath(); // shell dome
    ctx!.moveTo(-30, 0);
    ctx!.quadraticCurveTo(-14, -20, 6, -19);
    ctx!.quadraticCurveTo(22, -18, 26, -1);
    ctx!.closePath();
    ctx!.fill();
    ctx!.beginPath(); // head raised to the sun
    ctx!.moveTo(24, -6);
    ctx!.quadraticCurveTo(36, -12, 40, -20);
    ctx!.quadraticCurveTo(44, -26, 47, -24);
    ctx!.quadraticCurveTo(49, -21, 45, -16);
    ctx!.quadraticCurveTo(40, -8, 30, -2);
    ctx!.closePath();
    ctx!.fill();
    // warm rim light from the sunset side
    ctx!.strokeStyle = `${SUN}0.5)`;
    ctx!.lineWidth = 1.4;
    ctx!.beginPath();
    ctx!.moveTo(-28, -3);
    ctx!.quadraticCurveTo(-14, -21, 6, -19.5);
    ctx!.stroke();
    ctx!.restore();

    // faint reflection
    ctx!.fillStyle = "rgba(10, 16, 11, 0.35)";
    ctx!.beginPath();
    ctx!.ellipse(lx - 2, ly + 22, 34, 6, 0, 0, Math.PI * 2);
    ctx!.fill();
  }

  let swimT = 0.15;
  function drawSwimmer(dt: number) {
    swimT += dt * 0.0092;
    if (swimT > 1.18) { swimT = -0.18; }
    const x = swimT * w;
    const y = horizon + (h - horizon) * 0.62 + Math.sin(t * 0.8) * 3;

    // V wake
    ctx!.strokeStyle = "rgba(238, 226, 200, 0.10)";
    ctx!.lineWidth = 1.3;
    ctx!.beginPath();
    ctx!.moveTo(x - 4, y);
    ctx!.lineTo(x - w * 0.09, y - 9);
    ctx!.moveTo(x - 4, y);
    ctx!.lineTo(x - w * 0.09, y + 9);
    ctx!.stroke();
    ctx!.strokeStyle = "rgba(238, 226, 200, 0.05)";
    ctx!.beginPath();
    ctx!.moveTo(x - 10, y);
    ctx!.lineTo(x - w * 0.16, y - 14);
    ctx!.moveTo(x - 10, y);
    ctx!.lineTo(x - w * 0.16, y + 14);
    ctx!.stroke();

    // head + shell hump breaking the surface
    ctx!.fillStyle = SIL_FRONT;
    ctx!.beginPath();
    ctx!.ellipse(x, y - 2.5, 4, 3.4, 0, 0, Math.PI * 2); // head
    ctx!.fill();
    ctx!.beginPath();
    ctx!.ellipse(x - 14, y + 0.5, 9, 3, 0, Math.PI, 0); // shell arc
    ctx!.fill();

    if (Math.random() < 0.012) addRing(x - 10, y + 2, rand(14, 26), 0.16);
  }

  function drawReeds() {
    for (const r of reeds) {
      const near = Math.max(0, 1 - Math.abs(pointer.x - r.x) / 140);
      const lean = Math.sin(t * (0.5 + r.sway * 0.24) + r.phase) * (5 + r.sway * 5) + near * 7;
      const tipX = r.x + lean;
      const tipY = r.base - r.h;
      ctx!.strokeStyle = r.layer ? SIL_FRONT : SIL_BACK;
      ctx!.fillStyle = ctx!.strokeStyle;
      ctx!.lineWidth = r.w;
      ctx!.lineCap = "round";
      ctx!.beginPath();
      ctx!.moveTo(r.x, r.base);
      ctx!.quadraticCurveTo(r.x + lean * 0.25, r.base - r.h * 0.6, tipX, tipY + r.head * 0.4);
      ctx!.stroke();
      // cattail head
      ctx!.beginPath();
      const hw = r.w * 1.9;
      ctx!.ellipse(tipX, tipY, hw, r.head, lean * 0.012, 0, Math.PI * 2);
      ctx!.fill();
      // spike above the head
      ctx!.lineWidth = Math.max(1, r.w * 0.45);
      ctx!.beginPath();
      ctx!.moveTo(tipX, tipY - r.head);
      ctx!.lineTo(tipX + lean * 0.06, tipY - r.head - r.head * 0.9);
      ctx!.stroke();
    }
  }

  function drawFlies() {
    for (const f of flies) {
      const fx = (f.x + Math.sin(t * 0.11 * f.p3 + f.p1) * 0.05 + Math.sin(t * 0.043 + f.p2) * 0.04) * w;
      const fy = horizon - h * 0.02 + (f.y * 0.5 + Math.sin(t * 0.16 * f.p3 + f.p2) * 0.05) * (h - horizon);
      const blink = Math.pow(Math.max(0, Math.sin(t * 0.7 * f.p3 + f.p1)), 6);
      if (blink < 0.02) continue;
      const g = ctx!.createRadialGradient(fx, fy, 0, fx, fy, 7);
      g.addColorStop(0, `rgba(255, 232, 150, ${0.6 * blink})`);
      g.addColorStop(1, "rgba(255, 232, 150, 0)");
      ctx!.fillStyle = g;
      ctx!.fillRect(fx - 7, fy - 7, 14, 14);
      ctx!.fillStyle = `rgba(255, 244, 190, ${0.85 * blink})`;
      ctx!.fillRect(fx - 0.8, fy - 0.8, 1.6, 1.6);
    }
  }

  function vignette() {
    const v = ctx!.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.72);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.4)");
    ctx!.fillStyle = v;
    ctx!.fillRect(0, 0, w, h);
  }

  let last = performance.now();
  function frame(now: number) {
    if (disposed) return;
    const dt = Math.min(50, now - last);
    last = now;
    t += dt * 0.001;

    drawSkyAndWater();
    drawRings();
    drawBasker();
    drawSwimmer(dt);
    drawReeds();
    drawFlies();
    vignette();

    // occasional ambient "fish rise"
    if (Math.random() < 0.006) addRing(rand(w * 0.1, w * 0.9), rand(horizon + 12, h - 12), rand(16, 34), 0.12);

    if (!reduced) raf = requestAnimationFrame(frame);
  }

  // ---- events ----------------------------------------------------------

  const onMove = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
    const now = performance.now();
    if (pointer.y > horizon && now - pointer.lastRipple > 130) {
      pointer.lastRipple = now;
      addRing(pointer.x, pointer.y, rand(12, 22), 0.2);
      if (reduced) redrawOnce();
    }
  };
  const onLeave = () => { pointer.x = -1e4; pointer.y = -1e4; };
  const onDown = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    addRing(x, Math.max(y, horizon + 8), rand(40, 64), 0.3);
    if (reduced) redrawOnce();
  };

  function redrawOnce() {
    drawSkyAndWater();
    drawRings();
    drawBasker();
    drawReeds();
    vignette();
  }

  const ro = new ResizeObserver(() => {
    build();
    if (reduced) redrawOnce();
  });

  build();
  ro.observe(canvas);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("pointerdown", onDown);

  if (reduced) redrawOnce();
  else raf = requestAnimationFrame(frame);

  return {
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerdown", onDown);
    },
  };
}
