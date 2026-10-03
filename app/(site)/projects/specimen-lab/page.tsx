import type { Metadata } from "next";
import { projectShareCard } from "@/lib/projects";
import RevealRoot from "@/components/RevealRoot";
import SpecimenLab from "@/components/projects/specimen-lab/SpecimenLab";
import MoreProjects from "@/components/MoreProjects";

export const metadata: Metadata = {
  ...projectShareCard("specimen-lab"),
  title: "Specimen Lab — Frond Studio",
  description:
    "An ongoing notebook of generative specimens. The first is a radiolarian sphere: a golden-angle lattice with bone-like struts and bead-tipped spines, grown from a seed and rendered live in the browser.",
};

export default function SpecimenLabPage() {
  return (
    <RevealRoot>
      <SpecimenLab />
      <MoreProjects excludeSlug="specimen-lab" />
    </RevealRoot>
  );
}
