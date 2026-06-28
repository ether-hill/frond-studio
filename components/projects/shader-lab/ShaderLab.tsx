"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Handle, Params } from "./gpu";
import s from "./ShaderLab.module.css";

export default function ShaderLab() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [backend, setBackend] = useState("");
  const [fps, setFps] = useState(0);
  const [res, setRes] = useState<[number, number]>([0, 0]);
  const [panelOpen, setPanelOpen] = useState(true);
  const [more, setMore] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    const panelHost = panelRef.current;
    if (!mount || !panelHost) return;
    let handle: Handle | null = null;
    let paneHandle: { dispose: () => void; refresh: () => void } | null = null;
    let cancelled = false;

    // track canvas resolution for the inspector readout
    const ro = new ResizeObserver(() => {
      const r = mount.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      setRes([Math.round(r.width * dpr), Math.round(r.height * dpr)]);
    });
    ro.observe(mount);

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
      ro.disconnect();
      paneHandle?.dispose();
      handle?.dispose();
    };
  }, []);

  return (
    <div className={s.wrap} ref={wrapRef}>
      <div className={s.stage}>
        <div ref={mountRef} className={s.canvas} />

        {/* overlay chrome — sits on top of the live shader */}
        <div className={s.overlay}>
          {/* inspector / stats (top-left) */}
          <div className={s.inspector}>
            <span className={s.kicker}>SHADER · REAL-TIME</span>
            <dl className={s.stats}>
              <div><dt>backend</dt><dd>{backend || "…"}</dd></div>
              <div><dt>resolution</dt><dd>{res[0]}×{res[1]}</dd></div>
              <div><dt>fps</dt><dd>{fps}</dd></div>
            </dl>
          </div>

          {/* title + description + nav (bottom-left) */}
          <div className={s.hero}>
            <h1 className={s.title}>Shader Lab</h1>
            <p className={s.desc}>
              An original real-time flow-field running entirely on the GPU as a fragment
              shader, wired to a live control panel.
              {more && (
                <span className={s.descMore}>
                  {" "}A single full-screen triangle runs a domain-warped fractal-noise field;
                  every control on the right is a uniform updated live, so the image re-tunes
                  the instant you move a slider — nothing recompiles. Drag across the canvas to
                  deflect the flow toward the cursor, randomise for a new world, or save a still.
                </span>
              )}{" "}
              <button className={s.more} onClick={() => setMore((m) => !m)}>
                {more ? "read less" : "read more"}
              </button>
            </p>
            <nav className={s.nav}>
              <Link href="/projects" className={s.navLink}>← All projects</Link>
              <Link href="/contact" className={s.navLink}>✉ Contact</Link>
              <button className={s.navLink} onClick={() => setPanelOpen((o) => !o)}>
                {panelOpen ? "▣ Hide controls" : "▢ Controls"}
              </button>
            </nav>
          </div>

          {/* control panel (top-right) */}
          <div className={`${s.panel} ${panelOpen ? "" : s.panelHidden}`} ref={panelRef} />
        </div>
      </div>
    </div>
  );
}
