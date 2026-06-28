import type { Metadata } from "next";
import RevealRoot from "@/components/RevealRoot";
import RenderInspector from "@/components/projects/render-inspector/RenderInspector";
import MoreProjects from "@/components/MoreProjects";

export const metadata: Metadata = {
  title: "Render Inspector — Frond Studio",
  description:
    "A glass solid spinning in front of glowing 3D text, with a live control panel and a renderer inspector — a faithful three.js recreation of Faraz Shaikh's R3F WebGPU-inspector demo.",
};

export default function RenderInspectorPage() {
  return (
    <RevealRoot>
      <RenderInspector />
      <MoreProjects excludeSlug="render-inspector" />
    </RevealRoot>
  );
}
