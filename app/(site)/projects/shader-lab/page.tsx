import type { Metadata } from "next";
import RevealRoot from "@/components/RevealRoot";
import ShaderLab from "@/components/projects/shader-lab/ShaderLab";
import MoreProjects from "@/components/MoreProjects";

export const metadata: Metadata = {
  title: "Shader Lab — Frond Studio",
  description:
    "An original real-time GPU flow-field — a three.js fragment shader wired to a live control panel, where every slider re-tunes the image instantly. Drag to push the flow, randomise for a new world, and save a still.",
};

export default function ShaderLabPage() {
  return (
    <RevealRoot>
      <ShaderLab />
      <MoreProjects excludeSlug="shader-lab" />
    </RevealRoot>
  );
}
