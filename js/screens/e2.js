// Experience 2: Open the hood.
// Business question -> intuition -> interaction -> explanation -> model -> math -> code.
// Everything on these screens is computed live from the data. Nothing is staged.

import { h, s, bars, slider, stat, note, term, mount, int, money, table, waterfall, dotPlot, disclose, seg } from '../ui.js';
import { lineChart } from '../charts.js';
import { WEEKS, TRAIN_START, VALID_START, HOLDOUT_START, EMBARGO, N, weekLabel, monthLabel, COMPETITOR_WEEK, CHAIN_CUT_WEEK, MARGIN_PER_CASE, CARRY_PER_CASE,
         noiseFloor, TRUTH_EFFECTS } from '../data.js';
import { GROUPS, ALL_GROUPS, TEST_WEEKS, CAUTION_LEVELS, DEFAULT_CAUTION, trainModel, evaluate, evaluateValid, explain, importance, predict,
         predictLog, dataset, gradientDescent, solveExact, maxStableRate, rollingOrigin, bootstrapReduction, simpleForecast } from '../forecast.js';
import { costCurves, CUSHIONS, pairGain, flatBottom } from '../value.js';
import { head, actions, ticksFor, modelFor, recipeOf, rangeText } from './common.js';

const pc = (v, d = 1) => `${(v * 100).toFixed(d)}%`;
const spc = (v, d = 0) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v * 100).toFixed(d)}%`;
const GROUP = Object.fromEntries(GROUPS.map((g) => [g.id, g]));
const key = (a) => [...a].sort().join('|');
const FLOOR = noiseFloor();
const NTEST = TEST_WEEKS.length;
const DEFAULT = { groups: ALL_GROUPS, l2: DEFAULT_CAUTION };
const defaultModel = () => trainModel(DEFAULT.groups, { l2: DEFAULT.l2 });
const cautionName = (l2) => (CAUTION_LEVELS.find(([v]) => Math.abs(v - l2) < 1e-9) || [0, 'Custom'])[1].toLowerCase();

// ---- the depth gauge: how far down the hood you are ----
const LAYERS = [
  ['e2-business', 'The business view'], ['e2-data', 'Data'], ['e2-features', 'Features'], ['e2-model', 'Model'],
  ['e2-decide', 'Prediction to decision'], ['e2-learn', 'How it learns'], ['e2-math', 'Math and code'], ['e2-scale', 'Scaling up'],
];
function hood(ctx, id, ...body) {
  const at = LAYERS.findIndex(([k]) => k === id);
  const gauge = h('nav', { class: 'gauge', 'aria-label': 'Layers' },
    h('div', { class: 'gauge-title micro' }, 'Depth'),
    h('ol', null, LAYERS.map(([k, label], i) => h('li', { 'data-state': i < at ? 'above' : i === at ? 'here' : 'below' },
      h('button', { type: 'button', onClick: () => ctx.go(k), 'aria-current': i === at ? 'step' : null }, h('i'), h('span', null, label))))));
  return h('div', { class: 'screen hood' }, gauge, h('div', { class: 'hood-body stack-l' }, ...body));
}

// ---- charts of forecasts against what shoppers bought ----
const SERIES = {
  actual: { name: 'What shoppers bought', short: 'Actual', color: 'var(--s-actual)', width: 2.5 },
  current: { name: 'Today’s forecast', short: 'Today', color: 'var(--s-current)', dash: '5 5', width: 2 },
  simple: { name: 'Simple no-AI forecast', short: 'No-AI', color: 'var(--s-simple)', dash: '1 4', width: 2.5 },
  ai: { name: 'AI forecast', short: 'AI', color: 'var(--s-ai)', width: 2.5 },
};
const seriesFrom = (ev, keys = ['actual', 'current', 'simple', 'ai']) => keys.map((k) => ({ ...SERIES[k], values: ev.rows.map((r) => r[k]) }));
const bandFrom = (ev) => ({ lo: ev.rows.map((r) => r.ai * Math.exp(-ev.band)), hi: ev.rows.map((r) => r.ai * Math.exp(ev.band)), name: 'AI 80% range' });

function forecastChart(ev, { band = false, height = 280, markers = true } = {}) {
  const from = ev.rows[0].t, n = ev.rows.length;
  const mk = [];
  if (markers) {
    if (COMPETITOR_WEEK >= from && COMPETITOR_WEEK < from + n) mk.push({ i: COMPETITOR_WEEK - from, text: 'Competitor launches' });
    if (CHAIN_CUT_WEEK >= from && CHAIN_CUT_WEEK < from + n) mk.push({ i: CHAIN_CUT_WEEK - from, text: 'Chain X resets our range', dy: 18 });
  }
  return lineChart({
    n, height, yFmt: (v) => int(v), direct: true, yMin: 2800,
    series: seriesFrom(ev), band: band ? bandFrom(ev) : null,
    ticks: ticksFor(from, from + n - 1, 6).slice(0, 5), xLabel: (i) => `Week of ${weekLabel(from + i)}`, tipFmt: (v) => `${int(v)} cases`,
    markers: mk, desc: 'Weekly cases: what shoppers bought, today’s forecast, a simple no-AI forecast and the AI forecast.',
  });
}

// What the numbers say, in plain words, whatever they turn out to be.
function verdictText(ev) {
  const fixed = (ev.wapeCurrent - ev.wapeSimple) / ev.wapeCurrent;
  const gap = ev.wapeAI - ev.wapeSimple;
  const how = Math.abs(gap) < 0.004 ? 'about the same as' : gap < 0 ? 'a little better than' : 'worse than';
  return `Most of the improvement is not AI. A simple method that forecasts what shoppers bought, not what distributors shipped, cuts the typical miss from ${pc(ev.wapeCurrent)} to ${pc(ev.wapeSimple)}, a ${Math.round(fixed * 100)}% reduction. The AI forecast scores ${pc(ev.wapeAI)}, ${how} the simple method.`;
}

// ---------------------------------------------------------------- 0. The business view
const business = {
  id: 'e2-business', exp: 2, adopt: 'fit', title: 'The business view',
  render(ctx) {
    const m = defaultModel();
    const ev = evaluate(m);
    const chart = forecastChart(ev, { height: 300 });
    let band = false;
    const toggle = h('button', { class: 'btn ghost small', type: 'button', onClick: () => { band = !band; toggle.textContent = band ? 'Hide the forecast range' : 'Show the forecast range'; chart.update({ band: band ? bandFrom(ev) : null }); } }, 'Show the forecast range');
    const roll = rollingOrigin(DEFAULT.groups, DEFAULT.l2);
    const mlab = (st) => `${monthLabel(st)} to ${monthLabel(Math.min(N - 1, st + 12))}`;
    const winsToday = roll.filter((r) => r.wapeAI < r.wapeCurrent).length, winsSimple = roll.filter((r) => r.wapeAI < r.wapeSimple).length;
    const vsToday = bootstrapReduction(ev.rows, 'current'), vsSimple = bootstrapReduction(ev.rows, 'simple');
    const shipMiss = TEST_WEEKS.reduce((a, t) => a + Math.abs(WEEKS[t].cf - WEEKS[t].ship), 0) / TEST_WEEKS.reduce((a, t) => a + WEEKS[t].ship, 0);
    const examNote = ev.wapeAI > ev.wapeSimple + 0.004 ? ' On the exam weeks, the most recent and the hardest, it did not beat the simple method.' : ev.wapeAI < ev.wapeSimple - 0.004 ? ' On the exam weeks it also beat the simple method.' : ' On the exam weeks it was level with the simple method.';
    return hood(ctx, 'e2-business',
      h('div', { class: 'stack' },
        ...head({ lens: 'sys', exp: 2, stage: 'Understanding', title: 'What would a model have said?', wide: true }),
        h('p', { class: 'lede' }, 'We taught a forecasting model from history, then ',
          h('strong', null, `kept the last ${NTEST} weeks`), ' back. We asked it, today’s method, and a simple method with no AI in it to forecast those weeks. The model’s recipe was fixed in advance, and nothing was tuned on these weeks.')),
      h('div', { class: 'stack-s' },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('div', { class: 'micro' }, 'Weekly cases · hover for detail'), toggle),
        chart),
      h('p', { class: 'verdict' }, verdictText(ev)),
      h('div', { class: 'stats' },
        stat('Today’s forecast', pc(ev.wapeCurrent), `typical miss against shopper sales. Scored on shipments, which is what it forecasts, it misses by ${pc(shipMiss)}. It runs ${pc(ev.biasCurrent, 0)} above shopper sales.`),
        stat('Simple, no AI', pc(ev.wapeSimple), 'Same week last year, scaled by the recent trend.'),
        stat('AI forecast', pc(ev.wapeAI), `The simple forecast plus learned corrections, ${cautionName(DEFAULT.l2)}.`, 'ai'),
        stat('The noise floor', `≈ ${pc(FLOOR)}`, 'Even a forecast that knew the true demand would miss this much. Weeks are noisy.')),
      h('p', { class: 'micro' }, 'Today’s forecast here is a deliberately plain stand-in for any forecast built from last year’s shipments. It is not a verdict on anyone’s planning.'),
      h('div', { class: 'terms' }, term('Typical miss', 'Out of every 100 cases shoppers bought, how many the forecast was off by (weighted average percentage error). Lower is better.')),
      h('div', { class: 'stack-s' },
        h('h3', { class: 'h3' }, 'One test window is one roll of the dice'),
        h('p', { class: 'prose' }, `So we rolled forward five times, retraining each time and forecasting the next 13 weeks. The AI beat today’s forecast in ${winsToday} of 5 windows and the simple method in ${winsSimple} of 5.${examNote} The windows overlap the choosing and exam weeks, so they are not independent tests.`),
        dotPlot({
          legend: [{ name: 'Today', color: 'var(--s-current)' }, { name: 'No-AI', color: 'var(--s-simple)' }, { name: 'AI', color: 'var(--s-ai)' }],
          rows: roll.map((r) => ({ label: mlab(r.start), points: [{ name: 'Today', v: r.wapeCurrent, color: 'var(--s-current)' }, { name: 'No-AI', v: r.wapeSimple, color: 'var(--s-simple)' }, { name: 'AI', v: r.wapeAI, color: 'var(--s-ai)' }] })),
        }),
        h('p', { class: 'micro' }, 'Each row is a separate 13-week test. The largest dot is the best method that time. Lower is better.')),
      h('div', { class: 'split' },
        note('How sure?', `On the exam weeks the AI ${rangeText(vsToday)} against today’s forecast, and ${rangeText(vsSimple)} against the simple method. When a range crosses zero, the data cannot tell the two apart.`),
        note('Be careful', `A back-test is flattering: the answers are known and nothing is at stake. And look at the floor. At ≈${pc(FLOOR)} there is little room left above the simple method. It shows the idea is worth testing, not that it will work.`)),
      actions(ctx, { label: 'Open the hood: the data' }));
  },
};

// ---------------------------------------------------------------- 1. Data
const data = {
  id: 'e2-data', exp: 2, adopt: 'fit', title: 'Data',
  render(ctx) {
    const dep = WEEKS.map((w) => w.dep);
    const m = defaultModel();
    const rows = [];
    for (let t = HOLDOUT_START - 6; t < HOLDOUT_START; t++) {
      const w = WEEKS[t], ly = WEEKS[t - 52];
      const dp = (w.promo - ly.promo) * 100;
      rows.push([weekLabel(t), int(w.dep), spc(Math.log(w.dep / ly.dep)), spc(Math.log(w.list / ly.list), 1), `${dp >= 0 ? '+' : '−'}${Math.abs(dp).toFixed(0)} pts`, spc(Math.log(WEEKS[t - 5].dist / WEEKS[t - 57].dist), 1)]);
    }
    const learnEnd = VALID_START - EMBARGO - 1;
    return hood(ctx, 'e2-data',
      h('div', { class: 'stack' },
        ...head({ lens: 'sys', exp: 2, stage: 'Understanding', title: 'What did it learn from?', wide: true }),
        h('p', { class: 'lede' }, 'History. Each week is one row: how many cases shoppers bought compared with the same week a year earlier, and what changed in the market. The model learns from about ',
          h('strong', null, `${m.d.weeks.length} rows`), ' like these, and from nothing else.')),
      h('div', { class: 'stack-s' },
        h('div', { class: 'micro' }, 'Weekly cases shoppers bought, three years'),
        lineChart({
          n: N, height: 250, yMin: 2800, yFmt: (v) => int(v),
          series: [{ name: 'What shoppers bought', values: dep, color: 'var(--s-actual)', width: 2 }],
          spans: [{ from: VALID_START, to: HOLDOUT_START - 1, text: 'Choose', cls: 'alt', anchor: 'start' }, { from: HOLDOUT_START, to: N - 1, text: 'Exam' }],
          ticks: ticksFor(0, N - 1, 26), xLabel: (i) => `Week of ${weekLabel(i)}`, tipFmt: (v) => `${int(v)} cases`,
          desc: 'Three years of weekly shopper purchases with a seasonal peak each holiday season. The last 52 weeks are shaded: the first half is for making choices, the second half is the final exam.',
        })),
      h('div', { class: 'stack-s' },
        h('h3', { class: 'h3' }, 'Three slices of time'),
        h('div', { class: 'slices' },
          h('div', { class: 'slice' }, h('b', null, 'Learn'), h('span', null, `Weeks ${TRAIN_START} to ${learnEnd}. The model studies these.`)),
          h('div', { class: 'slice valid' }, h('b', null, 'Choose'), h('span', null, `Weeks ${VALID_START} to ${HOLDOUT_START - 1}. You decide on these.`)),
          h('div', { class: 'slice test' }, h('b', null, 'Exam'), h('span', null, `Weeks ${HOLDOUT_START} to ${N - 1}. Scored at the end.`))),
        h('p', { class: 'small' }, `A model never learns from the ${EMBARGO} weeks before the period it forecasts, because those weeks had not happened yet when its first forecast would have been made. For the exam the final model is refit on everything before that gap, weeks ${TRAIN_START} to ${HOLDOUT_START - EMBARGO - 1}.`)),
      h('div', { class: 'stack-s' },
        h('h3', { class: 'h3' }, 'Six of the rows it saw'),
        table(['Week of', 'Cases', 'vs. last year', 'Price', 'Promotion', 'Distribution'], rows, { num: [1, 2, 3, 4, 5] })),
      h('div', { class: 'terms' }, term('Training data', 'The history a model learns from. It must never include the weeks it is later scored on, or the weeks you used to make choices.')),
      h('div', { class: 'split' },
        note('How small', 'That is the whole dataset: a handful of numbers per week. It is not “big data”. A useful model can start small, which is why a pilot can start small.'),
        note('A catch', 'This is what shoppers bought, not what they wanted. In weeks when shelves ran empty, true demand was higher. Every model inherits the blind spots of its data.')),
      actions(ctx, { label: 'Next layer: features' }));
  },
};

// ---------------------------------------------------------------- 2. Features
const features = {
  id: 'e2-features', exp: 2, adopt: 'fit', title: 'Features',
  render(ctx) {
    const { state, save } = ctx;
    const chart = forecastChart(evaluateValid(state.features.length ? state.features : ALL_GROUPS, state.caution), { height: 240, markers: false });
    const box = h('div', { class: 'stack-l' });
    const paint = () => {
      const on = state.features, l2 = state.caution;
      const evV = evaluateValid(on, l2);
      const baseV = evaluateValid(ALL_GROUPS, DEFAULT.l2);
      chart.update({ series: seriesFrom(evV) });
      const toggles = GROUPS.map((g) => {
        const isOn = on.includes(g.id);
        const alt = isOn ? on.filter((x) => x !== g.id) : [...on, g.id];
        const delta = alt.length ? (evaluateValid(alt, l2).wapeAI - evV.wapeAI) * 100 : null;
        const flat = delta != null && Math.abs(delta) < 0.05;
        return h('button', {
          class: 'toggle', type: 'button', role: 'switch', 'aria-checked': String(isOn), disabled: isOn && on.length === 1,
          onClick: () => { state.features = alt.length ? ALL_GROUPS.filter((x) => alt.includes(x)) : on; save(); paint(); },
        }, h('span', { class: 'toggle-sw' }),
          h('span', null, h('span', { class: 'toggle-t' }, g.label), h('span', { class: 'toggle-h' }, g.hint)),
          delta == null ? h('span') : h('span', { class: `toggle-d ${flat ? '' : delta > 0 ? 'down' : 'up'}` },
            flat ? 'No change either way' : `If ${isOn ? 'off' : 'on'}: ${Math.abs(delta).toFixed(1)} pts ${delta > 0 ? 'worse' : 'better'}`));
      });
      const removed = ALL_GROUPS.filter((x) => !on.includes(x));
      const names = removed.map((x) => GROUP[x].short.toLowerCase()).join(' and ');
      let insight;
      const changed = removed.length || Math.abs(l2 - DEFAULT.l2) > 1e-9;
      if (!changed) insight = 'Try turning something off, or changing the caution. Each change shows what it would do to the miss on the choosing weeks, which the model has not learned from and which are not the final exam.';
      else if (evV.wapeAI < baseV.wapeAI - 0.0005) insight = `That recipe is better on the choosing weeks: ${pc(baseV.wapeAI)} down to ${pc(evV.wapeAI)}. Whether it holds when something breaks is another matter. The choosing weeks were a calm stretch, and you can find out how it does on the exam when you score it.`;
      else if (evV.wapeAI > baseV.wapeAI + 0.0005) insight = `That recipe is worse on the choosing weeks: ${pc(baseV.wapeAI)} up to ${pc(evV.wapeAI)}${removed.length ? `, without ${names}` : ''}. That setting was doing real work.`;
      else insight = 'That made almost no difference.';

      const locked = state.locked;
      const stale = locked && (key(locked.features) !== key(on) || Math.abs(locked.caution - l2) > 1e-9);
      let lockEl = null;
      if (!locked || stale) {
        lockEl = h('div', { class: `lockbox${stale ? ' warn' : ''}` },
          h('h3', { class: 'h3' }, locked ? 'You changed the recipe. Score it again?' : 'Ready? Score your recipe on the exam weeks.'),
          h('p', { class: 'prose' }, locked
            ? 'Scoring again is another look at the same exam weeks. Each look makes the result a little less clean: a recipe tuned by peeking at the answers looks better than it will be.'
            : 'The exam weeks were shown once already, for the recipe fixed in advance, so scoring yours is a second look. Nothing has been tuned on them yet, and that is what to protect.'),
          h('div', null, h('button', { class: 'btn', type: 'button', onClick: () => { state.locked = { features: [...on], caution: l2 }; save(); paint(); } }, locked ? 'Lock in and score again' : 'Lock in and score')));
      }
      let resultEl = null;
      if (locked) {
        const evT = evaluate(trainModel(locked.features, { l2: locked.caution })), allT = evaluate(defaultModel());
        const worse = evT.wapeAI > allT.wapeAI + 0.003, better = evT.wapeAI < allT.wapeAI - 0.003;
        const same = key(locked.features) === key(ALL_GROUPS) && Math.abs(locked.caution - DEFAULT.l2) < 1e-9;
        let lesson;
        if (same) lesson = 'You kept the recipe set in advance, so nothing was chosen by looking at results. That is the cleanest test there is.';
        else if (worse) lesson = `Your recipe did worse on the exam than the one set in advance (${pc(evT.wapeAI)} against ${pc(allT.wapeAI)}). Choosing on the past does not guarantee a better future.${locked.features.includes('dist') ? '' : ' Distribution looked useless in calm history, then Chain X reset our range and it mattered. Keep inputs you have a business reason for.'}${locked.caution < DEFAULT.l2 ? ' And less caution looks fine on calm weeks and costs you when the market breaks, which the choosing weeks cannot show you.' : ''}`;
        else if (better) lesson = `Your recipe did a little better on the exam than the one set in advance (${pc(evT.wapeAI)} against ${pc(allT.wapeAI)}). With ${NTEST} noisy weeks that can be luck.`;
        else lesson = `Your recipe scored about the same as the one set in advance (${pc(evT.wapeAI)} against ${pc(allT.wapeAI)}).`;
        resultEl = h('div', { class: 'lockbox' },
          h('h3', { class: 'h3' }, 'On the exam weeks'),
          h('div', { class: 'stats' },
            stat('Your recipe', pc(evT.wapeAI), `${locked.features.length} of ${GROUPS.length} inputs, ${cautionName(locked.caution)}.`, 'ai'),
            stat('Simple, no AI', pc(evT.wapeSimple), 'Same week last year, scaled by the trend.'),
            stat('Today’s forecast', pc(evT.wapeCurrent), 'Last year’s shipments plus 3%.')),
          h('p', { class: 'prose' }, lesson),
          h('p', { class: 'small' }, 'The rest of the lab uses the recipe you locked in.'));
      }
      mount(box,
        h('div', { class: 'stack-s' },
          h('h3', { class: 'h3' }, 'How far may the AI depart from the simple forecast?'),
          seg(CAUTION_LEVELS.map(([v, label]) => [String(v), label]), String(l2), (id) => { state.caution = +id; save(); paint(); }),
          h('p', { class: 'small' }, 'More caution pulls the AI’s corrections back toward zero, so it only departs from the simple forecast when the evidence is strong. Calm history rewards confidence, and a market that changes rewards caution. The choosing weeks can only see the calm.')),
        h('div', { class: 'stack-s' },
          h('div', { class: 'micro' }, 'Beside each switch: how the typical miss would change on the choosing weeks, in percentage points, if you flipped it.'),
          h('div', { class: 'toggles grid' }, toggles)),
        h('div', { class: 'stack' },
          h('div', { class: 'micro' }, 'The choosing weeks (104 to 129), forecast by a model that learned only from before them'),
          chart,
          h('div', { class: 'stats' },
            stat('AI miss, choosing weeks', pc(evV.wapeAI), `no-AI ${pc(evV.wapeSimple)} · today ${pc(evV.wapeCurrent)}`, 'ai'),
            stat('Inputs in use', `${on.length} of ${GROUPS.length}`, `Caution: ${cautionName(l2)}.`))),
        note('What happened', insight),
        lockEl, resultEl);
    };
    paint();
    return hood(ctx, 'e2-features',
      h('div', { class: 'stack' },
        ...head({ lens: 'sys', exp: 2, stage: 'Understanding', title: 'What should it be allowed to look at?', wide: true }),
        h('p', { class: 'lede' }, 'These are the model’s inputs. Each is known well before the week being forecast, because that is when a plan has to be made. Switch them on and off and the model retrains. You are choosing on one slice of history. The exam weeks stay out of your choices.'),
        h('div', { class: 'terms' }, term('Features', 'The inputs a model is given. Choosing them is a business judgment more than a technical one.'))),
      box,
      actions(ctx, { label: 'Next layer: the model' }));
  },
};

// ---------------------------------------------------------------- 3. Model
const model = {
  id: 'e2-model', exp: 2, adopt: 'fit', title: 'Model',
  render(ctx) {
    const { state } = ctx;
    const m = modelFor(state);
    const imp = importance(m);
    const params = m.w.length + 1;
    const explainBox = h('div', { class: 'stack' });
    const out = h('div', { class: 'stack-s' });
    let idx = NTEST - 4;

    const paint = () => {
      const t = TEST_WEEKS[idx];
      const e = explain(m, t);
      const actual = WEEKS[t].dep, f = predict(m, t);
      let run = e.base;
      const pts = [e.base];
      const steps = [e.drift, ...e.effects].map((x) => { const d = run * x.pct / 100; run += d; pts.push(run); return { label: x.label, d }; });
      const lo = Math.min(...pts, actual) - 70, hi = Math.max(...pts, actual) + 70;
      const rows = [
        { total: true, label: 'The simple forecast', value: e.base, shown: `${int(e.base)} cases` },
        ...steps.map((x) => ({ label: x.label, value: x.d, shown: `${x.d >= 0 ? '+' : '−'}${Math.abs(x.d).toFixed(0)}` })),
        { total: true, label: 'The model says', value: f, shown: `${int(f)} cases` },
      ];
      mount(out,
        h('div', { class: 'micro' }, 'Start from the simple forecast. Each input then corrects it up or down. The scale is cut to show the corrections.'),
        waterfall({ rows, min: lo, max: hi, ghost: { value: actual, label: 'What shoppers bought' } }),
        h('div', { class: 'wf-legend micro' }, h('span', null, h('i', { style: { background: 'var(--accent)' } }), `Dashed line: what shoppers actually bought, ${int(actual)} cases (the model was ${spc(f / actual - 1, 1)}).`)));
    };
    mount(explainBox,
      slider({ label: 'Pick a week', min: 0, max: NTEST - 1, step: 1, value: idx, fmt: (v) => weekLabel(TEST_WEEKS[v]), onInput: (v) => { idx = v; paint(); } }),
      out);
    paint();

    // What it learned, against the answer key the lab happens to have.
    const learned = [];
    const slope = (g) => { const j = m.grp.indexOf(g); return j < 0 ? null : m.w[j] / m.sd[j]; };
    const sp = slope('price'), spr = slope('promo'), sd = slope('dist');
    if (sp != null) learned.push(['Price', `${spc(sp / 100, 2)} sales for each +1% price`, `${spc(TRUTH_EFFECTS.price / 100, 2)}`]);
    if (spr != null) learned.push(['Promotion', `${spc(spr / 10, 1)} sales for each +10 points of stores on promotion`, `${spc(TRUTH_EFFECTS.promo / 10, 1)}`]);
    if (sd != null) learned.push(['Distribution', `${spc(sd / 100, 2)} sales for each +1% of stores`, `${spc(TRUTH_EFFECTS.dist / 100, 2)}`]);

    return hood(ctx, 'e2-model',
      h('div', { class: 'stack' },
        ...head({ lens: 'sys', exp: 2, stage: 'Understanding', title: 'What did it learn?', wide: true }),
        h('p', { class: 'lede' }, 'A model is a recipe. Start from the simple forecast, then correct it up or down for each thing that has changed. The ',
          h('strong', null, 'weights'), ' say how hard each correction pushes. This whole model is ', h('strong', null, `${params} numbers`), '. That is everything it knows.')),
      h('div', { class: 'stack-s' },
        h('h3', { class: 'h3' }, 'Why did it say that?'),
        explainBox),
      h('div', { class: 'stack-s' },
        h('h3', { class: 'h3' }, 'What it leans on'),
        h('p', { class: 'micro' }, 'Average size of each input’s correction, across the weeks it learned from.'),
        bars({ items: GROUPS.filter((g) => g.id in imp).map((g) => ({ label: g.label, value: imp[g.id] * 100, color: 'var(--ink)' })).sort((a, b) => b.value - a.value), max: Math.max(0.5, ...Object.values(imp).map((v) => v * 100)) * 1.1, fmt: (v) => `±${v.toFixed(1)}%` })),
      learned.length ? h('div', { class: 'stack-s' },
        h('h3', { class: 'h3' }, 'What it learned, against the truth'),
        h('p', { class: 'prose' }, 'In real life you never know the true effect of a price change. This lab happens to, so it can show how far a learned weight can drift from the truth.'),
        table(['Effect', 'What the model learned', 'The truth'], learned)) : null,
      h('div', { class: 'terms' }, term('Weights', 'How much each input moves the forecast. The model’s entire “knowledge” is this short list of numbers.')),
      note('Why this matters', 'You can ask this model why it said what it said, and get a real answer. But a learned weight is a pattern in history, not a law of nature. Where history showed no variation, or never showed something this big, the weight is a guess.'),
      actions(ctx, { label: 'Next layer: prediction to decision' }));
  },
};

// ---------------------------------------------------------------- 4. Prediction -> decision
const decide = {
  id: 'e2-decide', exp: 2, adopt: 'fit', title: 'Prediction to decision',
  render(ctx) {
    const { state, save } = ctx;
    const m = modelFor(state);
    const curves = costCurves(m);
    const ev = evaluate(m);
    const idxOf = (c) => CUSHIONS.findIndex((x) => Math.abs(x - c) < 1e-6);
    const at = (pts, c) => pts[idxOf(c)];
    const ch = curves.chosen;
    const chosenCost = { ai: at(curves.ai, ch.ai).cost, simple: at(curves.simple, ch.simple).cost, current: at(curves.current, ch.current).cost };
    const yMax = Math.ceil((Math.max(...Object.values(chosenCost)) * 2.6) / 50000) * 50000;
    const sgn = (c) => `${c > 0 ? '+' : c < 0 ? '−' : ''}${Math.abs(c * 100).toFixed(1)}%`;
    const gNo = pairGain(m, 'current', 'simple'), gAi = pairGain(m, 'simple', 'ai'), gAT = pairGain(m, 'current', 'ai');
    const flat = flatBottom(curves.ai);

    const setCushion = (c) => {
      state.cushion = Math.min(CUSHIONS[CUSHIONS.length - 1], Math.max(CUSHIONS[0], c)); save();
      sl.querySelector('input').value = state.cushion * 100; sl.querySelector('input').dispatchEvent(new Event('input'));
    };
    const chart = lineChart({
      n: CUSHIONS.length, height: 300, yMin: 0, yMax, yFmt: (v) => money(v), direct: true,
      series: [
        { name: 'Using today’s forecast', short: 'Today', values: curves.current.map((p) => p.cost), color: 'var(--s-current)', dash: '5 5', width: 2 },
        { name: 'Using the simple no-AI forecast', short: 'No-AI', values: curves.simple.map((p) => p.cost), color: 'var(--s-simple)', dash: '1 4', width: 2.5 },
        { name: 'Using the AI forecast', short: 'AI', values: curves.ai.map((p) => p.cost), color: 'var(--s-ai)', width: 2.5 },
      ],
      dots: [
        { i: idxOf(ch.ai), v: chosenCost.ai, color: 'var(--s-ai)', text: `AI picks ${sgn(ch.ai)}`, drop: true, dx: 10, dy: 24, anchor: 'start' },
        { i: idxOf(ch.simple), v: chosenCost.simple, color: 'var(--s-simple)', text: `No-AI ${sgn(ch.simple)}`, dx: 8, dy: -16 },
        { i: idxOf(ch.current), v: chosenCost.current, color: 'var(--s-current)', text: `Today ${sgn(ch.current)}`, dx: -10, dy: 24, anchor: 'end' },
      ],
      ticks: CUSHIONS.map((c, i) => ({ i, text: `${c > 0 ? '+' : ''}${Math.round(c * 100)}%` })).filter((_, i) => i % 10 === 0),
      xLabel: (i) => `Cushion ${sgn(CUSHIONS[i])} over forecast`, tipFmt: (v) => money(v),
      cursor: idxOf(state.cushion), onPick: (i) => setCushion(CUSHIONS[i]),
      desc: 'Cost over the exam weeks as the cushion above the forecast changes. Every curve is U-shaped: too little cushion loses sales, too much piles up stock. Dots mark the cushion each forecast would have chosen using earlier weeks.',
    });

    const out = h('div', { class: 'stack' });
    const paintOut = () => {
      const c = state.cushion;
      const a = at(curves.ai, c), sm = at(curves.simple, c), t = at(curves.current, c);
      chart.update({ cursor: idxOf(c) });
      mount(out, h('div', { class: 'stats' },
        stat(`AI at ${sgn(c)}`, money(a.cost), `${int(a.lost)} cases short, ${int(a.excess)} left over`, 'ai'),
        stat(`No-AI at ${sgn(c)}`, money(sm.cost), `${int(sm.lost)} cases short, ${int(sm.excess)} left over`),
        stat(`Today at ${sgn(c)}`, money(t.cost), `${int(t.lost)} cases short, ${int(t.excess)} left over`)));
    };
    const sl = slider({
      label: 'Cushion above the forecast', min: -5, max: 20, step: 0.5, value: state.cushion * 100,
      fmt: (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`, hint: 'Drag the chart or the slider. Plan for this much more (or less) than the forecast says.',
      onInput: (v) => { state.cushion = v / 100; save(); paintOut(); },
    });
    paintOut();

    // the gain is not one number: it depends on the cushion rule
    const regRows = gAi.regimes.map((r, i) => [r[0], money(gNo.regimes[i][1]), money(gAi.regimes[i][1]), money(gAT.regimes[i][1])]);

    // what each forecast could not see: before and after the competitor launch
    const rel = (rows, k) => rows.map((r) => (r[k] - r.actual) / r.actual);
    const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
    const sdv = (a) => { const mu = mean(a); return Math.sqrt(a.reduce((x, y) => x + (y - mu) ** 2, 0) / Math.max(1, a.length - 1)); };
    const pre = ev.rows.filter((r) => r.t < COMPETITOR_WEEK), post = ev.rows.filter((r) => r.t >= COMPETITOR_WEEK);
    const biasAI = [mean(rel(pre, 'ai')), mean(rel(post, 'ai'))];
    const se = Math.sqrt(sdv(rel(pre, 'ai')) ** 2 / pre.length + sdv(rel(post, 'ai')) ** 2 / post.length);
    const wape = (rows, k) => rows.reduce((x, r) => x + Math.abs(r[k] - r.actual), 0) / rows.reduce((x, r) => x + r.actual, 0);
    const shift = Math.abs(biasAI[1] - biasAI[0]) < 2 * se
      ? `The AI forecast ran ${spc(biasAI[0], 1)} off before the competitor launched and ${spc(biasAI[1], 1)} after. With only ${pre.length} and ${post.length} weeks, that is within the noise: the data cannot say the launch moved it.`
      : `The AI forecast ran ${spc(biasAI[0], 1)} off before the competitor launched and ${spc(biasAI[1], 1)} after, a shift larger than noise would explain.`;
    const harder = `Every forecast got harder after the launch and the Chain X reset: the typical miss went from ${pc(wape(pre, 'ai'))} to ${pc(wape(post, 'ai'))} for the AI, ${pc(wape(pre, 'simple'))} to ${pc(wape(post, 'simple'))} for the simple method, and ${pc(wape(pre, 'current'))} to ${pc(wape(post, 'current'))} for today’s.`;
    const aiShort = at(curves.ai, ch.ai).short;
    const crit = MARGIN_PER_CASE / (MARGIN_PER_CASE + CARRY_PER_CASE);
    const covSE = Math.sqrt(0.8 * 0.2 / ev.rows.length);
    const covText = Math.abs(ev.coverage - 0.8) < 2 * covSE ? 'Within the noise of that promise.' : ev.coverage < 0.8 ? 'It was too sure of itself.' : 'It was more cautious than it needed to be.';

    return hood(ctx, 'e2-decide',
      h('div', { class: 'stack' },
        ...head({ lens: 'biz', exp: 2, stage: 'Decision', title: 'A forecast is not a decision.', wide: true }),
        h('p', { class: 'lede' }, 'The decision is how many cases to plan for: the forecast plus a cushion. Too little and shelves go empty, and you lose about ',
          h('strong', null, `$${MARGIN_PER_CASE}`), ' of margin per missing case. Too much and each extra case sits in the pipeline at about ', h('strong', null, `$${CARRY_PER_CASE}`), '.')),
      h('div', { class: 'stack-s' },
        h('div', { class: 'micro' }, `Cost of the ${NTEST} exam weeks, replayed at each cushion, against what shoppers wanted. Each week stands alone: it ignores the stock distributors carry from week to week. “What shoppers wanted” is hidden in real life, and the lab knows it.`),
        chart, sl),
      out,
      h('div', { class: 'row' },
        h('button', { class: 'btn ghost small', type: 'button', onClick: () => setCushion(ch.ai) }, `Use the cushion the AI picked in advance (${sgn(ch.ai)})`)),
      h('div', { class: 'stack-s' },
        h('h3', { class: 'h3' }, 'The dollar gain is not one number'),
        h('p', { class: 'prose' }, `Each forecast chose its own cushion on the choosing weeks, before the exam. But every cost curve is flat near its bottom (for the AI, any cushion from ${sgn(flat[0])} to ${sgn(flat[1])} is within 10% of the best), so the exact pick is partly luck, and the gain depends on the rule. Annual gain in this market, three ways:`),
        table(['Cushion rule', 'No-AI over today', 'AI over no-AI', 'AI over today'], regRows, { num: [1, 2, 3] }),
        h('p', { class: 'prose' }, `Across the rules, forecasting shoppers instead of shipments (no AI) is worth ${money(gNo.lo)} to ${money(gNo.hi)} a year; what the AI adds on top is ${money(gAi.lo)} to ${money(gAi.hi)}. Treat these as an order of magnitude, not a business case. The ranges also include week-to-week sampling noise.`)),
      note('Why a cushion at all', `Missing a case costs ${Math.round(crit * 100)}% of the pair of mistakes, so the best plan covers demand about ${Math.round(crit * 100)}% of the time, which means being short about ${Math.round((1 - crit) * 100)}% of weeks. At the AI’s chosen cushion it was short in ${aiShort} of ${ev.rows.length} weeks (${Math.round((aiShort / ev.rows.length) * 100)}%).`),
      h('div', { class: 'terms' },
        term('Prediction', 'What is likely to happen.'),
        term('Decision', 'What you do about it, given what being wrong costs.'),
        term('Optimization', 'Choosing the best option within the limits you have.')),
      h('div', { class: 'split' },
        note('What it can’t see', `${shift} ${harder}`),
        note('Overconfident?', `The AI’s 80% range caught ${Math.round(ev.coverage * 100)}% of the exam weeks (${Math.round(ev.coverage * ev.rows.length)} of ${ev.rows.length}), against the 80% it promises. ${covText} With this few weeks, anything from about ${Math.round((ev.coverage - 2 * covSE) * 100)}% to ${Math.round(Math.min(1, ev.coverage + 2 * covSE) * 100)}% is consistent with what was seen.`)),
      actions(ctx, { label: 'Go deeper: how it learns' }));
  },
};

// ---------------------------------------------------------------- 5. How it learns
const STEPS = 400;
const SAMPLE = (() => { const out = [0, 1, 2, 3]; let v = 4; while (v < STEPS) { out.push(Math.round(v)); v *= 1.16; } out.push(STEPS); return [...new Set(out)]; })();

const learn = {
  id: 'e2-learn', exp: 2, adopt: 'fit', title: 'How it learns',
  render(ctx) {
    const { state, save } = ctx;
    const R = recipeOf(state);
    const d = dataset(R.groups);
    const names = d.meta.names;
    const exact = solveExact(d.Z, d.yc, R.l2);
    const floor = (() => { let sum = 0; d.Z.forEach((z, i) => { let p = exact.b; z.forEach((v, j) => { p += exact.w[j] * v; }); sum += (p - d.yc[i]) ** 2; }); return sum / d.Z.length; })();
    const thr = maxStableRate(d.Z, R.l2);
    const LR = [0.01, 0.1, +(thr * 0.5).toFixed(2), +(thr * 0.9).toFixed(2), +(thr * 1.2).toFixed(2)];
    let lrIdx = LR.findIndex((x) => Math.abs(x - state.lr) < 1e-9);
    if (lrIdx < 0) lrIdx = 1;
    const dw = d.weeks.slice(-52);
    const actualDW = dw.map((t) => WEEKS[t].dep), simpleDW = dw.map((t) => simpleForecast(t));
    const base = d.weeks[0];
    // Training starts from a random guess, as it does in practice. Seeded, so everyone sees the same start.
    const w0 = names.map((_, j) => { const x = Math.sin((j + 1) * 12.9898) * 43758.5453; return ((x - Math.floor(x)) - 0.5) * 0.36; });
    const predAt = (snap) => dw.map((t, i) => { let z = d.ybar + snap.b; const row = d.Z[t - base]; for (let j = 0; j < row.length; j++) z += snap.w[j] * row[j]; return simpleDW[i] * Math.exp(z); });
    const toPct = (loss) => Math.min(1000, Math.max(0.3, Math.sqrt(loss) * 100));

    let timer = null, run = 0;
    const S0 = { name: 'What shoppers bought', short: 'Actual', values: actualDW, color: 'var(--s-actual)', width: 2.5 };
    const S1 = { name: 'The simple forecast', short: 'Simple', values: simpleDW, color: 'var(--s-simple)', dash: '1 4', width: 2.5 };
    const hero = lineChart({
      n: dw.length, height: 260, yFmt: (v) => int(v), direct: true, hover: false,
      series: [S0, S1, { name: 'The model, at this step', short: 'Model', values: simpleDW, color: 'var(--s-ai)', width: 2.5 }],
      ticks: ticksFor(dw[0], dw[dw.length - 1], 13), xLabel: (i) => weekLabel(dw[i]),
      desc: 'The model’s forecast for its last 52 learning weeks, starting wild and settling toward what shoppers actually bought as it learns.',
    });
    const lossChart = lineChart({
      n: SAMPLE.length, height: 190, log: true, yMin: 1, hover: false,
      yFmt: (v) => `${v}%`,
      series: [{ name: 'Typical error', values: [], color: 'var(--s-ai)', width: 2.5 }],
      refs: [{ y: Math.sqrt(floor) * 100, text: 'Best possible at this setting', below: true }],
      ticks: [0, 10, 100, 400].map((st) => ({ i: SAMPLE.indexOf(SAMPLE.find((x) => x >= st)), text: String(st) })),
      desc: 'The model’s typical error on a log scale, falling as it learns.',
    });
    const barsHost = h('div'), readout = h('div', { class: 'stats' }), msg = h('div');

    const draw = (k, snaps, diverged) => {
      const sn = snaps[Math.min(k, snaps.length - 1)];
      hero.update({ series: [S0, S1, { name: 'The model, at this step', short: 'Model', values: predAt(sn), color: 'var(--s-ai)', width: 2.5 }] });
      const cut = SAMPLE.filter((x) => x <= k);
      lossChart.update({ series: [{ name: 'Typical error', values: cut.map((x) => toPct(snaps[x].loss)), color: 'var(--s-ai)', width: 2.5 }], yMax: diverged ? 1000 : Math.max(30, toPct(snaps[0].loss) * 1.3) });
      mount(barsHost, bars({ items: names.map((n, j) => ({ label: n, value: sn.w[j], color: sn.w[j] >= 0 ? 'var(--accent)' : 'var(--ink-2)' })), max: 0.2, animate: false, fmt: (v) => v.toFixed(3) }));
      const miss = Math.sqrt(sn.loss) * 100;
      mount(readout,
        stat('Step', String(k), `of ${STEPS}`),
        stat('Typical error', Number.isFinite(miss) && miss < 1000 ? `${miss.toFixed(1)}%` : 'Blown up', `the best this model can do is ${(Math.sqrt(floor) * 100).toFixed(1)}%`, diverged ? 'bad' : 'ai'));
    };

    const start = () => {
      clearInterval(timer);
      const myRun = ++run;
      const lr = LR[lrIdx];
      state.lr = lr; save();
      const snaps = [];
      gradientDescent(d.Z, d.yc, { lr, steps: STEPS, w0, l2: R.l2, onStep: (st, loss, w, b) => snaps.push({ loss, w: w.slice(), b }) });
      let k = 0, diverged = false;
      mount(msg);
      const per = Math.max(1, Math.round(STEPS / 110));
      timer = setInterval(() => {
        if (!hero.isConnected || myRun !== run) { clearInterval(timer); return; }
        k = Math.min(STEPS, k + per);
        const bad = snaps.findIndex((x) => !(x.loss < 1e2));
        diverged = bad >= 0 && bad <= k;
        if (diverged) k = bad;
        draw(k, snaps, diverged);
        if (diverged) {
          clearInterval(timer);
          mount(msg, note('What happened', `Too fast. For this model learning is stable only below about ${thr.toFixed(2)}, and you chose ${lr}. Past that, each step overshoots the answer by more than the last, so the error grows instead of shrinking. A learning rate that is too high does not learn faster. It stops learning.`));
        } else if (k >= STEPS) {
          clearInterval(timer);
          const end = snaps[STEPS].loss;
          mount(msg, note('What happened', end > floor * 1.15
            ? `Too slow. The error was still falling when the steps ran out (${(Math.sqrt(end) * 100).toFixed(1)}% against a best of ${(Math.sqrt(floor) * 100).toFixed(1)}%). It would get there, but it needs many more steps.`
            : `It started from a random guess and ended within a hair of the best any model of this shape can do, by repeating one move ${STEPS} times: measure the miss, then nudge every weight a little in the direction that shrinks it. For this model, learning is stable below about ${thr.toFixed(2)}.`));
        }
      }, 16);
    };

    let debounce = null;
    const sl = slider({
      label: 'Learning speed', min: 0, max: LR.length - 1, step: 1, value: lrIdx,
      fmt: (v) => (v === LR.length - 1 ? `${LR[v]} (too fast)` : String(LR[v])),
      onInput: (v) => { lrIdx = v; clearTimeout(debounce); debounce = setTimeout(start, 250); },
      hint: `It retrains as you move it. For this model, anything above about ${thr.toFixed(2)} cannot learn.`,
    });
    queueMicrotask(() => { if (hero.isConnected) start(); });

    return hood(ctx, 'e2-learn',
      h('div', { class: 'stack' },
        ...head({ lens: 'sys', exp: 2, stage: 'Understanding', title: 'How did it find those weights?', wide: true }),
        h('p', { class: 'lede' }, 'It started from a random guess: weights picked at random, so its first forecasts are wild. Then it repeated one move: measure how wrong the forecasts are, and nudge every weight a little in the direction that makes them less wrong. This is the real training run, not an animation.')),
      h('div', { class: 'learn-controls' }, sl, h('button', { class: 'btn small', type: 'button', onClick: start }, 'Replay')),
      h('div', { class: 'stack-s' }, h('div', { class: 'micro' }, 'Its own last 52 learning weeks: the model’s forecast, settling toward what shoppers bought'), hero),
      msg,
      h('div', { class: 'learn-top' },
        h('div', { class: 'stack-s' }, h('div', { class: 'micro' }, 'Typical error, as the model learns (log scale)'), lossChart),
        readout),
      h('div', { class: 'stack-s' }, h('div', { class: 'micro' }, 'The weights, step by step. They start at random values.'), barsHost),
      h('div', { class: 'terms' },
        term('Loss', 'How wrong the model is, as a single number: the average squared miss.'),
        term('Gradient descent', 'Nudging the weights, step by step, in whichever direction lowers the loss.'),
        term('Learning rate', 'How big each nudge is.')),
      actions(ctx, { label: 'Next layer: the math and the code' }));
  },
};

// ---------------------------------------------------------------- 6. Math and code
const math = {
  id: 'e2-math', exp: 2, adopt: 'fit', title: 'Math and code',
  render(ctx) {
    const { state } = ctx;
    const R = recipeOf(state);
    const m = modelFor(state);
    const t = TEST_WEEKS[NTEST - 4];
    const z = m.d.norm(m.d.X(t));
    const terms = m.names.map((n, j) => ({ n, w: m.w[j], z: z[j], p: m.w[j] * z[j] }));
    const yhat = predictLog(m, t);
    const f = (v, d = 3) => (v >= 0 ? v.toFixed(d) : `−${Math.abs(v).toFixed(d)}`);
    const src = `${gradientDescent.toString()}\n\n${simpleForecast.toString()}\n\n${predictLog.toString()}`;
    const lines = src.split('\n').length;
    const drift = m.b + m.ybar;
    const sf = simpleForecast(t);

    // One weight, the others held at their learned values: how the error changes as it moves, and the steps downhill.
    const d = m.d;
    const j = m.w.reduce((best, v, i) => (Math.abs(v) > Math.abs(m.w[best]) ? i : best), 0);
    const w0 = m.w[j], span = Math.max(0.12, Math.abs(w0) * 2.5);
    const lossAt = (w) => { let sum = 0; d.Z.forEach((zr, i) => { let p = m.b; zr.forEach((v, k) => { p += (k === j ? w : m.w[k]) * v; }); sum += (p - d.yc[i]) ** 2; }); return sum / d.Z.length; };
    const G = 61, grid = Array.from({ length: G }, (_, i) => w0 - span + (2 * span * i) / (G - 1));
    const pctErr = (l) => Math.sqrt(l) * 100;
    const path = [w0 - span * 0.9];
    for (let k = 0; k < 8; k++) {
      const w = path[k];
      let g = 0; d.Z.forEach((zr, i) => { let p = m.b; zr.forEach((v, kk) => { p += (kk === j ? w : m.w[kk]) * v; }); g += (p - d.yc[i]) * zr[j] / d.Z.length; });
      path.push(w - 0.1 * (g + R.l2 * w));
    }
    const near = (w) => Math.max(0, Math.min(G - 1, Math.round(((w - (w0 - span)) / (2 * span)) * (G - 1))));
    const bowl = lineChart({
      n: G, height: 220, hover: false, yFmt: (v) => `${v.toFixed(1)}%`,
      series: [{ name: 'Typical error as this one weight changes', values: grid.map((w) => pctErr(lossAt(w))), color: 'var(--ink)', width: 2.5 }],
      dots: [
        { i: near(path[0]), v: pctErr(lossAt(path[0])), color: 'var(--s-current)', text: 'Start', dx: 8, dy: -10 },
        ...path.slice(1, 5).map((w) => ({ i: near(w), v: pctErr(lossAt(w)), color: 'var(--s-ai)' })),
        { i: near(path[path.length - 1]), v: pctErr(lossAt(path[path.length - 1])), color: 'var(--s-ai)', text: 'After 8 steps', dx: 12, dy: -16, anchor: 'start' },
      ],
      ticks: [0, 15, 30, 45, 60].map((i) => ({ i, text: grid[i].toFixed(2) })),
      desc: 'The model’s typical error as one weight changes, shaped like a bowl, with the steps gradient descent takes downhill from a starting value.',
    });

    return hood(ctx, 'e2-math',
      h('div', { class: 'stack' },
        ...head({ lens: 'sys', exp: 2, stage: 'Understanding', title: 'The math, and the code.', wide: true }),
        h('p', { class: 'lede' }, 'This is the bottom of the hood. It is shorter than you might expect. Below, the same three ideas appear in plain words, in symbols with real numbers from this model, and as the code running in your browser right now.')),
      h('div', { class: 'stack' },
        h('h3', { class: 'h3' }, '1. Make a guess'),
        h('p', { class: 'prose' }, 'Start with the simple forecast, add the typical drift, then add each input times its weight. Each input is first rescaled to “how far above or below its own average”.'),
        h('pre', { class: 'eq' }, `guess = log(simple forecast) + drift + w₁·x₁ + w₂·x₂ + …\n\nfor the week of ${weekLabel(t)}:\n  simple forecast        ${int(sf)} cases → log = ${Math.log(sf).toFixed(3)}\n  typical drift          ${f(drift)}\n\n  weight × input\n${terms.map((x) => `  ${f(x.w).padStart(7)} × ${f(x.z, 2).padStart(6)}   ${x.n}`).join('\n')}\n\nguess = ${yhat.toFixed(3)}  →  e^${yhat.toFixed(3)} = ${int(Math.exp(yhat))} cases`)),
      h('div', { class: 'stack' },
        h('h3', { class: 'h3' }, '2. Measure the miss'),
        h('p', { class: 'prose' }, 'Square each miss so big ones count more, and average them.'),
        h('pre', { class: 'eq' }, `loss = average of (guess − actual)²\n     + a small pull of each weight back toward zero (caution: ${cautionName(R.l2)})\n     = ${m.losses[m.losses.length - 1].toFixed(5)}  on the weeks it learned from (the data part)`)),
      h('div', { class: 'stack' },
        h('h3', { class: 'h3' }, '3. Nudge the weights'),
        h('p', { class: 'prose' }, 'Move each weight against the slope of the loss, by a small step. Then repeat. Picture one weight with all the others held still: the error forms a bowl, and each step rolls downhill, by less as the slope flattens.'),
        bowl,
        h('p', { class: 'micro' }, `The weight on “${m.names[j]}”. Real numbers from this model: the dots are the steps gradient descent takes from a starting value.`),
        h('pre', { class: 'eq' }, `w ← w − η · (slope of loss with respect to w)\n\nη = 0.1   for the model on these screens\nrepeated 3,000 times (the demo on the last screen repeats it 400, from a random start)`)),
      h('div', { class: 'stack-s' },
        disclose('Show the code that is running', h('p', { class: 'prose' }, `The actual source of the functions running this page, printed from the program itself: ${lines} lines.`), h('pre', { class: 'code' }, h('code', null, src)))),
      note('What you just read', 'Nothing in that code is specific to bourbon or to forecasting. Change the data and the same short routine learns something else. That is why this approach is everywhere, and why the quality of the data and the question matter more than the cleverness of the code.'),
      actions(ctx, { label: 'Next layer: scaling up' }));
  },
};

// ---------------------------------------------------------------- 7. Scaling up
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
  svg.append(s('text', { x: 194, y: 58, class: 'dg-w', 'text-anchor': 'middle' }, 'output'));
  return svg;
}
function network() {
  const svg = s('svg', { viewBox: '0 0 220 150', role: 'img', 'aria-label': 'A neural network: layers of neurons, each connected to the next' });
  const layers = [[30, 65, 100], [20, 50, 80, 110], [20, 50, 80, 110], [65]];
  const xs = [24, 80, 136, 194];
  layers.forEach((ys, li) => {
    if (li) layers[li - 1].forEach((y0) => ys.forEach((y1) => svg.append(s('line', { x1: xs[li - 1], y1: y0 + 6, x2: xs[li], y2: y1 + 6, class: 'dg-line thin' }))));
  });
  layers.forEach((ys, li) => ys.forEach((y) => svg.append(s('circle', { cx: xs[li], cy: y + 6, r: 6, class: `dg-node${li === 3 ? ' on' : ''}` }))));
  return svg;
}
function language() {
  const svg = s('svg', { viewBox: '0 0 220 150', role: 'img', 'aria-label': 'A language model reads word pieces and predicts the next one' });
  [[10, 62, 'Ridge'], [76, 36, 'is'], [142, 36, 'down']].forEach(([x, w, t]) => {
    svg.append(s('rect', { x, y: 22, width: w, height: 24, rx: 6, class: 'dg-box' }));
    svg.append(s('text', { x: x + w / 2, y: 38, class: 'dg-tok', 'text-anchor': 'middle' }, t));
  });
  svg.append(s('text', { x: 110, y: 68, class: 'dg-w', 'text-anchor': 'middle' }, 'each piece becomes numbers'));
  svg.append(s('path', { d: 'M40,78 C60,98 80,98 100,78 M100,78 C120,98 140,98 160,78', class: 'dg-line thin', fill: 'none' }));
  svg.append(s('text', { x: 110, y: 112, class: 'dg-w', 'text-anchor': 'middle' }, 'pieces look at each other'));
  svg.append(s('rect', { x: 150, y: 124, width: 60, height: 20, rx: 6, class: 'dg-box on' }));
  svg.append(s('text', { x: 180, y: 138, class: 'dg-tok on', 'text-anchor': 'middle' }, 'by 8%?'));
  return svg;
}

const scale = {
  id: 'e2-scale', exp: 2, adopt: 'fit', title: 'Scaling up',
  render(ctx) {
    const panel = (svg, name, text) => h('div', { class: 'scale-panel' }, svg, h('h3', { class: 'h3' }, name), h('p', { class: 'small' }, text));
    return hood(ctx, 'e2-scale',
      h('div', { class: 'stack' },
        ...head({ lens: 'sys', exp: 2, stage: 'Understanding', title: 'From one neuron to a language model.', wide: true }),
        h('p', { class: 'lede' }, 'What you just trained is the smallest unit of modern AI: a weighted sum. Everything bigger is the same recipe, repeated and stacked.')),
      h('div', { class: 'scale-row' },
        panel(neuron(), 'One neuron', 'Inputs, each times a weight, added up. This is your forecasting model.'),
        panel(network(), 'A neural network', 'Many neurons in layers, with a bend between them, so it can learn curves and interactions a straight weighted sum cannot.'),
        panel(language(), 'A language model', 'Text cut into pieces called tokens, each turned into numbers. Pieces look at each other to decide what matters, and the model learns to predict the next one.')),
      h('p', { class: 'micro' }, 'These are diagrams of the idea, not demos.'),
      h('div', { class: 'split' },
        note('The same loop', 'A language model learns the way you just watched: guess, measure the miss, nudge the weights, billions of times, with billions of weights instead of a handful. The scale changes. The idea does not.'),
        note('Agents', 'Put a model in a loop with tools and memory, and it can look something up, decide, act, and see what happened. That is an agent. It is the same loop you started this lab with, with software in the seat.')),
      note('Why we used the simple one', 'A more complex model might squeeze out a little more. But on this series even the no-AI method sits near the noise floor, so there is little to squeeze. This model is enough, you can ask it why, you can audit it, and when it is wrong you can see how. Choosing the simplest model that works is itself a decision. It is usually the right one to make first, and a harder test for anything fancier.'),
      actions(ctx, { label: 'Design the pilot' }));
  },
};

export const e2 = [business, data, features, model, decide, learn, math, scale];
