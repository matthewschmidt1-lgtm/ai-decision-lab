// Experience 3: Design the pilot.
// Value -> system readiness -> people -> hypothesis -> measure -> a brief you could hand to a team.
// The aim is not "AI could help". It is "here is how we would find out", and what to do first.

import { h, choices, slider, stat, note, mount, int, money, chain, rangeBars, seg } from '../ui.js';
import { histogram } from '../charts.js';
import { WEEKS, decompose } from '../data.js';
import { TEST_WEEKS, evaluate, bootstrapReduction } from '../forecast.js';
import { SCOPES, PLANNERS, pairGain, valueRange, potentialValue, sensitivity, breakEvenMultiple, marketsToBreakEven, simulatePilot } from '../value.js';
import { head, actions, modelFor, rangeText } from './common.js';

const pc = (v, d = 1) => `${(v * 100).toFixed(d)}%`;
const VS = { simple: 'a simple no-AI forecast', current: 'today’s method' };
const SERIES = SCOPES.full.units;
const AVG_WEEKLY = WEEKS.reduce((s, w) => s + w.dep, 0) / WEEKS.length;
const baseKey = (vs) => (vs === 'simple' ? 'simple' : 'current');

// ---------------------------------------------------------------- 1. Business value
const value = {
  id: 'e3-value', exp: 3, adopt: 'value', title: 'What is it worth?',
  render(ctx) {
    const { state, save } = ctx;
    const m = modelFor(state);
    const root = h('div', { class: 'screen stack-l' });
    const out = h('div', { class: 'stack' });
    const sliders = h('div', { class: 'stack' });
    const tornado = h('div', { class: 'stack-s' });

    const paintOut = () => {
      const p = state.value;
      const est = pairGain(m, baseKey(p.vs), 'ai');
      const noAI = pairGain(m, 'current', 'simple');
      const r = valueRange(p, est);
      const sens = sensitivity(p, est.point);
      const need = breakEvenMultiple(p, est.point);
      const mk = marketsToBreakEven(p, est.point);
      const v = r.base;
      const tone = (n) => (n < 0 ? 'bad' : '');
      const lever = (sens.find((x) => x.key !== 'runCost') || sens[0]).label.toLowerCase();
      mount(out,
        h('p', { class: 'verdict' }, v.net >= 0
          ? `On these assumptions it pays for itself: about ${money(v.net)} a year net.`
          : `On these assumptions it does not pay for itself: about ${money(-v.net)} a year short.`),
        h('p', { class: 'prose' }, v.net < 0
          ? `That is worth knowing before spending anything, and it is not a reason to stop. It tells the pilot what to prove: the assumption that matters most is “${lever}”.`
          : `That is a case worth testing, not a case proven. The assumption that matters most is “${lever}”, so that is what the pilot should try hardest to break.`),
        h('div', { class: 'stats' },
          stat('If it goes poorly', money(r.low.net), `${money(r.low.gross)} of value, less ${money(r.low.run)} to run`, tone(r.low.net)),
          stat('Your estimate', money(r.base.net), `${money(r.base.gross)} of value, less ${money(r.base.run)} to run`, r.base.net < 0 ? 'bad' : 'ai'),
          stat('If it goes well', money(r.high.net), `${money(r.high.gross)} of value, less ${money(r.high.run)} to run`, tone(r.high.net))),
        h('p', { class: 'small' }, 'Net potential value per year. Scenario bounds, not probabilities: each uncertain input at half and at one-and-a-half times your estimate, the cost to run at one-and-a-half and three-quarters, and the market-level gain at the two ends of its own range.'),
        h('table', { class: 'tbl' }, h('tbody', null,
          p.vs !== 'simple' ? h('tr', null, h('td', null, `Planner time: ${int(v.hoursSaved)} hours saved`), h('td', { class: 'num r' }, money(v.time))) : null,
          h('tr', null, h('td', null, 'Fewer empty shelves and less stock held'), h('td', { class: 'num r' }, money(v.planning))),
          h('tr', null, h('td', null, 'Cost to run it'), h('td', { class: 'num r' }, money(-v.run))),
          h('tr', null, h('td', null, h('b', null, 'Net potential value')), h('td', { class: 'num r' }, h('b', null, money(v.net)))))),
        p.vs !== 'simple' && v.fte > 0.05 ? h('p', { class: 'small' }, `Time saved is about ${v.fte.toFixed(1)} of one planner’s year (you have ${PLANNERS}). It only counts as value if those hours are redeployed or a hire is avoided.`) : null,
        p.vs === 'simple' ? h('p', { class: 'small' }, 'Against a simple no-AI forecast, planner time is not counted: a spreadsheet forecast saves the same hours.') : null,
        note('The market-level gain', `The replay says a better forecast is worth between ${money(est.lo)} and ${money(est.hi)} a year against ${VS[p.vs]}, depending on the cushion rule and sampling noise. The calculator takes the middle, ${money(est.point)}, then discounts it. It is one noisy ${TEST_WEEKS.length}-week test in one market, and those weeks were unusual: a destock, a price increase and a competitor launch.`),
        note('What you would have to believe', need === Infinity
          ? 'On these numbers the market-level gain is zero or negative, so no multiple of it would pay for the run cost. The value has to come from somewhere the back-test did not look.'
          : `For this to pay for itself, the real-world gain would need to be about ${need.toFixed(1)}× what the market-level back-test showed (1× is exactly what it showed). Finer grain is where a model that shares what it learns across series might do that. Nothing in this lab shows it, so treat it as a hypothesis for the pilot.${mk ? ` Or: at these assumptions it would take ${mk} brand-markets to break even.` : ' Adding brand-markets alone would not get there.'}`),
        note('The no-AI move', `Forecasting shoppers instead of shipments, with a spreadsheet, is worth ${money(noAI.lo)} to ${money(noAI.hi)} a year in this market on the same replay (one brand, one state), and needs no AI. Do that regardless. The calculator asks what AI adds.`));
      mount(tornado,
        h('h3', { class: 'h3' }, 'What matters most'),
        h('p', { class: 'small' }, 'Net value from a pessimistic to an optimistic setting of each assumption. The blue marker is your estimate, and the line is break-even.'),
        rangeBars({ items: sens.map((x) => ({ label: x.label, low: x.low, high: x.high })), base: v.net, fmt: (n) => money(n).replace(/\$/g, '') }));
    };

    const paintSliders = () => {
      const p = state.value;
      const sl = (key, label, min, max, step, fmt, hint, extra = {}) => slider({ label, min, max, step, value: p[key], fmt, hint, onInput: (x) => { p[key] = x; p.scope = 'custom'; save(); paintOut(); if (extra.after) extra.after(x); }, ...extra.props });
      const coverageAfter = (x) => {
        const cost = Math.max(10000, Math.round((SCOPES.lean.runCost + (SCOPES.full.runCost - SCOPES.lean.runCost) * (x - 1 / 3) / (2 / 3)) / 5000) * 5000);
        const ri = sliders.querySelector('#run-cost');
        if (ri) { ri.value = cost; ri.dispatchEvent(new Event('input', { bubbles: true })); }
      };
      mount(sliders,
        h('div', { class: 'stack-s' },
          h('h3', { class: 'h3' }, 'Compare AI with'),
          seg([['simple', 'A no-AI forecast'], ['current', 'Today’s method']], p.vs, (id) => { p.vs = id; save(); paintSliders(); paintOut(); }),
          h('p', { class: 'small' }, p.vs === 'simple' ? 'The honest question for AI: what does it add beyond a spreadsheet that forecasts shopper sales?' : 'The value of the whole improvement, by any method that gets there.')),
        h('div', { class: 'stack-s' },
          h('h3', { class: 'h3' }, 'Scope'),
          seg(Object.entries(SCOPES).map(([id, sc]) => [id, id === 'lean' ? 'One distributor' : 'All three']), p.scope, (id) => { Object.assign(p, { scope: id, decisions: SCOPES[id].decisions, coverage: SCOPES[id].coverage, runCost: SCOPES[id].runCost }); save(); paintSliders(); paintOut(); }),
          h('p', { class: 'small' }, p.scope === 'lean' ? 'A lean pilot: a spreadsheet, one distributor, about $30K.' : p.scope === 'full' ? 'A full build: all three distributors, about $100K.' : 'Custom: you have changed the scope.')),
        h('div', { class: 'stack-s' },
          h('h3', { class: 'h3' }, 'What you have to believe'),
          sl('holds', 'Share of the back-test gain that holds in real life', 0, 1, 0.05, (x) => pc(x, 0), 'Back-tests flatter. Half is a sober start.'),
          sl('grain', 'Gain at SKU-by-distributor grain, as a multiple of the market-level back-test', 1, 10, 0.5, (x) => `${x}×`, '1× assumes no more than the back-test showed. Nothing in this lab supports more. Try it to see what would have to be true.'),
          sl('runCost', 'Annual cost to run in one brand-market', 10000, 250000, 5000, (x) => money(x), 'People, data work and tools.', { props: { id: 'run-cost' } })),
        h('details', { class: 'more' }, h('summary', null, 'More assumptions'),
          h('div', { class: 'stack' },
            sl('coverage', 'Share of Texas volume in scope', 0.1, 1, 0.01, (x) => pc(x, 0), 'Wider coverage costs more: moving this moves the cost to run.', { after: coverageAfter }),
            sl('decisions', 'Forecast decisions per year', 52, 2000, 52, int, 'SKU groups × distributors × 52 weeks.'),
            sl('adoption', 'Share of decisions where the forecast is used', 0, 1, 0.05, (x) => pc(x, 0), 'A forecast nobody uses is worth nothing.'),
            sl('minutes', 'Planner minutes per decision', 5, 120, 5, (x) => `${x} min`),
            sl('rate', 'Loaded cost per planner hour', 30, 150, 5, (x) => `$${x}`),
            sl('reduction', 'Time saved when a forecast is drafted for the planner', 0, 0.6, 0.05, (x) => pc(x, 0), p.vs === 'simple' ? 'Not counted against a simple forecast.' : null),
            sl('review', 'Forecasts a planner still builds by hand', 0, 0.6, 0.05, (x) => pc(x, 0)),
            sl('markets', 'Brand-markets using it', 1, 12, 1, (x) => `${x}`, 'Each added one costs a quarter of the first and earns 60% of what the first did: not every market is Texas.'))));
    };
    paintSliders(); paintOut();

    mount(root,
      h('div', { class: 'stack' },
        ...head({ lens: 'biz', exp: 3, stage: 'Understanding', title: 'Is it worth testing?', wide: true }),
        h('p', { class: 'lede' }, 'Before designing a test, size the prize, and be honest that it is a guess. Two numbers matter and they are not the same: what a better forecast is worth by ',
          h('strong', null, 'any'), ' method, and what ', h('strong', null, 'AI'), ' adds on top. Every number below is an assumption you can change.')),
      h('div', { class: 'split calc' }, sliders, out),
      tornado,
      actions(ctx, { label: 'Can it actually work?' }));
    return root;
  },
};

// ---------------------------------------------------------------- 2 & 3. System readiness and people
function worryScreen({ id, lens, adopt, title, lede, nodes, worries, key, label, stage, next, chainHead }) {
  return {
    id, exp: 3, adopt, title: label,
    render(ctx) {
      const { state, save } = ctx;
      const root = h('div', { class: 'screen stack-l' });
      const paint = () => {
        const w = worries.find((x) => x.id === state[key]);
        mount(root,
          h('div', { class: 'stack' },
            ...head({ lens, exp: 3, stage, title, wide: true }),
            h('p', { class: 'lede' }, lede)),
          h('div', { class: 'stack-s' }, h('h3', { class: 'h3' }, chainHead), chain(nodes, { active: w ? w.node : null })),
          h('div', { class: 'stack-s' },
            h('h3', { class: 'h3' }, 'Which one would you worry about most?'),
            choices({ name: 'Biggest worry', items: worries.map((x) => ({ id: x.id, title: x.title })), value: state[key], onPick: (v) => { state[key] = v; save(); paint(); } })),
          w ? h('div', { class: 'finding reveal' },
            h('div', { class: 'finding-head' }, h('div', { class: 'micro' }, 'Friction to test early'), h('p', { class: 'says' }, w.prove)),
            h('p', { class: 'prose' }, h('strong', null, 'How the pilot should be shaped: '), w.shape)) : null,
          actions(ctx, { label: next, disabled: !w }));
      };
      paint();
      return root;
    },
  };
}

const SYS_WORRIES = [
  { id: 'visibility', node: 'stock', title: 'Visibility: we see distributor stock monthly, by email.',
    prove: 'Can we get weekly distributor inventory, and do distributors act on a shared forecast once they see it?', shape: 'Make weekly stock reports a condition of the pilot distributor. Start with the stock-range alert, which needs no AI. The forecast is only as useful as the visibility behind it.' },
  { id: 'data', node: 'history', title: 'The data: mismatched SKU codes and nobody owns the cleanup.',
    prove: 'Can we build a clean weekly history for every SKU group within four weeks?', shape: 'Start with the one distributor whose codes already match, so the first test is about the forecast and not the plumbing.' },
  { id: 'workflow', node: 'sheet', title: 'The workflow: there is nowhere for a forecast to go.',
    prove: 'Will planners actually look at a forecast that arrives as a column in their own spreadsheet?', shape: 'Run the pilot inside the spreadsheet. No integration yet. The point is to learn whether it gets used.' },
  { id: 'score', node: 'score', title: 'The scoreboard: no agreed way to judge a forecast.',
    prove: 'Can we agree, before the pilot, how every forecast will be scored?', shape: 'Fix the metric and the baselines in writing first, and score today’s forecast, the simple one and the AI the same way.' },
];
const system = worryScreen({
  id: 'e3-system', lens: 'sys', adopt: 'system', label: 'Can it work?', stage: 'Understanding', next: 'Will people use it?',
  title: 'Can this actually work?',
  lede: 'A good model inside a bad system produces nothing. Here is how Ridgeline’s data and workflow look today, fictional but realistic. None of it is a verdict. It tells you where friction is likely, and the weakest link breaks the chain.',
  chainHead: 'From distributor shelf to a decision',
  nodes: [
    { id: 'stock', name: 'Distributor stock', detail: 'Reported monthly, by email. Nothing weekly.', status: 'Gap', tone: 'gap' },
    { id: 'history', name: 'Weekly sales history', detail: 'Three years exist. Two of three distributors use SKU codes that do not match.', status: 'Partly', tone: 'partly' },
    { id: 'sheet', name: 'Planners’ spreadsheet', detail: 'Where forecasts live. No place for a model’s answer.', status: 'Gap', tone: 'gap' },
    { id: 'score', name: 'The scoreboard', detail: 'No agreed way to judge a forecast, so none can be shown to be better.', status: 'Gap', tone: 'gap' },
    { id: 'erp', name: 'ERP export', detail: 'Weekly and manual. Fine for a pilot, not for production.', status: 'Partly', tone: 'partly' },
  ],
  worries: SYS_WORRIES, key: 'sysWorry',
});

const PPL_WORRIES = [
  { id: 'trust', node: 'planners', title: 'Trust: planners have watched a forecasting tool fail before.',
    prove: 'Do planners trust a forecast more when they can see why it said what it said?', shape: 'Show the reasoning with every forecast, let planners override with a reason, and track whose call turned out better.' },
  { id: 'incentives', node: 'vp', title: 'Incentives: the sales target sits on top of the forecast.',
    prove: 'Does an honest demand forecast get used when it looks like a missed target?', shape: 'Separate the demand forecast from the target before the pilot. Otherwise the model’s honesty becomes a liability for the people who must use it.' },
  { id: 'accountability', node: 'planners', title: 'Accountability: if the forecast is wrong and stock runs out, who answers?',
    prove: 'Who is accountable for the plan, and does that person feel able to disagree with the model?', shape: 'Name the accountable owner in advance. The planner decides and the model advises, and that is said out loud.' },
  { id: 'distributors', node: 'buyers', title: 'Control: distributors place their own orders.',
    prove: 'Will a distributor change what it orders because we shared a forecast?', shape: 'Treat the forecast as advice. Pilot with a distributor that agrees in advance to review it each week, and measure whether its orders moved.' },
];
const people = worryScreen({
  id: 'e3-people', lens: 'ppl', adopt: 'people', label: 'Will people use it?', stage: 'Understanding', next: 'Design the pilot',
  title: 'Will people actually use it?',
  lede: 'People are part of the system. A forecast that planners override every week, or that a distributor ignores, has not improved the decision, whatever its accuracy says. Here is how the people look, again fictional but realistic.',
  chainHead: 'From the target to the order',
  nodes: [
    { id: 'vp', name: 'VP of Sales', detail: 'Signs off the number, and the sales target sits on top of it.', status: 'Conflict', tone: 'partly' },
    { id: 'planners', name: 'Demand planners (6)', detail: 'Own the forecast. A forecasting tool was rolled out in 2022 and quietly dropped.', status: 'Low trust', tone: 'gap' },
    { id: 'buyers', name: 'Distributor buyers', detail: 'Decide their own orders. We can advise, not instruct.', status: 'Not ours', tone: 'gap' },
    { id: 'reps', name: 'Account reps', detail: 'Know their accounts well. Each sees one corner of the market.', status: 'Useful', tone: 'ok' },
  ],
  worries: PPL_WORRIES, key: 'pplWorry',
});

// ---------------------------------------------------------------- 4. Design
const SCOPE_TEXT = {
  lean: { title: 'One distributor, 12 SKU groups', sub: `Gulf Coast Wine & Spirits. ${SCOPES.lean.units} series: small enough to watch closely.`, short: 'Gulf Coast Wine & Spirits, 12 SKU groups' },
  full: { title: 'All three distributors', sub: `${SCOPES.full.units} series. More signal, more to coordinate, harder to learn from if something goes wrong.`, short: 'all three Texas distributors, 12 SKU groups each' },
};
const HUMANS = {
  review: { title: 'Planner reviews every forecast and can override it', sub: 'Slowest, most trust-building. Overrides become data on where the model is wrong.', short: 'reviews every forecast and may override it, with a reason' },
  band: { title: 'Automatic inside ±10%, planner reviews outside it', sub: 'Faster. Risks missing a quiet error inside the band.', short: 'reviews only forecasts that differ from the simple forecast by more than 10%' },
  auto: { title: 'AI decides, planner audits weekly', sub: 'Fastest. Only sensible once trust has been earned.', short: 'audits a sample each week; the AI forecast sets the plan' },
};
const TARGETS = [0.05, 0.1, 0.2];

const design = {
  id: 'e3-design', exp: 3, adopt: 'pilot', title: 'Design the pilot',
  render(ctx) {
    const { state, save } = ctx;
    const m = modelFor(state);
    const ev = evaluate(m);
    const vsSimple = bootstrapReduction(ev.rows, 'simple');
    const perSeries = AVG_WEEKLY / SERIES;
    const root = h('div', { class: 'screen stack-l' });
    const paint = () => {
      const p = state.pilot;
      const aboveEvidence = p.target > Math.max(0, vsSimple.hi);
      mount(root,
        h('div', { class: 'stack' },
          ...head({ lens: 'biz', exp: 3, stage: 'Action', title: 'Turn the idea into an experiment.', wide: true }),
          h('p', { class: 'lede' }, 'A pilot is a question you ask the real world. Decide what you will change, what you will compare it to, and who stays in charge.')),
        h('div', { class: 'stack-s' },
          h('h3', { class: 'h3' }, '1. Hypothesis'),
          h('p', { class: 'prose' }, 'At the grain that matters, distributor by SKU group, an AI-assisted forecast will cut the typical miss, compared with a simple no-AI forecast, by at least:'),
          choices({ name: 'Target', items: TARGETS.map((t) => ({ id: String(t), title: `${t * 100}%`, sub: t === 0.05 ? 'Cautious. Easy to be fooled by noise at this size.' : t === 0.1 ? 'A meaningful edge. The sort of gain that would justify the effort.' : 'Bold. Nothing in the back-test supports it.' })), value: String(p.target), onPick: (v) => { p.target = +v; save(); paint(); } }),
          h('p', { class: 'small' }, `At market level the back-test found the AI ${rangeText(vsSimple)} against the simple method. That is unresolved, not a tie. The hypothesis is that finer grain, where each series is noisier and a model can share what it learns across series, is where AI earns its keep. The model in this lab does not share across series, so the pilot would test a different model from the one you opened.`),
          aboveEvidence ? h('p', { class: 'small' }, h('strong', null, `A ${p.target * 100}% target is above the best case the back-test allowed (${pc(vsSimple.hi, 0)}). `), 'A pilot built around it tests a world the data did not show.') : null),
        h('div', { class: 'stack-s' },
          h('h3', { class: 'h3' }, '2. Baseline'),
          h('p', { class: 'prose' }, `Run three forecasts alongside each other for the whole pilot: today’s method (${pc(ev.wapeCurrent)} typical miss in the back-test, running ${pc(ev.biasCurrent, 0)} above shopper sales), a simple no-AI forecast (${pc(ev.wapeSimple)}) and the AI. Judge the AI against the better of the two, so that a win means AI, not just using shopper sales.`),
          h('p', { class: 'small' }, `Those back-test numbers are for the Texas total, about ${int(AVG_WEEKLY)} cases a week. At the pilot’s grain each series averages about ${int(perSeries)} cases a week, a small fraction of that. Expect every forecast to miss by more than it does at market level. How much more is unknown until it is measured, and measuring it is part of the pilot.`)),
        h('div', { class: 'stack-s' },
          h('h3', { class: 'h3' }, '3. Intervention'),
          choices({ name: 'Scope', items: Object.entries(SCOPE_TEXT).map(([id, x]) => ({ id, title: x.title, sub: x.sub })), value: p.scope, onPick: (v) => { p.scope = v; save(); paint(); } })),
        h('div', { class: 'stack-s' },
          h('h3', { class: 'h3' }, '4. Human role'),
          choices({ name: 'Human role', items: Object.entries(HUMANS).map(([id, x]) => ({ id, title: x.title, sub: x.sub })), value: p.human, onPick: (v) => { p.human = v; save(); paint(); } }),
          h('p', { class: 'small' }, 'In every option the planner stays accountable for the plan, and the distributor places its own order.')),
        actions(ctx, { label: 'Measure it' }));
    };
    paint();
    return root;
  },
};

// ---------------------------------------------------------------- 5. Measure
const PRIMARY = {
  wape: { title: 'Forecast accuracy (typical miss)', sub: 'Easy to measure and fast. But accuracy is a means: a better forecast that changes nothing about what ships changes nothing.' },
  lost: { title: 'Lost cases (shelves that ran empty)', sub: 'Closer to the business outcome. Noisier, and affected by things besides the forecast.' },
  both: { title: 'Both, with accuracy as the early signal', sub: 'Accuracy tells you quickly whether it is working. Lost cases tell you whether it matters.' },
};
const GUARDS = [
  ['excess', 'Distributor stock', 'Make sure it did not trade empty shelves for full warehouses.'],
  ['override', 'Planner override rate', 'If planners override most forecasts, the model has not been adopted.'],
  ['time', 'Planner time', 'Check that the savings are real and nobody is double-working.'],
];
const WEEKS_OPTS = [8, 13, 26];
const winText = (x) => `${(x * 100).toFixed(1).replace('.0', '')}%`;

const measure = {
  id: 'e3-measure', exp: 3, adopt: 'measure', title: 'Measure it',
  render(ctx) {
    const { state, save } = ctx;
    const m = modelFor(state);
    const ev = evaluate(m);
    const vsSimple = bootstrapReduction(ev.rows, 'simple');
    const root = h('div', { class: 'screen stack-l' });
    let hist = null;
    const paint = () => {
      const p = state.pilot;
      const units = SCOPES[p.scope].units;
      const stressUnits = Math.max(1, Math.round(units / 3));
      const sim = simulatePilot(m, p.weeks, p.target, { vs: 'simple', units });
      const stress = simulatePilot(m, p.weeks, p.target, { vs: 'simple', units: stressUnits });
      const [real, , none] = sim.worlds;
      const canTell = stress.power >= 0.8 && stress.falseAlarm <= 0.1;
      const aboveEvidence = p.target > Math.max(0, vsSimple.hi);
      const worlds = [{ samples: none.reductions, color: 'var(--ink-2)', label: 'AI does nothing' }, { samples: real.reductions, color: 'var(--s-ai)', label: `AI really is ${p.target * 100}% better` }];
      const markers = [{ v: 0, label: 'No change' }, { v: sim.passAt, label: `Win line ${winText(sim.passAt)}` }];
      if (hist) hist.update({ worlds, markers, passAt: sim.passAt });
      else hist = histogram({ worlds, markers, passAt: sim.passAt });
      mount(root,
        h('div', { class: 'stack' },
          ...head({ lens: 'biz', exp: 3, stage: 'Learning', title: 'Would the pilot be able to tell?', wide: true }),
          h('p', { class: 'lede' }, 'Decide the scoreboard before the game. Then ask the question most pilots skip: if the AI really were better, would a test this size show it, and if it were not, would it still look like a win?')),
        h('div', { class: 'finding sticky-hero' },
          h('div', { class: 'finding-head' },
            h('div', { class: 'micro' }, `${p.weeks}-week pilot, ${SCOPE_TEXT[p.scope].title} (${units} series), 1,500 simulated pilots in each world`),
            h('p', { class: 'says' }, canTell
              ? `A pilot this size can tell, even if its series overlap: it shows a win ${Math.round(stress.power * 100)}% of the time if the gain is real, and ${Math.round(stress.falseAlarm * 100)}% if it is not.`
              : `A pilot this size cannot reliably tell. If the AI really is ${p.target * 100}% better it shows a win ${Math.round(real.passes * 100)}% of the time under the assumption below, and ${Math.round(stress.power * 100)}% if its series overlap; if it does nothing it still shows one ${Math.round(none.passes * 100)}% to ${Math.round(stress.falseAlarm * 100)}% of the time.`)),
          hist,
          h('p', { class: 'small' }, `Each bar is how many simulated pilots ended at that improvement. Any one pilot lands above or below the truth by chance, so a win is called halfway between nothing and the ${p.target * 100}% target. Solid bars are wins. A good pilot has most of the blue there and almost none of the grey.`)),
        h('p', { class: 'small' }, `The picture assumes the pilot’s ${units} series have unrelated errors. Real series share a model, a price and a promotion calendar, so the numbers in the headline are for the stress case, where only ${stressUnits} series’ worth of noise really averages out. It also assumes the gain is the size of the target, which the back-test did not show.`),
        aboveEvidence ? h('p', { class: 'small' }, h('strong', null, `This power is conditional on a ${p.target * 100}% gain, which is above the best case the back-test allowed (${pc(vsSimple.hi, 0)}). `), 'Do not read it as the chance of success.') : null,
        h('div', { class: 'stack-s' },
          h('h3', { class: 'h3' }, 'Test period'),
          choices({ name: 'Weeks', items: WEEKS_OPTS.map((w) => ({ id: String(w), title: `${w} weeks`, sub: w === 8 ? 'Fast. Most likely to be fooled by a lucky or unlucky stretch.' : w === 13 ? 'A full quarter, including a quarter-end loading cycle.' : 'Half a year. Slow, and the most convincing.' })), value: String(p.weeks), onPick: (v) => { p.weeks = +v; save(); paint(); } })),
        h('div', { class: 'stack-s' },
          h('h3', { class: 'h3' }, 'Success metric'),
          choices({ name: 'Primary metric', items: Object.entries(PRIMARY).map(([id, x]) => ({ id, title: x.title, sub: x.sub })), value: p.primary, onPick: (v) => { p.primary = v; save(); paint(); } })),
        h('div', { class: 'stack-s' },
          h('h3', { class: 'h3' }, 'Guardrails'),
          h('p', { class: 'small' }, 'Things that must not get worse while the main metric improves.'),
          h('div', { class: 'toggles' }, GUARDS.map(([id, t, hint]) => {
            const on = p.guard.includes(id);
            return h('button', { class: 'toggle', type: 'button', role: 'switch', 'aria-checked': String(on), onClick: () => { p.guard = on ? p.guard.filter((x) => x !== id) : [...p.guard, id]; save(); paint(); } },
              h('span', { class: 'toggle-sw' }), h('span', null, h('span', { class: 'toggle-t' }, t), h('span', { class: 'toggle-h' }, hint)), h('span'));
          }))),
        h('div', { class: 'stack-s' },
          h('h3', { class: 'h3' }, 'Decision after the test'),
          choices({ name: 'Rule', items: [
            { id: 'scale', title: 'Scale if it shows a win. Extend if it is close. Stop if it is not.', sub: 'A clear rule agreed in advance, so the result cannot be argued around afterwards.' },
            { id: 'strict', title: 'Scale only if it shows a win and planners are not overriding most of it.', sub: 'Adoption counts as much as accuracy.' },
          ], value: p.rule, onPick: (v) => { p.rule = v; save(); paint(); } })),
        actions(ctx, { label: 'See the pilot brief' }));
    };
    paint();
    return root;
  },
};

// ---------------------------------------------------------------- 6. The brief
const READ_LABEL = { consumers: 'weaker shopper demand', competitor: 'a competitor taking shoppers', distribution: 'lost retail distribution', price: 'the price increase', inventory: 'distributors carrying too much', unsure: 'not sure yet' };

function briefData(state) {
  const m = modelFor(state);
  const ev = evaluate(m);
  const p = state.pilot, v = state.value;
  const est = pairGain(m, baseKey(v.vs), 'ai');
  const val = potentialValue(v, est.point);
  const need = breakEvenMultiple(v, est.point);
  const units = SCOPES[p.scope].units;
  const stressUnits = Math.max(1, Math.round(units / 3));
  const sim = simulatePilot(m, p.weeks, p.target, { vs: 'simple', units });
  const stress = simulatePilot(m, p.weeks, p.target, { vs: 'simple', units: stressUnits });
  const canTell = stress.power >= 0.8 && stress.falseAlarm <= 0.1;
  const sys = SYS_WORRIES.find((x) => x.id === state.sysWorry);
  const ppl = PPL_WORRIES.find((x) => x.id === state.pplWorry);
  const guardNames = GUARDS.filter(([id]) => p.guard.includes(id)).map(([, t]) => t.toLowerCase());
  const metric = { wape: 'forecast accuracy (the typical weekly miss)', lost: 'lost cases', both: 'forecast accuracy as the early signal, with lost cases as the outcome' }[p.primary];
  const rule = p.rule === 'strict'
    ? `Scale to the next distributor only if the pilot shows a win against the better baseline (at least ${winText(sim.passAt)}) and planners are not overriding most forecasts. Extend 13 weeks if close. Otherwise stop and write up what was learned.`
    : `Scale to the next distributor if the pilot shows a win against the better baseline (at least ${winText(sim.passAt)}). Extend 13 weeks if it comes close. Otherwise stop and write up what was learned.`;
  const noAIgain = pairGain(m, 'current', 'simple');
  const sections = [
    ['Recommendation', `Do the no-AI moves now. Run the AI test only if all of these hold: the weekly distributor stock reports and a stock-range alert are in place, so the AI is compared with the best no-AI practice; a pilot distributor has agreed to review the forecast each week; and the design below can tell a real gain from noise (${canTell ? 'it can, even if its series overlap' : 'it cannot yet: widen the scope or lengthen the test first'}). If the pilot shows no win, stop: the no-AI moves will already have paid for the effort.`],
    ['Do first, without AI', `Ask for weekly distributor inventory and set a stock range with an alert. Base the forecast on shopper sell-through, not shipments. In the back-test, forecasting shoppers instead of shipments cut the typical miss from ${pc(ev.wapeCurrent)} to ${pc(ev.wapeSimple)}, and was worth ${money(noAIgain.lo)} to ${money(noAIgain.hi)} a year in this one market across cushion rules. The stock alert was not tested here.`],
    ['Hypothesis', `At distributor-by-SKU-group grain, an AI-assisted weekly demand forecast will cut the typical forecast miss by at least ${p.target * 100}% compared with a simple no-AI forecast. At market level the back-test could not tell them apart.`],
    ['Baseline', `Today’s forecast (last year’s shipments plus 3%) misses by ${pc(ev.wapeCurrent)}; a simple forecast of shopper sales (same week last year, scaled by the recent trend) by ${pc(ev.wapeSimple)}; in a market-level back-test. Run both alongside the AI for the whole pilot, score all three on the same weeks, and judge the AI against the better of the two.`],
    ['Intervention', `An AI-assisted weekly forecast of shopper demand for ${SCOPE_TEXT[p.scope].short}, as a column in the planners’ existing spreadsheet, with the reasoning for each forecast, shared with the distributor. The plan is the forecast plus a cushion chosen in advance from the cost of a missing case ($95) against an extra one ($18). The distributor places its own order.`],
    ['Human role', `The demand planner ${HUMANS[p.human].short}. The planner stays accountable for the plan. The model advises.`],
    ['Success metric', `Primary: ${metric}. Guardrails: ${guardNames.length ? guardNames.join(', ') : 'none selected'}.`],
    ['Test period', `${p.weeks} weeks across ${units} series. In simulation, if the AI really is ${p.target * 100}% better a pilot this size shows a win (at least ${winText(sim.passAt)}) ${Math.round(sim.power * 100)}% of the time, or ${Math.round(stress.power * 100)}% if its series overlap; if it does nothing it shows a false win ${Math.round(sim.falseAlarm * 100)}% to ${Math.round(stress.falseAlarm * 100)}% of the time.`],
    ['Decision after the test', rule],
    ['Accountability', 'The head of demand planning owns the scoreboard and agrees the metric and baselines in writing before the pilot starts. The planner is accountable for each plan. The VP of Supply Chain decides to scale or stop, against the written rule, and answers for the result.'],
    ['Value at stake', `On the stated assumptions the net potential value is ${money(val.net)} a year, compared with ${VS[v.vs]}. It needs the real-world gain to be about ${need === Infinity ? 'more than the back-test can offer' : `${need.toFixed(1)}× the market-level back-test`} to pay for itself. That is a hypothesis for the pilot to test, not a finding.`],
  ];
  const learn = [
    'Does the AI beat the simple no-AI forecast at distributor-by-SKU grain, and by how much? The back-test, at market level, could not tell them apart.',
    ppl ? ppl.prove : 'Will planners use the forecast?',
    sys ? sys.prove : 'Can the data and workflow support it?',
    'Does a better forecast change what distributors order, and does that reduce lost cases without piling up stock?',
    'What does the model miss that a planner catches, such as a chain’s reset or a competitor launch, and how do we teach the next planner to look for it?',
  ];
  return { sections, learn, ev, val, sim, need, canTell };
}

const brief = {
  id: 'e3-brief', exp: 3, adopt: 'scale', title: 'The pilot brief',
  render(ctx) {
    const { state } = ctx;
    const b = briefData(state);
    const D = decompose();
    const text = `AI DECISION LAB: PILOT BRIEF\nRidgeline Bourbon, Texas (fictional)\n\n${b.sections.map(([t, x]) => `${t.toUpperCase()}\n${x}`).join('\n\n')}\n\nWHAT WOULD WE NEED TO LEARN?\n${b.learn.map((x, i) => `${i + 1}. ${x}`).join('\n')}\n`;
    const copy = h('button', { class: 'btn ghost small', type: 'button', 'aria-live': 'polite', onClick: async () => {
      try { await navigator.clipboard.writeText(text); copy.textContent = 'Copied to clipboard'; } catch (e) { copy.textContent = 'Copy failed: select the text instead'; }
      setTimeout(() => { copy.textContent = 'Copy as text'; }, 2400);
    } }, 'Copy as text');
    return h('div', { class: 'screen stack-l' },
      h('div', { class: 'stack' },
        ...head({ lens: 'biz', exp: 3, stage: 'Learning', title: 'Here is how you would find out.', wide: true }),
        h('p', { class: 'lede' }, 'You are not testing AI. You are testing whether it beats a spreadsheet at the grain that matters, and you now know how to make that test fair: a baseline in writing, a scoreboard agreed first, a rule for scale or stop, and an honest idea of what a pilot this size can tell you.')),
      h('article', { class: 'brief' },
        h('div', { class: 'brief-head' },
          h('div', null, h('div', { class: 'micro' }, 'Pilot brief'), h('h2', { class: 'h2' }, 'AI-assisted weekly demand forecast')),
          h('div', { class: 'row' }, copy, h('button', { class: 'btn ghost small', type: 'button', onClick: () => window.print() }, 'Print'))),
        h('dl', null, b.sections.flatMap(([t, x]) => [h('dt', null, t), h('dd', null, x)]))),
      !b.canTell ? note('A caution about this design', 'As configured, the pilot cannot reliably tell a real gain from noise. Change the scope or the length on the previous screen before committing.') : null,
      h('section', { class: 'stack finding' },
        h('div', { class: 'finding-head' }, h('div', { class: 'micro' }, 'The closing question'), h('p', { class: 'says' }, 'What would we need to learn?')),
        h('ol', { class: 'learn-list' }, b.learn.map((x) => h('li', null, x)))),
      h('section', { class: 'stack' },
        h('h2', { class: 'h2' }, 'Decide. See why. Learn. Repeat.'),
        h('div', { class: 'looped' },
          h('div', null, h('span', { class: 'micro' }, 'You started with'), h('p', null, state.read ? `A read that the drop came from ${READ_LABEL[state.read]}.` : 'A drop of 8% and an open question.')),
          h('div', null, h('span', { class: 'micro' }, 'The evidence said'), h('p', null, `Shipments down ${Math.abs(D.pct).toFixed(1)}%, shoppers down ${Math.abs(D.depPct).toFixed(1)}%. Most of the drop was inventory and availability, and part of it is temporary.`)),
          h('div', null, h('span', { class: 'micro' }, 'You found'), h('p', null, `Two cheaper moves first (see distributor stock, forecast shoppers not shipments), and a harder question for AI: ${pc(b.ev.wapeAI)} typical miss against ${pc(b.ev.wapeSimple)} for a simple method, in a back-test.`)),
          h('div', null, h('span', { class: 'micro' }, 'What is left'), h('p', null, 'Everything the back-test cannot tell you. That is the pilot.'))),
        h('div', { class: 'row' },
          h('button', { class: 'btn', type: 'button', onClick: () => ctx.go('e1-situation') }, 'Run the loop again'),
          h('button', { class: 'btn ghost', type: 'button', onClick: () => ctx.go('landing') }, 'Back to the start')),
        ctx.hasBack ? h('div', null, h('button', { class: 'back', type: 'button', onClick: ctx.back }, '← Back')) : null));
  },
};

export const e3 = [value, system, people, design, measure, brief];
