// A tiny neural network, small enough to read: one hidden layer of tanh neurons, trained by
// gradient descent (Adam, a gradient descent that steadies its own step size). With no hidden
// neurons it is a single neuron: a straight line, the same recipe as the forecasting model.
// Everything is seeded, so everyone sees the same run.

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (r) => { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); };

// A made-up pattern that bends: little response until promotion is wide enough, a jump, then it
// levels off. It is a toy, labelled as one. A straight line cannot follow it.
export const bend = (x) => 0.12 + 0.76 / (1 + Math.exp(-10 * (x - 0.5)));

// Two samples of the same pattern with noise: points the net learns from, and points it never sees.
export function toyData(nTrain = 20, nTest = 40, noise = 0.07, seed = 7) {
  const r = rng(seed);
  const make = (n) => Array.from({ length: n }, (_, i) => {
    const x = Math.min(1, Math.max(0, (i + 0.15 + 0.7 * r()) / n));
    return { x, y: bend(x) + noise * gauss(r) };
  });
  return { train: make(nTrain), test: make(nTest) };
}

// Parameters: hidden neurons j have input weight w[j], bias b[j] and output weight v[j]; c is the output bias.
// With hidden = 0 the model is y = a*x + c (a straight line), so "a" is stored in v[0].
const sx = (x) => 2 * x - 1;                  // inputs are centred, which makes training steadier

export function predict(p, x) {
  const z = sx(x);
  if (!p.w.length) return p.v[0] * z + p.c;
  let out = p.c;
  for (let j = 0; j < p.w.length; j++) out += p.v[j] * Math.tanh(p.w[j] * z + p.b[j]);
  return out;
}

export const mse = (p, pts) => pts.reduce((s, d) => s + (predict(p, d.x) - d.y) ** 2, 0) / pts.length;

function init(hidden, seed) {
  const r = rng(seed);
  if (!hidden) return { w: [], b: [], v: [0.1 * gauss(r)], c: 0.5 };
  return {
    w: Array.from({ length: hidden }, () => 1.2 * gauss(r)),
    b: Array.from({ length: hidden }, () => 0.6 * gauss(r)),
    v: Array.from({ length: hidden }, () => 0.4 * gauss(r)),
    c: 0.5,
  };
}

// The gradient of the mean squared error with respect to every parameter, in the order
// w[0..H), b[0..H), v[0..H), c (or [a, c] for a single neuron). The tests check it against a
// finite-difference gradient, which is the standard way to prove back-propagation is right.
export function gradient(p, data) {
  const H = p.w.length, n = data.length;
  const g = new Array(H ? 3 * H + 1 : 2).fill(0);
  for (const d of data) {
    const z = sx(d.x);
    if (!H) {
      const e = (p.v[0] * z + p.c) - d.y;
      g[0] += 2 * e * z / n; g[1] += 2 * e / n;
    } else {
      let out = p.c; const t = new Array(H);
      for (let j = 0; j < H; j++) { t[j] = Math.tanh(p.w[j] * z + p.b[j]); out += p.v[j] * t[j]; }
      const e = out - d.y;
      for (let j = 0; j < H; j++) {
        const dh = 2 * e * p.v[j] * (1 - t[j] * t[j]) / n;
        g[j] += dh * z; g[H + j] += dh; g[2 * H + j] += 2 * e * t[j] / n;
      }
      g[3 * H] += 2 * e / n;
    }
  }
  return g;
}

// Returns snapshots of the parameters at the steps in `at`, plus the final parameters.
export function trainNet(data, { hidden = 3, steps = 1500, lr = 0.03, seed = 3, at = [0, steps] } = {}) {
  const p = init(hidden, seed);
  const flat = () => [...p.w, ...p.b, ...p.v, p.c];
  const H = hidden;
  const size = H ? 3 * H + 1 : 2;
  const m = new Array(size).fill(0), vv = new Array(size).fill(0);
  const snaps = new Map();
  const keep = (k) => snaps.set(k, { w: [...p.w], b: [...p.b], v: [...p.v], c: p.c });
  const want = new Set(at);
  const n = data.length;
  for (let step = 0; step <= steps; step++) {
    if (want.has(step)) keep(step);
    if (step === steps) break;
    const g = gradient(p, data);
    // Adam: nudge each parameter against its gradient, with a step that adapts to the gradient's size
    const b1 = 0.9, b2 = 0.999, t1 = step + 1;
    const f = flat();
    for (let i = 0; i < size; i++) {
      m[i] = b1 * m[i] + (1 - b1) * g[i]; vv[i] = b2 * vv[i] + (1 - b2) * g[i] * g[i];
      f[i] -= lr * (m[i] / (1 - b1 ** t1)) / (Math.sqrt(vv[i] / (1 - b2 ** t1)) + 1e-8);
    }
    if (!H) { p.v[0] = f[0]; p.c = f[1]; } else {
      for (let j = 0; j < H; j++) { p.w[j] = f[j]; p.b[j] = f[H + j]; p.v[j] = f[2 * H + j]; }
      p.c = f[3 * H];
    }
  }
  return { params: { w: [...p.w], b: [...p.b], v: [...p.v], c: p.c }, snaps };
}

// The finite-difference gradient of the loss, for the tests: it must agree with the training code.
export function numericGradient(p, data, eps = 1e-5) {
  const flatKeys = [];
  if (!p.w.length) flatKeys.push(['v', 0]);
  else { p.w.forEach((_, j) => flatKeys.push(['w', j])); p.b.forEach((_, j) => flatKeys.push(['b', j])); p.v.forEach((_, j) => flatKeys.push(['v', j])); }
  flatKeys.push(['c', 0]);
  return flatKeys.map(([k, j]) => {
    const get = () => (k === 'c' ? p.c : p[k][j]), set = (x) => { if (k === 'c') p.c = x; else p[k][j] = x; };
    const x0 = get(); set(x0 + eps); const hi = mse(p, data); set(x0 - eps); const lo = mse(p, data); set(x0);
    return (hi - lo) / (2 * eps);
  });
}
