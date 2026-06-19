import type { Params } from "../core/types";
import { download } from "./export";

// A preset captures everything needed to reproduce a frame: { systemId, seed,
// params }. Saved to localStorage (the "keepers" list) and downloadable as JSON.

export interface Preset {
  name: string;
  systemId: string;
  seed: string;
  params: Params;
  savedAt: number;
}

const KEY = "frond-lab-presets-v1";

export function loadPresets(): Preset[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]") as Preset[]; } catch { return []; }
}

export function savePreset(p: Omit<Preset, "savedAt">): Preset[] {
  const all = loadPresets();
  const preset: Preset = { ...p, savedAt: Date.now() };
  all.unshift(preset);
  localStorage.setItem(KEY, JSON.stringify(all.slice(0, 200)));
  return loadPresets();
}

export function deletePreset(savedAt: number): Preset[] {
  const all = loadPresets().filter((p) => p.savedAt !== savedAt);
  localStorage.setItem(KEY, JSON.stringify(all));
  return all;
}

export function downloadPreset(p: Preset): void {
  const blob = new Blob([JSON.stringify(p, null, 2)], { type: "application/json" });
  download(blob, `${p.systemId}-${p.name || p.seed}.json`.replace(/\s+/g, "-"));
}

export function downloadAll(presets: Preset[]): void {
  const blob = new Blob([JSON.stringify(presets, null, 2)], { type: "application/json" });
  download(blob, `frond-lab-presets-${presets.length}.json`);
}

/** Parse a dropped/loaded JSON file into presets (single or array). */
export function parsePresetFile(text: string): Preset[] {
  const data = JSON.parse(text);
  const arr = Array.isArray(data) ? data : [data];
  return arr.filter((p) => p && p.systemId && p.params) as Preset[];
}
