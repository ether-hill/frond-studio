import type { GenerativeSystem } from "../core/types";
import { spaceColonization } from "./space-colonization";
import { differentialGrowth } from "./differential-growth";
import { phyllotaxis } from "./phyllotaxis";
import { strangeAttractors } from "./strange-attractors";
import { dielectricBreakdown } from "./dielectric-breakdown";
import { stableFluids } from "./stable-fluids";
import { rdSurface } from "./rd-surface";

// Build order: Tier-A (Canvas2D) first, then Tier-B (WebGL / three).
export const SYSTEMS: GenerativeSystem[] = [
  spaceColonization,
  differentialGrowth,
  phyllotaxis,
  strangeAttractors,
  dielectricBreakdown,
  stableFluids,
  rdSurface,
];
