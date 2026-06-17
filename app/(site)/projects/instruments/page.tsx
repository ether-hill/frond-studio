import type { Metadata } from "next";
import RevealRoot from "@/components/RevealRoot";
import InstrumentMount from "@/components/projects/instruments/InstrumentMount";

export const metadata: Metadata = {
  title: "Instruments — Frond Studio",
  description:
    "A small rack of instruments synthesised entirely in Web Audio — Juno-106, Space Echo and a Theremin, playable in the browser.",
};

export default function InstrumentsHubPage() {
  return (
    <RevealRoot>
      <InstrumentMount kind="hub" />
    </RevealRoot>
  );
}
