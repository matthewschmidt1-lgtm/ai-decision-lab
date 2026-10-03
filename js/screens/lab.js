// The lab, in seven screens. One idea and one thing to do on each.
//   1 The organism: every department pulls toward its own goal   2 The wave (the bullwhip) and the campaign: what the sum costs
//   3 Where attention goes (time and focus)   4 How it learns   5 The honest test
//   6 Safe and aligned   7 Steer: what to optimize, and the pilot
// Everything is computed live. The models on screen 4 are trained in the browser.

import { h, s, bars, stat, note, mount, int, money, slider, seg, choices, whenVisible } from '../ui.js';
import { lineChart } from '../charts.js';
import { WEEKS, weekLabel, COMPETITOR_WEEK, CHAIN_CUT_WEEK, decompose } from '../data.js';
import { ALL_GROUPS, DEFAULT_CAUTION, TEST_WEEKS, trainModel, evaluate, bootstrapReduction, dataset, gradientDescent, solveExact,
         maxStableRate, simpleForecast } from '../forecast.js';
import { SCOPES, pairGain, simulatePilot } from '../value.js';
import { toyData, trainNet, predict, mse } from '../nn.js';
import { testBeliefs } from '../beliefs.js';
import { WEEK, DESTINATIONS, DEST, TEAM, WORK_WEEKS, RATE, ROUTINE_HOURS, grossHours, netHours, routineShare, weekAfter, annualRange, REVIEW, reviewHours } from '../time.js';
import { sumPulls, runCampaign } from '../org.js';
import { orgFigure } from '../orgfig.js';
import { organism, wave } from './org.js';
import { actions, ticksFor, rangeText, STEP_NAMES, top } from './common.js';

export { STEP_NAMES };

const pc = (v, d = 0) => `${(v * 100).toFixed(d)}%`;
const hrs = (v) => `${v.toFixed(1).replace('.0', '')} h`;

let _model = null, _eval = null;
const EVAL = () => (_eval ||= evaluate(MODEL()));
const MODEL = () => (_model ||= trainModel(ALL_GROUPS, { l2: DEFAULT_CAUTION }));

// On a repaint (picking an answer) the page should not re-run its entrance animation.
let _hist = null;
const HISTORY = () => (_hist ||= testBeliefs().history);

const settle = (root) => { if (root._seen) root.classList.add('static'); root._seen = true; };

// ---------------------------------------------------------------- 3. Where attention goes
export const WHO = [['human', 'Human'], ['computer', 'Computer'], ['together', 'Together']];
const WHO_LABEL = Object.fromEntries(WHO);
// The right workflow is not set by capability alone. It is capability, uncertainty and consequence.
// One job for each block of the week, and what happens if a person, a computer, or both get it wrong.
export const JOBS = [
  { id: 'gather', short: 'Gather data', best: 'computer', cap: 'High', unc: 'Low', con: 'Medium',
    design: 'The computer, with automatic checks and flagged exceptions.',
    fail: { computer: 'A silent mismatch slips through unless it checks itself.', human: 'Slow, and a tired eye misses rows.', together: 'The computer matches. A person reviews only the rows it flags.' } },
  { id: 'forecast', short: 'Build the forecast', best: 'together', cap: 'High', unc: 'Medium', con: 'Medium',
    design: 'The computer drafts, a person checks.',
    fail: { computer: 'An AI error becomes an inventory problem.', human: 'A human error is a missed signal.', together: 'The combined workflow can catch both.' } },
  { id: 'decks', short: 'Decks and meetings', best: 'computer', cap: 'High', unc: 'Low', con: 'Low',
    design: 'The computer drafts it. A person reads before it goes out.',
    fail: { computer: 'A confident summary can carry a wrong number.', human: 'Hours go on formatting what a computer could draft.', together: 'The computer drafts, a person reads and sends.' } },
  { id: 'review', short: 'Review and approvals', best: 'together', cap: 'Medium', unc: 'Medium', con: 'High',
    design: 'The computer clears the routine. A person reviews the exceptions.',
    fail: { computer: 'Approvals nobody reads become a rubber stamp.', human: 'Every item waits on the same few people.', together: 'Routine clears itself. People spend time where it matters.' } },
  { id: 'judgment', short: 'Judgment and customers', best: 'human', cap: 'Low', unc: 'High', con: 'High',
    design: 'A person leads. The computer can flag unusual weeks.',
    fail: { computer: 'It sees the history, not a rival launch or a chain resetting its range.', human: 'A person notices the new event, overrides the model and reframes it.', together: 'Even better if the computer flags unusual weeks and a person decides what they mean.' } },
];
const LEVEL = { Low: '25%', Medium: '60%', High: '100%' };

const TILE = {
  gather: '#1F7A8C', forecast: '#6BAAB7', decks: '#CFCCBF', review: '#8B8F96', judgment: '#B4540F',
  checking: '#E3B25C', markets: '#2F7357', experiments: '#2457D6',
};
const OUTCOME = {
  none: 'No value: the hours refill',
  cost: 'Cost avoided, if it avoids a hire',
  capacity: 'Capacity for judgment, a saving only if headcount changes',
  learning: 'Learning, value not yet measured',
};

// A week is 40 tiles, one per hour, filled down each day. A tile that straddles two jobs is split.
function tileStyles(rows) {
  return Array.from({ length: 40 }, (_, t) => {
    const segs = []; let start = 0;
    for (const r of rows) { const a = Math.max(t, start), b = Math.min(t + 1, start + r.hours); if (b - a > 1e-6) segs.push({ id: r.id, f: b - a }); start += r.hours; }
    const main = segs.reduce((m, x) => (x.f > m.f ? x : m), segs[0]);
    if (segs.length === 1) return { bg: TILE[main.id], id: main.id };
    let acc = 0;
    const stops = segs.flatMap((x) => { const from = acc * 100; acc += x.f; return [`${TILE[x.id]} ${from.toFixed(1)}%`, `${TILE[x.id]} ${(acc * 100).toFixed(1)}%`]; });
    return { bg: `linear-gradient(180deg, ${stops.join(', ')})`, id: main.id };
  });
}

function calendar(title, rows) {
  const tiles = Array.from({ length: 40 }, () => h('i', { class: 'tile' }));
  const grid = h('div', { class: 'cal-grid', role: 'img' }, tiles);
  let prev = null, dimId = null, last = rows;
  const paint = () => {
    const st = tileStyles(last);
    tiles.forEach((el, i) => {
      el.style.background = st[i].bg;
      if (prev && prev[i] !== st[i].bg) { el.classList.remove('swap'); void el.offsetWidth; el.style.setProperty('--d', `${(i % 8) * 18}ms`); el.classList.add('swap'); }
      el.classList.toggle('dim', !!dimId && st[i].id !== dimId);
    });
    prev = st.map((x) => x.bg);
    grid.setAttribute('aria-label', `${title}: ${last.map((r) => `${r.label || r.id} ${r.hours.toFixed(1)} hours`).join(', ')}`);
  };
  paint();
  return {
    node: h('div', { class: 'cal' }, h('div', { class: 'cal-head' }, h('span', { class: 'cal-title' }, title)),
      h('div', { class: 'cal-days', 'aria-hidden': 'true' }, ['M', 'T', 'W', 'T', 'F'].map((d) => h('span', null, d))), grid),
    update(rows) { last = rows; paint(); },
    dim(id) { dimId = id; paint(); },
  };
}

const time = {
  id: 'time', title: 'Where attention goes',
  render(ctx) {
    const { state, save } = ctx;
    const share = () => (typeof state.autoShare === 'number' ? Math.min(1, Math.max(0, state.autoShare)) : 0.6);
    const dest = () => (DEST[state.destination] ? state.destination : 'judgment');
    if (!JOBS.some((j) => j.id === state.job)) state.job = null;
    const today = calendar('Today', WEEK.map((w) => ({ id: w.id, label: w.label, hours: w.hours })));
    const after = calendar('With AI', weekAfter(share(), dest()));
    const hero = h('p', { class: 'verdict' }), stats = h('div', { class: 'stats' }), fine = h('p', { class: 'small' }), keyBox = h('div', { class: 'jobs' }), card = h('div', { class: 'jobbox' });

    const paintKey = () => {
      const d = dest();
      mount(keyBox,
        JOBS.map((j) => h('button', { class: 'job', type: 'button', 'aria-pressed': String(state.job === j.id), onClick: () => { state.job = state.job === j.id ? null : j.id; save(); paintKey(); } }, h('i', { style: { background: TILE[j.id] } }), j.short)),
        h('span', { class: 'job static' }, h('i', { style: { background: TILE.checking } }), 'New checking work'),
        d === 'markets' || d === 'experiments' ? h('span', { class: 'job static' }, h('i', { style: { background: TILE[d] } }), d === 'markets' ? 'More markets' : 'New ideas') : null);
      today.dim(state.job); after.dim(state.job);
      const j = JOBS.find((x) => x.id === state.job);
      mount(card, j
        ? h('div', { class: 'jobcard reveal' },
          h('div', { class: 'row' }, h('h3', { class: 'h3' }, WEEK.find((w) => w.id === j.id).label), h('span', { class: `chip who-${j.best}` }, `Usual design: ${WHO_LABEL[j.best]}`)),
          h('p', { class: 'small' }, j.design),
          h('div', { class: 'pips' }, [['Computer can', j.cap], ['Uncertainty', j.unc], ['Cost of a mistake', j.con]].map(([l, v]) => h('span', { class: 'pip' }, h('i', { style: { '--w': LEVEL[v] } }), `${l}: ${v}`))),
          h('h4', { class: 'small' }, 'If it goes wrong'),
          h('ul', { class: 'fail' }, WHO.map(([k, label]) => h('li', { class: k === j.best ? 'mine' : '' }, h('b', null, `${label}: `), j.fail[k]))))
        : h('p', { class: 'micro' }, 'Tap a block to see who should do it, and what happens if it goes wrong.'));
    };
    const paintOut = () => {
      const s0 = share(), d = dest();
      const net = netHours(s0), gross = grossHours(s0), rg = annualRange(s0, d), a = rg.mid;
      after.update(weekAfter(s0, d));
      hero.textContent = `You just gave each planner ${hrs(net)} back, every week. What will the business do with them?`;
      mount(stats,
        stat('Net hours back', `${hrs(net)} a week`, `range ${hrs(rg.low.perWeek)} to ${hrs(rg.high.perWeek)}`, 'ai'),
        stat('Capacity created', `${Math.round(a.hours).toLocaleString('en-US')} h`, `a year: ${TEAM} planners, ${WORK_WEEKS} weeks`),
        stat(a.value ? 'At cost, up to' : 'Value', a.value ? money(a.value) : '$0', OUTCOME[a.kind].toLowerCase()));
      fine.textContent = `Releases ${hrs(gross)} (${pc(routineShare(s0))} of the ${ROUTINE_HOURS} routine hours), less ${hrs(gross - net)} of new checking work. Assumes ${WORK_WEEKS} weeks, ${TEAM} planners, $${RATE} an hour; the week is illustrative. Capacity is not savings. Would you still fund it at the low end (${hrs(rg.low.perWeek)} a week)?`;
      paintKey();
    };
    const sl = slider({ label: 'How far to push automation', min: 0, max: 1, step: 0.1, value: share(), fmt: (v) => pc(v), onInput: (v) => { state.autoShare = v; save(); paintOut(); } });
    const dst = h('div', { class: 'stack-s' }, h('h3', { class: 'h3' }, 'Where do the freed hours go?'),
      choices({ name: 'Destination', items: DESTINATIONS.map((d) => ({ id: d.id, title: d.label, sub: d.sub })), value: dest(), onPick: (id) => { state.destination = id; save(); paintOut(); } }));
    paintOut();
    return h('div', { class: 'screen stack-l' },
      h('div', { class: 'stack' }, ...top(3, 'biz', 'Where does attention go?',
        'Time and focus are what a business runs short of. Gathering and reconciling feel like the job.')),
      sl, hero,
      h('div', { class: 'stack-s' }, h('div', { class: 'cals' }, today.node, after.node), keyBox, card),
      dst, stats, fine,
      actions(ctx, { label: 'How does the computer part learn?' }));
  },
};

// ---------------------------------------------------------------- 4. How it learns: one neuron, then more
const STEPS = 400;
// Early steps are shown one by one (that is where the learning is), later ones in longer jumps.
const framesFor = (steps) => { const out = []; let v = 0; while (v < steps) { out.push(Math.round(v)); v = v < 12 ? v + 1 : v * 1.12; } out.push(steps); return [...new Set(out)]; };
const FRAMES = framesFor(STEPS);


// Stage 1: your forecasting model is one neuron, trained on the real data.
function neuronPanel(onMore) {
  const d = dataset(ALL_GROUPS);
  const names = d.meta.names;
  const exact = solveExact(d.Z, d.yc, DEFAULT_CAUTION);
  const floor = (() => { let sum = 0; d.Z.forEach((z, i) => { let p = exact.b; z.forEach((v, j) => { p += exact.w[j] * v; }); sum += (p - d.yc[i]) ** 2; }); return sum / d.Z.length; })();
  const thr = maxStableRate(d.Z, DEFAULT_CAUTION);
  const wMax = Math.max(0.03, ...exact.w.map(Math.abs)) * 1.5;
  const SPEEDS = [['slow', 'Too slow', 0.002], ['right', 'About right', 0.02], ['fast', 'Too fast', +(thr * 1.2).toFixed(2)]];
  let speed = 'right';
  const dw = d.weeks.slice(-52);
  const actual = dw.map((t) => WEEKS[t].dep), simple = dw.map((t) => simpleForecast(t));
  const base = d.weeks[0];
  // Training starts from a random guess, as it does in practice. Seeded, so everyone sees the same start.
  const w0 = names.map((_, j) => { const x = Math.sin((j + 1) * 12.9898) * 43758.5453; return ((x - Math.floor(x)) - 0.5) * 0.36; });
  const predAt = (snap) => dw.map((t, i) => { let z = d.ybar + snap.b; const row = d.Z[t - base]; for (let j = 0; j < row.length; j++) z += snap.w[j] * row[j]; return Math.min(9000, simple[i] * Math.exp(z)); });   // a blown-up model is drawn at the ceiling, not off the chart
  const S0 = { name: 'Depletions (actual)', short: 'Actual', values: actual, color: 'var(--s-actual)', width: 2.5 };
  const modelLine = (values) => ({ name: 'The model, at this step', short: 'Model', values, color: 'var(--s-ai)', width: 2.5 });
  const hero = lineChart({
    n: dw.length, height: 250, yFmt: (v) => int(v), direct: true, hover: false,
    series: [S0, modelLine(simple)],
    ticks: ticksFor(dw[0], dw[dw.length - 1], 13), xLabel: (i) => weekLabel(dw[i]),
    desc: 'The model’s forecast for its learning weeks, starting wild and settling toward actual depletions as it learns.',
  });
  const barsHost = h('div'), readout = h('div', { class: 'stats' }), msg = h('div'), speedBox = h('div'), roundBox = h('div', { class: 'loop-path flow' });
  let timer = null, run = 0, cancel = () => {};
  const stop = () => { clearInterval(timer); run++; cancel(); };

  const draw = (k, snaps, diverged) => {
    const sn = snaps[Math.min(k, snaps.length - 1)];
    hero.update({ series: [S0, modelLine(predAt(sn))] });
    mount(barsHost, bars({ items: names.map((n, j) => ({ label: n, value: sn.w[j], color: sn.w[j] >= 0 ? 'var(--accent)' : 'var(--ink-2)' })), max: wMax, animate: false, fmt: (v) => v.toFixed(3) }));
    const miss = Math.sqrt(sn.loss) * 100;
    const last = dw.length - 1, pred = predAt(sn)[last], miss1 = pred - actual[last];
    mount(roundBox, [`Model says ${int(pred)}`, `Actual ${int(actual[last])}`, `Miss ${miss1 >= 0 ? '+' : '−'}${int(Math.abs(miss1))}`, diverged ? 'Nudges overshoot' : k >= STEPS ? 'Weights settled' : 'Adjust the weights, try again'].flatMap((t, i, arr) => [h('span', null, t), i < arr.length - 1 ? h('i', { 'aria-hidden': 'true' }, '→') : null]));
    mount(readout,
      stat('Step', String(k), `of ${STEPS}`),
      stat('Typical error', Number.isFinite(miss) && miss < 1000 ? `${miss.toFixed(1)}%` : 'Blown up', `on these weeks. Best this model can do: ${(Math.sqrt(floor) * 100).toFixed(1)}%`, diverged ? 'bad' : 'ai'));
  };
  const start = () => {
    clearInterval(timer);
    const myRun = ++run;
    const lr = SPEEDS.find(([k]) => k === speed)[2];
    const snaps = [];
    gradientDescent(d.Z, d.yc, { lr, steps: STEPS, w0, l2: DEFAULT_CAUTION, onStep: (st, loss, w, b) => snaps.push({ loss, w: w.slice(), b }) });
    let f = 0, diverged = false;
    mount(msg);
    draw(0, snaps, false);                       // the random start, before any learning
    timer = setInterval(() => {
      if (!hero.isConnected || myRun !== run) { clearInterval(timer); return; }
      f += 1;
      let k = FRAMES[Math.min(f, FRAMES.length - 1)];
      const bad = snaps.findIndex((x) => !(x.loss < 1e2));
      diverged = bad >= 0 && bad <= k;
      if (diverged) k = bad;
      draw(k, snaps, diverged);
      if (diverged) {
        clearInterval(timer);
        mount(msg, note('Too fast', 'Each step overshoots by more than the last, so the error grows. A learning speed that is too high does not learn faster. It stops learning.'));
      } else if (k >= STEPS) {
        clearInterval(timer);
        const end = snaps[STEPS].loss;
        const slow = end > floor * 1.15;
        mount(msg, note(slow ? 'Too slow' : 'It learned', slow
          ? `Still ${(Math.sqrt(end) * 100).toFixed(1)}% when the steps ran out, against a best of ${(Math.sqrt(floor) * 100).toFixed(1)}%. It would get there, but it needs far more steps.`
          : 'From a random start to the best this model can do, by repeating one move: measure the miss, nudge every weight to shrink it. A company learns the same way only when the miss reaches whoever made the call.'),
          slow ? null : h('p', null, h('button', { class: 'btn small', type: 'button', onClick: onMore }, 'Try more neurons', h('span', { 'aria-hidden': 'true' }, '→'))));
      }
    }, 85);
  };
  const paintSpeed = () => mount(speedBox, seg(SPEEDS.map(([k, label]) => [k, label]), speed, (id) => { speed = id; paintSpeed(); start(); }));
  paintSpeed();
  draw(0, (() => { const sn = []; gradientDescent(d.Z, d.yc, { lr: 0.02, steps: 1, w0, l2: DEFAULT_CAUTION, onStep: (st, loss, w, b) => sn.push({ loss, w: w.slice(), b }) }); return sn; })(), false);
  // Start when the chart is on screen, so nobody misses the random start.
  cancel = whenVisible(hero, start);

  const node = h('div', { class: 'stack-l' },
    hero,
    h('div', { class: 'stack-s' }, h('div', { class: 'micro' }, 'One example week, one round of learning'), roundBox),
    h('div', { class: 'learn-controls' }, speedBox, h('button', { class: 'btn small', type: 'button', onClick: start }, 'Replay')),
    readout, msg,
    h('div', { class: 'stack-s' }, h('div', { class: 'micro' }, 'The weights: how hard each input pushes the forecast'), barsHost,
      h('p', { class: 'micro' }, 'The forecast scored on the next page uses the same recipe, and solves for the best weights directly.')));
  return { node, stop };
}

// Stage 2: more neurons let a model bend. A toy pattern, not Ridgeline data, so the bend is real
// and the lesson (more is not always better) can be measured on points the net never sees.
const NET_STEPS = 2500;
const NET_FRAMES = framesFor(NET_STEPS);
const NET_OPTS = [[0, 'One neuron'], [3, '3 neurons'], [12, '12 neurons']];
const GRID = 61;

function netDiagram(k, p) {
  const svg = s('svg', { viewBox: '0 0 220 120', role: 'img', 'aria-label': k ? `A network: one input, ${k} hidden neurons, one output. Line thickness is weight size.` : 'One neuron: one input and one output. Line thickness is weight size.' });
  const ys = Array.from({ length: k }, (_, j) => (k === 1 ? 60 : 12 + (96 * j) / (k - 1)));
  // Line thickness follows the weight, so training visibly changes the network.
  const wd = (v) => Math.min(4.5, 0.4 + Math.abs(v || 0) * 1.6);
  if (!k) svg.append(s('line', { x1: 36, y1: 60, x2: 184, y2: 60, class: 'dg-line', 'stroke-width': wd(p && p.v[0]) }));
  ys.forEach((y, j) => {
    svg.append(s('line', { x1: 30, y1: 60, x2: 110, y2: y, class: 'dg-line thin', 'stroke-width': wd(p && p.w[j] * 0.6) }));
    svg.append(s('line', { x1: 110, y1: y, x2: 190, y2: 60, class: 'dg-line thin', 'stroke-width': wd(p && p.v[j]) }));
  });
  svg.append(s('circle', { cx: 24, cy: 60, r: 7, class: 'dg-node' }));
  ys.forEach((y) => svg.append(s('circle', { cx: 110, cy: y, r: k > 6 ? 4.5 : 6, class: 'dg-node' })));
  svg.append(s('circle', { cx: 196, cy: 60, r: 8, class: 'dg-node on' }));
  return svg;
}

function netPanel() {
  const data = toyData(14, 60, 0.1, 5);
  const rmse = (p, pts) => Math.sqrt(mse(p, pts)) * 100;
  const finals = Object.fromEntries(NET_OPTS.map(([k]) => {
    const r = trainNet(data.train, { hidden: k, steps: NET_STEPS, lr: 0.03, seed: 3, at: [NET_STEPS] });
    return [k, { train: rmse(r.params, data.train), test: rmse(r.params, data.test) }];
  }));
  const xs = Array.from({ length: GRID }, (_, i) => i / (GRID - 1));
  const curve = (p) => ({ name: 'The network’s curve', short: 'Model', values: xs.map((x) => predict(p, x)), color: 'var(--s-ai)', width: 2.5 });
  const dots = [
    ...data.test.map((d) => ({ i: d.x * (GRID - 1), v: d.y, color: 'var(--ink-2)', hollow: true, r: 3.2 })),
    ...data.train.map((d) => ({ i: d.x * (GRID - 1), v: d.y, color: 'var(--ink)', r: 4.5 })),
  ];
  const chart = lineChart({
    n: GRID, height: 250, yMin: 0, yMax: 1, hover: false, yFmt: (v) => String(Math.round(v * 100)),
    series: [curve(trainNet(data.train, { hidden: 0, steps: 0, at: [0] }).params)],
    dots, ticks: [0, 15, 30, 45, 60].map((i) => ({ i, text: `${Math.round((i / 60) * 30)}%` })), xLabel: (i) => `${Math.round((i / (GRID - 1)) * 30)}% discount`,
    desc: 'A made-up pattern with noise: extra volume as the discount deepens. Filled dots are the examples a model learns from, hollow dots are points it never sees. The curve is the model’s fit as it trains.',
  });
  let k = 3, timer = null, run = 0, cancel = () => {}, startErr = null;
  const stop = () => { clearInterval(timer); run++; cancel(); };
  const readout = h('div', { class: 'stats' }), diagram = h('div', { class: 'net-diagram' }), msg = h('div'), optBox = h('div'), cmp = h('div');
  const show = (p) => {
    chart.update({ series: [curve(p)] });
    mount(readout,
      stat('Error on what it learned from', rmse(p, data.train).toFixed(1), 'training data, typical miss in points', 'ai'),
      stat('Error on what it never saw', rmse(p, data.test).toFixed(1), 'test data, typical miss in points'));
    mount(diagram, netDiagram(k, p), h('p', { class: 'micro' }, 'Line thickness is weight size. Training changes the weights.'));
  };
  const paintCmp = () => mount(cmp, h('table', { class: 'tbl cmp' },
    h('thead', null, h('tr', null, h('th', null, 'Model'), h('th', { class: 'num r' }, 'Training error'), h('th', { class: 'num r' }, 'Test error'))),
    h('tbody', null, NET_OPTS.map(([v, label]) => h('tr', { class: v === k ? 'sel' : '' }, h('td', null, label), h('td', { class: 'num r' }, finals[v].train.toFixed(1)), h('td', { class: 'num r' }, finals[v].test.toFixed(1)))))));
  const say = () => {
    const f = finals[k];
    const calm = f.test < f.train ? ' A model does not always score worse on points it has not seen: held-out points can happen to be easier. What matters is how the two errors move as the model gets more flexible.' : '';
    const text = k === 0
      ? `A single neuron can only draw a straight line, so it misses the bend: ${f.test.toFixed(1)} on points it never saw.${calm}`
      : k === 3
        ? `Three neurons can bend to follow the pattern: ${f.test.toFixed(1)} on points it never saw, against ${finals[0].test.toFixed(1)} for a line.${calm}`
        : finals[12].test > finals[3].test
          ? `Twelve neurons fit the examples it learned from better (${f.train.toFixed(1)}) but do worse on new ones (${f.test.toFixed(1)}, against ${finals[3].test.toFixed(1)} for three). It has learned quirks in those examples that do not repeat.`
          : `Twelve neurons do about as well as three on points it never saw (${f.test.toFixed(1)}). The extra flexibility was not needed.`;
    const trend = startErr === null ? '' : ` Training error fell ${startErr > 40 ? 'from a wild random start' : `from ${startErr.toFixed(1)}`} to ${f.train.toFixed(1)}.`;
    mount(msg, note(k === 12 && finals[12].test > finals[3].test ? 'Too flexible' : 'What happened', text + trend));
  };
  const play = () => {
    clearInterval(timer);
    const myRun = ++run;
    mount(msg); paintCmp();
    const { snaps } = trainNet(data.train, { hidden: k, steps: NET_STEPS, lr: 0.03, seed: 3, at: NET_FRAMES });
    let f = 0;
    startErr = rmse(snaps.get(0), data.train);
    show(snaps.get(0));
    timer = setInterval(() => {
      if (!chart.isConnected || myRun !== run) { clearInterval(timer); return; }
      f += 1;
      const step = NET_FRAMES[Math.min(f, NET_FRAMES.length - 1)];
      show(snaps.get(step));
      if (step >= NET_STEPS) { clearInterval(timer); say(); }
    }, 70);
  };
  const paintOpts = () => mount(optBox, seg(NET_OPTS.map(([v, label]) => [String(v), label]), String(k), (id) => { k = +id; paintOpts(); play(); }));
  paintOpts(); paintCmp();
  show(trainNet(data.train, { hidden: k, steps: 0, lr: 0.03, seed: 3, at: [0] }).params);
  cancel = whenVisible(chart, play);

  const node = h('div', { class: 'stack-l' },
    chart,
    h('p', { class: 'micro' }, 'A made-up pattern, not Ridgeline data: extra volume as a discount deepens. Filled dots: the 14 examples it learns from (training data). Hollow: points it never sees (test data).'),
    h('div', { class: 'learn-controls' }, optBox, h('button', { class: 'btn small', type: 'button', onClick: play }, 'Replay')),
    h('div', { class: 'net-row' }, readout, diagram),
    cmp, msg,
    h('p', { class: 'small' }, 'In most random draws of this toy, three neurons beat twelve. This draw shows it clearly. Large language models use the same broad idea, learned weights in a neural network, with transformer architectures, many layers and billions of parameters.'));
  return { node, stop };
}

const learn = {
  id: 'learn', title: 'How it learns',
  render(ctx) {
    let stage = 'neuron', stopPanel = () => {};
    const body = h('div', { class: 'stack-l' });
    const paint = () => {
      stopPanel();
      const panel = stage === 'neuron' ? neuronPanel(() => { stage = 'net'; paint(); }) : netPanel();
      stopPanel = panel.stop;
      mount(body,
        h('div', { class: 'stack' },
          ...top(4, 'sys', stage === 'neuron' ? 'Teach it to forecast.' : 'Now give it more neurons.',
            stage === 'neuron'
              ? 'One artificial neuron: inputs times weights, added up. It starts with random weights, so its first forecasts are wild. Learning is one move, repeated: predict, measure the miss, adjust the weights, try again.'
              : 'Learning is adjusting a model’s weights until its predictions become less wrong. More neurons give it more ways to bend. They do not guarantee better predictions.')),
        seg([['neuron', 'One neuron'], ['net', 'More neurons']], stage, (id) => { stage = id; paint(); }),
        panel.node);
    };
    paint();
    return h('div', { class: 'screen stack-l' }, body, actions(ctx, { label: 'Did it beat a spreadsheet?' }));
  },
};

// ---------------------------------------------------------------- 5. The honest test
const SERIES = {
  actual: { name: 'Depletions (actual)', short: 'Actual', color: 'var(--s-actual)', width: 2.5 },
  current: { name: 'Today’s forecast (of shipments)', short: 'Today', color: 'var(--s-current)', dash: '5 5', width: 2 },
  simple: { name: 'Simple, no-AI forecast', short: 'No-AI', color: 'var(--s-simple)', dash: '1 4', width: 2.5 },
  ai: { name: 'AI forecast', short: 'AI', color: 'var(--s-ai)', width: 2.5 },
};

const test = {
  id: 'test', title: 'The honest test',
  render(ctx) {
    const m = MODEL();
    const ev = evaluate(m);
    const from = ev.rows[0].t, n = ev.rows.length;
    const vsSimple = bootstrapReduction(ev.rows, 'simple');
    const fixed = (ev.wapeCurrent - ev.wapeSimple) / ev.wapeCurrent;
    const shipMiss = TEST_WEEKS.reduce((a, t) => a + Math.abs(WEEKS[t].cf - WEEKS[t].ship), 0) / TEST_WEEKS.reduce((a, t) => a + WEEKS[t].ship, 0);
    const gap = ev.wapeAI - ev.wapeSimple;
    const how = Math.abs(gap) < 0.004 ? 'about the same as' : gap < 0 ? 'a little better than' : 'worse than';
    const chart = lineChart({
      n, height: 270, yFmt: (v) => int(v), direct: true, yMin: 2800,
      series: ['actual', 'current', 'simple', 'ai'].map((k) => ({ ...SERIES[k], values: ev.rows.map((r) => r[k]) })),
      ticks: ticksFor(from, from + n - 1, 6).slice(0, 5), xLabel: (i) => `Week of ${weekLabel(from + i)}`, tipFmt: (v) => `${int(v)} cases`,
      markers: [{ i: COMPETITOR_WEEK - from, text: 'Rival launches' }, { i: CHAIN_CUT_WEEK - from, text: 'Chain X resets', dy: 18 }].filter((x) => x.i >= 0 && x.i < n),
      desc: 'Weekly cases the model had never seen: actual depletions, today’s shipment forecast, a simple no-AI depletions forecast and the AI forecast.',
    });
    return h('div', { class: 'screen stack-l' },
      h('div', { class: 'stack' },
        ...top(5, 'sys', 'Did it beat a spreadsheet?',
          `Today’s forecast is the organization’s belief: last year plus a little. We kept the last ${TEST_WEEKS.length} weeks hidden, then asked it, a simple forecast and the AI to predict them. This is a back-test: a replay of history.`)),
      chart,
      h('div', { class: 'stats' },
        stat('Today’s forecast', pc(ev.wapeCurrent, 1), `typical miss vs depletions. ${pc(shipMiss, 1)} against shipments, what it forecasts`),
        stat('Simple, no AI', pc(ev.wapeSimple, 1), 'typical miss vs depletions'),
        stat('AI forecast', pc(ev.wapeAI, 1), 'typical miss vs depletions', 'ai')),
      h('p', { class: 'verdict' }, `Most of the gain is not AI. Forecasting depletions instead of shipments, with a trend measured from recent weeks, cuts the miss against depletions by ${Math.round(fixed * 100)}%. The AI is ${how} that.`),
      note('Where it needs a person', `The forecasting neuron did not overfit: it missed by ${pc(HISTORY().trainWape, 1)} on weeks it learned from and ${pc(HISTORY().examWape, 1)} on new ones. But it cannot see a rival launching or a chain resetting its range. A person has to, and has to be free to override it.`),
      note('How sure?', `Against the simple method the AI ${rangeText(vsSimple)}. When a range crosses zero, the data cannot tell them apart. A replay also flatters: the answers are known and nothing is at stake.`),
      actions(ctx, { label: 'Make it safe and aligned' }));
  },
};

// ---------------------------------------------------------------- 6. Safe and aligned
const GAPS = [
  { id: 'business', title: 'Do you know what matters?', sub: 'Not everyone agrees what drives value.',
    prove: 'Do the planner, sales and finance agree what a good forecast is worth, and how it is scored?' },
  { id: 'system', title: 'Can the organization execute?', sub: 'The processes do not support the strategy.',
    prove: 'Can the data, hand-offs and tools around the forecast support using it every week?' },
  { id: 'people', title: 'Can people act on it?', sub: 'They lack clarity, authority or incentive.',
    prove: 'Does the planner have the clarity, authority and incentive to act on the forecast?' },
];

// Three lenses, and where they overlap. Name the weakest and its circle drifts away: the overlaps it
// belongs to, and the multiplier, fade.
const DRIFT = { business: [-34, -24], system: [34, -24], people: [0, 40] };
function venn() {
  const svg = s('svg', { viewBox: '0 0 300 300', class: 'venn', role: 'img', 'aria-label': 'Three overlapping circles: Business creates value, System creates leverage, People creates capability. Their overlaps are scale, capability and leadership, and the centre is the multiplier.' });
  const lens = {
    business: { cx: 112, cy: 114, cls: 'biz', name: ['Business', 'value'], tx: 78, ty: 102 },
    system: { cx: 188, cy: 114, cls: 'sys', name: ['System', 'leverage'], tx: 222, ty: 102 },
    people: { cx: 150, cy: 182, cls: 'ppl', name: ['People', 'capability'], tx: 150, ty: 229 },
  };
  const groups = {};
  for (const [id, l] of Object.entries(lens)) {
    const c = s('circle', { cx: l.cx, cy: l.cy, r: 72, class: `venn-c ${l.cls}` });
    const g = s('g', { class: 'venn-g' }, c, s('text', { x: l.tx, y: l.ty, class: 'venn-t', 'text-anchor': 'middle' }, l.name[0]), s('text', { x: l.tx, y: l.ty + 15, class: 'venn-s', 'text-anchor': 'middle' }, l.name[1]));
    groups[id] = { g, c };
    svg.append(g);
  }
  const labels = [
    ['business system', ['Scale'], 150, 88], ['business people', ['Leader-', 'ship'], 116, 170],
    ['system people', ['Capa-', 'bility'], 184, 170], ['business system people', ['The', 'multiplier'], 150, 140],
  ].map(([needs, lines, x, y]) => {
    const g = s('g', { class: 'venn-o' }, lines.map((t, i) => s('text', { x, y: y + i * 11, 'text-anchor': 'middle' }, t)));
    svg.append(g);
    return { g, needs: needs.split(' ') };
  });
  return {
    node: svg,
    set(gap) {
      for (const [id, o] of Object.entries(groups)) { o.g.style.transform = gap === id ? `translate(${DRIFT[id][0]}px, ${DRIFT[id][1]}px)` : 'none'; o.c.classList.toggle('drift', gap === id); }
      labels.forEach((l) => l.g.classList.toggle('faint', !!gap && l.needs.includes(gap)));
    },
  };
}

const ANNOUNCE = [
  { id: 'now', text: '“Everyone needs to start using AI immediately.”', hear: 'I have to prove I am using it. Admitting I do not understand it will look like incompetence.', safe: false },
  { id: 'track', text: '“Use AI wherever possible. We will track usage.”', hear: 'I am measured on how much I use it, not on whether it helps.', safe: false },
  { id: 'experiment', text: '“Experiment with AI. Tell us where it helps, where it does not, and where you are not comfortable. We will redesign the work, not just add to it.”', hear: 'It is fine to be a beginner. My experience is part of the experiment.', safe: true },
];
export const SAFE_QS = [
  ['allowed', 'What am I allowed to put into AI?'],
  ['check', 'What am I responsible for checking?'],
  ['not', 'When should I not use AI?'],
  ['mistake', 'What happens if I make a mistake?'],
  ['workload', 'Will the time AI frees become extra workload?'],
  ['where', 'Where do I go when I do not know what to do?'],
];

// Problems travel up from the front line. Where it is safe to try they reach leadership. Where it is not,
// they stop at a wall, and leadership sees only good news.
function signalCard(kind) {
  const svg = s('svg', { viewBox: '0 0 300 74', class: 'sig', 'aria-hidden': 'true' });
  svg.append(s('line', { x1: 30, y1: 30, x2: 270, y2: 30, class: 'sig-line' }));
  [[30, 'Front line'], [150, 'Managers'], [270, 'Leadership']].forEach(([x, t], i) => svg.append(s('circle', { cx: x, cy: 30, r: 11, class: `sig-node${i === 2 ? ' lead' : ''}` }), s('text', { x, y: 62, class: 'sig-text' }, t)));
  svg.append(s('rect', { x: 196, y: 16, width: 5, height: 28, rx: 2, class: 'sig-wall' }));
  [0, 1.2, 2.4].forEach((d) => svg.append(s('circle', { cx: 0, cy: 30, r: 4.5, class: 'sig-dot', style: { '--d': `${d}s` } })));
  const safeCard = kind === 'safe';
  return h('div', { class: `signal ${kind}` }, h('b', null, safeCard ? 'Safe to try' : 'Not safe to try'), svg,
    h('p', { class: 'small' }, safeCard ? 'Leadership sees what is really happening.' : 'Leadership thinks AI is working.'));
}

const safe = {
  id: 'safe', title: 'Safe and aligned',
  render(ctx) {
    const { state, save } = ctx;
    const v = venn(), prove = h('p', { class: 'small' }), hears = h('p', { class: 'prose' }), qs = h('div', { class: 'qchecks' }), status = h('p', { class: 'small' });
    const cards = { safe: signalCard('safe'), unsafe: signalCard('unsafe') };
    const paint = () => {
      if (!GAPS.some((x) => x.id === state.gap)) state.gap = null;
      if (!ANNOUNCE.some((a) => a.id === state.announce)) state.announce = null;
      state.safeAns = (Array.isArray(state.safeAns) ? state.safeAns : []).filter((id) => SAFE_QS.some(([k]) => k === id));
      const g = GAPS.find((x) => x.id === state.gap), pick = ANNOUNCE.find((a) => a.id === state.announce), yes = state.safeAns.length;
      v.set(state.gap);
      mount(prove, g ? [h('strong', null, 'Test first: '), g.prove] : '');
      mount(hears, pick ? [h('strong', null, 'What an employee hears: '), pick.hear] : '');
      cards.safe.classList.toggle('on', !!pick && pick.safe); cards.unsafe.classList.toggle('on', !!pick && !pick.safe);
      mount(qs, SAFE_QS.map(([id, q]) => {
        const on = state.safeAns.includes(id);
        return h('button', { class: 'qcheck', type: 'button', 'aria-pressed': String(on), onClick: () => { state.safeAns = on ? state.safeAns.filter((x) => x !== id) : [...state.safeAns, id]; save(); paint(); } }, h('i', { 'aria-hidden': 'true' }), q);
      }));
      status.textContent = yes === SAFE_QS.length
        ? 'All six answered. People can say “I do not know” and “I do not trust this output” without penalty.'
        : `${yes} of ${SAFE_QS.length} answered. Each gap is a reason to wait.`;
    };
    const gapPick = choices({ name: 'Gap', items: GAPS.map((x) => ({ id: x.id, title: x.title, sub: x.sub })), value: state.gap, onPick: (id) => { state.gap = id; save(); paint(); } });
    const annPick = choices({ name: 'Announcement', items: ANNOUNCE.map((a) => ({ id: a.id, title: a.text })), value: state.announce, onPick: (id) => { state.announce = id; save(); paint(); } });
    paint();
    return h('div', { class: 'screen stack-l' },
      h('div', { class: 'stack' }, ...top(6, 'ppl', 'Aligned, and safe to try.',
        'Adoption sticks where business, system and people line up, and where people can say what is not working.')),
      h('div', { class: 'stick-top' },
        h('div', { class: 'stack-s' }, v.node),
        h('div', { class: 'stack-s' }, h('h3', { class: 'h3' }, 'Where is your weakest lens?'), gapPick, prove)),
      h('div', { class: 'stack-s' },
        h('h3', { class: 'h3' }, 'You are the CEO. Which announcement do you make?'), annPick, hears,
        h('div', { class: 'signals' }, cards.safe, cards.unsafe)),
      h('div', { class: 'stack-s' }, h('h3', { class: 'h3' }, 'Can your people answer these today?'), qs, status),
      actions(ctx, { label: 'Choose what to optimize' }));
  },
};

// ---------------------------------------------------------------- 7. Steer
const MEASURES = [
  { id: 'depletions', label: 'Depletions' },
  { id: 'instock', label: 'In-stock through campaigns' },
  { id: 'shipments', label: 'Shipments' },
];
let _dec = null;
const measureLine = (id) => {
  const d = (_dec ||= decompose()), a = Math.abs(d.pct).toFixed(1), b = Math.abs(d.depPct).toFixed(1);
  if (id === 'instock') return `It would have caught the stockout on screen 2: only ${pc(runCampaign('alone').served)} of campaign demand was served when Operations set the buffer alone.`;
  if (id === 'shipments') return `Shipments are the supplier’s own number. They fell ${a}% while depletions fell ${b}%, a gap of distributor inventory that shipments cannot see.`;
  return `Depletions show what accounts actually take. Over the last 13 weeks shipments fell ${a}% and depletions fell ${b}%.`;
};

const TARGETS = [0.05, 0.1, 0.2];
const WEEKS_OPT = [8, 13, 26];
const SCOPE_SHORT = { lean: 'one distributor (12 SKU groups)', full: 'all three distributors (12 SKU groups each)' };
const winText = (x) => `${(x * 100).toFixed(1).replace('.0', '')}%`;

// Stage 1: give the departments one measure in common, and watch the pulls line up.
function alignView(ctx, toTest) {
  const { state, save } = ctx;
  const fig = orgFigure(), out = h('p', { class: 'verdict' }), line = h('p', { class: 'small measure-note' });
  const base = sumPulls(state.pulls, 0).reach;
  const paint = () => {
    const sm = fig.set({ pulls: state.pulls, shared: state.shared, reveal: true });
    out.textContent = state.shared === 0
      ? `Left alone, ${pc(base)} of the pulling reaches the star.`
      : `With ${pc(state.shared)} of every goal shared, ${pc(sm.reach)} of the pulling reaches the star, up from ${pc(base)}.`;
    line.textContent = measureLine(state.measure);
  };
  const sl = slider({ label: 'How much of every department’s goal is one shared measure', min: 0, max: 1, step: 0.2, value: state.shared, fmt: (v) => pc(v), onInput: (v) => { state.shared = v; save(); paint(); } });
  const meas = h('div'), paintMeas = () => mount(meas, seg(MEASURES.map((m) => [m.id, m.label]), state.measure, (id) => { state.measure = id; save(); paintMeas(); paint(); }));
  paintMeas(); paint();
  return h('div', { class: 'stack-l' },
    h('div', { class: 'org-split' },
      h('div', { class: 'org-wrap' }, fig.node),
      h('div', { class: 'stack' }, sl, out, h('div', { class: 'stack-s' }, h('h3', { class: 'h3' }, 'The shared measure'), meas, line))),
    h('div', { class: 'actions' }, ctx.hasBack ? h('button', { class: 'back', type: 'button', onClick: ctx.back }, '← Back') : h('span'),
      h('div', { class: 'actions-r' }, h('button', { class: 'btn', type: 'button', onClick: toTest }, 'Design the test', h('span', { 'aria-hidden': 'true' }, '→')))));
}

// Stage 2: test it before you scale it. Can a pilot this size tell, and what goes in the brief.
function testView(ctx) {
  const { state, save } = ctx;
  const m = MODEL(), ev = EVAL();
  const vsSimple = bootstrapReduction(ev.rows, 'simple');
  const noAI = pairGain(m, 'current', 'simple');
  const root = h('div', { class: 'stack-l' });
  const paint = () => {
    const p = state.pilot;
    const units = SCOPES[p.scope].units, stressUnits = Math.max(1, Math.round(units / 3));
    const sim = simulatePilot(m, p.weeks, p.target, { vs: 'simple', units });
    const stress = simulatePilot(m, p.weeks, p.target, { vs: 'simple', units: stressUnits });
    const canTell = stress.power >= 0.8 && stress.falseAlarm <= 0.1;
    const above = p.target > Math.max(0, vsSimple.hi);
    const g = GAPS.find((x) => x.id === state.gap);
    const mode = REVIEW.find((r) => r.id === p.human) || REVIEW[1];
    const share = typeof state.autoShare === 'number' ? state.autoShare : 0.6, dest = DEST[state.destination] ? state.destination : 'judgment';
    const answered = Array.isArray(state.safeAns) ? state.safeAns : [], open = SAFE_QS.filter(([k]) => !answered.includes(k));
    const maxed = p.weeks === 26 && p.scope === 'full';
    const M = MEASURES.find((x) => x.id === state.measure) || MEASURES[0];
    const rows = [
      ['Shared measure', state.shared > 0 ? `${M.label}, ${pc(state.shared)} of every department’s goal. One named executive owns it across departments.` : 'Choose one first. Left alone, every department optimizes its own.'],
      ['Do first, no AI', `Forecast depletions from weekly distributor inventory, then set shipments to that plus the inventory change you want. The back-test cut the miss from ${pc(ev.wapeCurrent, 1)} to ${pc(ev.wapeSimple, 1)}, worth ${money(noAI.lo)} to ${money(noAI.hi)} a year here.`],
      ['Redeploy the time', DEST[dest].kind === 'none' ? 'Decide first where the freed hours go. Left alone they refill the calendar, and the value is zero.' : `${hrs(netHours(share))} a week per planner, after checking work, moved to ${DEST[dest].label.toLowerCase()}.`],
      ['The test', `The AI cuts the typical miss in depletions by at least ${p.target * 100}% against the simple forecast, over ${p.weeks} weeks across ${SCOPE_SHORT[p.scope]}. A win beats the better baseline by ${winText(sim.passAt)}. Scale if it wins, extend if close, stop if not. Written before it starts.`],
      ['Review', `${mode.label}: ${hrs(reviewHours(mode.id))} a week per planner, down from ${hrs(reviewHours('review'))}. The planner stays accountable.`],
      ['Close the gap first', g ? g.prove : 'Name your weakest lens on screen 6.'],
      ['Make it safe to try', open.length ? `Answer first: ${open.slice(0, 3).map(([, q]) => q.replace(/\?$/, '').toLowerCase()).join('; ')}${open.length > 3 ? ` and ${open.length - 3} more` : ''}. Announce it as an experiment, not a mandate.` : 'The six questions are answered. Announce it as an experiment, not a mandate.'],
      ['Owner', 'Head of demand planning owns the scoreboard. VP of Supply Chain decides scale or stop.'],
    ];
    const text = `AI DECISION LAB: PILOT BRIEF\nRidgeline Bourbon, Texas (fictional)\n\n${rows.map(([t, x]) => `${t.toUpperCase()}\n${x}`).join('\n\n')}\n`;
    const copy = h('button', { class: 'btn ghost small', type: 'button', 'aria-live': 'polite', onClick: async () => {
      let ok = false;
      try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
        try { const ta = h('textarea', { style: { position: 'fixed', opacity: '0' } }); ta.value = text; document.body.append(ta); ta.select(); ok = document.execCommand('copy'); ta.remove(); } catch (e2) { ok = false; }
      }
      copy.textContent = ok ? 'Copied' : 'Select the brief and copy';
      setTimeout(() => { copy.textContent = 'Copy as text'; }, 2000);
    } }, 'Copy as text');
    mount(root,
      h('div', { class: 'pilot-controls' },
        h('div', { class: 'stack-s' }, h('h3', { class: 'h3' }, 'The AI will cut the miss by at least'), seg(TARGETS.map((t) => [String(t), `${t * 100}%`]), String(p.target), (v) => { p.target = +v; save(); paint(); })),
        h('div', { class: 'stack-s' }, h('h3', { class: 'h3' }, 'For'), seg(WEEKS_OPT.map((w) => [String(w), `${w} weeks`]), String(p.weeks), (v) => { p.weeks = +v; save(); paint(); })),
        h('div', { class: 'stack-s' }, h('h3', { class: 'h3' }, 'Across'), seg([['lean', 'One distributor'], ['full', 'All three']], p.scope, (v) => { p.scope = v; save(); paint(); })),
        h('div', { class: 'stack-s' }, h('h3', { class: 'h3' }, 'Review'), seg(REVIEW.map((r) => [r.id, r.id === 'auto' ? 'Automatic' : r.label.replace('Review ', '').replace(/^./, (c) => c.toUpperCase())]), mode.id, (v) => { p.human = v; save(); paint(); }))),
      h('div', { class: 'finding' },
        h('p', { class: 'says' }, canTell
          ? `This design can find out. If the gain is real it shows a win ${Math.round(stress.power * 100)}% of the time, and if the AI adds nothing it shows a false win only ${Math.round(stress.falseAlarm * 100)}% of the time.`
          : `This design cannot reliably find out. If the gain is real it shows a win ${Math.round(stress.power * 100)}% of the time, and if the AI adds nothing it still shows one ${Math.round(stress.falseAlarm * 100)}% of the time. ${maxed ? 'Even the largest design here cannot settle it at this target: aim for a bigger effect, or accept the pilot will not decide it.' : 'Try more weeks or all three distributors.'}`),
        h('p', { class: 'small' }, `Assumes only a third of your series are independent.${above ? ` A ${p.target * 100}% target is above the best case the replay allowed (${pc(Math.max(0, vsSimple.hi), 1)}), so read this as the chance of a win only if that gain is real.` : ''}`)),
      h('article', { class: 'brief' },
        h('div', { class: 'brief-head' }, h('div', null, h('div', { class: 'micro' }, 'Pilot brief'), h('h2', { class: 'h2' }, 'AI-assisted weekly depletions forecast')), copy),
        h('dl', null, rows.flatMap(([t, x]) => [h('dt', null, t), h('dd', null, x)]))),
      h('div', { class: 'actions' },
        ctx.hasBack ? h('button', { class: 'back', type: 'button', onClick: ctx.back }, '← Back') : h('span'),
        h('div', { class: 'actions-r' }, h('button', { class: 'btn ghost', type: 'button', onClick: () => ctx.go('organism') }, 'Start again'))));
  };
  paint();
  return root;
}

const steer = {
  id: 'steer', title: 'Steer',
  render(ctx) {
    const { state, save } = ctx;
    state.shared = Number.isFinite(state.shared) ? Math.min(1, Math.max(0, Math.round(state.shared * 5) / 5)) : 0.4;
    if (!MEASURES.some((x) => x.id === state.measure)) state.measure = 'depletions';
    if (state.steer !== 'test') state.steer = 'align';
    const body = h('div'), tabs = h('div');
    const paint = () => {
      mount(tabs, seg([['align', 'What to optimize'], ['test', 'How to test it']], state.steer, (id) => { state.steer = id; save(); paint(); }));
      mount(body, state.steer === 'test' ? testView(ctx) : alignView(ctx, () => { state.steer = 'test'; save(); paint(); window.scrollTo({ top: 0, behavior: 'instant' }); }));
    };
    paint();
    return h('div', { class: 'screen stack-l' },
      h('div', { class: 'stack' }, ...top(7, 'biz', 'Choose what the whole company optimizes.',
        'Give every department a shared measure and the pulls line up. Then test it before you scale it.')),
      tabs, body);
  },
};

export const screens = [organism, wave, time, learn, test, safe, steer];
