// The lab, in five screens. One idea and one thing to do on each.
//   1 The problem   2 The blind spot   3 How it learns (one neuron, then more)
//   4 The honest test   5 The pilot (with the three questions)
// Everything is computed live from the data. The models on screen 3 are trained in the browser.

import { h, s, bars, stat, note, mount, int, money, seg, choices, eyebrow } from '../ui.js';
import { lineChart } from '../charts.js';
import { WEEKS, decompose, weekLabel, noiseFloor, COMPETITOR_WEEK, CHAIN_CUT_WEEK } from '../data.js';
import { ALL_GROUPS, DEFAULT_CAUTION, TEST_WEEKS, trainModel, evaluate, bootstrapReduction, dataset, gradientDescent, solveExact,
         maxStableRate, simpleForecast } from '../forecast.js';
import { SCOPES, pairGain, valueRange, breakEvenMultiple, simulatePilot } from '../value.js';
import { toyData, trainNet, predict, mse } from '../nn.js';
import { VERDICTS, VERDICT, testBeliefs } from '../beliefs.js';
import { actions, ticksFor, rangeText } from './common.js';

export const STEP_NAMES = ['The problem', 'The blind spot', 'How it learns', 'The honest test', 'The pilot'];
const TOTAL = STEP_NAMES.length;

const D = decompose();
const pc = (v, d = 0) => `${(v * 100).toFixed(d)}%`;
const pcs = (v, d = 1) => `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(d)}%`;
const abs1 = (v) => Math.abs(v).toFixed(1);
const ma3 = (arr) => arr.map((_, i) => { const a = arr.slice(Math.max(0, i - 1), i + 2); return a.reduce((x, y) => x + y, 0) / a.length; });
const slice = (key, from, to) => WEEKS.slice(from, to + 1).map((w) => w[key]);

let _model = null, _eval = null;
const EVAL = () => (_eval ||= evaluate(MODEL()));
const MODEL = () => (_model ||= trainModel(ALL_GROUPS, { l2: DEFAULT_CAUTION }));

// On a repaint (picking an answer) the page should not re-run its entrance animation.
const settle = (root) => { if (root._seen) root.classList.add('static'); root._seen = true; };

// The top of every screen: where you are, and the one question.
const top = (n, lens, title, lede) => [
  eyebrow(lens, `${n} of ${TOTAL}`, STEP_NAMES[n - 1]),
  h('h1', { class: 'h1 wide' }, title),
  lede ? h('p', { class: 'lede' }, lede) : null,
];

// ---------------------------------------------------------------- 1. The problem
const FORCES = [
  { id: 'price', label: 'The April price increase', lower: 'the April price increase' },
  { id: 'competitor', label: 'A premium rival launching', lower: 'a premium rival launching' },
  { id: 'distribution', label: 'Chain X dropping our items', lower: 'Chain X dropping our items' },
  { id: 'inventory', label: 'Distributors working down inventory', lower: 'distributors working down inventory' },
];

const problem = {
  id: 'problem', title: 'The problem',
  render(ctx) {
    const { state, save } = ctx;
    const root = h('div', { class: 'screen stack-l' });
    const from = 130, to = 155;
    const win = (key, a, b) => ma3(slice(key, a - 2, b)).slice(2);
    const lastYear = win('ship', from - 52, to - 52), shipNow = win('ship', from, to), depl = win('dep', from, to);
    const chart = (shown) => lineChart({
      n: shipNow.length, height: 250, yMin: 2800, yFmt: (v) => int(v), direct: true,
      series: [
        { name: 'Shipments, last year', short: 'Last year', values: lastYear, color: 'var(--s-current)', dash: '5 5', width: 2 },
        { name: 'Shipments to distributors, this year', short: 'Shipments', values: shipNow, color: 'var(--ink)', width: 2.5 },
        ...(shown ? [{ name: 'Depletions (distributor sales to accounts), this year', short: 'Depletions', values: depl, color: 'var(--s-ai)', width: 2.5 }] : []),
      ],
      fills: shown ? [{ a: 1, b: 2, posClass: 'up', negClass: 'down' }] : [{ a: 0, b: 1, posClass: 'loss', negClass: 'gain' }],
      ticks: ticksFor(from, to, 6).filter((_, i) => i % 2 === 0), xLabel: (i) => `Week of ${weekLabel(from + i)}`, tipFmt: (v) => `${int(v)} cases`,
      desc: 'Weekly shipments to Texas distributors, this year and last, and after you answer, depletions to stores and bars this year.',
    });
    const paint = () => {
      const pick = state.read;
      const forces = FORCES.map((f) => ({ ...f, value: D.pts[f.id] })).sort((a, b) => a.value - b.value);
      const biggest = forces[0];
      mount(root,
        h('div', { class: 'stack' },
          eyebrow(null, 'AI Decision Lab', 'for CPG leaders'),
          h('h1', { class: 'h1 wide' }, `Ridgeline shipments are down ${abs1(D.pct)}% in Texas.`),
          h('p', { class: 'lede' }, 'Shipments to distributors are well below last year. Which one thing is the biggest piece of the drop?')),
        chart(!!pick),
        !pick
          ? choices({ name: 'Biggest piece', items: FORCES.map((f) => ({ id: f.id, title: f.label })), value: pick, onPick: (id) => { state.read = id; save(); paint(); } })
          : h('div', { class: 'stack reveal' },
              h('p', { class: 'verdict' }, pick === biggest.id ? `You called it: ${biggest.lower}.` : `The biggest piece was ${biggest.lower}, not ${FORCES.find((f) => f.id === pick).lower}.`),
              bars({ items: forces.map((f) => ({ id: f.id, label: f.label, value: f.value, mark: f.id === pick })), max: 5, fmt: (v) => `${v.toFixed(1)} pts` }),
              h('p', { class: 'small' }, `Points of change in shipments. Other forces, such as promotion, offset part of them, which is why the bars add to more than ${abs1(D.pct)}%. Depletions, what distributors sold on to stores and bars, fell only ${abs1(D.depPct)}%. The gap is distributor inventory, built by earlier shipments and now running down, and that part is temporary. (Estimated with the lab’s answer key; real life has none.)`),
              note('The point', 'Before asking what AI can do, find out what actually happened.'),
              actions(ctx, { label: 'What is everyone assuming?' })));
      settle(root);
    };
    paint();
    return root;
  },
};

// ---------------------------------------------------------------- 2. The blind spot
const T = testBeliefs();
const pct1 = (v) => `${(v * 100).toFixed(1)}%`;
const BELIEFS = [
  { id: 'forecast', title: 'Our shipment forecast tells us what will sell.', test: T.forecast,
    why: (t) => `Against depletions it was ${pcs(t.biasYearOne)} off in its first year, but ${pc(t.biasRecent)} high lately, and within 5% in only ${t.within5} of ${t.weeks} weeks. Right on average, wrong in the weeks that matter.` },
  { id: 'distributors', title: 'Shipments to a distributor track its depletions.', test: T.distributors,
    why: (t) => `In ${t.ordWithin3} of ${t.ordinary} ordinary weeks, shipments were within 3% of depletions. But quarter-ends ran ${pcs(t.quarterEnd)} above, and the weeks before the price increase ${pcs(t.preBuy)}.` },
  { id: 'promo', title: 'Promotion adds depletions.', test: T.promo,
    why: (t) => `About ${abs1(t.pts)} points of the change in shipments, through depletions. Whether it paid is another matter: the data has no discount or margin to test that.` },
  { id: 'shelves', title: 'Promotions are what cause our out-of-stocks.', test: T.shelves,
    why: (t) => `Out-of-stocks were ${pct1(t.during)} during the promotion run (${pct1(t.duringLast)} a year earlier) and rose to ${pct1(t.after)} only after it ended.` },
  { id: 'distribution', title: 'Losing distribution costs depletions one for one.', test: T.distribution,
    why: (t) => `The data says about ${t.slope.toFixed(1)} for each 1% of stores carrying us, give or take ${t.half.toFixed(1)}. One-for-one and half that both fit, so it cannot tell.` },
];

const assume = {
  id: 'assume', title: 'The blind spot',
  render(ctx) {
    const { state, save } = ctx;
    const root = h('div', { class: 'screen stack-l' });
    const paint = () => {
      const bets = state.bets || (state.bets = {});
      const done = BELIEFS.every((b) => bets[b.id]);
      const hits = BELIEFS.filter((b) => bets[b.id] === b.test.verdict).length;
      const intro = h('div', { class: 'stack' },
        ...top(2, 'biz', 'What is everyone assuming?', state.checked
          ? `You matched the data on ${hits} of ${BELIEFS.length}. Few of these hold as stated.`
          : 'Five beliefs sit inside how Ridgeline plans. Call each one, then check.'),
        h('p', { class: 'small' }, h('strong', null, 'Sometimes'), ' means true on average but not when it matters. ', h('strong', null, 'Can’t tell'), ' means the data cannot say.'));
      if (!state.checked) {
        mount(root, intro,
          h('div', { class: 'beliefs' }, BELIEFS.map((b) => h('div', { class: 'belief' },
            h('p', { class: 'belief-q' }, b.title),
            seg(VERDICTS.map((v) => [v.id, v.short]), bets[b.id], (id) => { bets[b.id] = id; save(); paint(); })))),
          h('div', { class: 'actions' }, h('span', { class: 'micro' }, `${BELIEFS.filter((b) => bets[b.id]).length} of ${BELIEFS.length} called`),
            h('div', { class: 'actions-r' }, h('button', { class: 'btn', type: 'button', disabled: !done, onClick: () => { state.checked = true; save(); paint(); window.scrollTo({ top: 0 }); } }, 'Check against the data', h('span', { 'aria-hidden': 'true' }, '→')))));
        settle(root);
        return;
      }
      mount(root, intro,
        h('div', { class: 'beliefs reveal' }, BELIEFS.map((b) => {
          const v = VERDICT[b.test.verdict], mine = VERDICT[bets[b.id]], hit = mine.id === v.id;
          return h('div', { class: `belief result${hit ? ' hit' : ''}` },
            h('p', { class: 'belief-q' }, b.title),
            h('div', { class: 'belief-chips' }, h('span', { class: `chip ${v.tone}` }, v.short), h('span', { class: 'micro' }, hit ? 'You called it' : `You said: ${mine.short}`)),
            h('p', { class: 'prose' }, b.why(b.test)));
        })),
        note('The point', 'These were invisible until someone asked. A model trained on them will repeat the mistake, however fast it runs.'),
        actions(ctx, { label: 'Teach a model to forecast' }));
      settle(root);
    };
    paint();
    return root;
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
    return h('div', { class: 'screen stack-l' }, body, actions(ctx, { label: 'Did it beat a spreadsheet?' }));
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
      note('How sure?', `Against the simple method the AI ${rangeText(vsSimple)}. When a range crosses zero, the data cannot tell them apart. A replay also flatters: the answers are known and nothing is at stake.`),
      actions(ctx, { label: 'Design the pilot' }));
  },
};

// ---------------------------------------------------------------- 5. The pilot (with the three questions)
const SYS = [
  { id: 'visibility', label: 'Inventory visibility', prove: 'Can we get weekly distributor inventory and depletions, and do distributors act on a shared forecast?' },
  { id: 'data', label: 'Data', prove: 'Can we build a clean weekly history for every SKU group within four weeks?' },
  { id: 'workflow', label: 'Workflow', prove: 'Will planners use a forecast that arrives as a column in their own spreadsheet?' },
  { id: 'score', label: 'Scoreboard', prove: 'Can we agree, before the pilot, how every forecast will be scored?' },
];
const PPL = [
  { id: 'trust', label: 'Trust', prove: 'Do planners trust a forecast more when they can see why it said what it said?' },
  { id: 'incentives', label: 'Incentives', prove: 'Does an honest depletions forecast get used when it looks like a missed target?' },
  { id: 'accountability', label: 'Accountability', prove: 'Who answers for the plan, and can that person disagree with the model?' },
  { id: 'distributors', label: 'Control', prove: 'Will a distributor change how much it takes from us because we shared a depletions forecast?' },
];
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
    const est = pairGain(m, 'simple', 'ai'), noAI = pairGain(m, 'current', 'simple');
    const val = valueRange(state.value, est), need = breakEvenMultiple(state.value, est.point);
    const root = h('div', { class: 'screen stack-l' });
    const worry = (lens, label, items, key) => {
      const w = items.find((x) => x.id === state[key]);
      return h('div', { class: 'qrow', 'data-lens': lens },
        h('div', { class: 'qrow-h' }, h('span', { class: 'lens-dot' }), h('b', null, label)),
        seg(items.map((x) => [x.id, x.label]), state[key], (id) => { state[key] = id; save(); paint(); }),
        w ? h('p', { class: 'small reveal' }, h('strong', null, 'Test first: '), w.prove) : h('p', { class: 'small' }, 'Which worries you most?'));
    };
    const paint = () => {
      const p = state.pilot;
      const units = SCOPES[p.scope].units, stressUnits = Math.max(1, Math.round(units / 3));
      const sim = simulatePilot(m, p.weeks, p.target, { vs: 'simple', units });
      const stress = simulatePilot(m, p.weeks, p.target, { vs: 'simple', units: stressUnits });
      const canTell = stress.power >= 0.8 && stress.falseAlarm <= 0.1;
      const above = p.target > Math.max(0, vsSimple.hi);
      const sys = SYS.find((x) => x.id === state.sysWorry), ppl = PPL.find((x) => x.id === state.pplWorry);
      const rows = [
        ['Do first, no AI', `Get weekly distributor inventory. Forecast depletions, then set shipments to that plus the inventory change you want. In the back-test the miss against depletions fell from ${pc(ev.wapeCurrent, 1)} to ${pc(ev.wapeSimple, 1)}, worth ${money(noAI.lo)} to ${money(noAI.hi)} a year here.`],
        ['The test', `The AI cuts the typical miss in depletions by at least ${p.target * 100}% against the simple forecast, over ${p.weeks} weeks across ${SCOPE_SHORT[p.scope]}, planner reviewing every forecast. A win beats the better baseline by ${winText(sim.passAt)}, half the target, for luck. Scale if it wins, extend 13 weeks if close, stop if not. Written before it starts.`],
        ['Prove first', [sys && sys.prove, ppl && ppl.prove].filter(Boolean).join(' ') || 'Pick a system and a people worry above to add them here.'],
        ['Owner', 'Head of demand planning owns the scoreboard. VP of Supply Chain decides scale or stop.'],
      ];
      const text = `AI DECISION LAB: PILOT BRIEF\nRidgeline Bourbon, Texas (fictional)\n\n${rows.map(([t, x]) => `${t.toUpperCase()}\n${x}`).join('\n\n')}\n`;
      const copy = h('button', { class: 'btn ghost small', type: 'button', 'aria-live': 'polite', onClick: async () => {
        try { await navigator.clipboard.writeText(text); copy.textContent = 'Copied'; } catch (e) { copy.textContent = 'Copy failed'; }
        setTimeout(() => { copy.textContent = 'Copy as text'; }, 2000);
      } }, 'Copy as text');
      mount(root,
        h('div', { class: 'stack' }, ...top(5, 'biz', 'Turn the idea into an experiment.', 'Three questions decide whether an AI idea is real. Then design a test that could tell.')),
        h('div', { class: 'qrow', 'data-lens': 'biz' },
          h('div', { class: 'qrow-h' }, h('span', { class: 'lens-dot' }), h('b', null, 'Business: does it create value?')),
          h('p', { class: 'prose' }, need === Infinity
            ? `Over a no-AI forecast, AI adds nothing measurable here. `
            : `Over a no-AI forecast, AI is worth about ${money(val.base.net)} a year after costs, and would need ${need.toFixed(1)}× the replay’s gain to pay for itself. `,
            h('strong', null, 'Do this first, with no AI: '), `forecast depletions, not shipments. About ${money(noAI.point)} a year here.`)),
        worry('sys', 'System: can it work?', SYS, 'sysWorry'),
        worry('ppl', 'People: will they use it?', PPL, 'pplWorry'),
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
          h('div', { class: 'actions-r' }, h('button', { class: 'btn ghost', type: 'button', onClick: () => ctx.go('problem') }, 'Start again'))));
      settle(root);
    };
    paint();
    return root;
  },
};

export const screens = [problem, assume, learn, test, pilot];
