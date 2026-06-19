import type { GenerativeSystem, Params, RNG, RenderSurface } from "../core/types";
import { createSurface, resizeSurface, disposeSurface } from "../surfaces";

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png"));
}

export function download(blob: Blob, filename: string): void {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/** PNG of exactly what's on screen now. */
export async function exportCurrentPng(surface: RenderSurface): Promise<Blob> {
  return canvasToBlob(surface.canvas);
}

/**
 * Hi-res export — NOT an upscale. Re-builds the system on an offscreen surface
 * at N× resolution and re-simulates the same number of frames (deterministic),
 * so the export matches the live look at higher resolution. Systems can override
 * via `exportHiRes`.
 */
export async function exportHiResPng(
  system: GenerativeSystem,
  params: Params,
  seed: string,
  scale: number,
  baseW: number,
  baseH: number,
  frames: number,
  makeRng: (seed: string) => RNG,
): Promise<Blob> {
  if (system.exportHiRes) return system.exportHiRes(params, makeRng(seed), scale, baseW, baseH);

  const off = document.createElement("canvas");
  const surf = resizeSurface(createSurface(off, system.tier), Math.round(baseW * scale), Math.round(baseH * scale), 1);
  try {
    const rng = makeRng(seed);
    let state = system.init(surf, params, rng);
    const n = Math.max(1, frames);
    for (let i = 0; i < n; i++) {
      if (system.isDone?.(state)) break;
      state = system.step(state, 1 / 60);
    }
    system.render(state, surf);
    return await canvasToBlob(off);
  } finally {
    disposeSurface(surf);
  }
}

export async function copyParamsJson(systemId: string, seed: string, params: Params): Promise<void> {
  const json = JSON.stringify({ systemId, seed, params }, null, 2);
  try { await navigator.clipboard.writeText(json); } catch { /* clipboard blocked */ }
}
