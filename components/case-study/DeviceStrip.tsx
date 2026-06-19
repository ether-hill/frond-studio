import type { Project } from "@/content/projects/_types";
import Media from "./Media";

/** Responsive device strip — mobile / tablet / desktop frames side by side. */
export default function DeviceStrip({ devices }: { devices: NonNullable<Project["devices"]> }) {
  return (
    <section data-rvs className="cs-devices" style={{ display: "grid", gridTemplateColumns: "0.7fr 0.95fr 1.5fr", gap: "clamp(20px,2.5vw,44px)", alignItems: "end" }}>
      <Media slot={devices.mobile} />
      <Media slot={devices.tablet} />
      <Media slot={devices.desktop} />
    </section>
  );
}
