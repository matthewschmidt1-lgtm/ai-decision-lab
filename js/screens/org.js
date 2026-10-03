// Screens 1 and 2: the organism, and what its layers do to a signal.
//   1 Every department pulls toward its own goal. The company moves in the sum.
//   2 A signal moves through (the bullwhip), and "Beat the market" meets "minimize inventory": a campaign.

import { h, s, mount, int, stat, note, seg, whenVisible, reducedMotion } from '../ui.js';
import { DEPTS, PULL_DEFAULT, clampPull, sumPulls, BUFFERS, runCampaign, WEEKS_SIM, CAMPAIGN_START, PLAN_LIFT, BASE, SAFETY, MARGIN, HOLD, LEAD } from '../org.js';
import { orgFigure } from '../orgfig.js';
import { waveFigure } from '../wavefig.js';
import { runChain, MODES, LAYERS, STEP, WINDOW } from '../bullwhip.js';
import { actions, top } from './common.js';

const pc = (v, d = 0) => `${(v * 100).toFixed(d)}%`;
const k = (n) => `$${Math.round(n / 1000)}K`;

// The sentence that says who is pulling hardest against the star, from the pulls themselves.
export function againstText(pulls) {
  const worst = DEPTS.map((d) => ({ d, y: clampPull(pulls[d.id]) * Math.cos((d.angle * Math.PI) / 180) })).sort((a, b) => a.y - b.y)[0];
  return worst.y < -0.05 ? `${worst.d.name} pulls hardest against it: it is paid for ${worst.d.goal.toLowerCase()}, not the market.` : '';
}

// ---------------------------------------------------------------- 1. The organism
export function pullRows(state, save, onChange) {
  return h('div', { class: 'pulls' }, DEPTS.map((d) => {
    const input = h('input', { type: 'range', min: 0, max: 2, step: 0.1, value: clampPull(state.pulls[d.id]), 'aria-label': `How hard ${d.name} pulls toward ${d.goal.toLowerCase()}`, style: { '--c': d.color } });
    const paint = () => input.style.setProperty('--fill', `${(input.value / 2) * 100}%`);
    input.addEventListener('input', () => { state.pulls[d.id] = +input.value; paint(); save(); onChange(); });
    paint();
    return h('label', { class: 'pull' }, h('span', { class: 'pull-name' }, h('i', { style: { background: d.color } }), d.name), input);
  }));
}

export const organism = {
  id: 'organism', title: 'The organism',
  render(ctx) {
    const { state, save } = ctx;
    state.pulls = Object.fromEntries(DEPTS.map((d) => [d.id, clampPull(state.pulls && state.pulls[d.id])]));
    state.reveal = state.reveal === true;
    const fig = orgFigure();
    const out = h('div', { class: 'stack-s org-out' });
    const paint = () => {
      const sm = fig.set({ pulls: state.pulls, shared: 0, reveal: state.reveal });
      const against = againstText(state.pulls);
      mount(out, state.reveal
        ? [h('p', { class: 'verdict reveal' }, `${pc(sm.reach)} of the pulling moves the company toward the star. The rest cancels or drifts sideways.`), against ? h('p', { class: 'small reveal' }, against) : null]
        : h('p', { class: 'small' }, 'Everyone repeats the mantra. Each is paid for something narrower.'));
    };
    const rows = pullRows(state, save, paint);
    const ask = h('button', { class: 'btn small', type: 'button', onClick: () => { state.reveal = !state.reveal; save(); ask.textContent = state.reveal ? 'Hide the sum' : 'Ask the AI what it is really optimizing'; paint(); } },
      state.reveal ? 'Hide the sum' : 'Ask the AI what it is really optimizing');
    paint();
    return h('div', { class: 'screen stack-l' },
      h('div', { class: 'stack' }, ...top(1, null, 'Every department pulls toward its own goal.', 'The company moves in the sum of those pulls. Nobody owns the sum.')),
      h('div', { class: 'org-split' },
        h('div', { class: 'org-wrap' }, fig.node),
        h('div', { class: 'stack' },
          h('div', { class: 'stack-s' }, h('p', { class: 'micro' }, 'Drag to change how hard each department pulls. Directions are illustrative.'), rows),
          ask, out)),
      actions(ctx, { label: 'Watch a signal move through' }));
  },
};

// ---------------------------------------------------------------- 2. The campaign
const CW = 640, CH = 262, PL = 14, PR = 14, PT = 42, PB = 26, YMAX = 3400;
const xEdge = (x) => PL + (x * (CW - PL - PR)) / WEEKS_SIM;              // left edge of week x
const xc = (i) => xEdge(i + 0.5);
const yv = (v) => CH - PB - (Math.min(v, YMAX) / YMAX) * (CH - PB - PT);
const SHORT = { alone: 'Operations alone', calendar: 'Plan with the campaign', ai: 'AI reads past campaigns' };
const ALL = () => (ALL._ ||= Object.fromEntries(BUFFERS.map((b) => [b.id, runCampaign(b.id)])));

function chartSvg(r) {
  const svg = s('svg', { viewBox: `0 0 ${CW} ${CH}`, class: 'camp', role: 'img',
    'aria-label': `Weekly demand and stock over ${WEEKS_SIM} weeks with a campaign in weeks ${CAMPAIGN_START + 1} to ${CAMPAIGN_START + PLAN_LIFT.length}. ${r.emptyWeek >= 0 ? `Stock ran out in week ${r.emptyWeek + 1}.` : 'Stock never ran out.'}` });
  const pat = s('pattern', { id: 'hatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, s('rect', { width: 6, height: 6, fill: 'rgba(179,38,30,0.14)' }), s('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: 'var(--bad)', 'stroke-width': 2.4 }));
  const clipRect = s('rect', { x: 0, y: 0, width: 0, height: CH });
  svg.append(s('defs', null, pat, s('clipPath', { id: 'reveal' }, clipRect)));
  // The campaign flag, carrying the mantra.
  const c0 = xEdge(CAMPAIGN_START), c1 = xEdge(CAMPAIGN_START + PLAN_LIFT.length);
  svg.append(s('rect', { x: c0, y: 8, width: c1 - c0, height: 22, rx: 11, class: 'camp-flag' }), s('text', { x: (c0 + c1) / 2, y: 23, class: 'camp-flag-t', 'text-anchor': 'middle' }, 'Beat the market'),
    s('rect', { x: c0, y: 34, width: c1 - c0, height: CH - PB - 34, class: 'camp-band' }));
  // Baseline, week numbers.
  svg.append(s('line', { x1: PL, y1: CH - PB, x2: CW - PR, y2: CH - PB, class: 'camp-base' }));
  for (let i = 0; i < WEEKS_SIM; i += 2) svg.append(s('text', { x: xc(i), y: CH - 8, class: 'camp-x', 'text-anchor': 'middle' }, i + 1));
  const g = s('g', { 'clip-path': 'url(#reveal)' });
  const avail = r.avail.map((v, i) => `${xc(i).toFixed(1)},${yv(v).toFixed(1)}`);
  g.append(s('polygon', { points: `${xc(0)},${yv(0)} ${avail.join(' ')} ${xc(WEEKS_SIM - 1)},${yv(0)}`, class: 'camp-stock-fill' }),
    s('polyline', { points: avail.join(' '), class: 'camp-stock' }));
  const bw = (CW - PL - PR) / WEEKS_SIM * 0.9;
  r.lost.forEach((l, i) => { if (l > 1) g.append(s('rect', { x: xc(i) - bw / 2, y: yv(r.demand[i]), width: bw, height: Math.max(2, yv(r.avail[i]) - yv(r.demand[i])), class: 'camp-lost', fill: 'url(#hatch)' })); });
  g.append(s('polyline', { points: r.demand.map((v, i) => `${xc(i).toFixed(1)},${yv(v).toFixed(1)}`).join(' '), class: 'camp-demand' }));
  // Two callouts, only when they are true.
  if (r.emptyWeek >= 0) {
    const ex = xc(r.emptyWeek), ey = yv(r.demand[r.emptyWeek]);
    g.append(s('line', { x1: ex, y1: ey - 36, x2: ex, y2: ey - 4, class: 'camp-lead' }), s('text', { x: ex, y: ey - 42, class: 'camp-call bad', 'text-anchor': 'middle' }, 'Out of stock'));
  }
  const gi = r.stock.indexOf(r.glut);
  if (r.glut > 2.2 * BASE) g.append(s('text', { x: xc(gi), y: yv(r.avail[gi]) - 8, class: 'camp-call', 'text-anchor': 'middle' }, 'Then a glut'));
  svg.append(g);
  const head = s('line', { x1: 0, y1: PT - 6, x2: 0, y2: CH - PB, class: 'camp-head' });
  svg.append(head);
  return { svg, clipRect, head };
}

// The shelf: twelve bottles. As many as there is stock for this week's demand.
function shelf() {
  const bottles = Array.from({ length: 12 }, () => h('i', { class: 'bottle' }));
  const cap = h('span', { class: 'micro' }, 'The shelf');
  const pill = h('span', { class: 'oos', 'aria-live': 'polite' }, '');
  return { node: h('div', { class: 'shelf' }, h('div', { class: 'bottles' }, bottles), h('div', { class: 'shelf-cap' }, cap, pill)),
    set(ratio, week, out) { const n = Math.round(ratio * 12); bottles.forEach((b, i) => b.classList.toggle('gone', i >= n)); cap.textContent = `The shelf, week ${week + 1}`; pill.textContent = out ? 'Out of stock' : ''; pill.classList.toggle('on', !!out); } };
}

function ledger(current) {
  const runs = ALL(), max = Math.max(...BUFFERS.map((b) => runs[b.id].total));
  return h('div', { class: 'ledger', role: 'img', 'aria-label': BUFFERS.map((b) => `${SHORT[b.id]}: ${k(runs[b.id].missed)} of missed margin and ${k(runs[b.id].holding)} of holding cost`).join('. ') },
    BUFFERS.map((b) => { const r = runs[b.id];
      return h('div', { class: `led-row${b.id === current ? ' on' : ''}` },
        h('span', { class: 'led-name' }, SHORT[b.id]),
        h('span', { class: 'led-bar' }, h('i', { class: 'led-miss', style: { width: `${(r.missed / max) * 100}%` } }), h('i', { class: 'led-hold', style: { width: `${(r.holding / max) * 100}%` } })),
        h('span', { class: 'led-val num' }, k(r.total))); }),
    h('div', { class: 'led-key micro' }, h('span', null, h('i', { class: 'led-miss' }), 'Margin lost to empty shelves'), h('span', null, h('i', { class: 'led-hold' }), 'Cost of holding stock')));
}

const storyLine = (m) => {
  const runs = ALL(), r = runs[m];
  if (m === 'alone') {
    const leanest = BUFFERS.every((b) => runs.alone.avgStock <= runs[b.id].avgStock);
    return `${leanest ? 'Operations held the least stock of the three, so its own measure looked best. ' : ''}Marketing hit its launch date. The shelf ran empty in week ${r.emptyWeek + 1}, at the peak of the campaign, then orders chasing last week’s sales left ${int(r.glut)} cases of glut.`;
  }
  if (m === 'calendar') return `Stock was built ahead of the campaign, so nothing ran out. The plan was trusted at face value, so ${int(r.peakDuring - runs.ai.peakDuring)} more cases sat at the peak than the AI would have held.`;
  return 'The AI saw that past campaigns landed near 80% of plan, and built the buffer to match. A person still approves it, and owns the call.';
};

function campaignView(ctx) {
  {
    const { state, save } = ctx;
    if (!BUFFERS.some((b) => b.id === state.buffer)) state.buffer = 'alone';
    const stage = h('div', { class: 'stack camp-stage' });
    const optBox = h('div');
    let run = 0, raf = 0, cancel = () => {}, chartEl = null;
    const stop = () => { run++; cancelAnimationFrame(raf); cancel(); };

    const build = (autoplay = false) => {
      stop();
      const m = state.buffer, r = ALL()[m], ch = chartSvg(r), sh = shelf(), results = h('div', { class: 'stack camp-results' });
      chartEl = h('div', { class: 'camp-wrap' }, ch.svg);
      mount(stage, chartEl, sh.node,
        h('div', { class: 'camp-key micro' }, h('span', null, h('i', { class: 'k-demand' }), 'Demand'), h('span', null, h('i', { class: 'k-stock' }), 'Stock on hand'), h('span', null, h('i', { class: 'k-lost' }), 'Demand we could not serve')),
        results);
      const frame = (x) => {
        ch.clipRect.setAttribute('width', xEdge(x).toFixed(1));
        ch.head.setAttribute('x1', xEdge(x).toFixed(1)); ch.head.setAttribute('x2', xEdge(x).toFixed(1));
        const w = Math.min(WEEKS_SIM - 1, Math.floor(x));
        sh.set(Math.min(1, r.avail[w] / r.demand[w]), w, r.lost[w] > 1);
      };
      const done = () => {
        frame(WEEKS_SIM); ch.head.style.opacity = '0';
        mount(results,
          h('p', { class: 'verdict reveal' }, storyLine(m)),
          h('div', { class: 'stats reveal' }, stat('Campaign demand served', pc(r.served), r.lostTotal > 1 ? `${int(r.lostTotal)} cases we could not sell` : 'every case demanded was available', r.served < 0.95 ? 'bad' : 'ai'), stat('Total cost', k(r.total), `${k(r.missed)} lost margin plus ${k(r.holding)} to hold stock`)),
          h('div', { class: 'reveal' }, ledger(m)),
          h('p', { class: 'micro' }, `Illustrative: ${int(BASE)} cases a week, a six-week campaign planned to lift demand by up to ${int(PLAN_LIFT[2] * 100)}%, ${LEAD} weeks for stock to arrive, $${MARGIN} margin a case, $${HOLD.toFixed(2)} a case a week to hold. Past campaigns landing near 80% of plan is an assumption.`));
      };
      const go = () => {
        const my = ++run, t0 = performance.now(), dur = 5600;
        if (reducedMotion()) { done(); return; }
        const step = (now) => { if (my !== run || !ch.svg.isConnected) return; const p = Math.min(1, (now - t0) / dur); frame(p * WEEKS_SIM); if (p < 1) raf = requestAnimationFrame(step); else done(); };
        frame(0); raf = requestAnimationFrame(step);
      };
      frame(0);
      build.replay = go;
      if (autoplay) go(); else cancel = whenVisible(chartEl, go);
    };
    const paintOpts = () => mount(optBox, seg(BUFFERS.map((b) => [b.id, SHORT[b.id]]), state.buffer, (id) => { state.buffer = id; save(); paintOpts(); build(true); }));
    paintOpts(); build();
    return h('div', { class: 'stack-l' },
      h('div', { class: 'learn-controls' }, optBox, h('button', { class: 'btn small', type: 'button', onClick: () => build.replay() }, 'Replay')),
      stage);
  }
}

// ---------------------------------------------------------------- The wave: the bullwhip
const CHAINS = () => (CHAINS._ ||= { orders: runChain('orders'), shared: runChain('shared') });
const peakOf = (d, id) => d.peaks.find((p) => p.id === id);
const round = (v) => Math.round(v);

function waveView(ctx) {
  const { state, save } = ctx;
  const fig = waveFigure(), out = h('div', { class: 'stack camp-results' }), optBox = h('div');
  let cancel = () => {};
  const results = (mode) => {
    const d = CHAINS()[mode], plant = peakOf(d, 'plant'), cons = peakOf(d, 'consumer'), base = peakOf(CHAINS().orders, 'plant');
    const swing = plant.down > 1 ? `up ${round(plant.up)}% and down ${round(plant.down)}%` : `up ${round(plant.up)}%`;
    mount(out,
      h('p', { class: 'verdict reveal' }, mode === 'orders'
        ? `Consumer demand barely moved: ${round(cons.abs)}%. The plant’s orders swung ${swing}. Every layer responded rationally. The system responded irrationally.`
        : `With real demand shared, the plant’s swing falls from ${round(base.abs)}% to ${round(plant.abs)}%. The rest is stock that a higher level of demand needs once.`),
      h('div', { class: 'stats reveal' }, stat('Consumer demand', `+${round(cons.abs)}%`, 'what actually changed'), stat('Plant orders', `${round(plant.abs)}%`, 'the biggest swing, either way', mode === 'orders' ? 'bad' : 'ai'), stat('Amplified', `${(plant.abs / cons.abs).toFixed(0)}x`, 'plant swing over demand change')),
      note('Why it matters', `Each layer optimized its own stock. Nobody owned the sum. An AI that reads every layer’s orders at once can show the swing as it starts, and sharing real demand cuts the plant’s swing to ${round(peakOf(CHAINS().shared, 'plant').abs)}%.`),
      h('p', { class: 'micro' }, `Illustrative: each layer orders up to a ${WINDOW}-week average of what it is asked for plus ${LAYERS.map((l) => l.cover).join(', ')} weeks of cover, with stock taking ${LAYERS.map((l) => l.lead).join(', ')} weeks to arrive. Demand rises ${round(STEP * 100)}% and stays there. The gold band is that change at the same scale. This is the documented bullwhip effect.`));
  };
  const go = () => { mount(out); fig.play(CHAINS()[state.seen], () => results(state.seen)); };
  const paintOpts = () => mount(optBox, seg(MODES.map((m) => [m.id, m.label]), state.seen, (id) => { state.seen = id; save(); paintOpts(); cancel(); go(); }));
  paintOpts();
  fig.rest(CHAINS()[state.seen]);
  cancel = whenVisible(fig.node, go);
  return h('div', { class: 'stack-l' },
    h('div', { class: 'learn-controls' }, optBox, h('button', { class: 'btn small', type: 'button', onClick: () => { cancel(); go(); } }, 'Replay')),
    h('div', { class: 'wave-wrap' }, fig.node), out);
}

export const wave = {
  id: 'wave', title: 'The wave',
  render(ctx) {
    const { state, save } = ctx;
    if (state.view !== 'campaign') state.view = 'wave';
    if (!MODES.some((m) => m.id === state.seen)) state.seen = 'orders';
    const head = h('div', { class: 'stack' }), tabs = h('div'), body = h('div');
    const paint = () => {
      mount(tabs, seg([['wave', 'The wave'], ['campaign', 'The campaign']], state.view, (id) => { state.view = id; save(); paint(); }));
      mount(head, ...(state.view === 'wave'
        ? top(2, 'biz', 'A signal moves through.', 'Consumer demand rises 3%. Watch four sensible decisions turn it into something else.')
        : top(2, 'biz', 'Beat the market. Then run out of stock.', 'Marketing launches a big campaign. Operations is measured on lean stock. Who sets the buffer?')));
      mount(body, state.view === 'wave' ? waveView(ctx) : campaignView(ctx));
    };
    paint();
    return h('div', { class: 'screen stack-l' }, head, tabs, body, actions(ctx, { label: 'Where does attention go?' }));
  },
};
