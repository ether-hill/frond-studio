import type { Metadata } from "next";
import RevealRoot from "@/components/RevealRoot";
import ObjectViewer from "@/components/projects/object-viewer/ObjectViewer";
import MoreProjects from "@/components/MoreProjects";

export const metadata: Metadata = {
  title: "Object Viewer — Frond Studio",
  description:
    "A studio-lit 3D object viewer — a cabinet of curiosities of photoreal, public-domain (CC0) Poly Haven models: blades, brass instruments, statuary, a treasure chest and more. Pick a piece, drag to spin it, scrub the 360° dial and read its notes.",
};

export default function ObjectViewerPage() {
  return (
    <RevealRoot>
      <ObjectViewer />
      <MoreProjects excludeSlug="object-viewer" />
    </RevealRoot>
  );
}
