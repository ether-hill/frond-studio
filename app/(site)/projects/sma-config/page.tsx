import type { Metadata } from "next";
import RevealRoot from "@/components/RevealRoot";
import SmaConfig from "@/components/projects/sma-config/SmaConfig";
import MoreProjects from "@/components/MoreProjects";

export const metadata: Metadata = {
  title: "SMA Config — Frond Studio",
  description:
    "An advanced real-time GPU studio for the Jones (2010) agent-based Physarum slime-mould model — sculpt the parameters live.",
};

export default function SmaConfigPage() {
  return (
    <RevealRoot>
      <SmaConfig />
      <MoreProjects excludeSlug="sma-config" />
    </RevealRoot>
  );
}
