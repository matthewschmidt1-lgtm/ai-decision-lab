// The lab, in seven screens. One idea and one thing to do on each.
//   1 Which loop are you in? (and what happens if each job goes wrong)   2 Where does the time go?
//   3 How it learns (one neuron, then more)   4 The honest test
//   5 Make it stick (the three lenses and the gap)   6 Is it safe to try?   7 The pilot
// Everything is computed live. The models on screen 3 are trained in the browser.

import { h, s, bars, stat, note, mount, int, money, slider, seg, choices, eyebrow, table } from '../ui.js';
import { lineChart } from '../charts.js';
import { WEEKS, weekLabel, noiseFloor, COMPETITOR_WEEK, CHAIN_CUT_WEEK } from '../data.js';
import { ALL_GROUPS, DEFAULT_CAUTION, TEST_WEEKS, trainModel, evaluate, bootstrapReduction, dataset, gradientDescent, solveExact,
         maxStableRate, simpleForecast } from '../forecast.js';
import { SCOPES, pairGain, simulatePilot } from '../value.js';
import { toyData, trainNet, predict, mse } from '../nn.js';
import { testBeliefs } from '../beliefs.js';
import { WEEK, DESTINATIONS, DEST, TEAM, WORK_WEEKS, RATE, ROUTINE_HOURS, grossHours, netHours, freedHours, routineShare, weekAfter, annualRange, REVIEW, reviewHours } from '../time.js';
import { actions, ticksFor, rangeText } from './common.js';

export const STEP_NAMES = ['The loops', 'Time and focus', 'How it learns', 'The honest test', 'Make it stick', 'Safe to try', 'The pilot'];
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
  { id: 'activity', name: 'The activity loop', path: ['Data', 'Spreadsheet', 'Deck', 'Meeting', '“Can you cut it another way?”', 'Spreadsheet'], line: 'A lot of activity, not much progress.' },
  { id: 'learning', name: 'The learning loop', path: ['Signal', 'Understanding', 'Decision', 'Action', 'Learning'], line: 'Every decision makes the next one better.' },
];
export const WHO = [['human', 'Human'], ['computer', 'Computer'], ['together', 'Together']];
const WHO_LABEL = Object.fromEntries(WHO);
const TONE = { human: 'who-human', computer: 'who-computer', together: 'who-together' };
// The right workflow is not set by capability alone. It is capability, uncertainty and consequence.
export const TASKS = [
  { id: 'pattern', text: 'Spot a weekly pattern in three years of orders', best: 'computer', cap: 'High', unc: 'Low', con: 'Low',
    design: 'The computer, spot-checked by a person.',
    fail: { computer: 'It may find a pattern that is not real. Cheap to check, cheap to be wrong.', human: 'Too slow to read three years of weeks, so the pattern is never found.', together: 'A sound default: the computer finds it, a person sanity-checks it.' } },
  { id: 'chain', text: 'Decide whether to give Chain X the price it wants', best: 'together', cap: 'Medium', unc: 'High', con: 'High',
    design: 'A person decides and is accountable, with the computer supporting the analysis.',
    fail: { computer: 'It optimizes on what Chain X has paid before. The relationship takes the damage.', human: 'Ignoring the data leaves money on the table.', together: 'The computer brings elasticity and profitability. A person owns the call.' } },
  { id: 'reconcile', text: 'Reconcile two distributors’ spreadsheets', best: 'computer', cap: 'High', unc: 'Low', con: 'Medium',
    design: 'The computer, with automatic checks and flagged exceptions.',
    fail: { computer: 'A silent mismatch slips through unless it checks itself.', human: 'Slow, and a tired eye misses rows.', together: 'The computer matches. A person reviews only the rows it flags.' } },
  { id: 'draft', text: 'Draft next week’s forecast, then check it against what you know', best: 'together', cap: 'High', unc: 'Medium', con: 'Medium',
    design: 'The computer drafts, a person checks.',
    fail: { computer: 'An AI error becomes an inventory problem.', human: 'A human error is a missed signal.', together: 'The combined workflow can catch both.' } },
  { id: 'rival', text: 'Notice that a rival’s launch changes what history says', best: 'human', cap: 'Low', unc: 'High', con: 'Medium',
    design: 'A person leads. The computer can flag unusual weeks.',
    fail: { computer: 'The model sees the historical pattern and forecasts as if nothing happened.', human: 'A person notices the new event, overrides the model and reframes it.', together: 'Even better if the computer flags unusual weeks and a person decides what they mean.' } },
];

const loops = {
  id: 'loops', title: 'The loops',
  render(ctx) {
    const { state, save } = ctx;
    const root = h('div', { class: 'screen stack-l' });
    let cur = null;
    const paint = () => {
      const sorts = {};
      TASKS.forEach((t) => { if (WHO_LABEL[state.sorts && state.sorts[t.id]]) sorts[t.id] = state.sorts[t.id]; });
      state.sorts = sorts;
      state.sorted = TASKS.every((t) => sorts[t.id]);
      if (cur === null) cur = state.sorted ? TASKS.length : TASKS.findIndex((t) => !sorts[t.id]);
      const t = TASKS[cur];
      let job;
      if (!t) {
        job = h('div', { class: 'stack-s reveal' },
          h('h3', { class: 'h3' }, 'The right workflow depends on three things, not one.'),
          table(['Job', 'Computer can', 'Uncertainty', 'Cost of a mistake', 'Usual design'],
            TASKS.map((x) => [x.text, x.cap, x.unc, x.con, x.design])),
          h('p', { class: 'small' }, 'Capability, uncertainty and consequence set the workflow. Context can change any of these answers, so treat them as a starting design, not a rule.'));
      } else if (!sorts[t.id]) {
        job = h('div', { class: 'stack-s' }, h('div', { class: 'micro' }, `Job ${cur + 1} of ${TASKS.length}`),
          h('div', { class: 'belief' }, h('p', { class: 'belief-q' }, t.text), h('p', { class: 'small' }, 'Who should do this?'),
            seg(WHO, null, (id) => { sorts[t.id] = id; state.sorts = sorts; save(); paint(); })));
      } else {
        const mine = sorts[t.id];
        job = h('div', { class: 'stack-s reveal' }, h('div', { class: 'micro' }, `Job ${cur + 1} of ${TASKS.length}`),
          h('div', { class: 'belief result' }, h('p', { class: 'belief-q' }, t.text),
            h('div', { class: 'belief-chips' }, h('span', { class: `chip ${TONE[mine]}` }, `You said: ${WHO_LABEL[mine]}`), h('span', { class: 'micro' }, `Usual design: ${t.design}`)),
            h('h4', { class: 'small' }, 'What happens if it goes wrong?'),
            h('ul', { class: 'fail' }, WHO.map(([k, label]) => h('li', { class: k === mine ? 'mine' : '' }, h('b', null, `${label}: `), t.fail[k])))),
          h('div', null, h('button', { class: 'btn small', type: 'button', onClick: () => { cur += 1; paint(); } }, cur + 1 < TASKS.length ? 'Next job' : 'See the pattern', h('span', { 'aria-hidden': 'true' }, '→'))));
      }
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
        h('div', { class: 'stack-s' }, h('h3', { class: 'h3' }, 'Who should do each job? Then ask what happens if you get it wrong.'), job),
        !t ? actions(ctx, { label: 'Where does the time go?' }) : null);
      settle(root);
    };
    paint();
    return root;
  },
};

// ---------------------------------------------------------------- 2. Where does the time go?
const SEG_COLOR = {
  gather: 'color-mix(in srgb, var(--sys) 100%, var(--paper))', forecast: 'color-mix(in srgb, var(--sys) 60%, var(--paper))',
  decks: 'var(--line-2)', review: 'var(--muted)', judgment: 'var(--biz)', markets: 'var(--ppl)', experiments: 'var(--accent)',
  checking: 'repeating-linear-gradient(135deg, var(--muted) 0 4px, var(--paper) 4px 8px)',
};
const OUTCOME = {
  none: 'No value: the hours refill',
  cost: 'Cost avoided, if it avoids a hire',
  capacity: 'Capacity for judgment, a saving only if headcount changes',
  learning: 'Learning, value not yet measured',
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
    const share = () => (typeof state.autoShare === 'number' ? Math.min(1, Math.max(0, state.autoShare)) : 0.6);
    const dest = () => (DEST[state.destination] ? state.destination : 'judgment');
    const out = h('div', { class: 'stack' });
    const paintOut = () => {
      const s0 = share(), d = dest();
      const net = netHours(s0), gross = grossHours(s0);
      const rg = annualRange(s0, d), a = rg.mid;
      const rows = weekAfter(s0, d);
      const keyRows = [...WEEK, { id: 'checking', label: 'New work: checking AI output' }, ...(d === 'markets' ? [{ id: 'markets', label: 'More brands and markets' }] : d === 'experiments' ? [{ id: 'experiments', label: 'Testing new ideas' }] : [])];
      mount(out,
        h('p', { class: 'verdict' }, `You just gave each planner ${hrs(net)} back, every week. What will the business do with them?`),
        h('div', { class: 'wk' },
          h('div', { class: 'wk-row' }, h('span', { class: 'wk-label' }, 'Today'), weekBar(WEEK.map((w) => ({ id: w.id, label: w.label, hours: w.hours })))),
          h('div', { class: 'wk-row' }, h('span', { class: 'wk-label' }, 'With AI'), weekBar(rows))),
        h('div', { class: 'wk-key small' }, keyRows.map((w) => h('span', null, h('i', { style: { background: SEG_COLOR[w.id] } }), w.label))),
        h('p', { class: 'small' }, `Automation releases ${hrs(gross)} (${pc(routineShare(s0))} of the ${ROUTINE_HOURS} routine hours), less ${hrs(gross - net)} of new checking work.`),
        h('div', { class: 'loop-path flow' }, [`Automation ${pc(s0)}`, `Hours released ${hrs(net)}`, `Redeployed: ${DEST[d].label.toLowerCase()}`, OUTCOME[DEST[d].kind]].flatMap((t, i, arr) => [h('span', null, t), i < arr.length - 1 ? h('i', { 'aria-hidden': 'true' }, '→') : null])),
        h('div', { class: 'stats' },
          stat('Net hours back', `${hrs(net)} a week`, `range ${hrs(rg.low.perWeek)} to ${hrs(rg.high.perWeek)}`, 'ai'),
          stat('Capacity created', `${Math.round(a.hours).toLocaleString('en-US')} h`, `a year: ${TEAM} planners, ${WORK_WEEKS} weeks`),
          stat(a.value ? 'At cost, up to' : 'Value', a.value ? money(a.value) : '$0', a.value ? OUTCOME[a.kind].toLowerCase() : 'the hours refill')),
        h('p', { class: 'small' }, `Assumes ${WORK_WEEKS} working weeks, ${TEAM} planners and $${RATE} an hour fully loaded. The week itself is illustrative. Capacity is not savings, and neither is business value: those depend on what happens next. Would you still fund it at the low end (${hrs(rg.low.perWeek)} a week)?`));
    };
    const sl = slider({ label: 'How far to push automation', min: 0, max: 1, step: 0.1, value: share(), fmt: (v) => pc(v), hint: 'At 100% a computer takes over everything it realistically can.', onInput: (v) => { state.autoShare = v; save(); paintOut(); } });
    const dst = h('div', { class: 'stack-s' }, h('h3', { class: 'h3' }, 'Where do the freed hours go?'),
      choices({ name: 'Destination', items: DESTINATIONS.map((d) => ({ id: d.id, title: d.label, sub: d.sub })), value: dest(), onPick: (id) => { state.destination = id; save(); paintOut(); } }));
    paintOut();
    return h('div', { class: 'screen stack-l' },
      h('div', { class: 'stack' }, ...top(2, 'biz', 'Where does the time go?',
        'Time and focus are what a business runs short of. Here is one planner’s week. Gathering and reconciling feel like the job. They are what everyone has learned to accept.')),
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
          ...top(3, 'sys', stage === 'neuron' ? 'Teach it to forecast.' : 'Now give it more neurons.',
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
        ...top(4, 'sys', 'Did it beat a spreadsheet?',
          `We kept the last ${TEST_WEEKS.length} weeks hidden from the model, then asked it, today’s method and a simple forecast with no AI to predict them. This is a back-test: a replay of history.`)),
      chart,
      h('div', { class: 'stats' },
        stat('Today’s forecast', pc(ev.wapeCurrent, 1), `typical miss vs depletions. ${pc(shipMiss, 1)} against shipments, what it forecasts`),
        stat('Simple, no AI', pc(ev.wapeSimple, 1), 'typical miss vs depletions'),
        stat('AI forecast', pc(ev.wapeAI, 1), 'typical miss vs depletions', 'ai')),
      h('p', { class: 'verdict' }, `Most of the gain is not AI. Forecasting depletions instead of shipments, with a trend measured from recent weeks, cuts the miss against depletions by ${Math.round(fixed * 100)}%. The AI is ${how} that.`),
      note('Where it needs a person', `The forecasting neuron did not overfit: it missed by ${pc(HISTORY().trainWape, 1)} on weeks it learned from and ${pc(HISTORY().examWape, 1)} on new ones. But it cannot see a rival launching or a chain resetting its range. A person has to, and has to be free to override it.`),
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
        actions(ctx, { label: 'Is it safe to try?' }));
      settle(root);
    };
    paint();
    return root;
  },
};

// ---------------------------------------------------------------- 6. Is it safe to try?
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
const ADOPT_LOOPS = [
  { id: 'safe', name: 'Safe to try', path: ['Try', 'Fail', 'Speak up', 'Learn', 'Improve', 'Try again'], line: 'Leadership sees what is really happening.' },
  { id: 'unsafe', name: 'Not safe to try', path: ['Try', 'Fail', 'Hide it', 'Leadership never knows', 'Repeat'], line: 'Leadership thinks AI is working.' },
];

const safe = {
  id: 'safe', title: 'Safe to try',
  render(ctx) {
    const { state, save } = ctx;
    const root = h('div', { class: 'screen stack-l' });
    const paint = () => {
      if (!ANNOUNCE.some((a) => a.id === state.announce)) state.announce = null;
      state.safeAns = (Array.isArray(state.safeAns) ? state.safeAns : []).filter((id) => SAFE_QS.some(([k]) => k === id));
      const pick = ANNOUNCE.find((a) => a.id === state.announce);
      const yes = state.safeAns.length;
      mount(root,
        h('div', { class: 'stack' }, ...top(6, 'ppl', 'Is it safe to try?',
          'Telling everyone to use AI can mean very different things to the people hearing it. What they hear decides whether they tell you what is really happening.')),
        h('div', { class: 'stack-s' },
          h('h3', { class: 'h3' }, 'You are the CEO. Which announcement do you make?'),
          choices({ name: 'Announcement', items: ANNOUNCE.map((a) => ({ id: a.id, title: a.text })), value: state.announce, onPick: (id) => { state.announce = id; save(); paint(); } }),
          pick ? h('p', { class: 'prose reveal' }, h('strong', null, 'What an employee hears: '), pick.hear) : null),
        h('div', { class: 'loops pair' }, ADOPT_LOOPS.map((l) => h('div', { class: `loop ${l.id === 'safe' ? 'learning' : 'activity'}${pick && (pick.safe === (l.id === 'safe')) ? ' on' : ''}` },
          h('b', null, l.name),
          h('div', { class: 'loop-path' }, l.path.flatMap((p, i) => [h('span', null, p), i < l.path.length - 1 ? h('i', { 'aria-hidden': 'true' }, '→') : null])),
          h('p', { class: 'small' }, l.line)))),
        h('div', { class: 'stack-s' },
          h('h3', { class: 'h3' }, 'Before you announce: can your people answer these today?'),
          h('div', { class: 'qchecks' }, SAFE_QS.map(([id, q]) => {
            const on = state.safeAns.includes(id);
            return h('button', { class: 'qcheck', type: 'button', 'aria-pressed': String(on), onClick: () => { state.safeAns = on ? state.safeAns.filter((x) => x !== id) : [...state.safeAns, id]; save(); paint(); } }, h('i', { 'aria-hidden': 'true' }), q);
          })),
          h('p', { class: 'small' }, yes === SAFE_QS.length
            ? 'All six answered. People can say “I do not know” and “I do not trust this output” without penalty.'
            : `${yes} of ${SAFE_QS.length} answered. Each gap is a reason to wait. Telling people to use AI before answering them creates uncertainty, not adoption.`)),
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
      const answered = Array.isArray(state.safeAns) ? state.safeAns : [], open = SAFE_QS.filter(([k]) => !answered.includes(k));
      const maxed = p.weeks === 26 && p.scope === 'full';
      const rows = [
        ['Do first, no AI', `Get weekly distributor inventory. Forecast depletions, then set shipments to that plus the inventory change you want. In the back-test the miss against depletions fell from ${pc(ev.wapeCurrent, 1)} to ${pc(ev.wapeSimple, 1)}, worth ${money(noAI.lo)} to ${money(noAI.hi)} a year here.`],
        ['Redeploy the time', DEST[dest].kind === 'none' ? 'Decide first where the freed hours go. Left alone they refill the calendar, and the value is zero.' : `${hrs(netHours(share))} a week per planner, after new checking work, moved to ${DEST[dest].label.toLowerCase()}. Capacity is not savings: it is value only once redeployed.`],
        ['The test', `The AI cuts the typical miss in depletions by at least ${p.target * 100}% against the simple forecast, over ${p.weeks} weeks across ${SCOPE_SHORT[p.scope]}. A win beats the better baseline by ${winText(sim.passAt)}, half the target, for luck. Scale if it wins, extend 13 weeks if close, stop if not. Written before it starts.`],
        ['Review', `${mode.label}: ${hrs(reviewHours(mode.id))} a week per planner, down from ${hrs(reviewHours('review'))}. The planner stays accountable.`],
        ['Close the gap first', g ? g.prove : 'Pick your gap on the Make it stick screen to add it here.'],
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
        h('div', { class: 'stack' }, ...top(7, 'biz', 'Turn the idea into an experiment.', 'Decide what you will test, and check that a test this size could tell.')),
        h('div', { class: 'pilot-controls' },
          h('div', { class: 'stack-s' }, h('h3', { class: 'h3' }, 'The AI will cut the miss by at least'), seg(TARGETS.map((t) => [String(t), `${t * 100}%`]), String(p.target), (v) => { p.target = +v; save(); paint(); })),
          h('div', { class: 'stack-s' }, h('h3', { class: 'h3' }, 'For'), seg(WEEKS_OPT.map((w) => [String(w), `${w} weeks`]), String(p.weeks), (v) => { p.weeks = +v; save(); paint(); })),
          h('div', { class: 'stack-s' }, h('h3', { class: 'h3' }, 'Across'), seg([['lean', 'One distributor'], ['full', 'All three']], p.scope, (v) => { p.scope = v; save(); paint(); }))),
        h('div', { class: 'finding' },
          h('p', { class: 'says' }, canTell
            ? `This design can find out. If the gain is real it shows a win ${Math.round(stress.power * 100)}% of the time, and if the AI adds nothing it shows a false win only ${Math.round(stress.falseAlarm * 100)}% of the time.`
            : `This design cannot reliably find out. If the gain is real it shows a win ${Math.round(stress.power * 100)}% of the time, and if the AI adds nothing it still shows one ${Math.round(stress.falseAlarm * 100)}% of the time. ${maxed ? 'Even the largest design here cannot settle it at this target: aim for a bigger effect, or accept the pilot will not decide it.' : 'Try more weeks or all three distributors.'}`),
          h('p', { class: 'small' }, `Assumes only a third of your series are independent, since real ones share a model and a calendar.${above ? ` A ${p.target * 100}% target is above the best case the replay allowed (${pc(Math.max(0, vsSimple.hi), 1)}), so read this as the chance of a win only if that gain is real.` : ''}`)),
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

export const screens = [loops, time, learn, test, stick, safe, pilot];
