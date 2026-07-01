import type { Metadata } from "next";
import RevealRoot from "@/components/RevealRoot";
import DataCenterSimF5 from "@/components/projects/data-center-sim-f5/DataCenterSimF5";
import MoreProjects from "@/components/MoreProjects";

export const metadata: Metadata = {
  title: "Data Center Sim F5 — Frond Studio",
  description:
    "A from-scratch rebuild of the data center management sim on a high-desert plateau: a real day/night cycle drives solar, batteries, grid prices and carbon. Keep the halls cool through the desert afternoon and sell clean compute at a premium.",
};

export default function DataCenterSimF5Page() {
  return (
    <RevealRoot>
      <DataCenterSimF5 />
      <MoreProjects excludeSlug="data-center-sim-f5" />
    </RevealRoot>
  );
}
