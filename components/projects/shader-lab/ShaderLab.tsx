"use client";

import { useEffect, useRef, useState } from "react";
import type { Handle, Params } from "./gpu";
import s from "./ShaderLab.module.css";

export default function ShaderLab() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [backend, setBackend] = useState("");
  const [fps, setFps] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);

  useEffect(() => {
    const mount = mountRef.current;
    const panelHost = panelRef.current;
    if (!mount || !panelHost) return;
    let handle: Handle | null = null;
    let paneHandle: { dispose: () => void; refresh: () => void } | null = null;
    let cancelled = false;

    (async () => {
      const [{ createPlayground, DEFAULTS, PALETTES, randomized }, { Pane }] = await Promise.all([
        import("./gpu"),
        import("tweakpane"),
      ]);
      if (cancelled || !mountRef.current || !panelRef.current) return;

      handle = createPlayground(mountRef.current, DEFAULTS);
      setBackend(handle.backendLabel);
      handle.setFps((f) => setFps(f));

      const p = handle.params;
      const paletteOpts: Record<string, number> = {};
      PALETTES.forEach((pl, i) => (paletteOpts[pl.name] = i));

      // tweakpane v4; loosely typed (its folders return Bindable APIs)
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const pane: any = new Pane({ container: panelRef.current });
      paneHandle = pane;

      const pattern = pane.addFolder({ title: "Pattern" });
      pattern.addBinding(p, "speed", { min: 0, max: 0.8, step: 0.01 });
      pattern.addBinding(p, "scale", { min: 0.6, max: 8, step: 0.05, label: "zoom" });
      pattern.addBinding(p, "warp", { min: 0, max: 3.5, step: 0.02 });
      pattern.addBinding(p, "octaves", { min: 1, max: 8, step: 1, label: "detail" });
      pattern.addBinding(p, "ridged");
      pattern.addBinding(p, "flowX", { min: -0.08, max: 0.08, step: 0.002, label: "drift x" });
      pattern.addBinding(p, "flowY", { min: -0.08, max: 0.08, step: 0.002, label: "drift y" });

      const colour = pane.addFolder({ title: "Colour" });
      colour.addBinding(p, "paletteIndex", { options: paletteOpts, label: "palette" });
      colour.addBinding(p, "hue", { min: 0, max: 1, step: 0.01 });
      colour.addBinding(p, "saturation", { min: 0, max: 2, step: 0.02 });
      colour.addBinding(p, "brightness", { min: 0.4, max: 1.6, step: 0.02 });
      colour.addBinding(p, "contrast", { min: 0.6, max: 1.8, step: 0.02 });

      const sceneF = pane.addFolder({ title: "Scene" });
      sceneF.addBinding(p, "mouseInfluence", { min: 0, max: 2, step: 0.02, label: "mouse pull" });
      sceneF.addBinding(p, "vignette", { min: 0, max: 1, step: 0.02 });
      sceneF.addBinding(p, "grain", { min: 0, max: 0.2, step: 0.005 });
      sceneF.addBinding(p, "paused");

      pane.addButton({ title: "Randomise" }).on("click", () => {
        Object.assign(p, randomized());
        pane.refresh();
      });
      pane.addButton({ title: "Reset" }).on("click", () => {
        Object.assign(p, DEFAULTS as Params);
        pane.refresh();
      });
      pane.addButton({ title: "Save PNG" }).on("click", () => handle?.exportPNG());
      /* eslint-enable @typescript-eslint/no-explicit-any */
    })();

    return () => {
      cancelled = true;
      paneHandle?.dispose();
      handle?.dispose();
    };
  }, []);

  return (
    <div className={s.wrap} ref={wrapRef}>
      <header className={s.head} data-rv>
        <div>
          <div className={s.kicker}>SHADER · REAL-TIME · LIVE CONTROLS</div>
          <h1 className={s.title}>Shader Lab</h1>
        </div>
        <p className={s.intro}>
          An original real-time flow-field running entirely on the GPU as a fragment shader,
          wired to a live control panel — the three.js creative-coding workflow where every
          slider re-tunes the image instantly. Drag across the canvas to push the flow,
          randomise for a new world, and save a still.
        </p>
      </header>

      <div className={s.stage}>
        <div ref={mountRef} className={s.canvas} />

        <div className={s.badges}>
          <span className={s.badge}>{backend || "…"}</span>
          <span className={s.badge}>{fps} fps</span>
        </div>

        <button
          className={s.panelToggle}
          onClick={() => setPanelOpen((o) => !o)}
          aria-expanded={panelOpen}
        >
          {panelOpen ? "✕ Controls" : "⚙ Controls"}
        </button>

        <div className={`${s.panel} ${panelOpen ? "" : s.panelHidden}`} ref={panelRef} />
      </div>

      <p className={s.legend}>
        Rendered on {backend || "the GPU"} as a single full-screen fragment shader — an original
        domain-warped fractal-noise field. Every control above is a uniform updated live; nothing
        re-compiles. Drag on the image to deflect the flow toward the cursor.
      </p>
    </div>
  );
}
