import type { Metadata } from "next";
import RevealRoot from "@/components/RevealRoot";
import DataCenterSim from "@/components/projects/data-center-sim/DataCenterSim";
import MoreProjects from "@/components/MoreProjects";

export const metadata: Metadata = {
  title: "Data Center Sim — Frond Studio",
  description:
    "A browser management sim: lay out server racks, cooling, power and networking on the floor, then keep the heat under control. Heat is a real diffusing field — place coolers near racks or watch your servers throttle and fail.",
};

export default function DataCenterSimPage() {
  return (
    <RevealRoot>
      <DataCenterSim />
      <MoreProjects excludeSlug="data-center-sim" />
    </RevealRoot>
  );
}
