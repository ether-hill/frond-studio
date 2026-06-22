import type { Metadata } from "next";
import RevealRoot from "@/components/RevealRoot";
import InstrumentMount from "@/components/projects/instruments/InstrumentMount";
import MoreProjects from "@/components/MoreProjects";

export const metadata: Metadata = {
  title: "Instruments — Frond Studio",
  description:
    "A growing rack of instruments synthesised entirely in Web Audio: Juno-106, Space Echo, a Theremin and more, playable in the browser.",
};

export default function InstrumentsHubPage() {
  return (
    <RevealRoot>
      <InstrumentMount kind="hub" />
      <MoreProjects excludeSlug="instruments" />
    </RevealRoot>
  );
}
