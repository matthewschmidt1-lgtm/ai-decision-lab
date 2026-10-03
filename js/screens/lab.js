// The lab, in six screens. One idea and one thing to do on each.
//   1 Which loop are you in? (and who does each job better)   2 Where does the time go?
//   3 How it learns (one neuron, then more)   4 The honest test
//   5 Make it stick (the three lenses and the gap between them)   6 The pilot
// Everything is computed live. The models on screen 3 are trained in the browser.

import { h, s, bars, stat, note, mount, int, money, slider, seg, choices, eyebrow } from '../ui.js';
import { lineChart } from '../charts.js';
import { WEEKS, weekLabel, noiseFloor, COMPETITOR_WEEK, CHAIN_CUT_WEEK } from '../data.js';
import { ALL_GROUPS, DEFAULT_CAUTION, TEST_WEEKS, trainModel, evaluate, bootstrapReduction, dataset, gradientDescent, solveExact,
         maxStableRate, simpleForecast } from '../forecast.js';
import { SCOPES, pairGain, simulatePilot } from '../value.js';
import { toyData, trainNet, predict, mse } from '../nn.js';
import { testBeliefs } from '../beliefs.js';
import { WEEK, DESTINATIONS, DEST, WEEK_HOURS, TEAM, freedHours, weekAfter, annual, REVIEW, reviewHours } from '../time.js';
import { actions, ticksFor, rangeText } from './common.js';

export const STEP_NAMES = ['The loops', 'Time and focus', 'How it learns', 'The honest test', 'Make it stick', 'The pilot'];
const TOTAL = STEP_NAMES.length;

const pc = (v, d = 0) => `${(v * 100).toFixed(d)}%`;
const hrs = (v) => `${v.toFixed(1).replace('.0', '')} h`;

let _model = null, _eval = null;
const EVAL = () => (_eval ||= evaluate(MODEL()));
const MODEL = () => (_model ||= trainModel(ALL_GROUPS, { l2: DEFAULT_CAUTION }));

// On a repaint (picking an answer) the page should not re-run its entrance animation.
let _hist = null;
const HISTORY = () => (_hist ||= testBeliefs().history);

const settle = (root) => { if (root._seen) root.classList.add('static'); root._seen = true; };

// The top of every screen: where you are, and the one question.
const top = (n, lens, title, lede) => [
  eyebrow(lens, `${n} of ${TOTAL}`, STEP_NAMES[n - 1]),
  h('h1', { class: 'h1 wide' }, title),
  lede ? h('p', { class: 'lede' }, lede) : null,
];

// ---------------------------------------------------------------- 1. Which loop are you in?
const LOOPS = [
  { id: 'activity', name: 'The activity loop', path: ['Data', 'Deck', 'Meeting', 'Deck', 'Meeting'], line: 'A lot of activity, not much progress.' },
  { id: 'learning', name: 'The learning loop', path: ['Signal', 'Understanding', 'Decision', 'Action', 'Learning'], line: 'Every decision makes the next one better.' },
];
export const WHO = [['human', 'Human'], ['computer', 'Computer'], ['together', 'Together']];
const WHO_LABEL = Object.fromEntries(WHO);
export const TASKS = [
  { id: 'pattern', text: 'Spot a weekly pattern in three years of orders', best: 'computer', why: 'Pattern-finding across years of numbers is tireless work for a computer.' },
  { id: 'chain', text: 'Decide whether to give Chain X the price it wants', best: 'human', why: 'A relationship, a judgment and an accountable owner.' },
  { id: 'reconcile', text: 'Reconcile two distributors’ spreadsheets', best: 'computer', why: 'Fast, exact matching, and a poor use of a planner’s attention.' },
  { id: 'draft', text: 'Draft next week’s forecast, then check it against what you know', best: 'together', why: 'The computer drafts in seconds. A person catches what the numbers cannot see.' },
  { id: 'rival', text: 'Notice that a rival’s launch changes what history says', best: 'human', why: 'Context from outside the data. A model only knows what it was shown.' },
];
const TONE = { human: 'who-human', computer: 'who-computer', together: 'who-together' };

const loops = {
  id: 'loops', title: 'The loops',
  render(ctx) {
    const { state, save } = ctx;
    const root = h('div', { class: 'screen stack-l' });
    const paint = () => {
      const sorts = {};
      TASKS.forEach((t) => { if (WHO_LABEL[state.sorts && state.sorts[t.id]]) sorts[t.id] = state.sorts[t.id]; });
      state.sorts = sorts;
      if (state.sorted && !TASKS.every((t) => sorts[t.id])) state.sorted = false;
      const done = TASKS.every((t) => sorts[t.id]);
      const hits = TASKS.filter((t) => sorts[t.id] === t.best).length;
      mount(root,
        h('div', { class: 'stack' },
          eyebrow(null, 'AI Decision Lab', 'for CPG leaders'),
          h('h1', { class: 'h1 wide' }, 'Which loop is your business in?'),
          h('p', { class: 'lede' }, 'Understand the problem deeply. Find the signal through the noise. Then build something better.')),
        h('div', { class: 'loops' }, LOOPS.map((l) => h('div', { class: `loop ${l.id}` },
          h('b', null, l.name),
          h('div', { class: 'loop-path' }, l.path.flatMap((p, i) => [h('span', null, p), i < l.path.length - 1 ? h('i', { 'aria-hidden': 'true' }, '→') : null])),
          h('p', { class: 'small' }, l.line)))),
        h('div', { class: 'stack-s' },
          h('p', { class: 'small' }, 'Which is closer to your organization?'),
          seg([['activity', 'Mostly activity'], ['both', 'Both'], ['learning', 'Mostly learning']], state.loop, (id) => { state.loop = id; save(); paint(); }),
          state.loop ? h('p', { class: 'small reveal' }, 'Most organizations run both. AI pays off where it shortens the activity loop and speeds up the learning loop.') : null),
        h('div', { class: 'stack-s' },
          h('h3', { class: 'h3' }, state.sorted ? `Who does each job better? You matched ${hits} of ${TASKS.length}.` : 'Who does each job better?'),
          h('div', { class: 'beliefs' }, TASKS.map((t) => {
            if (!state.sorted) return h('div', { class: 'belief' }, h('p', { class: 'belief-q' }, t.text), seg(WHO, sorts[t.id], (id) => { sorts[t.id] = id; state.sorts = sorts; save(); paint(); }));
            const hit = sorts[t.id] === t.best;
            return h('div', { class: `belief result${hit ? ' hit' : ''}` }, h('p', { class: 'belief-q' }, t.text),
              h('div', { class: 'belief-chips' }, h('span', { class: `chip ${TONE[t.best]}` }, WHO_LABEL[t.best]), h('span', { class: 'micro' }, hit ? 'You called it' : `You said: ${WHO_LABEL[sorts[t.id]]}`)),
              h('p', { class: 'small' }, t.why));
          }))),
        state.sorted
          ? actions(ctx, { label: 'Where does the time go?' })
          : h('div', { class: 'actions' }, h('span', { class: 'micro' }, `${TASKS.filter((t) => sorts[t.id]).length} of ${TASKS.length} called`),
              h('div', { class: 'actions-r' }, h('button', { class: 'btn', type: 'button', disabled: !done, onClick: () => { state.sorted = true; save(); paint(); } }, 'Check', h('span', { 'aria-hidden': 'true' }, '→')))));
      settle(root);
    };
    paint();
    return root;
  },
};

// ---------------------------------------------------------------- 2. Where does the time go?
const SEG_COLOR = {
  gather: 'color-mix(in srgb, var(--sys) 100%, var(--paper))', forecast: 'color-mix(in srgb, var(--sys) 60%, var(--paper))',
  decks: 'var(--line-2)', review: 'var(--muted)', judgment: 'var(--biz)', markets: 'var(--ppl)',
};

function weekBar(rows) {
  return h('div', { class: 'wk-bar', role: 'img', 'aria-label': rows.map((r) => `${r.label} ${r.hours.toFixed(1)} hours`).join(', ') },
    rows.map((r) => h('div', { class: 'wk-seg', style: { flex: `${r.hours} 1 0`, background: SEG_COLOR[r.id] }, title: `${r.label}: ${r.hours.toFixed(1)} h` },
      r.hours >= 3.5 ? h('span', null, Math.round(r.hours)) : null)));
}

const time = {
  id: 'time', title: 'Time and focus',
  render(ctx) {
    const { state, save } = ctx;
    const share = () => (typeof state.autoShare === 'number' ? state.autoShare : 0.6);
    const dest = () => (DEST[state.destination] ? state.destination : 'judgment');
    const out = h('div', { class: 'stack' });
    const paintOut = () => {
      const f = freedHours(share()), a = annual(share(), dest());
      const rows = weekAfter(share(), dest());
      mount(out,
        h('div', { class: 'wk' },
          h('div', { class: 'wk-row' }, h('span', { class: 'wk-label' }, 'Today'), weekBar(WEEK.map((w) => ({ id: w.id, label: w.label, hours: w.hours })))),
          h('div', { class: 'wk-row' }, h('span', { class: 'wk-label' }, 'With AI'), weekBar(rows))),
        h('div', { class: 'wk-key small' }, [...WEEK, { id: 'markets', label: 'More brands and markets' }].filter((w) => w.id !== 'markets' || dest() === 'markets')
          .map((w) => h('span', null, h('i', { style: { background: SEG_COLOR[w.id] } }), w.label))),
        h('div', { class: 'stats' },
          stat('Freed per planner', `${hrs(f)} a week`, `of a ${WEEK_HOURS}-hour week`, 'ai'),
          stat('Freed across the team', `${Math.round(a.hours).toLocaleString('en-US')} h`, `${TEAM} planners, a year`),
          stat('Worth', a.value ? money(a.value) : '$0', a.value ? 'in planner time, once redeployed' : 'the hours just refill')),
        a.value
          ? h('p', { class: 'small' }, 'Time is only value once it is redeployed. What it earns beyond that, fewer misses and better customer calls, is for a pilot to measure. A spreadsheet frees some of this too.')
          : h('p', { class: 'small' }, 'Saved time that goes nowhere in particular is worth nothing. The calendar fills.'));
    };
    const sl = slider({ label: 'How much of the routine work the computer takes over', min: 0, max: 1, step: 0.1, value: share(), fmt: (v) => pc(v), onInput: (v) => { state.autoShare = v; save(); paintOut(); } });
    const dst = h('div', { class: 'stack-s' }, h('h3', { class: 'h3' }, 'Where do the freed hours go?'),
      choices({ name: 'Destination', items: DESTINATIONS.map((d) => ({ id: d.id, title: d.label, sub: d.sub })), value: dest(), onPick: (id) => { state.destination = id; save(); paintOut(); } }));
    paintOut();
    return h('div', { class: 'screen stack-l' },
      h('div', { class: 'stack' }, ...top(2, 'biz', 'Where does the time go?',
        'Time and focus are what a business runs short of. Here is one planner’s week (an illustrative assumption). Gathering and reconciling feel like the job. They are what everyone has learned to accept.')),
      sl, out, dst,
      actions(ctx, { label: 'How does the computer part learn?' }));
  },
};

// ---------------------------------------------------------------- 3. How it learns: one neuron, then more
const STEPS = 400;
// Early steps are shown one by one (that is where the learning is), later ones in longer jumps.
const framesFor = (steps) => { const out = []; let v = 0; while (v < steps) { out.push(Math.round(v)); v = v < 12 ? v + 1 : v * 1.12; } out.push(steps); return [...new Set(out)]; };
const FRAMES = framesFor(STEPS);

// Run `fn` once the element is mostly on screen, so nobody misses the start of a training run.
// A polling check, not an observer: it also works when the page loads already scrolled or in a background tab.
function whenVisible(el, fn) {
  let t = setInterval(() => {
    if (!el.isConnected) { clearInterval(t); return; }
    const r = el.getBoundingClientRect();
    if (r.height && r.top < window.innerHeight - r.height * 0.5 && r.bottom > r.height * 0.5) { clearInterval(t); fn(); }
  }, 250);
  return () => clearInterval(t);
}

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
  const barsHost = h('div'), readout = h('div', { class: 'stats' }), msg = h('div'), speedBox = h('div');
  let timer = null, run = 0, cancel = () => {};
  const stop = () => { clearInterval(timer); run++; cancel(); };

  const draw = (k, snaps, diverged) => {
    const sn = snaps[Math.min(k, snaps.length - 1)];
    hero.update({ series: [S0, modelLine(predAt(sn))] });
    mount(barsHost, bars({ items: names.map((n, j) => ({ label: n, value: sn.w[j], color: sn.w[j] >= 0 ? 'var(--accent)' : 'var(--ink-2)' })), max: wMax, animate: false, fmt: (v) => v.toFixed(3) }));
    const miss = Math.sqrt(sn.loss) * 100;
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
          : 'From a random start to the best this model can do, by repeating one move: measure the miss, nudge every weight to shrink it.'),
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
    h('div', { class: 'learn-controls' }, speedBox, h('button', { class: 'btn small', type: 'button', onClick: start }, 'Replay')),
    readout, msg,
    h('div', { class: 'stack-s' }, h('div', { class: 'micro' }, 'The weights: how hard each input pushes the forecast'), barsHost));
  return { node, stop };
}

// Stage 2: more neurons let a model bend. A toy pattern, not Ridgeline data, so the bend is real
// and the lesson (more is not always better) can be measured on points the net never sees.
const NET_STEPS = 2500;
const NET_FRAMES = framesFor(NET_STEPS);
const NET_OPTS = [[0, 'One neuron'], [3, '3 neurons'], [12, '12 neurons']];
const GRID = 61;

function netDiagram(k) {
  const svg = s('svg', { viewBox: '0 0 220 120', role: 'img', 'aria-label': k ? `A network: one input, ${k} hidden neurons, one output` : 'One neuron: one input and one output' });
  const ys = Array.from({ length: k }, (_, j) => (k === 1 ? 60 : 12 + (96 * j) / (k - 1)));
  if (!k) svg.append(s('line', { x1: 36, y1: 60, x2: 184, y2: 60, class: 'dg-line' }));
  ys.forEach((y) => { svg.append(s('line', { x1: 30, y1: 60, x2: 110, y2: y, class: 'dg-line thin' })); svg.append(s('line', { x1: 110, y1: y, x2: 190, y2: 60, class: 'dg-line thin' })); });
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
    dots, ticks: [0, 15, 30, 45, 60].map((i) => ({ i, text: `${i / 60 * 100}%` })), xLabel: (i) => `${Math.round((i / (GRID - 1)) * 100)}% of stores on promotion`,
    desc: 'A made-up pattern with noise: filled dots are the points a model learns from, hollow dots are points it never sees. The curve is the model’s fit as it trains.',
  });
  let k = 3, timer = null, run = 0, cancel = () => {};
  const stop = () => { clearInterval(timer); run++; cancel(); };
  const readout = h('div', { class: 'stats' }), diagram = h('div', { class: 'net-diagram' }), msg = h('div'), optBox = h('div');
  const show = (p) => {
    chart.update({ series: [curve(p)] });
    mount(readout,
      stat('Error on points it learned from', rmse(p, data.train).toFixed(1), 'typical miss, in points', 'ai'),
      stat('Error on points it never saw', rmse(p, data.test).toFixed(1), 'typical miss, in points'));
  };
  const say = () => {
    const f = finals[k];
    const text = k === 0
      ? `A single neuron can only draw a straight line, so it misses the bend: ${f.test.toFixed(1)} on points it never saw.`
      : k === 3
        ? `Three neurons can bend to follow the pattern: ${f.test.toFixed(1)} on points it never saw, against ${finals[0].test.toFixed(1)} for a line.`
        : finals[12].test > finals[3].test
          ? `Twelve neurons fit the points it learned from better (${f.train.toFixed(1)}) but do worse on new ones (${f.test.toFixed(1)}, against ${finals[3].test.toFixed(1)} for three). It is memorizing noise. More is not better.`
          : `Twelve neurons do about as well as three on points it never saw (${f.test.toFixed(1)}). More was not needed.`;
    mount(msg, note(k === 12 && finals[12].test > finals[3].test ? 'Too many' : 'What happened', text));
  };
  const play = () => {
    clearInterval(timer);
    const myRun = ++run;
    mount(msg);
    mount(diagram, netDiagram(k));
    const { snaps } = trainNet(data.train, { hidden: k, steps: NET_STEPS, lr: 0.03, seed: 3, at: NET_FRAMES });
    let f = 0;
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
  paintOpts();
  mount(diagram, netDiagram(k));
  show(trainNet(data.train, { hidden: k, steps: 0, lr: 0.03, seed: 3, at: [0] }).params);
  cancel = whenVisible(chart, play);

  const node = h('div', { class: 'stack-l' },
    chart,
    h('p', { class: 'micro' }, 'A made-up pattern, not Ridgeline data. Filled dots: the 14 points it learns from. Hollow: points it never sees.'),
    h('div', { class: 'learn-controls' }, optBox, h('button', { class: 'btn small', type: 'button', onClick: play }, 'Replay')),
    h('div', { class: 'net-row' }, readout, diagram),
    msg);
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
          ...top(3, 'sys', stage === 'neuron' ? 'Teach it to forecast.' : 'Now give it more neurons.',
            stage === 'neuron'
              ? 'One artificial neuron: inputs times weights, added up. It starts with random weights, so its first forecasts are wild. Then it repeats one move: measure the miss, nudge the weights to shrink it.'
              : 'Add neurons and a model can bend to fit a pattern a line cannot. A neural network is this, stacked. Language models are the same idea with billions of weights.')),
        seg([['neuron', 'One neuron'], ['net', 'More neurons']], stage, (id) => { stage = id; paint(); }),
        panel.node);
    };
    paint();
    return h('div', { class: 'screen stack-l' }, body, actions(ctx, { label: 'What can it actually learn?' }));
  },
};

// ---------------------------------------------------------------- 4. The honest test
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
        ...top(4, 'sys', 'Did it beat a spreadsheet?',
          `We kept the last ${TEST_WEEKS.length} weeks hidden from the model, then asked it, today’s method and a simple forecast with no AI to predict them. This is a back-test: a replay of history.`)),
      chart,
      h('div', { class: 'stats' },
        stat('Today’s forecast', pc(ev.wapeCurrent, 1), 'typical miss vs depletions'),
        stat('Simple, no AI', pc(ev.wapeSimple, 1), 'typical miss vs depletions'),
        stat('AI forecast', pc(ev.wapeAI, 1), 'typical miss vs depletions', 'ai')),
      h('p', { class: 'verdict' }, `Most of the gain is not AI. Forecasting depletions instead of shipments, with a trend measured from recent weeks, cuts the miss against depletions by ${Math.round(fixed * 100)}%. The AI is ${how} that.`),
      note('Where it needs a person', `It cannot see a rival launching or a chain resetting its range, and accuracy on past weeks is not accuracy on new ones: the 12-neuron network missed by ${HISTORY().net.train.toFixed(1)} on points it learned from and ${HISTORY().net.test.toFixed(1)} on new ones. That judgment stays with people.`),
      note('How sure?', `Against the simple method the AI ${rangeText(vsSimple)}. When a range crosses zero, the data cannot tell them apart. A replay also flatters: the answers are known and nothing is at stake.`),
      actions(ctx, { label: 'Make it stick' }));
  },
};

// ---------------------------------------------------------------- 5. Make it stick
const GAPS = [
  { id: 'business', lens: 'biz', title: 'Do you know what matters?', sub: 'Everything gets measured. Not everyone agrees what drives value.',
    prove: 'Do the planner, sales and finance agree what a good forecast is worth, and how it is scored?' },
  { id: 'system', lens: 'sys', title: 'Can the organization execute?', sub: 'The strategy makes sense. The processes around it do not support it.',
    prove: 'Can the data, hand-offs and tools around the forecast support using it every week?' },
  { id: 'people', lens: 'ppl', title: 'Can people act on it?', sub: 'The answer exists. People lack the clarity, authority or incentive.',
    prove: 'Does the planner have the clarity, authority and incentive to act on the forecast?' },
];

// Three lenses, and where they overlap.
function venn() {
  const svg = s('svg', { viewBox: '0 0 300 235', class: 'venn', role: 'img', 'aria-label': 'Three overlapping circles: Business creates value, System creates leverage, People creates capability. Their overlaps are scale, capability and leadership, and the centre is the multiplier.' });
  const circ = (cx, cy, c) => svg.append(s('circle', { cx, cy, r: 72, class: `venn-c ${c}` }));
  circ(112, 90, 'biz'); circ(188, 90, 'sys'); circ(150, 158, 'ppl');
  const t = (x, y, text, cls = 'venn-t') => svg.append(s('text', { x, y, class: cls, 'text-anchor': 'middle' }, text));
  t(78, 78, 'Business'); t(78, 93, 'value', 'venn-s');
  t(222, 78, 'System'); t(222, 93, 'leverage', 'venn-s');
  t(150, 205, 'People'); t(150, 220, 'capability', 'venn-s');
  t(150, 64, 'Scale', 'venn-o'); t(116, 146, 'Leader-', 'venn-o'); t(116, 157, 'ship', 'venn-o'); t(184, 146, 'Capa-', 'venn-o'); t(184, 157, 'bility', 'venn-o');
  t(150, 116, 'The', 'venn-o'); t(150, 127, 'multiplier', 'venn-o');
  return svg;
}

const stick = {
  id: 'stick', title: 'Make it stick',
  render(ctx) {
    const { state, save } = ctx;
    const root = h('div', { class: 'screen stack-l' });
    const paint = () => {
      const g = GAPS.find((x) => x.id === state.gap);
      const mode = REVIEW.find((r) => r.id === (state.pilot && state.pilot.human)) || REVIEW[1];
      mount(root,
        h('div', { class: 'stack' }, ...top(5, 'biz', 'Make it stick.', 'The problem is rarely one lens. It is the gap between them. The details change. The friction does not.')),
        h('div', { class: 'stick-top' },
          h('div', { class: 'stack-s' }, venn(),
            h('p', { class: 'small' }, 'Scale: Business plus System. Capability: System plus People. Leadership: Business plus People. The multiplier: all three aligned.')),
          h('div', { class: 'stack-s' }, h('h3', { class: 'h3' }, 'Where is your gap?'),
            choices({ name: 'Gap', items: GAPS.map((x) => ({ id: x.id, title: x.title, sub: x.sub })), value: state.gap, onPick: (id) => { state.gap = id; save(); paint(); } }),
            g ? h('p', { class: 'small reveal' }, h('strong', null, 'Test first: '), g.prove) : null)),
        h('div', { class: 'stack-s' },
          h('h3', { class: 'h3' }, 'Design the review and approvals'),
          seg(REVIEW.map((r) => [r.id, r.label]), mode.id, (id) => { state.pilot.human = id; save(); paint(); }),
          h('div', { class: 'stats' },
            stat('Review time today', hrs(reviewHours('review')), 'per planner, a week'),
            stat('With this design', hrs(reviewHours(mode.id)), 'per planner, a week', 'ai')),
          h('p', { class: 'small' }, mode.note, ' In every option the planner stays accountable.')),
        actions(ctx, { label: 'Design the pilot' }));
      settle(root);
    };
    paint();
    return root;
  },
};

// ---------------------------------------------------------------- 6. The pilot
const TARGETS = [0.05, 0.1, 0.2];
const WEEKS_OPT = [8, 13, 26];
const SCOPE_SHORT = { lean: 'one distributor (12 SKU groups)', full: 'all three distributors (12 SKU groups each)' };
const winText = (x) => `${(x * 100).toFixed(1).replace('.0', '')}%`;

const pilot = {
  id: 'pilot', title: 'The pilot',
  render(ctx) {
    const { state, save } = ctx;
    const m = MODEL();
    const ev = EVAL();
    const vsSimple = bootstrapReduction(ev.rows, 'simple');
    const noAI = pairGain(m, 'current', 'simple');
    const root = h('div', { class: 'screen stack-l' });
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
      const rows = [
        ['Do first, no AI', `Get weekly distributor inventory. Forecast depletions, then set shipments to that plus the inventory change you want. In the back-test the miss against depletions fell from ${pc(ev.wapeCurrent, 1)} to ${pc(ev.wapeSimple, 1)}, worth ${money(noAI.lo)} to ${money(noAI.hi)} a year here.`],
        ['Redeploy the time', `${hrs(freedHours(share))} a week per planner, moved to ${DEST[dest].label.toLowerCase()}. It counts as value only once it is redeployed.`],
        ['The test', `The AI cuts the typical miss in depletions by at least ${p.target * 100}% against the simple forecast, over ${p.weeks} weeks across ${SCOPE_SHORT[p.scope]}. A win beats the better baseline by ${winText(sim.passAt)}, half the target, for luck. Scale if it wins, extend 13 weeks if close, stop if not. Written before it starts.`],
        ['Review', `${mode.label}: ${hrs(reviewHours(mode.id))} a week per planner, down from ${hrs(reviewHours('review'))}. The planner stays accountable.`],
        ['Close the gap first', g ? g.prove : 'Pick your gap on the last screen to add it here.'],
        ['Owner', 'Head of demand planning owns the scoreboard. VP of Supply Chain decides scale or stop.'],
      ];
      const text = `AI DECISION LAB: PILOT BRIEF\nRidgeline Bourbon, Texas (fictional)\n\n${rows.map(([t, x]) => `${t.toUpperCase()}\n${x}`).join('\n\n')}\n`;
      const copy = h('button', { class: 'btn ghost small', type: 'button', 'aria-live': 'polite', onClick: async () => {
        try { await navigator.clipboard.writeText(text); copy.textContent = 'Copied'; } catch (e) { copy.textContent = 'Copy failed'; }
        setTimeout(() => { copy.textContent = 'Copy as text'; }, 2000);
      } }, 'Copy as text');
      mount(root,
        h('div', { class: 'stack' }, ...top(6, 'biz', 'Turn the idea into an experiment.', 'Decide what you will test, and check that a test this size could tell.')),
        h('div', { class: 'pilot-controls' },
          h('div', { class: 'stack-s' }, h('h3', { class: 'h3' }, 'The AI will cut the miss by at least'), seg(TARGETS.map((t) => [String(t), `${t * 100}%`]), String(p.target), (v) => { p.target = +v; save(); paint(); })),
          h('div', { class: 'stack-s' }, h('h3', { class: 'h3' }, 'For'), seg(WEEKS_OPT.map((w) => [String(w), `${w} weeks`]), String(p.weeks), (v) => { p.weeks = +v; save(); paint(); })),
          h('div', { class: 'stack-s' }, h('h3', { class: 'h3' }, 'Across'), seg([['lean', 'One distributor'], ['full', 'All three']], p.scope, (v) => { p.scope = v; save(); paint(); }))),
        h('div', { class: 'finding' },
          h('p', { class: 'says' }, canTell
            ? `This design can find out. If the gain is real it shows a win ${Math.round(stress.power * 100)}% of the time, and if the AI adds nothing it shows a false win only ${Math.round(stress.falseAlarm * 100)}% of the time.`
            : `This design cannot reliably find out. If the gain is real it shows a win ${Math.round(stress.power * 100)}% of the time, and if the AI adds nothing it still shows one ${Math.round(stress.falseAlarm * 100)}% of the time. Try more weeks or all three distributors.`),
          h('p', { class: 'small' }, `Assumes only a third of your series are independent, since real ones share a model and a calendar.${above ? ` A ${p.target * 100}% target is above the best case the replay allowed (${pc(Math.max(0, vsSimple.hi))}), so read this as the chance of a win only if that gain is real.` : ''}`)),
        h('article', { class: 'brief' },
          h('div', { class: 'brief-head' }, h('div', null, h('div', { class: 'micro' }, 'Pilot brief'), h('h2', { class: 'h2' }, 'AI-assisted weekly depletions forecast')), copy),
          h('dl', null, rows.flatMap(([t, x]) => [h('dt', null, t), h('dd', null, x)]))),
        h('div', { class: 'actions' },
          ctx.hasBack ? h('button', { class: 'back', type: 'button', onClick: ctx.back }, '← Back') : h('span'),
          h('div', { class: 'actions-r' }, h('button', { class: 'btn ghost', type: 'button', onClick: () => ctx.go('loops') }, 'Start again'))));
      settle(root);
    };
    paint();
    return root;
  },
};

export const screens = [loops, time, learn, test, stick, pilot];
