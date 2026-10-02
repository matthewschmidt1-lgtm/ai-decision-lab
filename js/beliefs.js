// Six beliefs that sit inside how Ridgeline plans, each tested against the data a learner can see.
// Every verdict is computed from WEEKS, so it moves if the data does. Nothing here reads the hidden
// truth, with one labelled exception (the promotion break-even uses the lab's assumed lift).
//
// Four verdicts, defined once so a learner can predict them:
//   holds       the data backs it, including in the weeks that matter
//   conditions  true on average or in ordinary weeks, false in the weeks that decide a quarter
//   unsupported the data does not back it
//   untestable  the data does not contain what it would take to say

import { WEEKS, WINDOW, PRICE_WEEK, PROMO_RUN, HOLDOUT_START, N, decompose, MARGIN_PER_CASE, REVENUE_PER_CASE, TRUTH_EFFECTS } from './data.js';

export const VERDICTS = [
  { id: 'holds', short: 'Holds', tone: 'strong', def: 'The data backs it, including in the weeks that matter.' },
  { id: 'conditions', short: 'Some conditions', tone: 'maybe', def: 'True on average, false in the weeks that decide a quarter.' },
  { id: 'unsupported', short: 'Not supported', tone: 'no', def: 'The data does not back it.' },
  { id: 'untestable', short: 'Can’t be tested', tone: 'none', def: 'The data does not contain what it would take to say.' },
];
export const VERDICT = Object.fromEntries(VERDICTS.map((v) => [v.id, v]));

const sum = (idx, k) => idx.reduce((s, t) => s + WEEKS[t][k], 0);
const range = (a, b) => { const r = []; for (let t = a; t <= b; t++) r.push(t); return r; };
const gap = (idx) => sum(idx, 'ship') / sum(idx, 'dep') - 1;       // what distributors bought vs. what shoppers bought
const bias = (idx) => sum(idx, 'cf') / sum(idx, 'dep') - 1;          // forecast vs. what shoppers bought
const mean = (arr) => arr.reduce((s, x) => s + x, 0) / arr.length;

// Quarter structure as the data shows it: orders swell in the last two weeks of a 13-week quarter
// and sag in the first two.
const wk = (t) => t % 13;
const isQuarterEnd = (t) => wk(t) === 11 || wk(t) === 12;
const isQuarterStart = (t) => wk(t) === 0 || wk(t) === 1;

// Ordinary least squares of y on x with a rough standard error (it ignores week-to-week
// correlation, so the true range is wider than this).
function ols(x, y) {
  const n = x.length, mx = mean(x), my = mean(y);
  let sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sxx += (x[i] - mx) ** 2; sxy += (x[i] - mx) * (y[i] - my); }
  const b = sxy / sxx, a = my - b * mx;
  let sse = 0;
  for (let i = 0; i < n; i++) sse += (y[i] - a - b * x[i]) ** 2;
  return { slope: b, se: Math.sqrt(sse / (n - 2) / sxx) };
}

export function testBeliefs() {
  const D = decompose();

  // 1. Our forecast represents demand.
  const yearOne = range(55, 103), recent = range(HOLDOUT_START, N - 1), allFc = range(55, N - 1);
  const within5 = allFc.filter((t) => Math.abs(WEEKS[t].cf / WEEKS[t].dep - 1) <= 0.05).length;
  const wape = (idx) => idx.reduce((s, t) => s + Math.abs(WEEKS[t].cf - WEEKS[t].dep), 0) / sum(idx, 'dep');
  const f = { biasYearOne: bias(yearOne), biasRecent: bias(recent), wape: wape(allFc), within5, weeks: allFc.length };
  f.verdict = Math.abs(f.biasYearOne) <= 0.03 && f.biasRecent > 0.05 ? 'conditions' : (Math.abs(f.biasRecent) <= 0.03 ? 'holds' : 'unsupported');

  // 2. Distributors order what they expect to sell (what shoppers buy).
  const year = range(N - 52, N - 1), all = range(0, N - 1);
  const preBuy = range(PRICE_WEEK - 5, PRICE_WEEK - 1), postBuy = range(PRICE_WEEK, PRICE_WEEK + 4);
  const ordinary = all.filter((t) => !isQuarterEnd(t) && !isQuarterStart(t) && !preBuy.includes(t) && !postBuy.includes(t));
  const ordWithin3 = ordinary.filter((t) => Math.abs(WEEKS[t].ship / WEEKS[t].dep - 1) <= 0.03).length;
  const d = {
    gapYear: gap(year), ordinary: ordinary.length, ordWithin3,
    quarterEnd: gap(all.filter(isQuarterEnd)), quarterStart: gap(all.filter(isQuarterStart)),
    preBuy: gap(preBuy), postBuy: gap(postBuy),
    quarterEndInPreBuy: preBuy.filter(isQuarterEnd).length,
  };
  d.verdict = Math.abs(d.gapYear) <= 0.02 && Math.max(Math.abs(d.quarterEnd), Math.abs(d.preBuy)) > 0.05 ? 'conditions' : (Math.abs(d.gapYear) <= 0.02 ? 'holds' : 'unsupported');

  // 3. Promotion adds volume. (Whether it adds profit needs a discount and a margin the data does not hold.)
  const lift = TRUTH_EFFECTS.promo, perStore = Math.exp(lift) - 1;
  const p = { pts: D.pts.promo, perStore, breakEven: MARGIN_PER_CASE * perStore / (1 + perStore) };
  p.breakEvenPct = p.breakEven / REVENUE_PER_CASE;
  p.verdict = p.pts > 0.5 ? 'holds' : 'unsupported';

  // 4. The people closest to the account see what matters.
  const s = { chain: D.pts.distribution, rival: D.pts.competitor, stock: D.pts.inventory, total: D.pct };
  s.verdict = [s.chain, s.rival, s.stock].every((x) => x < -0.5) ? 'conditions' : 'untestable';

  // 5. Losing distribution costs us volume one for one.
  const x = [], y = [];
  for (let t = 52; t < N; t++) { x.push(Math.log(WEEKS[t].dist / WEEKS[t - 52].dist)); y.push(Math.log(WEEKS[t].dep / WEEKS[t - 52].dep)); }
  const fit = ols(x, y);
  const q = { slope: fit.slope, half: 1.96 * fit.se, lo: fit.slope - 1.96 * fit.se, hi: fit.slope + 1.96 * fit.se, model: TRUTH_EFFECTS.dist, lost: (WEEKS[N - 1].dist - WEEKS[N - 53].dist) };
  // one-for-one is only "supported" if the data could tell it from half; here it cannot
  q.verdict = q.half < 0.25 ? (Math.abs(q.slope - 1) < 0.25 ? 'holds' : 'unsupported') : 'untestable';

  // 6. Promotions are what empty our shelves.
  const run = range(PROMO_RUN[0], PROMO_RUN[1]), after = range(PROMO_RUN[1] + 1, N - 1);
  const oos = (idx, off = 0) => mean(idx.map((t) => WEEKS[t - off].oos));
  const o = { during: oos(run), duringLast: oos(run, 52), after: oos(after), afterLast: oos(after, 52), afterFrom: after[0] };
  o.verdict = o.during < o.duringLast + 0.01 && o.after > o.afterLast + 0.015 ? 'unsupported' : (o.during > o.duringLast + 0.015 ? 'holds' : 'untestable');

  return { forecast: f, distributors: d, promo: p, field: s, distribution: q, shelves: o };
}
