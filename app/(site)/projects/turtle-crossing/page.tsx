import type { Metadata } from "next";
import RevealRoot from "@/components/RevealRoot";
import TurtleCrossing from "@/components/projects/turtle-crossing/TurtleCrossing";
import MoreProjects from "@/components/MoreProjects";

export const metadata: Metadata = {
  title: "Turtle Crossing — Frond Studio",
  description:
    "An interactive field resource for southwestern Ontario's eight at-risk turtle species — a living marsh, field-guide plates, the turtle year, a road-rescue trainer and a habitat explorer, plus who to call when it matters.",
};

export default function TurtleCrossingPage() {
  return (
    <RevealRoot>
      <TurtleCrossing />
      <MoreProjects excludeSlug="turtle-crossing" />
    </RevealRoot>
  );
}
