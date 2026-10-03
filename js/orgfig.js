// The organism, drawn once and then moved. A glowing core (the company), four arms that each pull
// toward one department's own goal, a star (the mantra everyone repeats) and, once the AI is asked,
// an arrow showing where the sum of the pulls is really heading. Motion is eased by a short
// animation loop that stops as soon as everything has settled.

import { s } from './ui.js';
import { DEPTS, sumPulls, blendAngle, clampPull } from './org.js';

const CX = 320, CY = 240, STAR = { x: 320, y: 52 };
const rad = (d) => (d * Math.PI) / 180;
const armLen = (v) => 46 + 62 * clampPull(v);
const SIDE = DEPTS.map((d) => (d.angle < 0 ? -1 : 1));   // which side of the figure each label lives on
const GAP = 34;                                          // least vertical space between two labels
const at = (a, r) => [CX + r * Math.sin(rad(a)), CY - r * Math.cos(rad(a))];
const starPoints = (cx, cy, R, r) => Array.from({ length: 10 }, (_, i) => { const a = (Math.PI / 5) * i, d = i % 2 ? r : R; return `${(cx + d * Math.sin(a)).toFixed(1)},${(cy - d * Math.cos(a)).toFixed(1)}`; }).join(' ');
const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function orgFigure() {
  const svg = s('svg', { viewBox: '70 8 500 412', class: 'org', role: 'img', 'aria-label': 'The company and four departments, each pulling toward its own goal.' });
  svg.append(s('circle', { cx: CX, cy: CY, r: 108, class: 'org-ring' }), s('circle', { cx: CX, cy: CY, r: 188, class: 'org-ring' }));

  // The star: where leadership says the company is going.
  const goal = s('line', { x1: CX, y1: CY, x2: STAR.x, y2: STAR.y + 20, class: 'org-goal' });
  const halo = s('circle', { cx: STAR.x, cy: STAR.y, r: 34, class: 'org-halo' });
  const star = s('polygon', { points: starPoints(STAR.x, STAR.y, 17, 7.5), class: 'org-star' });
  const mantra = s('text', { x: STAR.x + 30, y: STAR.y + 5, class: 'org-mantra' }, 'Beat the market');
  svg.append(goal, halo, star, mantra);

  // What the sum of the pulls is really doing. Drawn in only when asked.
  const arc = s('path', { class: 'org-arc' });
  const rLine = s('line', { x1: CX, y1: CY, x2: CX, y2: CY, class: 'org-rline', pathLength: 1 });
  const rHead = s('polygon', { class: 'org-rhead' });
  const rText = s('text', { x: 82, y: 410, class: 'org-rtext' }, '→  Where it is really heading');
  const result = s('g', { class: 'org-result' }, arc, rLine, rHead, rText);
  svg.append(result);

  // One arm per department.
  const arms = DEPTS.map((d) => {
    const shaft = s('line', { x1: CX, y1: CY, x2: CX, y2: CY, class: 'org-shaft', style: { stroke: d.color } });
    const flow = s('line', { x1: CX, y1: CY, x2: CX, y2: CY, class: 'org-flow', style: { stroke: d.color } });
    const tip = s('circle', { r: 8, class: 'org-tip', style: { fill: d.color } });
    const name = s('tspan', { class: 'org-name', style: { fill: d.color } }, d.name), goalT = s('tspan', { class: 'org-goaltext', dy: '15' }, d.goal);
    const label = s('text', { class: 'org-label' }, name, goalT);
    goalT.setAttribute('x', 0);
    svg.append(shaft, flow, tip, label);
    return { d, shaft, flow, tip, label, name, goalT };
  });

  // The company: a quiet pulse, like something alive.
  svg.append(s('circle', { cx: CX, cy: CY, r: 30, class: 'org-pulse' }), s('circle', { cx: CX, cy: CY, r: 30, class: 'org-pulse b' }),
    s('circle', { cx: CX, cy: CY, r: 30, class: 'org-core' }), s('text', { x: CX, y: CY + 4, class: 'org-coretext', 'text-anchor': 'middle' }, 'Company'));

  // Current and target values for every moving part, eased together.
  const cur = { arms: DEPTS.map(() => ({ a: 0, l: 40, o: 0 })), r: { a: 0, l: 0 }, reach: 0.5 };
  let tgt = { arms: cur.arms.map((x) => ({ ...x })), r: { a: 0, l: 0 }, reach: 0.5 };
  let raf = 0, first = true;

  function draw() {
    // Each arm starts on its own lane, so four arms aimed the same way still read as four.
    const laid = arms.map((m, i) => {
      const { a, l, o } = cur.arms[i], dx = Math.sin(rad(a)), dy = -Math.cos(rad(a));
      const x0 = CX + o * Math.cos(rad(a)), y0 = CY + o * Math.sin(rad(a));
      return { m, i, x0, y0, x: x0 + l * dx, y: y0 + l * dy };
    });
    for (const [side, group] of [[-1, laid.filter((e) => SIDE[e.i] < 0)], [1, laid.filter((e) => SIDE[e.i] > 0)]]) {
      let floor = -Infinity;
      group.sort((p, q) => p.y - q.y).forEach((e) => {
        const ly = Math.max(e.y - 2, floor); floor = ly + GAP;
        const lx = e.x + side * 14;
        e.m.label.setAttribute('x', lx.toFixed(1)); e.m.label.setAttribute('y', ly.toFixed(1)); e.m.label.setAttribute('text-anchor', side > 0 ? 'start' : 'end');
        e.m.name.setAttribute('x', lx.toFixed(1)); e.m.goalT.setAttribute('x', lx.toFixed(1));
      });
    }
    laid.forEach((e) => {
      for (const el of [e.m.shaft, e.m.flow]) { el.setAttribute('x1', e.x0.toFixed(1)); el.setAttribute('y1', e.y0.toFixed(1)); el.setAttribute('x2', e.x.toFixed(1)); el.setAttribute('y2', e.y.toFixed(1)); }
      e.m.tip.setAttribute('cx', e.x.toFixed(1)); e.m.tip.setAttribute('cy', e.y.toFixed(1));
    });
    const { a, l } = cur.r, [rx, ry] = at(a, Math.max(l, 0.01));
    rLine.setAttribute('x2', rx.toFixed(1)); rLine.setAttribute('y2', ry.toFixed(1));
    const ux = Math.sin(rad(a)), uy = -Math.cos(rad(a)), px = -uy, py = ux;
    rHead.setAttribute('points', `${rx + ux * 13},${ry + uy * 13} ${rx + px * 8},${ry + py * 8} ${rx - px * 8},${ry - py * 8}`);
    const R = 74, [ax, ay] = at(a, R), [bx, by] = at(0, R);
    arc.setAttribute('d', Math.abs(a) < 1.5 ? '' : `M ${bx.toFixed(1)} ${by.toFixed(1)} A ${R} ${R} 0 ${Math.abs(a) > 180 ? 1 : 0} ${a > 0 ? 1 : 0} ${ax.toFixed(1)} ${ay.toFixed(1)}`);
    halo.style.setProperty('--reach', cur.reach.toFixed(3));
  }

  function tick() {
    let moving = false;
    const ease = (c, t, k = 0.2) => { const d = t - c; if (Math.abs(d) < 0.04) return t; moving = true; return c + d * k; };
    cur.arms.forEach((c, i) => { c.a = ease(c.a, tgt.arms[i].a); c.l = ease(c.l, tgt.arms[i].l); c.o = ease(c.o, tgt.arms[i].o); });
    cur.r.a = ease(cur.r.a, tgt.r.a); cur.r.l = ease(cur.r.l, tgt.r.l);
    cur.reach = ease(cur.reach, tgt.reach, 0.12);
    draw();
    raf = moving && svg.isConnected ? requestAnimationFrame(tick) : 0;
  }

  // pulls: how hard each department pulls. shared: how much of every goal is one shared measure. reveal: show the sum.
  function set({ pulls, shared = 0, reveal = false }) {
    const sm = sumPulls(pulls, shared);
    tgt = {
      arms: DEPTS.map((d, i) => ({ a: blendAngle(d.angle, shared), l: armLen(pulls && pulls[d.id]), o: (i - 1.5) * 8 * Math.min(1, Math.max(0, shared)) })),
      r: { a: sm.angle, l: Math.min(176, sm.mag * 50) },
      reach: reveal ? 0.25 + 0.75 * sm.reach : 0.5,
    };
    result.classList.toggle('on', !!reveal);
    halo.classList.toggle('on', !!reveal);
    svg.setAttribute('aria-label', `The company and four departments, each pulling toward its own goal.${reveal ? ` Together they move it ${Math.round(sm.reach * 100)} percent of the way toward the star.` : ''}`);
    if (reduced()) { cur.arms = tgt.arms.map((x) => ({ ...x })); cur.r = { ...tgt.r }; cur.reach = tgt.reach; draw(); return sm; }
    // The first time, the arms grow out of the core toward their goals.
    if (first) { cur.arms = tgt.arms.map((x) => ({ a: x.a, l: 8, o: x.o })); cur.r = { a: tgt.r.a, l: 0 }; cur.reach = tgt.reach; first = false; draw(); }
    if (!raf) raf = requestAnimationFrame(tick);
    return sm;
  }
  return { node: svg, set };
}
