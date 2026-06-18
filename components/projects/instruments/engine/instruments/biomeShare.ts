// Biome share/embed codec — turns a Biome snapshot into a compact, URL-safe string
// (and back) for shareable links and iframe embeds. Browser-safe base64url, lossless
// enough for playback (rounded to keep links short); Biome.apply fills any gaps.

import type { Strand, MasterState } from "./biomeEngine";

export type Snapshot = { strands: Strand[]; master: MasterState };

const r = (v: number, d: number) => Number(v.toFixed(d));

function toUrlSafe(b64: string): string {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromUrlSafe(s: string): string {
  return s.replace(/-/g, "+").replace(/_/g, "/");
}

/** Serialise a snapshot to a compact "v1."-prefixed url-safe base64 string. */
export function encodeState(snap: Snapshot): string {
  const min = {
    strands: snap.strands.filter((s) => s.enabled).map((s) => ({
      type: s.type,
      hz: r(s.hz, 2),
      beat: r(s.beat, 2),
      level: r(s.level, 3),
      pan: r(s.pan, 3),
      breath: r(s.breath, 3),
      breathRate: r(s.breathRate, 3),
      tone: r(s.tone, 3),
    })),
    master: {
      volume: r(snap.master.volume, 3),
      reverb: r(snap.master.reverb, 3),
      breath: r(snap.master.breath, 3),
      breathRate: r(snap.master.breathRate, 3),
    },
  };
  const json = JSON.stringify(min);
  return "v1." + toUrlSafe(btoa(unescape(encodeURIComponent(json))));
}

/** Parse a "v1." string back to a snapshot. Resilient: returns null on any error. */
export function decodeState(str: string): Snapshot | null {
  try {
    if (!str.startsWith("v1.")) return null;
    const b64 = fromUrlSafe(str.slice(3));
    const json = decodeURIComponent(escape(atob(b64)));
    const obj = JSON.parse(json);
    if (!obj || !Array.isArray(obj.strands) || typeof obj.master !== "object" || obj.master === null) return null;
    return obj as Snapshot;
  } catch {
    return null;
  }
}

/** Read a shared snapshot from the current location — hash (#s=) first, then query (?s=). */
export function readSharedFromLocation(): Snapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const hash = window.location.hash.replace(/^#/, "");
    const hashParams = new URLSearchParams(hash);
    const fromHash = hashParams.get("s");
    if (fromHash) { const snap = decodeState(fromHash); if (snap) return snap; }
    const fromQuery = new URLSearchParams(window.location.search).get("s");
    if (fromQuery) { const snap = decodeState(fromQuery); if (snap) return snap; }
    return null;
  } catch {
    return null;
  }
}

/** Build a shareable URL to the full player with the snapshot in the hash. */
export function buildShareUrl(origin: string, snap: Snapshot): string {
  return `${origin}/projects/instruments/biome#s=${encodeState(snap)}`;
}

/** Recommended iframe dimensions [width, height] for each embed size. */
export const EMBED_DIMS: Record<"micro" | "compact" | "mini", [number, number]> = {
  micro: [360, 132],
  compact: [440, 150],
  mini: [480, 150],
};

/** The embed page URL (with the snapshot in the query) — for live previews. */
export function buildEmbedUrl(origin: string, size: "micro" | "compact" | "mini", snap: Snapshot): string {
  return `${origin}/embed/biome?size=${size}&s=${encodeState(snap)}`;
}

/** Build an iframe embed snippet at one of the three fixed sizes. */
export function buildEmbedCode(origin: string, size: "micro" | "compact" | "mini", snap: Snapshot): string {
  const [w, h] = EMBED_DIMS[size];
  return `<iframe src="${buildEmbedUrl(origin, size, snap)}" width="${w}" height="${h}" style="border:0;border-radius:12px;max-width:100%" loading="lazy" title="Biome — Frond Studio"></iframe>`;
}
