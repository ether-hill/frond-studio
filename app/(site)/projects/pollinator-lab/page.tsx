import type { Metadata } from "next";
import RevealRoot from "@/components/RevealRoot";
import PollinatorLab from "@/components/projects/pollinator-lab/PollinatorLab";
import MoreProjects from "@/components/MoreProjects";

export const metadata: Metadata = {
  title: "Pollinator Lab — Frond Studio",
  description:
    "An interactive 3D field guide to pollinators — bees, moths, beetles, hummingbirds and bats. Every specimen is a procedurally built three.js model, lit in a soft studio and set on a turntable you can spin, with field notes for each species.",
};

export default function PollinatorLabPage() {
  return (
    <RevealRoot>
      <PollinatorLab />
      <MoreProjects excludeSlug="pollinator-lab" />
    </RevealRoot>
  );
}
