import * as THREE from "three";
import type { RenderSurface } from "../core/types";

// The harness owns the surface; modules own the content. One factory builds a
// surface of the right tier on a given canvas, and one resizer keeps it sized.

export function createSurface(canvas: HTMLCanvasElement, tier: "canvas2d" | "webgl" | "three"): RenderSurface {
  if (tier === "canvas2d") {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas2D not available");
    return { kind: "canvas2d", canvas, ctx, width: 1, height: 1, dpr: 1 };
  }
  if (tier === "webgl") {
    const gl = canvas.getContext("webgl2", { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error("WebGL2 not available");
    return { kind: "webgl", canvas, gl, width: 1, height: 1 };
  }
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  return { kind: "three", canvas, renderer, THREE, width: 1, height: 1 };
}

/** Resize a surface to `w`×`h` logical px at `dpr`. Returns the surface (mutated). */
export function resizeSurface(s: RenderSurface, w: number, h: number, dpr: number): RenderSurface {
  if (s.kind === "canvas2d") {
    s.canvas.width = Math.round(w * dpr);
    s.canvas.height = Math.round(h * dpr);
    s.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    s.width = w; s.height = h; s.dpr = dpr;
  } else if (s.kind === "webgl") {
    s.canvas.width = Math.round(w * dpr);
    s.canvas.height = Math.round(h * dpr);
    s.gl.viewport(0, 0, s.canvas.width, s.canvas.height);
    s.width = s.canvas.width; s.height = s.canvas.height;
  } else {
    s.renderer.setPixelRatio(dpr);
    s.renderer.setSize(w, h, false);
    s.width = w; s.height = h;
  }
  return s;
}

/** Dispose GPU resources held by a surface (between system swaps). */
export function disposeSurface(s: RenderSurface): void {
  if (s.kind === "three") { try { s.renderer.dispose(); } catch { /* noop */ } }
}
