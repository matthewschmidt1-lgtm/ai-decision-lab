// Four mirrors, then one lens. Each department learns from its own scorecard, a small loop that closes
// inside the department. An event touches a chain of links, and each mirror reflects only some of them.
// Pull the camera back and an AI lens lights the whole chain, and learning becomes one large loop that
// runs through every department. Two events: a campaign that outran its stock, and a quarter-end push
// in which Operations does the work of sales and marketing. Every number a mirror quotes is computed.

import { h, s, mount, int, stat, whenVisible } from '../ui.js';
import { DEPTS, CHAIN, SEES, mirrorFacts, unseenLinks, PUSH_CHAIN, PUSH_SEES, PRODUCTS, pushFacts } from '../org.js';
import { pushFilm } from './film.js';

const pc = (v) => `${Math.round(Math.abs(v) * 100)}%`;
const k = (n) => `$${Math.round(n / 1000)}K`;
const list = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);
const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// What each department's own scorecard says about the campaign.
export const said = (F) => ({
  mkt: `Launched on time. Demand peaked at +${pc(F.peakLift)}.`,
  sales: `My forecast was close: within ${pc(F.forecastErr)}.`,
  ops: `${F.leanest ? 'I held the least stock of any plan' : 'Stock stayed lean'}: ${int(F.avgStock)} cases on average.`,
  fin: `${F.cheapest ? 'Carrying cost was the lowest' : 'Carrying cost stayed low'}: ${k(F.holding)}.`,
});

// What each department's own scorecard says about the year-end push.
export const saidPush = (F) => ({
  mkt: `Spent the whole budget. ${pc(F.spendOnLeaders)} of it reached products ${PRODUCTS[0]} and ${PRODUCTS[1]}.`,
  sales: `I hit my number: ${pc(F.attain)} of plan.`,
  ops: `Every order shipped on time. I closed the year-end gap with ${int(F.y1.push)} cases.`,
  fin: `Revenue booked at ${pc(F.attain)} of plan.`,
});

// The two events, each with its chain of links, who sees which, and what the lens finds.
function scenario(name) {
  if (name === 'push') {
    const F = pushFacts();
    return { name, F, chain: PUSH_CHAIN, sees: PUSH_SEES, said: saidPush(F), dark: unseenLinks(PUSH_CHAIN, PUSH_SEES), lens: () => pushLens(F) };
  }
  const F = mirrorFacts();
  return { name: 'campaign', F, chain: CHAIN, sees: SEES, said: said(F), dark: unseenLinks(), lens: () => campaignLens(F) };
}

const campaignLens = (F) => [
  h('p', { class: 'verdict reveal' }, `${pc(F.served)} of the campaign’s demand was served. The shelf ran empty in week ${F.emptyWeek + 1}, ${k(F.missed)} of margin was lost, and ${int(F.glut)} cases sat unsold after. Each department was right. The company paid ${k(F.total)}.`),
  h('div', { class: 'stats reveal' }, stat('Cost, learning locally', k(F.total), 'what the campaign cost'), stat('Cost, learning from the whole chain', k(F.best), 'a plan that read every link', 'ai')),
];

// The year-end push, as a film in five acts: the handoff, the reservoir, two scoreboards, the empty chair, the loop.
const pushLens = (F) => {
  const film = pushFilm(F.P);
  whenVisible(film.node, () => film.start());
  return [
    h('p', { class: 'verdict reveal' }, `Everyone hit the number. Demand explains ${pc(F.createdShare)} of the growth. The other ${pc(F.pushShare)} was shipped into the distributor in the last week of the year.`),
    film.node,
  ];
};

export function mirrorPanel(state, save) {
  const SC = scenario(state.scenario), SAID = SC.said, dark = SC.dark, CHAIN_ = SC.chain, SEES_ = SC.sees;
  const root = h('div', { class: 'mirror' });
  root.dataset.mode = state.mirror;

  // The links of the event, left to right. A link is ringed in the colour of each department that sees it.
  const links = CHAIN_.map((c) => {
    const seers = DEPTS.filter((d) => SEES_[d.id].includes(c.id));
    const dot = h('i', { class: 'mdot' });
    if (seers.length) dot.style.background = seers.length === 1 ? seers[0].color : `conic-gradient(${seers.map((d, i) => `${d.color} ${(i * 100) / seers.length}% ${((i + 1) * 100) / seers.length}%`).join(', ')})`;
    return { c, el: h('div', { class: `mlink${seers.length ? '' : ' dark'}` }, h('span', null, c.label), dot), dot, seers };
  });
  const chain = h('div', { class: 'mchain' }, links.map((l) => l.el));
  chain.style.gridTemplateColumns = `repeat(${links.length}, minmax(0, 1fr))`;

  // Four departments, each with a small loop that closes on itself.
  const depts = DEPTS.map((d) => {
    const loop = s('svg', { viewBox: '0 0 48 48', class: 'mloop', 'aria-hidden': 'true' },
      s('circle', { cx: 24, cy: 24, r: 17, class: 'mloop-ring', style: { stroke: d.color } }), s('polygon', { points: '24,3 32,9.5 24,16', style: { fill: d.color } }));
    return { d, el: h('div', { class: 'mdept', style: { '--c': d.color } }, loop, h('b', null, d.name), h('p', { class: 'mquote' }, `“${SAID[d.id]}”`)) };
  });
  const row = h('div', { class: 'mdepts' }, depts.map((x) => x.el));

  // The drawing laid over both: beams from each department to the links it sees, the big loop, and the lens.
  const svg = s('svg', { class: 'moverlay', 'aria-hidden': 'true' });
  const spine = s('line', { class: 'mspine' }), beams = s('g', { class: 'mbeams' }), stubs = s('g', { class: 'mstubs' });
  const bigLoop = s('path', { class: 'mbig' }), lens = s('g', { class: 'mlens' }, s('circle', { r: 30, class: 'mlens-ring' }), s('circle', { r: 30, class: 'mlens-glow' }));
  svg.append(spine, beams, stubs, bigLoop, lens);
  root.append(chain, row, svg);

  let lensTo = [0, 0], lensFrom = [0, 0];
  function layout() {
    const o = root.getBoundingClientRect();
    if (!o.width) return;
    const rel = (el) => { const r = el.getBoundingClientRect(); return { cx: r.left - o.left + r.width / 2, cy: r.top - o.top + r.height / 2, y: r.top - o.top, b: r.bottom - o.top, l: r.left - o.left, r: r.right - o.left }; };
    svg.setAttribute('viewBox', `0 0 ${o.width.toFixed(0)} ${o.height.toFixed(0)}`);
    const D = links.map((l) => rel(l.dot)), C = depts.map((x) => rel(x.el));
    const yT = D[0].cy, yB = Math.max(...C.map((c) => c.b)) + 18, xL = 6, xR = o.width - 6, r = 20;
    spine.setAttribute('x1', D[0].cx); spine.setAttribute('x2', D[D.length - 1].cx); spine.setAttribute('y1', yT); spine.setAttribute('y2', yT);
    beams.replaceChildren(); stubs.replaceChildren();
    depts.forEach((x, j) => links.forEach((l, i) => {
      if (!SEES_[x.d.id].includes(l.c.id)) return;
      const y1 = C[j].y, y2 = D[i].b, mid = (y1 + y2) / 2;
      beams.append(s('path', { d: `M ${C[j].cx.toFixed(1)} ${y1.toFixed(1)} C ${C[j].cx.toFixed(1)} ${mid.toFixed(1)} ${D[i].cx.toFixed(1)} ${mid.toFixed(1)} ${D[i].cx.toFixed(1)} ${y2.toFixed(1)}`, class: 'mbeam', style: { stroke: x.d.color } }));
    }));
    // Each department feeds the big loop by the nearest edge that nothing else sits in front of.
    depts.forEach((x, j) => {
      const c = C[j], toL = c.l - xL, toR = xR - c.r, toB = yB - c.b, near = Math.min(toL, toR, toB), my = (c.y + c.b) / 2;
      const [x1, y1, x2, y2] = near === toB ? [c.cx, c.b, c.cx, yB] : near === toL ? [c.l, my, xL, my] : [c.r, my, xR, my];
      stubs.append(s('line', { x1, y1, x2, y2, style: { stroke: x.d.color }, class: 'mstub' }));
    });
    bigLoop.setAttribute('d', `M ${D[0].cx.toFixed(1)} ${yT.toFixed(1)} L ${(xR - r).toFixed(1)} ${yT.toFixed(1)} Q ${xR} ${yT.toFixed(1)} ${xR} ${(yT + r).toFixed(1)} L ${xR} ${(yB - r).toFixed(1)} Q ${xR} ${yB.toFixed(1)} ${(xR - r).toFixed(1)} ${yB.toFixed(1)} L ${xL + r} ${yB.toFixed(1)} Q ${xL} ${yB.toFixed(1)} ${xL} ${(yB - r).toFixed(1)} L ${xL} ${(yT + r).toFixed(1)} Q ${xL} ${yT.toFixed(1)} ${xL + r} ${yT.toFixed(1)} L ${D[0].cx.toFixed(1)} ${yT.toFixed(1)}`);
    lensFrom = [D[0].cx, D[0].cy]; lensTo = [D[D.length - 1].cx, D[D.length - 1].cy];
    lens.style.transform = `translate(${(root.dataset.mode === 'system' ? lensTo : lensFrom).map((v) => `${v.toFixed(1)}px`).join(', ')})`;
  }
  new ResizeObserver(layout).observe(root);

  // The caption, and the verdict once the lens has seen the whole chain.
  const out = h('div', { class: 'stack-s mirror-out' }), timers = [];
  const paintOut = () => {
    mount(out, state.mirror === 'system'
      ? SC.lens()
      : h('p', { class: 'callout' }, `Every scorecard looks fine. None of them shows ${list(dark.map((c) => c.plain || c.label.toLowerCase()))}.`));
  };

  function set(mode) {
    timers.splice(0).forEach(clearTimeout);
    state.mirror = mode; save(); root.dataset.mode = mode;
    links.forEach((l) => l.el.classList.remove('lit'));
    if (mode === 'system') {
      if (reduced()) links.forEach((l) => l.el.classList.add('lit'));
      else {
        lens.style.transition = 'none'; lens.style.transform = `translate(${lensFrom[0]}px, ${lensFrom[1]}px)`; void lens.getBoundingClientRect();
        lens.style.transition = ''; lens.style.transform = `translate(${lensTo[0]}px, ${lensTo[1]}px)`;
        links.forEach((l, i) => timers.push(setTimeout(() => l.el.classList.add('lit'), 200 + i * 240)));
      }
    } else { lens.style.transform = `translate(${lensFrom[0]}px, ${lensFrom[1]}px)`; }
    paintOut();
  }
  if (state.mirror === 'system') links.forEach((l) => l.el.classList.add('lit'));
  paintOut();
  return { node: root, out, set, stop: () => timers.splice(0).forEach(clearTimeout) };
}
