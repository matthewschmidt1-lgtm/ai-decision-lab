// Three small pictures for the quarter-end push, each one beat of the paradox.
//   1 effortBars   Marketing spends on some products, Sales sells others: the effort barely overlaps.
//   2 growthWaterfall   Where the quarter's growth came from. Demand made a sliver; Operations pushed the rest.
//   3 ratchetChart   Weekly shipments against depletions over four quarters: a hockey stick every quarter, and a gap that grows.
// Every bar starts at zero, and every figure is read from runPush() in org.js.

import { h, int } from '../ui.js';
import { lineChart } from '../charts.js';
import { PRODUCTS, MARKETING_MIX, SALES_MIX, PUSH, overlapOf } from '../org.js';

const pc = (v) => `${Math.round(v * 100)}%`;

// 1. Grouped bars: for each product, the share of marketing spend and the share of sales effort.
export function effortBars() {
  const top = Math.max(...MARKETING_MIX, ...SALES_MIX), w = (v) => `${(v / top) * 78}%`;
  const rows = PRODUCTS.map((p, i) => h('div', { class: 'eb-row' },
    h('b', { class: 'eb-p' }, p),
    h('div', { class: 'eb-bars' },
      h('div', { class: 'eb-line', title: `Marketing spend on ${p}: ${pc(MARKETING_MIX[i])}` }, h('i', { class: 'eb-mkt', style: { width: w(MARKETING_MIX[i]) } }), h('span', null, pc(MARKETING_MIX[i]))),
      h('div', { class: 'eb-line', title: `Sales effort on ${p}: ${pc(SALES_MIX[i])}` }, h('i', { class: 'eb-sales', style: { width: w(SALES_MIX[i]) } }), h('span', null, pc(SALES_MIX[i]))))));
  return h('div', { class: 'eb', role: 'img', 'aria-label': `Share of marketing spend and sales effort by product. ${PRODUCTS.map((p, i) => `${p}: marketing ${pc(MARKETING_MIX[i])}, sales ${pc(SALES_MIX[i])}`).join('. ')}. The two overlap on ${pc(overlapOf(MARKETING_MIX, SALES_MIX))}.` },
    h('div', { class: 'eb-key micro' }, h('span', null, h('i', { class: 'eb-mkt' }), 'Marketing spend'), h('span', null, h('i', { class: 'eb-sales' }), 'Sales effort')),
    rows);
}

// 2. The growth waterfall: zero-based, so the lengths are honest.
export function growthWaterfall(P) {
  const max = Math.max(P.plan, P.aligned) * 1.06, at = (v) => `${(v / max) * 100}%`;
  const rows = [
    { label: 'Growth the plan asks for', from: 0, to: P.plan, kind: 'plan' },
    { label: 'Created by marketing and sales', from: 0, to: P.created, kind: 'demand' },
    { label: 'Pushed into the distributor by Operations', from: P.created, to: P.plan, kind: 'push' },
    { label: 'Growth reported in shipments', from: 0, to: P.plan, kind: 'total' },
    { label: 'Possible if both worked the same products', from: 0, to: P.aligned, kind: 'ghost' },
  ];
  const sorted = rows.map((r) => {
    const value = r.to - r.from;
    return h('div', { class: `gw-row ${r.kind}`, title: `${r.label}: +${int(value)} cases` },
      h('span', { class: 'gw-label' }, r.label),
      h('div', { class: 'gw-track' }, h('i', { class: 'gw-bar', style: { left: at(r.from), width: at(value) } })),
      h('span', { class: 'gw-val num' }, `+${int(value)}`));
  });
  return h('div', { class: 'gw', style: { '--plan': at(P.plan) }, role: 'img', 'aria-label': `Growth in cases. ${rows.map((r) => `${r.label}: ${int(r.to - r.from)}`).join('. ')}.` },
    h('div', { class: 'gw-target', 'aria-hidden': 'true' }), sorted);
}

// 3. Weekly shipments against depletions across the quarters.
export function ratchetChart(P) {
  const n = P.ship.length, W = PUSH.weeks;
  return lineChart({
    n, height: 230, yMin: 0, yFmt: (v) => int(v), direct: true, hover: false,
    series: [
      { name: 'Shipments', short: 'Shipments', values: P.ship, color: 'var(--d-ops)', width: 2.5 },
      { name: 'Depletions', short: 'Depletions', values: P.depl, color: 'var(--s-actual)', width: 2.5 },
    ],
    ticks: P.quarters.map((q, i) => ({ i: i * W + W / 2, text: `Q${q.q}` })), xLabel: (i) => `Quarter ${Math.floor(i / W) + 1}, week ${(i % W) + 1}`,
    tipFmt: (v) => `${int(v)} cases`,
    desc: `Weekly shipments and depletions over ${P.quarters.length} quarters. Shipments spike in the last week of each quarter while depletions stay flat.`,
  });
}
