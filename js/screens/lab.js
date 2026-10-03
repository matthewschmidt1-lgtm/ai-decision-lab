// The lab, in seven screens. One idea and one thing to do on each.
//   1 The problem   2 The blind spot   3 Teach a neuron   4 Does it beat a spreadsheet?
//   5 Neural nets   6 Three questions  7 The pilot
// Everything is computed live from the data. The model on screen 3 is trained in the browser.

import { h, s, bars, stat, note, mount, int, money, seg, choices, eyebrow } from '../ui.js';
import { lineChart } from '../charts.js';
import { WEEKS, decompose, weekLabel, noiseFloor, COMPETITOR_WEEK, CHAIN_CUT_WEEK } from '../data.js';
import { ALL_GROUPS, DEFAULT_CAUTION, TEST_WEEKS, trainModel, evaluate, bootstrapReduction, dataset, gradientDescent, solveExact,
         maxStableRate, simpleForecast } from '../forecast.js';
import { SCOPES, pairGain, valueRange, breakEvenMultiple, simulatePilot } from '../value.js';
import { VERDICTS, VERDICT, testBeliefs } from '../beliefs.js';
import { actions, ticksFor, rangeText } from './common.js';

export const STEP_NAMES = ['The problem', 'The blind spot', 'Teach a neuron', 'The honest test', 'Neural nets', 'Three questions', 'The pilot'];
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

// ---------------------------------------------------------------- 3. Teach a neuron
const STEPS = 400;
// Early steps are shown one by one (that is where the learning is), later ones in longer jumps.
const FRAMES = (() => { const out = []; let v = 0; while (v < STEPS) { out.push(Math.round(v)); v = v < 12 ? v + 1 : v * 1.12; } out.push(STEPS); return [...new Set(out)]; })();
const train = {
  id: 'train', title: 'Teach a neuron',
  render(ctx) {
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
    let timer = null, run = 0;

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
          mount(msg, note(end > floor * 1.15 ? 'Too slow' : 'It learned', end > floor * 1.15
            ? `Still ${(Math.sqrt(end) * 100).toFixed(1)}% when the steps ran out, against a best of ${(Math.sqrt(floor) * 100).toFixed(1)}%. It would get there, but it needs far more steps.`
            : 'From a random start to the best this model can do, by repeating one move: measure the miss, nudge every weight to shrink it.'));
        }
      }, 85);
    };
    const paintSpeed = () => mount(speedBox, seg(SPEEDS.map(([k, label]) => [k, label]), speed, (id) => { speed = id; paintSpeed(); start(); }));
    paintSpeed();
    // Start when the chart is on screen, so nobody misses the random start.
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); start(); } }, { threshold: 0.6 });
      queueMicrotask(() => { if (hero.isConnected) io.observe(hero); });
    } else queueMicrotask(() => { if (hero.isConnected) start(); });
    draw(0, (() => { const sn = []; gradientDescent(d.Z, d.yc, { lr: 0.02, steps: 1, w0, l2: DEFAULT_CAUTION, onStep: (st, loss, w, b) => sn.push({ loss, w: w.slice(), b }) }); return sn; })(), false);

    return h('div', { class: 'screen stack-l' },
      h('div', { class: 'stack' },
        ...top(3, 'sys', 'Teach it to forecast.',
          'One artificial neuron: inputs times weights, added up. It starts with random weights, so its first forecasts are wild. Then it repeats one move: measure the miss, nudge the weights to shrink it.')),
      hero,
      h('div', { class: 'learn-controls' }, speedBox, h('button', { class: 'btn small', type: 'button', onClick: start }, 'Replay')),
      readout,
      msg,
      h('div', { class: 'stack-s' }, h('div', { class: 'micro' }, 'The weights: how hard each input pushes the forecast'), barsHost),
      actions(ctx, { label: 'Did it beat a spreadsheet?' }));
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
      actions(ctx, { label: 'What are neural nets?' }));
  },
};

// ---------------------------------------------------------------- 5. Neural nets
function neuron() {
  const svg = s('svg', { viewBox: '0 0 220 150', role: 'img', 'aria-label': 'One neuron: several inputs, each multiplied by a weight, added together into one output' });
  [20, 50, 80, 110].forEach((y, i) => {
    svg.append(s('line', { x1: 36, y1: y + 6, x2: 150, y2: 70, class: 'dg-line' }));
    svg.append(s('circle', { cx: 28, cy: y + 6, r: 8, class: 'dg-node' }));
    svg.append(s('text', { x: 78, y: (y + 6 + 70) / 2 - 5, class: 'dg-w', 'text-anchor': 'middle' }, `w${i + 1}`));
  });
  svg.append(s('circle', { cx: 158, cy: 70, r: 14, class: 'dg-node on' }));
  svg.append(s('text', { x: 158, y: 74, class: 'dg-sum', 'text-anchor': 'middle' }, 'Σ'));
  svg.append(s('line', { x1: 172, y1: 70, x2: 214, y2: 70, class: 'dg-line' }));
  return svg;
}
function network() {
  const svg = s('svg', { viewBox: '0 0 220 150', role: 'img', 'aria-label': 'A neural network: layers of neurons, each connected to the next' });
  const layers = [[30, 65, 100], [20, 50, 80, 110], [20, 50, 80, 110], [65]];
  const xs = [24, 80, 136, 194];
  layers.forEach((ys, li) => { if (li) layers[li - 1].forEach((y0) => ys.forEach((y1) => svg.append(s('line', { x1: xs[li - 1], y1: y0 + 6, x2: xs[li], y2: y1 + 6, class: 'dg-line thin' })))); });
  layers.forEach((ys, li) => ys.forEach((y) => svg.append(s('circle', { cx: xs[li], cy: y + 6, r: 6, class: `dg-node${li === 3 ? ' on' : ''}` }))));
  return svg;
}
function language() {
  const svg = s('svg', { viewBox: '0 0 220 150', role: 'img', 'aria-label': 'A language model reads word pieces and predicts the next one' });
  [[10, 62, 'Ridge'], [76, 36, 'is'], [142, 36, 'down']].forEach(([x, w, t]) => {
    svg.append(s('rect', { x, y: 22, width: w, height: 24, rx: 6, class: 'dg-box' }));
    svg.append(s('text', { x: x + w / 2, y: 38, class: 'dg-tok', 'text-anchor': 'middle' }, t));
  });
  svg.append(s('path', { d: 'M40,78 C60,98 80,98 100,78 M100,78 C120,98 140,98 160,78', class: 'dg-line thin', fill: 'none' }));
  svg.append(s('rect', { x: 150, y: 124, width: 60, height: 20, rx: 6, class: 'dg-box on' }));
  svg.append(s('text', { x: 180, y: 138, class: 'dg-tok on', 'text-anchor': 'middle' }, 'by 8%?'));
  return svg;
}

const nets = {
  id: 'nets', title: 'Neural nets',
  render(ctx) {
    const panel = (svg, name, text) => h('div', { class: 'scale-panel' }, svg, h('h3', { class: 'h3' }, name), h('p', { class: 'small' }, text));
    return h('div', { class: 'screen stack-l' },
      h('div', { class: 'stack' }, ...top(5, 'sys', 'You just trained a neuron.', 'Everything bigger is the same recipe, repeated and stacked: guess, measure the miss, nudge the weights, with billions of weights instead of four.')),
      h('div', { class: 'scale-row' },
        panel(neuron(), 'One neuron', 'Inputs times weights, added up. Your forecaster: a straight weighted sum.'),
        panel(network(), 'A neural network', 'Many neurons in layers, with a bend between layers, so it can learn curves and interactions a straight sum cannot.'),
        panel(language(), 'A language model', 'Text becomes numbers, and a huge network learns to predict the next piece.')),
      note('Why we kept it simple', `Even the simple forecast misses by ${pc(EVAL().wapeSimple, 1)}, close to the ${pc(noiseFloor(), 1)} no forecast can beat because weekly depletions are noisy. A bigger model has little to gain here, and choosing the simplest model that works is itself a decision.`),
      actions(ctx, { label: 'Is it worth testing?' }));
  },
};

// ---------------------------------------------------------------- 6. Three questions
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

const lenses = {
  id: 'lenses', title: 'Three questions',
  render(ctx) {
    const { state, save } = ctx;
    const m = MODEL();
    const est = pairGain(m, 'simple', 'ai'), noAI = pairGain(m, 'current', 'simple');
    const r = valueRange(state.value, est), need = breakEvenMultiple(state.value, est.point);
    const root = h('div', { class: 'screen stack-l' });
    const weak = (items, key, label) => {
      const w = items.find((x) => x.id === state[key]);
      return h('div', { class: 'stack-s' },
        h('p', { class: 'small' }, label),
        seg(items.map((x) => [x.id, x.label]), state[key], (id) => { state[key] = id; save(); paint(); }),
        w ? h('p', { class: 'prose reveal' }, h('strong', null, 'Test first: '), w.prove) : null);
    };
    const paint = () => {
      mount(root,
        h('div', { class: 'stack' }, ...top(6, 'biz', 'Three questions decide if an AI idea is real.')),
        h('section', { class: 'lens-card stack-s', 'data-lens': 'biz' },
          h('h2', { class: 'h3' }, h('span', { class: 'lens-dot' }), 'Business: does it create value?'),
          h('div', { class: 'stats' },
            stat('If it goes poorly', money(r.low.net), 'a year, after costs'),
            stat('Your estimate', money(r.base.net), 'a year, after costs', r.base.net < 0 ? 'bad' : 'ai'),
            stat('If it goes well', money(r.high.net), 'a year, after costs')),
          h('p', { class: 'prose' }, need === Infinity
            ? 'AI adds nothing measurable over a spreadsheet at market level, so any value has to come from finer detail the replay did not see.'
            : `Over a no-AI forecast, AI would need about ${need.toFixed(1)}× the gain the replay showed to pay for itself. That is a hypothesis for the pilot, not a finding.`),
          h('p', { class: 'prose' }, h('strong', null, 'Do this first, with no AI: '), `forecast depletions, not shipments. About ${money(noAI.point)} a year in this market (range ${money(noAI.lo)} to ${money(noAI.hi)}, depending on how much cushion you plan).`)),
        h('section', { class: 'lens-card stack-s', 'data-lens': 'sys' },
          h('h2', { class: 'h3' }, h('span', { class: 'lens-dot' }), 'System: can it work?'),
          weak(SYS, 'sysWorry', 'Which would you worry about most?')),
        h('section', { class: 'lens-card stack-s', 'data-lens': 'ppl' },
          h('h2', { class: 'h3' }, h('span', { class: 'lens-dot' }), 'People: will they use it?'),
          weak(PPL, 'pplWorry', 'Which would you worry about most?')),
        actions(ctx, { label: 'Design the pilot' }));
      settle(root);
    };
    paint();
    return root;
  },
};

// ---------------------------------------------------------------- 7. The pilot
const TARGETS = [0.05, 0.1, 0.2];
const WEEKS_OPT = [8, 13, 26];
const SCOPE_SHORT = { lean: 'one distributor (12 SKU groups)', full: 'all three distributors (12 SKU groups each)' };
const winText = (x) => `${(x * 100).toFixed(1).replace('.0', '')}%`;

const pilot = {
  id: 'pilot', title: 'The pilot',
  render(ctx) {
    const { state, save } = ctx;
    const m = MODEL();
    const ev = evaluate(m);
    const vsSimple = bootstrapReduction(ev.rows, 'simple');
    const root = h('div', { class: 'screen stack-l' });
    const paint = () => {
      const p = state.pilot;
      const units = SCOPES[p.scope].units, stressUnits = Math.max(1, Math.round(units / 3));
      const sim = simulatePilot(m, p.weeks, p.target, { vs: 'simple', units });
      const stress = simulatePilot(m, p.weeks, p.target, { vs: 'simple', units: stressUnits });
      const canTell = stress.power >= 0.8 && stress.falseAlarm <= 0.1;
      const above = p.target > Math.max(0, vsSimple.hi);
      const sys = SYS.find((x) => x.id === state.sysWorry), ppl = PPL.find((x) => x.id === state.pplWorry);
      const noAI = pairGain(m, 'current', 'simple');
      const rows = [
        ['Do first, no AI', `Get weekly distributor inventory. Forecast depletions, then set shipments to that plus the inventory change you want. In the back-test the miss against depletions fell from ${pc(ev.wapeCurrent, 1)} to ${pc(ev.wapeSimple, 1)}, worth ${money(noAI.lo)} to ${money(noAI.hi)} a year here.`],
        ['Hypothesis', `At distributor-by-SKU grain, the AI cuts the typical miss in depletions by at least ${p.target * 100}% against the simple forecast. The market-level back-test could not tell them apart.`],
        ['The test', `${p.weeks} weeks, ${SCOPE_SHORT[p.scope]}, three depletions forecasts side by side, planner reviews every one. A win means beating the better baseline by ${winText(sim.passAt)}, half the target, for luck.`],
        ['Decide', 'Scale if it wins, extend 13 weeks if close, stop if not. Written before the test starts.'],
        ['Prove first', [sys && sys.prove, ppl && ppl.prove].filter(Boolean).join(' ') || 'Pick a worry on the last screen to add it here.'],
        ['Owner', 'Head of demand planning owns the scoreboard. VP of Supply Chain decides scale or stop.'],
      ];
      const text = `AI DECISION LAB: PILOT BRIEF\nRidgeline Bourbon, Texas (fictional)\n\n${rows.map(([t, x]) => `${t.toUpperCase()}\n${x}`).join('\n\n')}\n`;
      const copy = h('button', { class: 'btn ghost small', type: 'button', 'aria-live': 'polite', onClick: async () => {
        try { await navigator.clipboard.writeText(text); copy.textContent = 'Copied'; } catch (e) { copy.textContent = 'Copy failed'; }
        setTimeout(() => { copy.textContent = 'Copy as text'; }, 2000);
      } }, 'Copy as text');
      mount(root,
        h('div', { class: 'stack' }, ...top(7, 'biz', 'Turn the idea into an experiment.', 'Decide what you will test, and check that a test this size could tell.')),
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

export const screens = [problem, assume, train, test, nets, lenses, pilot];
