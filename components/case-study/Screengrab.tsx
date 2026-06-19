import type { MediaSlot } from "@/content/projects/_types";
import Media from "./Media";

/** Full-bleed screen-grab — breaks out of the page gutter to the viewport edges. */
export default function Screengrab({ slot }: { slot: MediaSlot }) {
  return (
    <section data-rvs className="cs-fullbleed">
      <Media slot={slot} />
    </section>
  );
}
