import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RevealRoot from "@/components/RevealRoot";
import InstrumentMount, { type InstrumentKind } from "@/components/projects/instruments/InstrumentMount";
import MoreProjects from "@/components/MoreProjects";

const INSTRUMENTS: Record<string, { title: string; desc: string }> = {
  "juno-106": { title: "Juno-106 — Frond Studio", desc: "Roland's 1984 polysynth, rebuilt in Web Audio. Play it in the browser." },
  "space-echo": { title: "Space Echo — Frond Studio", desc: "The RE-201 tape delay and spring reverb, rebuilt in Web Audio." },
  theremin: { title: "Theremin — Frond Studio", desc: "A gesture instrument — pitch and volume swept from thin air, in Web Audio." },
  biome: { title: "Biome — Frond Studio", desc: "A sound-healing soundscape ecosystem — a living drone built from a frequency atlas, in Web Audio." },
};

export function generateStaticParams() {
  return Object.keys(INSTRUMENTS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const m = INSTRUMENTS[slug];
  return m ? { title: m.title, description: m.desc } : { title: "Instruments — Frond Studio" };
}

export default async function InstrumentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!INSTRUMENTS[slug]) notFound();
  return (
    <RevealRoot>
      <InstrumentMount kind={slug as InstrumentKind} />
      <MoreProjects excludeSlug="instruments" />
    </RevealRoot>
  );
}
