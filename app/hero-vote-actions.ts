"use server";

// Server Actions for the hero randomiser learning (no API route). Read returns
// both signals in one round-trip; write records a preset vote and, on an upvote,
// banks the exact config so the randomiser can mutate from it later.
import {
  getHeroSceneVotes,
  getHeroLikedConfigs,
  castHeroSceneVote,
  pushHeroLikedConfig,
  type LikedConfig,
} from "@/lib/votes";
import type { VoteMap } from "@/lib/blurbVotes";

export async function fetchHeroLearning(): Promise<{ sceneVotes: VoteMap; liked: LikedConfig[] }> {
  const [sceneVotes, liked] = await Promise.all([getHeroSceneVotes(), getHeroLikedConfigs()]);
  return { sceneVotes, liked };
}

export async function submitHeroVote(
  id: string,
  dir: "up" | "down",
  config?: Record<string, unknown> | null
): Promise<void> {
  if ((dir !== "up" && dir !== "down") || !id || id.length > 40) return;
  await castHeroSceneVote(id, dir);
  if (dir === "up" && config && typeof config === "object") {
    await pushHeroLikedConfig({ id, params: config });
  }
}
