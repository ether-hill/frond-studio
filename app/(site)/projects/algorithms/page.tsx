import type { Metadata } from "next";
import RevealRoot from "@/components/RevealRoot";
import AlgorithmsApp from "@/components/projects/algorithms/AlgorithmsApp";
import MoreProjects from "@/components/MoreProjects";

export const metadata: Metadata = {
  title: "Algorithms — Frond Studio",
  description:
    "A growing collection of generative systems behind the studio: Physarum, reaction–diffusion, boids, L-systems, Voronoi, DLA and more, each running live in the browser.",
};

export default function AlgorithmsPage() {
  return (
    <RevealRoot>
      <AlgorithmsApp />
      <MoreProjects excludeSlug="algorithms" />
    </RevealRoot>
  );
}
