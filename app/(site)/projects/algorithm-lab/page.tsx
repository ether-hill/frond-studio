import type { Metadata } from "next";
import RevealRoot from "@/components/RevealRoot";
import AlgorithmLab from "@/components/projects/algorithm-lab/AlgorithmLab";

export const metadata: Metadata = {
  title: "Algorithm Lab — Frond Studio",
  description:
    "A live lab of nature-inspired generative systems — sonar lattices, venation, differential growth, phyllotaxis, strange attractors, fluids and reaction-diffusion. Pick one, tune it live, record it as a smooth motion-graphic background.",
};

export default function AlgorithmLabPage() {
  return (
    <RevealRoot>
      <AlgorithmLab />
    </RevealRoot>
  );
}
