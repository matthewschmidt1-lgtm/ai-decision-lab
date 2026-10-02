// The economics: what a forecast is worth, replayed against what really happened,
// and what a pilot could and could not tell us. All of it is computed, none of it is canned.
//
// Two rules keep this honest. Every choice (the cushion) is made on validation weeks and then
// scored on test weeks it never touched. And every forecast is compared on the same rule.

import { WEEKS, MARGIN_PER_CASE, CARRY_PER_CASE } from './data.js';
import { TEST_WEEKS, VALID_WEEKS, predict, selectionModel, simpleForecast } from './forecast.js';

// Replay: order = supply for the week. If supply falls short of what shoppers wanted we lose the
// margin on the missing cases. If it overshoots, the extras sit in the pipeline and cost us.
// Each week stands on its own, which ignores the stock distributors carry from week to week.
// That is a simplification, and the lab says so.
function cost(rows) {
  let lost = 0, excess = 0, short = 0;
  for (const { q, d } of rows) {
    lost += Math.max(0, d - q);
    excess += Math.max(0, q - d);
    if (q < d) short++;
  }
  return { lost, excess, short, weeks: rows.length, cost: lost * MARGIN_PER_CASE + excess * CARRY_PER_CASE };
}

export const CURRENT_CUSHION = 0.04;   // today's rule of thumb: forecast plus 4%
export const CUSHIONS = [];
for (let c = -0.10; c <= 0.2501; c += 0.005) CUSHIONS.push(+c.toFixed(3));

// A forecast source, as it would have been available at the time.
function source(key, model) {
  if (key === 'ai') return { test: (t) => predict(model, t), valid: (t) => predict(selectionModel(model.groups, model.l2), t) };
  if (key === 'current') return { test: (t) => WEEKS[t].cf, valid: (t) => WEEKS[t].cf };
  return { test: (t) => simpleForecast(t), valid: (t) => simpleForecast(t) };
}
const replay = (f, weeks, cushion) => cost(weeks.map((t) => ({ q: f(t) * (1 + cushion), d: WEEKS[t].want })));

export const replayAI = (model, c) => replay(source('ai', model).test, TEST_WEEKS, c);
export const replayCurrent = (c = CURRENT_CUSHION) => replay(source('current').test, TEST_WEEKS, c);
export const replaySimple = (model, c) => replay(source('simple', model).test, TEST_WEEKS, c);

const argmin = (pts) => pts.reduce((a, p) => (p.cost < a.cost ? p : a), pts[0]);

// Cost on the TEST weeks at every cushion, for each forecast, plus the cushion each would have
// picked on the VALIDATION weeks (before ever seeing the test) and the best-in-hindsight for reference.
export function costCurves(model) {
  const out = { chosen: {}, hindsight: {} };
  for (const key of ['ai', 'current', 'simple']) {
    const src = source(key, model);
    out[key] = CUSHIONS.map((c) => ({ c, ...replay(src.test, TEST_WEEKS, c) }));
    const onValid = CUSHIONS.map((c) => ({ c, ...replay(src.valid, VALID_WEEKS, c) }));
    out.chosen[key] = argmin(onValid).c;
    out.hindsight[key] = argmin(out[key]).c;
  }
  return out;
}
const at = (pts, c) => pts[CUSHIONS.findIndex((x) => Math.abs(x - c) < 1e-6)];

export const WEEKS_IN_BACKTEST = TEST_WEEKS.length;
export const annualise = (v) => v * 52 / WEEKS_IN_BACKTEST;

// The dollar gain of one forecast over another is not one number: it depends on the cushion rule, and
// each cost curve is flat near its bottom, so the "best" cushion is partly luck. So report it three ways
// (each forecast's cushion chosen in advance, today's own +4% for both, and each at its hindsight best)
// and take the middle one as the estimate, with the whole spread as the range.
// base and other are forecast keys: the gain is cost(base) - cost(other), annualised.
function weekCost(f, t, cushion) {
  const q = f(t) * (1 + cushion), d = WEEKS[t].want;
  return Math.max(0, d - q) * MARGIN_PER_CASE + Math.max(0, q - d) * CARRY_PER_CASE;
}
export function bootstrapGain(model, base = 'simple', other = 'ai', { runs = 1500, block = 4 } = {}) {
  const cv = costCurves(model);
  const fo = source(other, model).test, fb = source(base, model).test;
  const diffs = TEST_WEEKS.map((t) => weekCost(fb, t, cv.chosen[base]) - weekCost(fo, t, cv.chosen[other]));
  const n = diffs.length, rand = mulberry(31);
  const out = [];
  for (let i = 0; i < runs; i++) {
    let sum = 0, k = 0;
    while (k < n) {
      const start = Math.floor(rand() * n);                       // circular blocks
      for (let j = 0; j < block && k < n; j++, k++) sum += diffs[(start + j) % n];
    }
    out.push(annualise(sum));
  }
  out.sort((x, y) => x - y);
  return { point: annualise(diffs.reduce((a, b) => a + b, 0)), lo: out[Math.floor(runs * 0.05)], hi: out[Math.floor(runs * 0.95)] };
}
export function pairGain(model, base = 'simple', other = 'ai') {
  const cv = costCurves(model);
  const at = (key, c) => cv[key][CUSHIONS.findIndex((x) => Math.abs(x - c) < 1e-6)].cost;
  const regimes = [
    ['each forecast’s own cushion, chosen in advance', annualise(at(base, cv.chosen[base]) - at(other, cv.chosen[other]))],
    ['both at today’s +4%', annualise(at(base, CURRENT_CUSHION) - at(other, CURRENT_CUSHION))],
    ['each at its best in hindsight', annualise(at(base, cv.hindsight[base]) - at(other, cv.hindsight[other]))],
  ];
  const vals = regimes.map((r) => r[1]).sort((a, b) => a - b);
  const boot = bootstrapGain(model, base, other);
  return { point: vals[1], lo: Math.min(boot.lo, vals[0]), hi: Math.max(boot.hi, vals[2]), regimes, boot, annual: vals[1] };
}
// How wide is the flat bottom of a cost curve? The cushions within 10% of the best cost.
export function flatBottom(curve) {
  const best = Math.min(...curve.map((p) => p.cost));
  const near = curve.filter((p) => p.cost <= best * 1.1).map((p) => p.c);
  return [Math.min(...near), Math.max(...near)];
}

export const SCOPES = {
  lean: { label: 'Lean pilot: one distributor', short: 'one distributor', decisions: 12 * 52, coverage: 1 / 3, runCost: 30000, units: 12 },
  full: { label: 'Full build: all three distributors', short: 'all three distributors', decisions: 3 * 12 * 52, coverage: 1, runCost: 100000, units: 36 },
};
export const DEFAULTS = {
  scope: 'lean',
  decisions: SCOPES.lean.decisions,   // 12 SKU groups x 52 weeks, one distributor
  coverage: SCOPES.lean.coverage,     // share of Texas volume in scope
  minutes: 40,          // planner time per forecast decision today
  rate: 70,             // loaded cost per planner hour
  reduction: 0.30,      // time saved when a forecast is drafted for the planner
  review: 0.20,         // share of forecasts a planner still does by hand
  holds: 0.50,          // share of the back-test improvement that survives real life
  grain: 1,             // gain at SKU-by-distributor grain, as a multiple of the market-level back-test
  adoption: 0.70,       // share of decisions where the forecast is actually used
  runCost: SCOPES.lean.runCost,
  markets: 1,           // brand-markets using it. The back-test is one: Ridgeline in Texas
  vs: 'simple',         // what the gain is measured against: 'simple' or 'current'
};
export const EXTRA_MARKET_COST = 0.25;   // each added brand-market costs a quarter of the first
export const TRANSFER = 0.6;             // and earns 60% of what the first did: not every market is Texas
export const PLANNERS = 6;
export const HOURS_PER_FTE = 1800;

const clamp01 = (x) => Math.min(1, Math.max(0, x));

// Planner time only counts as AI value when the comparison is with today's method. A simple
// spreadsheet forecast saves the same hours, so against that it is not AI's to claim.
export function potentialValue(p, gainAnnual) {
  const reach = 1 + TRANSFER * (p.markets - 1);
  const hours = p.decisions * p.minutes / 60;
  const kept = p.reduction * (1 - p.review) * p.adoption;
  const time = p.vs === 'simple' ? 0 : hours * p.rate * kept * reach;
  const planning = gainAnnual * p.grain * p.coverage * p.holds * p.adoption * reach;
  const run = p.runCost * (1 + EXTRA_MARKET_COST * (p.markets - 1));
  const gross = time + planning;
  return { hours, hoursSaved: hours * kept * reach, fte: hours * kept * reach / HOURS_PER_FTE, time, planning, run, gross, net: gross - run };
}

// Scenario bounds, not probabilities: each uncertain lever at half and at one-and-a-half times your
// estimate, the cost to run at one-and-a-half and three-quarters, and the market-level gain at the low and
// high end of its own range.
export function valueRange(p, est) {
  const lo = { ...p, reduction: p.reduction * 0.5, holds: p.holds * 0.5, adoption: p.adoption * 0.5, runCost: p.runCost * 1.5 };
  const hi = { ...p, reduction: clamp01(p.reduction * 1.5), holds: clamp01(p.holds * 1.5), adoption: clamp01(p.adoption * 1.5), runCost: p.runCost * 0.75 };
  return { low: potentialValue(lo, est.lo), base: potentialValue(p, est.point), high: potentialValue(hi, est.hi) };
}

// Which assumption moves the answer most?
export function sensitivity(p, gainAnnual) {
  const levers = [
    ['grain', 'Gain at finer grain vs. the market-level back-test'],
    ['holds', 'How much of the back-test gain holds in real life'],
    ['adoption', 'How often planners actually use the forecast'],
    ['runCost', 'Annual cost to run it'],
  ];
  if (p.vs !== 'simple') levers.push(['reduction', 'Planner time saved per forecast']);
  return levers.map(([k, label]) => {
    const worse = k === 'runCost' ? p[k] * 1.5 : p[k] * 0.5;
    const better = k === 'runCost' ? p[k] * 0.5 : k === 'grain' ? p[k] * 2 : clamp01(p[k] * 1.5);
    const a = potentialValue({ ...p, [k]: worse }, gainAnnual).net, b = potentialValue({ ...p, [k]: better }, gainAnnual).net;
    return { key: k, label, low: a, high: b, swing: b - a };
  }).sort((x, y) => y.swing - x.swing);
}

// What multiple of the market-level back-test gain would the real world have to deliver for this to
// pay for itself? 1 means exactly what the back-test showed. Conditional on everything else.
export function breakEvenMultiple(p, gainAnnual) {
  const v = potentialValue({ ...p, holds: 1, grain: 1 }, 0);
  const reach = 1 + TRANSFER * (p.markets - 1);
  const per = gainAnnual * p.coverage * p.adoption * reach;
  if (per <= 0) return Infinity;
  return Math.max(0, v.run - v.time) / per;
}

// How many brand-markets would it take, on these assumptions, for it to pay for itself?
export function marketsToBreakEven(p, gainAnnual) {
  for (let m = 1; m <= 60; m++) if (potentialValue({ ...p, markets: m }, gainAnnual).net >= 0) return m;
  return null;
}

// ---- Would a pilot of this length be able to tell? --------------------------------------
// The question is not "did the back-test win" but "if the AI really were this much better, how
// often would a pilot of this size show it, and how often would it show a win that is not there?"
// The noise comes from the real weekly forecast errors, resampled four weeks at a time (neighbouring
// weeks are related). Pilots that cover more independent series average out more of the noise:
// that is the case for a pilot at SKU-by-distributor grain. The assumption is that errors in
// different series are independent, which is generous. Seeded, so it never flickers.
function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function simulatePilot(model, weeks, target, { vs = 'simple', units = 1, runs = 1500, block = 4 } = {}) {
  const rows = TEST_WEEKS.map((t) => {
    const a = WEEKS[t].dep, base = vs === 'current' ? WEEKS[t].cf : simpleForecast(t);
    return { b: Math.abs(base - a), d: Math.abs(base - a) - Math.abs(predict(model, t) - a) };
  });
  const n = rows.length;
  const dbar = rows.reduce((s, r) => s + r.d, 0) / n;
  const bbar = rows.reduce((s, r) => s + r.b, 0) / n;
  const noise = 1 / Math.sqrt(units);
  // A pilot lands above or below the truth by chance. So a win is called halfway between "nothing"
  // and "the target": the line that balances false alarms against missed wins.
  const passAt = target / 2;
  const worlds = [['the AI really is that much better', target], ['half as good', target / 2], ['no better at all', 0]].map(([label, r], wi) => {
    const rand = mulberry(101 + weeks * 7 + wi + units);
    const reductions = [];
    for (let i = 0; i < runs; i++) {
      let sd = 0, sb = 0, k = 0;
      while (k < weeks) {
        const start = Math.floor(rand() * n);                       // circular blocks
        for (let j = 0; j < block && k < weeks; j++, k++) {
          const x = rows[(start + j) % n];
          sd += r * bbar + (x.d - dbar) * noise;   // the true effect, plus this week's noise
          sb += bbar;
        }
      }
      reductions.push(sd / sb);
    }
    reductions.sort((x, y) => x - y);
    return { label, r, reductions, passes: reductions.filter((x) => x >= passAt).length / runs, lo: reductions[Math.floor(runs * 0.05)], hi: reductions[Math.floor(runs * 0.95)] };
  });
  return { worlds, passAt, power: worlds[0].passes, falseAlarm: worlds[2].passes, backtest: dbar / bbar };
}
