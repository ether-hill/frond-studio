'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BufferAttribute, BufferGeometry } from 'three';
import { exportGLB } from '../lib/export';
import type { GeometryParams, RenderParams } from '../lib/params';
import { readUrl, writeUrl } from '../lib/urlParams';
import { useGenerator } from '../lib/useGenerator';
import Controls from './Controls';
import Scene from './Scene';

const STAGES: Record<string, string> = { lattice: 'lattice', field: 'distance field', mesh: 'marching cubes', smooth: 'smoothing' };

/** Renders the specimen into the StudioShell visual, and its controls into the sidebar. */
export default function RadiolarianApp({ panel }: { panel: HTMLElement }) {
  const [initial] = useState(readUrl);
  const [geometry, setGeometry] = useState<GeometryParams>(initial.geometry);
  const [render, setRender] = useState<RenderParams>(initial.render);
  const gen = useGenerator(geometry);

  const onChange = useCallback((g: GeometryParams, r: RenderParams) => {
    setGeometry((prev) => (JSON.stringify(prev) === JSON.stringify(g) ? prev : { ...g }));
    setRender((prev) => (JSON.stringify(prev) === JSON.stringify(r) ? prev : { ...r }));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => writeUrl(geometry, render), 250);
    return () => clearTimeout(t);
  }, [geometry, render]);

  const mesh = useMemo(() => {
    if (!gen.mesh) return null;
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(gen.mesh.positions, 3));
    g.setAttribute('normal', new BufferAttribute(gen.mesh.normals, 3));
    g.setIndex(new BufferAttribute(gen.mesh.indices, 1));
    g.computeBoundingSphere();
    return g;
  }, [gen.mesh]);
  useEffect(() => () => mesh?.dispose(), [mesh]);

  // the mesh on screen may lag the controls; name the file after the params that produced it
  const meshParams = gen.mesh?.params;
  const onExportGLB = useCallback(() => {
    if (!mesh || !meshParams) return alert('No mesh yet');
    exportGLB(mesh, meshParams).catch((e) => alert(e.message));
  }, [mesh, meshParams]);

  const s = gen.mesh?.stats;
  return (
    <>
      <Scene gen={gen} render={render} geometry={mesh} />
      {createPortal(<Controls initial={initial} onChange={onChange} onExportGLB={onExportGLB} />, panel)}

      <div className="spec-hud">
        {gen.error ? (
          <span className="spec-error">{gen.error}</span>
        ) : gen.busy ? (
          <span className="spec-progress">
            <span className="spec-bar"><span style={{ width: `${Math.round(gen.t * 100)}%` }} /></span>
            {STAGES[gen.stage] ?? gen.stage} {Math.round(gen.t * 100)}%
          </span>
        ) : s ? (
          <span>
            {s.triangles.toLocaleString()} tris · {s.primitives.toLocaleString()} primitives ·{' '}
            {Math.round(s.ms.lattice + s.ms.field + s.ms.mesh + s.ms.smooth)} ms
          </span>
        ) : null}
      </div>
    </>
  );
}
