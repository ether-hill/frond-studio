"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Handle, Info, Params } from "./scene";
import s from "./RenderInspector.module.css";

const DEMO_URL = "https://farazzshaikh.com/demos/demo-2026-r3f-inspector";

export default function RenderInspector() {
  const mountRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [backend, setBackend] = useState("");
  const [fps, setFps] = useState(0);
  const [info, setInfo] = useState<Info>({ calls: 0, tris: 0, geometries: 0, textures: 0, programs: 0 });
  const [panelOpen, setPanelOpen] = useState(true);
  const [more, setMore] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    const panelHost = panelRef.current;
    if (!mount || !panelHost) return;
    let handle: Handle | null = null;
    let paneHandle: { dispose: () => void; refresh: () => void } | null = null;
    let statTimer = 0;
    let cancelled = false;

    (async () => {
      const [{ createScene, DEFAULTS }, { Pane }] = await Promise.all([
        import("./scene"),
        import("tweakpane"),
      ]);
      if (cancelled || !mountRef.current || !panelRef.current) return;

      handle = createScene(mountRef.current, DEFAULTS);
      setBackend(handle.backendLabel);
      handle.setFps((f) => setFps(f));
      statTimer = window.setInterval(() => handle && setInfo(handle.info()), 500);

      const p = handle.params;
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const pane: any = new Pane({ container: panelRef.current, title: "Demo" });
      paneHandle = pane;

      pane.addBinding(p, "text");
      pane.addBinding(p, "spin");
      pane.addBinding(p, "speed", { min: 0, max: 3, step: 0.01 });

      const mat = pane.addFolder({ title: "Material" });
      mat.addBinding(p, "roughness", { min: 0, max: 1, step: 0.01 });
      mat.addBinding(p, "thickness", { min: 0, max: 2, step: 0.01 });

      const geo = pane.addFolder({ title: "Geometry" });
      geo.addBinding(p, "shape", {
        options: { "Torus Knot": "Torus Knot", Icosahedron: "Icosahedron", Tetrahedron: "Tetrahedron" },
      });

      pane.addBinding(p, "textColor", { view: "color", label: "text color" });
      pane.addBinding(p, "bloom", { min: 0, max: 3, step: 0.01 });

      pane.addButton({ title: "Reset" }).on("click", () => {
        Object.assign(p, DEFAULTS as Params);
        pane.refresh();
      });
      pane.addButton({ title: "Save PNG" }).on("click", () => handle?.exportPNG());
      /* eslint-enable @typescript-eslint/no-explicit-any */
    })();

    return () => {
      cancelled = true;
      clearInterval(statTimer);
      paneHandle?.dispose();
      handle?.dispose();
    };
  }, []);

  const fmt = (n: number) => n.toLocaleString("en-US");

  return (
    <div className={s.wrap}>
      <div className={s.stage}>
        <div ref={mountRef} className={s.canvas} />

        <div className={s.overlay}>
          {/* inspector / renderer stats (top-left) */}
          <div className={s.inspector}>
            <span className={s.kicker}>RENDERER · INSPECTOR</span>
            <dl className={s.stats}>
              <div><dt>backend</dt><dd>{backend || "…"}</dd></div>
              <div><dt>fps</dt><dd>{fps}</dd></div>
              <div><dt>draw calls</dt><dd>{info.calls}</dd></div>
              <div><dt>triangles</dt><dd>{fmt(info.tris)}</dd></div>
              <div><dt>geometries</dt><dd>{info.geometries}</dd></div>
              <div><dt>textures</dt><dd>{info.textures}</dd></div>
              <div><dt>programs</dt><dd>{info.programs}</dd></div>
            </dl>
          </div>

          {/* title + description + nav (bottom-left) */}
          <div className={s.hero}>
            <h1 className={s.title}>Render Inspector</h1>
            <p className={s.desc}>
              A glass solid spinning in front of glowing 3D text — every material,
              geometry and colour knob wired to a live panel, with a renderer inspector.
              {more && (
                <span className={s.descMore}>
                  {" "}A faithful recreation of Faraz Shaikh&rsquo;s &ldquo;ThreeJS WebGPU Inspector
                  in React-Three-Fiber&rdquo; demo, rebuilt here in vanilla three.js on WebGL2:
                  a transmission material refracts the emissive text behind it, a selective bloom
                  lifts the glow, and a soft contact shadow grounds it. Drag to orbit; scroll to zoom.
                </span>
              )}{" "}
              <button className={s.more} onClick={() => setMore((m) => !m)}>
                {more ? "read less" : "read more"}
              </button>
            </p>
            <p className={s.credit}>
              Original concept &amp; design by{" "}
              <a href={DEMO_URL} target="_blank" rel="noopener noreferrer">Faraz Shaikh</a> ·
              recreation by Frond Studio
            </p>
            <nav className={s.nav}>
              <Link href="/projects" className={s.navLink}>← All projects</Link>
              <a href={DEMO_URL} target="_blank" rel="noopener noreferrer" className={s.navLink}>Original demo ↗</a>
              <button className={s.navLink} onClick={() => setPanelOpen((o) => !o)}>
                {panelOpen ? "▣ Hide panel" : "▢ Panel"}
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
