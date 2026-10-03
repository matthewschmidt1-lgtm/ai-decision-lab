// A real forecasting model, small enough to read in one sitting.
//
// It forecasts depletions. It starts from the simple forecast (same week last year, scaled by the recent trend), then learns
// corrections to it: whether the trend is over- or under-trusted, and what the announced price, the
// promotion calendar and distribution as last reported are doing. With every weight at zero it IS the
// simple forecast, so it can only differ from it where it has learned something. The corrections are
// weights learned from history by gradient descent. Nothing is staged.
//
// Honest evaluation uses three slices of time. Choices (which inputs, what cushion) are made
// on VALIDATION weeks, by a model that never saw them. The TEST weeks only score the result.

import { WEEKS, TRAIN_START, VALID_START, HOLDOUT_START, EMBARGO, N } from './data.js';

export const GROUPS = [
  { id: 'mom', label: 'Momentum correction', short: 'Momentum', cols: 1, hint: 'Whether the simple forecast over- or under-trusts the recent trend' },
  { id: 'price', label: 'Price change', short: 'Price', cols: 1, hint: 'The announced list price, against a year ago' },
  { id: 'promo', label: 'Promotion change', short: 'Promotion', cols: 1, hint: 'Share of stores on promotion, against the same week last year' },
  { id: 'dist', label: 'Distribution change', short: 'Distribution', cols: 1, hint: 'Share of stores carrying us as last reported (over a month old), against a year ago' },
];
export const ALL_GROUPS = GROUPS.map((g) => g.id);

// The same week last year: a three-week average of depletions, to take the edge off noise.
export const lastYear = (t) => (WEEKS[t - 53].dep + WEEKS[t - 52].dep + WEEKS[t - 51].dep) / 3;

// Everything in a row is known at least four weeks before the week it describes.
// A planned or announced value (price, promotion) is known ahead. A reported one (distribution,
// depletions) is only known with a lag, so the model gets last month's figure, not the week's own.
export function rowFor(t, groups) {
  const w = WEEKS[t];
  const x = [], names = [], grp = [];
  const add = (v, name, g) => { x.push(v); names.push(name); grp.push(g); };
  if (groups.includes('mom')) {
    let now = 0, then = 0;
    for (let u = t - 8; u <= t - 5; u++) { now += WEEKS[u].dep; then += WEEKS[u - 52].dep; }
    add(Math.log(now / then), 'recent momentum', 'mom');
  }
  if (groups.includes('price')) add(Math.log(w.list / WEEKS[t - 52].list), 'price change', 'price');
  if (groups.includes('promo')) add(w.promo - WEEKS[t - 52].promo, 'promotion change', 'promo');
  if (groups.includes('dist')) add(Math.log(WEEKS[t - 5].dist / WEEKS[t - 57].dist), 'distribution change', 'dist');
  return { x, names, grp };
}

const idx = (a, b) => { const o = []; for (let t = a; t < b; t++) o.push(t); return o; };
// A model fitted for weeks from `to` onward learns from weeks before `to - EMBARGO`: the weeks in between were
// not yet known when its first forecast would have been made.
export const trainWeeksFor = (to) => idx(TRAIN_START, to - EMBARGO);
export const TRAIN_WEEKS = trainWeeksFor(HOLDOUT_START);
export const VALID_WEEKS = idx(VALID_START, HOLDOUT_START);
export const TEST_WEEKS = idx(HOLDOUT_START, N);

function standardise(rows) {
  const p = rows[0].length, n = rows.length;
  const mu = new Array(p).fill(0), sd = new Array(p).fill(0);
  for (const r of rows) for (let j = 0; j < p; j++) mu[j] += r[j] / n;
  for (const r of rows) for (let j = 0; j < p; j++) sd[j] += (r[j] - mu[j]) ** 2 / n;
  for (let j = 0; j < p; j++) sd[j] = Math.sqrt(sd[j]) || 1;
  return { mu, sd };
}

// Gradient descent, written out. This function is shown on the "code" screen as it runs.
export function gradientDescent(Z, y, opts = {}) {
  const { lr = 0.1, steps = 2000, onStep = null, every = 1, w0 = null, l2 = 0 } = opts;
  const n = Z.length, p = Z[0].length;
  const w = w0 ? w0.slice() : new Array(p).fill(0);
  let b = 0;
  const losses = [];
  for (let s = 0; s <= steps; s++) {
    const gw = new Array(p).fill(0);
    let gb = 0, loss = 0;
    for (let i = 0; i < n; i++) {
      let pred = b;
      for (let j = 0; j < p; j++) pred += w[j] * Z[i][j];
      const err = pred - y[i];
      loss += err * err / n;
      gb += err / n;
      for (let j = 0; j < p; j++) gw[j] += err * Z[i][j] / n;
    }
    if (s % every === 0) losses.push(loss);
    if (onStep) onStep(s, loss, w, b);
    if (s === steps) break;
    b -= lr * gb;
    for (let j = 0; j < p; j++) w[j] -= lr * (gw[j] + l2 * w[j]);   // l2 pulls every weight back toward zero
  }
  return { w, b, losses };
}

// The algebraic answer, used to check that gradient descent arrives at the same place.
export function solveExact(Z, y, l2 = 0) {
  const n = Z.length, p = Z[0].length + 1;
  const A = Array.from({ length: p }, () => new Array(p + 1).fill(0));
  for (let i = 0; i < n; i++) {
    const row = [1, ...Z[i]];
    for (let a = 0; a < p; a++) {
      for (let c = 0; c < p; c++) A[a][c] += row[a] * row[c];
      A[a][p] += row[a] * y[i];
    }
  }
  for (let a = 1; a < p; a++) A[a][a] += 1e-9 + l2 * n;
  for (let c = 0; c < p; c++) {
    let piv = c;
    for (let r = c + 1; r < p; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    [A[c], A[piv]] = [A[piv], A[c]];
    for (let r = 0; r < p; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k <= p; k++) A[r][k] -= f * A[c][k];
    }
  }
  const sol = A.map((row, i) => row[p] / row[i]);
  return { b: sol[0], w: sol.slice(1) };
}

// Gradient descent on this problem is stable only below 2 / (the largest curvature).
// Above that, every step overshoots by more than the last. Found by power iteration.
export function maxStableRate(Z, l2 = 0) {
  const n = Z.length, p = Z[0].length + 1;
  const rows = Z.map((z) => [1, ...z]);
  let v = new Array(p).fill(1 / Math.sqrt(p)), lambda = 1;
  for (let it = 0; it < 200; it++) {
    const u = new Array(p).fill(0);
    for (const r of rows) {
      let d = 0;
      for (let j = 0; j < p; j++) d += r[j] * v[j];
      for (let j = 0; j < p; j++) u[j] += r[j] * d / n;
    }
    for (let j = 1; j < p; j++) u[j] += l2 * v[j];       // the pull toward zero adds curvature on the weights
    const norm = Math.sqrt(u.reduce((s, x) => s + x * x, 0)) || 1;
    lambda = norm;
    v = u.map((x) => x / norm);
  }
  return 2 / lambda;
}

// How hard the corrections are pulled back toward "no change" from the simple forecast. Calm history rewards
// confidence and a market that changes rewards caution, and validation weeks can only see the calm, so this is a
// business judgment the learner makes. The default is a judgment call, not a tuned value.
export const CAUTION_LEVELS = [[0, 'Free'], [0.2, 'Some'], [0.8, 'Careful'], [2, 'Very careful']];
export const DEFAULT_CAUTION = 0.8;
const cache = new Map();

export function dataset(groups, to = HOLDOUT_START) {
  const meta = rowFor(TRAIN_START, groups);
  const X = (t) => rowFor(t, groups).x;
  const weeks = trainWeeksFor(to);
  const trainX = weeks.map(X);
  const { mu, sd } = standardise(trainX);
  const norm = (x) => x.map((v, j) => (v - mu[j]) / sd[j]);
  const y = weeks.map((t) => Math.log(WEEKS[t].dep / simpleForecast(t)));
  const ybar = y.reduce((a, b) => a + b, 0) / y.length;
  return { meta, X, norm, mu, sd, weeks, Z: trainX.map(norm), yc: y.map((v) => v - ybar), ybar };
}

// to: the first week the model is NOT allowed to see.
export function trainModel(groups, opts = {}) {
  const to = opts.to ?? HOLDOUT_START;
  const key = `${groups.join('|')}|${to}|${opts.lr ?? ''}|${opts.steps ?? ''}|${opts.l2 ?? DEFAULT_CAUTION}`;
  if (cache.has(key)) return cache.get(key);
  const d = dataset(groups, to);
  const { w, b, losses } = gradientDescent(d.Z, d.yc, { lr: 0.1, steps: 3000, every: 10, l2: DEFAULT_CAUTION, ...opts, to: undefined });
  const model = { groups, to, l2: opts.l2 ?? DEFAULT_CAUTION, w, b, names: d.meta.names, grp: d.meta.grp, mu: d.mu, sd: d.sd, ybar: d.ybar, d, losses };
  let ss = 0;
  d.weeks.forEach((t) => { ss += (predictLog(model, t) - Math.log(WEEKS[t].dep)) ** 2; });
  model.sigma = Math.sqrt(ss / d.weeks.length);       // in-sample: flatters the model
  cache.set(key, model);
  return model;
}

// The model as the learner chooses it, trained on history before the validation weeks.
export const selectionModel = (groups, l2) => trainModel(groups, { to: VALID_START, l2 });

export function predictLog(model, t) {
  const z = model.d.norm(model.d.X(t));
  let s = Math.log(simpleForecast(t)) + model.b + model.ybar;
  for (let j = 0; j < z.length; j++) s += model.w[j] * z[j];
  return s;
}
export const predict = (model, t) => Math.exp(predictLog(model, t));

// A competent forecast with no AI in it: the same week last year (3-week average of depletions), scaled by how the last four known weeks compare with a year earlier.
export function simpleForecast(t) {
  if (t < 60) return null;
  const lastYear = (WEEKS[t - 53].dep + WEEKS[t - 52].dep + WEEKS[t - 51].dep) / 3;
  let now = 0, then = 0;
  for (let u = t - 8; u <= t - 5; u++) { now += WEEKS[u].dep; then += WEEKS[u - 52].dep; }
  return lastYear * now / then;
}

// Why this number? Start from the simple forecast and show each correction, as a percentage.
export function explain(model, t) {
  const z = model.d.norm(model.d.X(t));
  const byGroup = {};
  for (let j = 0; j < z.length; j++) byGroup[model.grp[j]] = (byGroup[model.grp[j]] || 0) + model.w[j] * z[j];
  const drift = model.b + model.ybar;
  return {
    base: simpleForecast(t),
    drift: { label: 'Typical drift', pct: (Math.exp(drift) - 1) * 100, log: drift },
    effects: GROUPS.filter((g) => g.id in byGroup).map((g) => ({ id: g.id, label: g.short, pct: (Math.exp(byGroup[g.id]) - 1) * 100, log: byGroup[g.id] })),
  };
}

// How much each group matters: the average size of its pull over the training weeks.
export function importance(model) {
  const out = {};
  for (const g of model.groups) out[g] = 0;
  for (const t of model.d.weeks) {
    const z = model.d.norm(model.d.X(t));
    const acc = {};
    for (let j = 0; j < z.length; j++) acc[model.grp[j]] = (acc[model.grp[j]] || 0) + model.w[j] * z[j];
    for (const g of model.groups) out[g] += Math.abs(acc[g] || 0) / model.d.weeks.length;
  }
  return out;
}

// Out-of-sample spread of the log error, measured on the validation weeks. This is what sets the
// forecast band honestly: the in-sample spread is always too small.
export function oosSigma(groups, l2) {
  const m = selectionModel(groups, l2);
  let ss = 0;
  VALID_WEEKS.forEach((t) => { ss += (predictLog(m, t) - Math.log(WEEKS[t].dep)) ** 2; });
  return Math.sqrt(ss / VALID_WEEKS.length);
}

function score(rows, keys) {
  const sumA = rows.reduce((s, r) => s + r.actual, 0);
  const out = {};
  for (const k of keys) {
    out[`wape_${k}`] = rows.reduce((s, r) => s + Math.abs(r[k] - r.actual), 0) / sumA;
    out[`bias_${k}`] = rows.reduce((s, r) => s + (r[k] - r.actual), 0) / sumA;
  }
  return out;
}

// Score a model against weeks it has not been trained on.
export function evaluate(model, weeks = TEST_WEEKS, opts = {}) {
  const rows = weeks.map((t) => ({
    t, actual: WEEKS[t].dep, want: WEEKS[t].want,
    ai: predict(model, t), current: WEEKS[t].cf, simple: simpleForecast(t),
  }));
  const s = score(rows, ['ai', 'current', 'simple']);
  const sigma = opts.sigma ?? oosSigma(model.groups, model.l2);
  const band = 1.2816 * sigma;
  const inside = rows.filter((r) => r.actual >= r.ai * Math.exp(-band) && r.actual <= r.ai * Math.exp(band)).length;
  return {
    rows, band, sigma,
    wapeAI: s.wape_ai, wapeCurrent: s.wape_current, wapeSimple: s.wape_simple,
    biasAI: s.bias_ai, biasCurrent: s.bias_current, biasSimple: s.bias_simple,
    coverage: inside / rows.length,
  };
}

// What the learner sees while choosing: a model trained before the validation weeks, scored on them.
export const evaluateValid = (groups, l2) => {
  const m = selectionModel(groups, l2);
  return evaluate(m, VALID_WEEKS, { sigma: m.sigma });
};

// Roll the whole exercise forward: retrain at each step, forecast the next 13 weeks, move on.
// One test window is one roll of the dice. This is five.
export function rollingOrigin(groups, l2, starts = [91, 104, 117, 130, 143], len = 13) {
  return starts.map((s) => {
    const m = trainModel(groups, { to: s, l2 });
    const weeks = idx(s, Math.min(N, s + len));
    const e = evaluate(m, weeks, { sigma: m.sigma });
    return { start: s, wapeAI: e.wapeAI, wapeCurrent: e.wapeCurrent, wapeSimple: e.wapeSimple };
  });
}

// How sure can we be of the gain? Resample the test weeks in blocks of four (errors in
// neighbouring weeks are related) and recompute the reduction in typical miss each time.
function rand32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function bootstrapReduction(rows, baseKey, { runs = 1500, block = 4, seed = 11 } = {}) {
  const r = rand32(seed), n = rows.length;
  const red = (rs) => {
    let a = 0, b = 0;
    for (const x of rs) { a += Math.abs(x.ai - x.actual); b += Math.abs(x[baseKey] - x.actual); }
    return 1 - a / b;
  };
  const out = [];
  for (let i = 0; i < runs; i++) {
    const pick = [];
    while (pick.length < n) {
      const start = Math.floor(r() * n);                       // circular blocks: every week is equally likely
      for (let k = 0; k < block && pick.length < n; k++) pick.push(rows[(start + k) % n]);
    }
    out.push(red(pick));
  }
  out.sort((x, y) => x - y);
  return { point: red(rows), lo: out[Math.floor(runs * 0.05)], hi: out[Math.floor(runs * 0.95)] };
}
