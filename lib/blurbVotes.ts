// Lightweight, per-browser feedback for the cycling CTA statements (lib/blurbs).
// Thumbs up/down are recorded in localStorage and bias which lines surface:
// down-voted lines fade out gradually (multiplicative decay, never hard zero so
// they can recover), up-voted ones surface more. No backend — this self-tunes
// per visitor. Swap loadVotes/recordVote for an API later for studio-wide stats.

export type Vote = { up: number; down: number };
export type VoteMap = Record<string, Vote>;

const LS_KEY = "frond.blurbVotes.v1";

/** Stable, compact key for a statement (survives reordering; resets if the line text is edited). */
export function keyFor(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return "b" + (h >>> 0).toString(36);
}

export function loadVotes(): VoteMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}") as VoteMap;
  } catch {
    return {};
  }
}

export function recordVote(text: string, dir: "up" | "down"): VoteMap {
  const all = loadVotes();
  const k = keyFor(text);
  const cur = all[k] || { up: 0, down: 0 };
  all[k] = { up: cur.up + (dir === "up" ? 1 : 0), down: cur.down + (dir === "down" ? 1 : 0) };
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch {
    /* storage full / blocked — voting still works for this session via the returned map */
  }
  return all;
}

/** Selection weight from votes: ×1.4 per up, ×0.5 per down, clamped so nothing
 *  fully disappears (a downvoted line can climb back if it earns ups later). */
export function blurbWeight(v?: Vote): number {
  const up = v?.up ?? 0;
  const down = v?.down ?? 0;
  const w = Math.pow(1.4, up) * Math.pow(0.5, down);
  return Math.min(8, Math.max(0.02, w));
}

/** Weighted random index into `texts`, never returning `exclude` (the line on screen). */
export function pickWeighted(texts: string[], votes: VoteMap, exclude = -1): number {
  if (texts.length <= 1) return 0;
  const weights = texts.map((t, i) => (i === exclude ? 0 : blurbWeight(votes[keyFor(t)])));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) {
    let n = Math.floor(Math.random() * texts.length);
    if (n === exclude) n = (n + 1) % texts.length;
    return n;
  }
  let r = Math.random() * total;
  for (let i = 0; i < texts.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return texts.length - 1;
}
