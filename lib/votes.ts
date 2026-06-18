// Server-only aggregate store for the CTA statement votes (lib/blurbs).
// Backed by Upstash Redis via the Vercel Marketplace integration. One hash holds
// every counter as `<blurbKey>:up` / `<blurbKey>:down`, bumped atomically with
// HINCRBY — no schema, no migrations. If the env vars aren't present (local dev,
// previews, or before the DB is provisioned) every call no-ops and the UI falls
// back to per-browser localStorage, so nothing breaks.
import { Redis } from "@upstash/redis";
import type { VoteMap } from "./blurbVotes";

// The Upstash/Vercel-KV integrations expose one of these env-var pairs.
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;
const HASH = "blurb-votes";

export const votesEnabled = !!redis;

/** Read the full aggregate as the same {key:{up,down}} shape the client weights on. */
export async function getVotes(): Promise<VoteMap> {
  if (!redis) return {};
  try {
    const flat = await redis.hgetall<Record<string, string | number>>(HASH);
    if (!flat) return {};
    const out: VoteMap = {};
    for (const [field, val] of Object.entries(flat)) {
      const i = field.lastIndexOf(":");
      if (i < 0) continue;
      const key = field.slice(0, i);
      const dir = field.slice(i + 1);
      if (dir !== "up" && dir !== "down") continue;
      (out[key] ||= { up: 0, down: 0 })[dir] = Number(val) || 0;
    }
    return out;
  } catch {
    return {};
  }
}

/** Atomically record one vote. No-ops (safely) when the store isn't configured. */
export async function castVote(key: string, dir: "up" | "down"): Promise<void> {
  if (!redis) return;
  try {
    await redis.hincrby(HASH, `${key}:${dir}`, 1);
  } catch {
    /* transient store error — a dropped vote is acceptable for a vibe meter */
  }
}

// ── Hero generative randomiser learning ─────────────────────────────────────
// Two signals teach the homepage Jones/Physarum randomiser: per-preset votes
// (which curated scenes people like) and a capped pool of liked full configs
// (the exact jittered params of up-voted renders, to mutate from). Same Upstash
// store; no-ops without creds.
const HERO_HASH = "hero-scene-votes";
const HERO_LIKED = "hero-liked-configs";
const LIKED_CAP = 60;

export type LikedConfig = { id: string; params: Record<string, unknown> };

export async function getHeroSceneVotes(): Promise<VoteMap> {
  if (!redis) return {};
  try {
    const flat = await redis.hgetall<Record<string, string | number>>(HERO_HASH);
    if (!flat) return {};
    const out: VoteMap = {};
    for (const [field, val] of Object.entries(flat)) {
      const i = field.lastIndexOf(":");
      if (i < 0) continue;
      const id = field.slice(0, i);
      const dir = field.slice(i + 1);
      if (dir !== "up" && dir !== "down") continue;
      (out[id] ||= { up: 0, down: 0 })[dir] = Number(val) || 0;
    }
    return out;
  } catch {
    return {};
  }
}

export async function getHeroLikedConfigs(): Promise<LikedConfig[]> {
  if (!redis) return [];
  try {
    const rows = await redis.lrange<LikedConfig | string>(HERO_LIKED, 0, LIKED_CAP - 1);
    return rows
      .map((r) => (typeof r === "string" ? (JSON.parse(r) as LikedConfig) : r))
      .filter((r): r is LikedConfig => !!r && typeof r.id === "string" && !!r.params);
  } catch {
    return [];
  }
}

export async function castHeroSceneVote(id: string, dir: "up" | "down"): Promise<void> {
  if (!redis) return;
  try {
    await redis.hincrby(HERO_HASH, `${id}:${dir}`, 1);
  } catch {
    /* noop */
  }
}

export async function pushHeroLikedConfig(cfg: LikedConfig): Promise<void> {
  if (!redis) return;
  try {
    await redis.lpush(HERO_LIKED, JSON.stringify(cfg));
    await redis.ltrim(HERO_LIKED, 0, LIKED_CAP - 1);
  } catch {
    /* noop */
  }
}
