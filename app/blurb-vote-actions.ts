"use server";

// Server Actions for the CTA statement votes — the "no API" path: the client
// calls these functions directly (no route handler, no fetch endpoint). Reads
// return the live aggregate; writes bump the Upstash counter atomically.
import { getVotes, castVote } from "@/lib/votes";
import type { VoteMap } from "@/lib/blurbVotes";

export async function fetchBlurbVotes(): Promise<VoteMap> {
  return getVotes();
}

export async function submitBlurbVote(key: string, dir: "up" | "down"): Promise<void> {
  if ((dir !== "up" && dir !== "down") || !key || key.length > 24) return;
  await castVote(key, dir);
}
