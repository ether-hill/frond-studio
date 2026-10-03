import { createRoot } from "react-dom/client";
import RadiolarianApp from "./radiolarian/components/RadiolarianApp";

/** StudioShell mount: the specimen in the visual, its Leva controls in the sidebar. */
export function mountSpecimenLab(root: HTMLElement) {
  const stage = root.querySelector<HTMLElement>("#spec-stage")!;
  const panel = root.querySelector<HTMLElement>("#spec-panel")!;
  const toggle = root.querySelector<HTMLButtonElement>("#spec-ctrltoggle")!;

  // Phones: controls start hidden under the visual, behind the Controls button.
  const setCtrl = (v: boolean) => { panel.style.display = v ? "" : "none"; };
  const onToggle = () => setCtrl(panel.style.display === "none");
  toggle.addEventListener("click", onToggle);
  if (window.innerWidth < 860) setCtrl(false);

  const app = createRoot(stage);
  app.render(<RadiolarianApp panel={panel} />);
  return () => {
    toggle.removeEventListener("click", onToggle);
    app.unmount();
  };
}
