import type { Metadata } from "next";
import AlgorithmLab from "@/components/projects/algorithm-lab/AlgorithmLab";

export const metadata: Metadata = {
  title: "Algorithm Lab — Frond Studio",
  description:
    "A live sandbox for seven nature-inspired generative systems — space colonization, differential growth, phyllotaxis, strange attractors, dielectric breakdown, stable fluids and reaction–diffusion — each seedable, tunable and exportable.",
};

// Full-viewport tool: the fixed nav floats over the top; the lab fills the rest.
export default function AlgorithmLabPage() {
  return (
    <main data-theme="dark" style={{ height: "100svh", paddingTop: 60, boxSizing: "border-box", background: "#0c0d10", overflow: "hidden" }}>
      <AlgorithmLab />
    </main>
  );
}
