// The bullwhip as a wave. Five stations (the consumer, then four layers) sit along a river. Each
// station's height is that layer's real order swing at that moment, so the ribbon through them is
// the wave. The camera starts close, so a 3% change looks large, and pulls back as the wave grows:
// by the end the first pulse is the thin gold band. Nothing here is decoration: every height is read
// from the simulation in bullwhip.js. Words live in HTML rows above and below the drawing, so they
// stay readable on a phone.

import { h, s } from './ui.js';
import { LAYERS, STEP, STEP_AT } from './bullwhip.js';

const W = 640, H = 300, CY = 150, HMAX = 112, XS = [64, 192, 320, 448, 576];
const NAMES = ['Consumer', ...LAYERS.map((l) => l.name)];
const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const f1 = (v) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}%`;

// A smooth curve through the points (Catmull-Rom as cubic Beziers).
const spline = (P) => {
  let d = `M ${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}`;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || P[i + 1];
    d += ` C ${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
};
const at = (arr, t) => { const i = Math.min(arr.length - 1, Math.floor(t)), j = Math.min(arr.length - 1, i + 1), f = t - i; return arr[i] * (1 - f) + arr[j] * f; };

export function waveFigure() {
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'wv', role: 'img', 'aria-label': 'A wave moving through a consumer, a retailer, a distributor, a supplier and a plant.' });
  const grad = s('linearGradient', { id: 'wvgrad', x1: 0, y1: 0, x2: 1, y2: 0 },
    s('stop', { offset: '0%', style: { stopColor: 'var(--d-fin)' } }), s('stop', { offset: '55%', style: { stopColor: 'var(--accent)' } }), s('stop', { offset: '100%', style: { stopColor: 'var(--bad)' } }));
  svg.append(s('defs', null, grad));

  const corridor = s('rect', { x: XS[0] - 40, width: XS[4] - XS[0] + 80, rx: 8, class: 'wv-corridor' });
  const base = s('line', { x1: XS[0] - 40, x2: XS[4] + 40, y1: CY, y2: CY, class: 'wv-base' });
  const ghosts = Array.from({ length: 7 }, () => s('path', { class: 'wv-ghost' }));
  const glow = s('path', { class: 'wv-glow', stroke: 'url(#wvgrad)' }), ribbon = s('path', { class: 'wv-ribbon', stroke: 'url(#wvgrad)' });
  const caps = XS.map((_, i) => s('rect', { width: 16, rx: 8, class: `wv-cap${i === 0 ? ' src' : ''}` }));
  const rings = s('g');
  const nodes = XS.map((x, i) => s('circle', { cx: x, cy: CY, r: i === 0 ? 8 : 10, class: `wv-node${i === 0 ? ' src' : ''}` }));
  svg.append(corridor, base, ...ghosts, glow, ribbon, ...caps, rings, ...nodes);

  // Each layer's decision, said in its own words, appears when the wave reaches it. Names and live numbers sit below.
  const says = XS.map((_, i) => h('div', { class: `wv-say${i === 0 ? ' src' : ''}` }, i === 0 ? `Demand +${Math.round(STEP * 100)}%` : LAYERS[i - 1].says.join(' ')));
  const vals = XS.map(() => h('span', { class: 'wv-val' }, ''));
  const node = h('div', { class: 'wv-fig' },
    h('div', { class: 'wv-row' }, says),
    svg,
    h('div', { class: 'wv-row' }, XS.map((_, i) => h('div', { class: 'wv-col' }, h('b', null, NAMES[i]), vals[i]))));

  let raf = 0, run = 0;
  const stop = () => { run++; cancelAnimationFrame(raf); };

  // Everything drawn for week-time t at zoom k (pixels per percent).
  function draw(rows, t, k, hist) {
    const P = rows.map((r, i) => [XS[i], CY - k * at(r.dev, t)]);
    const d = spline(P);
    ribbon.setAttribute('d', d); glow.setAttribute('d', d);
    ghosts.forEach((g, i) => { const old = hist[hist.length - 1 - i]; g.setAttribute('d', old ? spline(old) : ''); g.style.opacity = String(0.34 * (1 - i / ghosts.length)); });
    const band = 3 * k;
    corridor.setAttribute('y', (CY - band).toFixed(1)); corridor.setAttribute('height', Math.max(1.5, band * 2).toFixed(1));
    nodes.forEach((n, i) => {
      n.setAttribute('cy', P[i][1].toFixed(1));
      n.style.fill = i === 0 ? 'var(--gold)' : `color-mix(in srgb, var(--bad) ${Math.round(Math.min(1, Math.abs(at(rows[i].dev, t)) / 30) * 100)}%, var(--d-fin))`;
    });
    vals.forEach((v, i) => { v.textContent = t < STEP_AT && i === 0 ? '' : f1(at(rows[i].dev, t)); });
    return { P };
  }

  // Play the whole run once. `onDone` is called when the camera has pulled back and the swings are shown.
  function play(data, onDone) {
    stop();
    const my = run, rows = data.rows, N = rows[0].dev.length;
    const hist = [], seen = new Set();
    const cum = []; let m = 0;
    for (let w = 0; w < N; w++) { m = Math.max(m, ...rows.map((r) => Math.abs(r.dev[w]))); cum.push(m); }
    const reactAt = rows.map((r, i) => (i === 0 ? STEP_AT : Math.max(STEP_AT, r.dev.findIndex((v) => Math.abs(v) >= 0.4))));
    says.forEach((b) => b.classList.remove('on')); caps.forEach((c) => c.setAttribute('height', 0)); rings.replaceChildren();
    node.classList.remove('done');
    let kCur = HMAX / 3, t0 = null, lastGhost = -1;
    const WEEK_MS = 175;
    const ring = (i, P) => { const c = s('circle', { cx: XS[i], cy: P[i][1], r: 10, class: 'wv-ring' }); rings.append(c); setTimeout(() => c.remove(), 1300); };
    const finish = () => {
      const k = HMAX / Math.max(3, cum[N - 1]);
      draw(rows, N - 1, k, []);
      node.classList.add('done');
      says.forEach((b) => b.classList.add('on'));
      rows.forEach((r, i) => { vals[i].textContent = `swing ${r.dev.reduce((a, v) => Math.max(a, Math.abs(v)), 0).toFixed(0)}%`; });
      const go = (t00) => (now) => {
        if (my !== run) return;
        const p = Math.min(1, (now - t00) / 900), e = 1 - (1 - p) ** 3;
        caps.forEach((c, i) => {
          const hi = Math.max(0, ...rows[i].dev), lo = Math.min(0, ...rows[i].dev);
          c.setAttribute('x', XS[i] - 8); c.setAttribute('y', (CY - k * hi * e).toFixed(1)); c.setAttribute('height', Math.max(3, k * (hi - lo) * e).toFixed(1));
        });
        if (p < 1) raf = requestAnimationFrame(go(t00)); else onDone && onDone();
      };
      raf = requestAnimationFrame(go(performance.now()));
    };
    if (reduced()) { finish(); return; }
    const step = (now) => {
      if (my !== run || !node.isConnected) return;
      if (t0 === null) t0 = now;
      const t = Math.min(N - 1, (now - t0) / WEEK_MS);
      const target = HMAX / Math.max(3, at(cum, t));
      kCur += (target - kCur) * 0.12;
      const out = draw(rows, t, kCur, hist);
      if (Math.floor(t * 2) !== lastGhost) { lastGhost = Math.floor(t * 2); hist.push(out.P.map((p) => p.slice())); if (hist.length > 24) hist.shift(); }
      rows.forEach((_, i) => { if (!seen.has(i) && t >= reactAt[i]) { seen.add(i); says[i].classList.add('on'); ring(i, out.P); } });
      if (t < N - 1) raf = requestAnimationFrame(step); else finish();
    };
    draw(rows, 0, kCur, hist);
    raf = requestAnimationFrame(step);
  }

  // The calm picture before anything happens.
  function rest(data) { stop(); node.classList.remove('done'); says.forEach((b) => b.classList.remove('on')); draw(data.rows, 0, HMAX / 3, []); }
  return { node, play, stop, rest };
}
