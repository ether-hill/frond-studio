"use client";

import { useEffect, useRef } from "react";

/**
 * Algorithm Lab (Wave 2) mounted inside the site. The framework-agnostic engine
 * (cores + harness + 7 systems) is lazily imported client-side (WebGL / three /
 * Tweakpane never touch SSR) and torn down on unmount. All styling is scoped
 * under `.alab` so the lab's utilitarian dark UI never leaks into the site.
 */
const CSS = `
.alab { --bg:#0c0d10; --panel:#15171c; --line:#262a33; --fg:#e7e9ee; --dim:#8b909c; --acc:#9fe0c2;
  display:grid; grid-template-columns:312px 1fr; height:100%; min-height:0; background:var(--bg); color:var(--fg);
  font:13px/1.4 ui-sans-serif, system-ui, sans-serif; }
.alab *, .alab *::before, .alab *::after { box-sizing:border-box; }
.alab-side { border-right:1px solid var(--line); overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:14px; }
.alab-side h1 { font-size:14px; margin:0; letter-spacing:0.02em; color:var(--fg); }
.alab-side h1 span { color:var(--dim); font-weight:400; }
.alab-block { border-top:1px solid var(--line); padding-top:12px; }
.alab-lbl { font-size:10px; letter-spacing:0.14em; text-transform:uppercase; color:var(--dim); margin-bottom:8px; }
.alab-row { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:6px; }
.alab button { font:inherit; background:var(--panel); color:var(--fg); border:1px solid var(--line); border-radius:6px; padding:6px 10px; cursor:pointer; }
.alab button:hover { border-color:var(--dim); }
.alab button.on { border-color:var(--acc); color:var(--acc); }
.alab-systems { display:flex; flex-direction:column; gap:4px; }
.alab-systems button { text-align:left; display:grid; gap:2px; padding:9px 11px; }
.alab-systems .t { font-weight:600; }
.alab-systems .b { color:var(--dim); font-size:11px; }
.alab-systems .tier { color:var(--dim); font-size:9px; letter-spacing:0.1em; text-transform:uppercase; }
.alab-transport button { flex:1; }
.alab-hud { color:var(--dim); font-size:11px; font-variant-numeric:tabular-nums; }
.alab-presets { display:flex; flex-direction:column; gap:4px; }
.alab-preset { display:flex; gap:4px; }
.alab-preset .load { flex:1; text-align:left; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.alab-stage { position:relative; overflow:hidden; background:#000; min-width:0; }
.alab-view { position:absolute; inset:0; width:100%; height:100%; display:block; }
.alab-sel { background:var(--panel); color:var(--fg); border:1px solid var(--line); border-radius:6px; padding:6px 8px; font:inherit; cursor:pointer; }
.alab .tp-dfwv { width:100%; }
/* cinematic / full-bleed: drop the sidebar, canvas fills everything */
.alab-cine-exit { position:absolute; top:12px; right:12px; z-index:5; display:none; opacity:0.35; transition:opacity .2s; }
.alab-cine-exit:hover { opacity:1; }
.alab.alab-cinematic { grid-template-columns:1fr; }
.alab.alab-cinematic .alab-side { display:none; }
.alab.alab-cinematic .alab-cine-exit { display:inline-flex; }
@media (max-width: 720px) {
  .alab { grid-template-columns:1fr; grid-template-rows:auto 1fr; }
  .alab-side { max-height:42vh; }
}
`;

export default function AlgorithmLab() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let teardown: (() => void) | undefined;
    let cancelled = false;
    import("./engine/lab")
      .then((m) => { if (!cancelled) teardown = m.mountLab(root); })
      .catch((err) => console.error("Algorithm Lab failed to mount:", err));
    return () => { cancelled = true; teardown?.(); };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div ref={ref} className="alab-root" style={{ height: "100%" }} />
    </>
  );
}
