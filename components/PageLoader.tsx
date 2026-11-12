'use client';

import { useEffect, useRef, useState } from 'react';

/** 'pending' while the WebGL scenes are expected but not yet rendering, 'ready' once both canvases have drawn real frames, 'off' for reduced motion / no WebGL. */
export type SceneState = 'pending' | 'ready' | 'off';

const FONT_FACES = ['400 1em Antonio', '400 1em Poppins', '500 1em Poppins', '600 1em Poppins', '400 1em "DM Sans"', '500 1em "DM Sans"'];
const MODEL_URL = '/models/chrome-bust.glb';
const MIN_VISIBLE_MS = 700;
const HARD_CAP_MS = 15000;
type Part = 'fonts' | 'images' | 'model' | 'scene';
const LABELS: Record<Part, string> = { fonts: 'SETTING THE TYPE', images: 'GATHERING THE WORK', model: 'SHAPING THE SCULPTURE', scene: 'POURING THE LIQUID' };

/** Downloads with byte progress so the HTTP cache is warm before the 3D loaders request the same file. */
async function fetchWithProgress(url: string, onProgress: (value: number) => void) {
  const response = await fetch(url);
  const total = Number(response.headers.get('content-length')) || 0;
  if (!response.body || !total) { await response.arrayBuffer(); return; }
  const reader = response.body.getReader();
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    loaded += value.byteLength;
    onProgress(Math.min(loaded / total, 1));
  }
}

export default function PageLoader({ scene, onDone, onLeave }: { scene: SceneState; onDone: () => void; onLeave?: () => void }) {
  const [shown, setShown] = useState(0);
  const [label, setLabel] = useState('OPENING THE BOX');
  const [phase, setPhase] = useState<'loading' | 'leaving' | 'gone'>('loading');
  const parts = useRef<Record<Part, number>>({ fonts: 0, images: 0, model: 0, scene: 0 });
  const sceneState = useRef(scene);
  const done = useRef(onDone);
  const leave = useRef(onLeave);
  sceneState.current = scene;
  done.current = onDone;
  leave.current = onLeave;

  useEffect(() => {
    let alive = true;
    const root = document.documentElement;
    root.classList.add('is-page-loading');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const set = (part: Part, value: number) => { if (alive) parts.current[part] = Math.max(parts.current[part], value); };

    Promise.all(FONT_FACES.map(face => document.fonts.load(face).catch(() => []))).then(() => document.fonts.ready).finally(() => set('fonts', 1));

    // Every image on the page, including the lazy gallery, so scrolling never waits on a download.
    const sources = [...new Set(Array.from(document.images, image => image.currentSrc || image.src).filter(Boolean))];
    let decoded = 0;
    if (!sources.length) set('images', 1);
    sources.forEach(source => {
      const image = new Image();
      image.decoding = 'async';
      image.src = source;
      image.decode().catch(() => undefined).finally(() => set('images', ++decoded / sources.length));
    });

    if (reduced) set('model', 1);
    // The 3D sculpture plus the hero's dust-impact clip (small; fetched alongside so the first landing never waits).
    else Promise.all([fetchWithProgress(MODEL_URL, value => set('model', value * .98)), fetch('/media/dust-impact.mp4').then(r => r.arrayBuffer())])
      .then(() => import('./journey/JourneyScene').then(module => module.preloadSculpture()))
      .catch(() => undefined)
      .finally(() => set('model', 1));

    const start = performance.now();
    let frame = 0; let last = -1; let lastLabel = ''; let finishing = false;
    const tick = (now: number) => {
      if (!alive) return;
      const state = sceneState.current;
      const p = parts.current;
      if (state === 'ready') p.scene = 1;
      else if (state === 'pending') p.scene += (.88 - p.scene) * .012; // canvases give no partial progress; ease toward the finish line
      const capped = now - start > HARD_CAP_MS;
      const weights: Array<[Part, number]> = state === 'off' ? [['fonts', .25], ['images', .75]] : [['fonts', .1], ['images', .25], ['model', .3], ['scene', .35]];
      const target = capped ? 100 : weights.reduce((sum, [part, weight]) => sum + weight * Math.min(p[part], 1), 0) * 100;
      // Count up smoothly, never backwards and never ahead of the real progress.
      let next = Math.max(last, 0);
      const ceiling = target >= 99.9 ? 100 : Math.floor(target);
      if (ceiling > next) next = Math.min(ceiling, next + Math.max(1, Math.ceil((ceiling - next) * .12)));
      if (next !== last) { last = next; setShown(next); }
      const pending = weights.find(([part]) => p[part] < 1);
      const nextLabel = pending ? LABELS[pending[0]] : 'READY';
      if (nextLabel !== lastLabel) { lastLabel = nextLabel; setLabel(nextLabel); }
      if (!finishing && last >= 100 && now - start > MIN_VISIBLE_MS) {
        finishing = true;
        setTimeout(() => { if (!alive) return; setPhase('leaving'); root.classList.remove('is-page-loading'); leave.current?.(); }, 260);
        setTimeout(() => { if (!alive) return; setPhase('gone'); done.current(); }, 260 + (reduced ? 350 : 1100));
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(frame); root.classList.remove('is-page-loading'); };
  }, []);

  if (phase === 'gone') return null;
  return <div className={`page-loader${phase === 'leaving' ? ' is-leaving' : ''}`} role="progressbar" aria-label="Loading The Vivid View" aria-valuemin={0} aria-valuemax={100} aria-valuenow={shown} aria-valuetext={`${shown}% — ${label.toLowerCase()}`}>
    <div className="page-loader-inner">
      <img className="page-loader-logo" src="/images/agency/vivid-view-logo.png" alt="" width={120} height={64}/>
      <div className="page-loader-count" aria-hidden="true"><span>{shown}</span><sup>%</sup></div>
      <div className="page-loader-bar" aria-hidden="true"><i style={{ transform: `scaleX(${shown / 100})` }}/></div>
      <div className="page-loader-meta" aria-hidden="true"><span>{label}</span><span>IDEAS WITHOUT EDGES</span></div>
    </div>
  </div>;
}
