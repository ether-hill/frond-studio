import type { Metadata } from "next";
import RevealRoot from "@/components/RevealRoot";
import DataCenterSimF5 from "@/components/projects/data-center-sim-f5/DataCenterSimF5";
import MoreProjects from "@/components/MoreProjects";

export const metadata: Metadata = {
  title: "Data Center Sim F5 — Frond Studio",
  description:
    "A from-scratch rebuild of the data center management sim, on a high-desert plateau shared with a small town. A real day/night cycle drives solar, batteries, grid prices and carbon — while the chillers roar, smog gathers over the houses and community sentiment falls.",
};

export default function DataCenterSimF5Page() {
  return (
    <RevealRoot>
      <DataCenterSimF5 />
      <MoreProjects excludeSlug="data-center-sim-f5" />
    </RevealRoot>
  );
}
