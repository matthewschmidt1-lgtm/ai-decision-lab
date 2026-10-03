// The bullwhip: a small change in what consumers buy, passed up a chain of layers that each order
// by a sensible rule, comes out much larger at the far end. This is a documented effect (Lee,
// Padmanabhan and Whang, 1997), here in its plainest form. Each layer orders up to a four-week
// average of what it is asked for, plus a little cover for the time stock takes to arrive. The cover
// and lead times are illustrative assumptions, labelled on screen. What is real is the arithmetic:
// the same rule, applied layer after layer, amplifies the swing, and sharing real demand tames it.

export const WEEKS_BW = 56;
export const BASE_BW = 100;          // units a week before the change
export const STEP = 0.03;            // consumer demand rises 3% and stays there
export const STEP_AT = 8;            // in week 9
export const WINDOW = 4;             // each layer averages the last four weeks of what it is asked for

// Each layer's decision, in its own words, and the cover and lead time that decision stands for.
export const LAYERS = [
  { id: 'retailer', name: 'Retailer', says: ['Better order', 'a little extra.'], lead: 2, cover: 0.25 },
  { id: 'distributor', name: 'Distributor', says: ['Better protect', 'service level.'], lead: 2, cover: 0.5 },
  { id: 'supplier', name: 'Supplier', says: ['Better build', 'a little more.'], lead: 3, cover: 0.5 },
  { id: 'plant', name: 'Plant', says: ['Better keep', 'the line running.'], lead: 3, cover: 0.75 },
];

export const MODES = [
  { id: 'orders', label: 'Each layer sees only orders' },
  { id: 'shared', label: 'Every layer sees real demand' },
];

const dev = (series) => series.map((v) => ((v - BASE_BW) / BASE_BW) * 100);

// mode 'orders': each layer forecasts from the orders it receives. mode 'shared': each layer forecasts
// from consumer demand itself, though it still has to fill the orders it is actually given.
export function runChain(mode = 'orders', step = STEP) {
  const N = WEEKS_BW;
  const demand = Array.from({ length: N }, (_, t) => BASE_BW * (1 + (t >= STEP_AT ? step : 0)));
  let asked = demand;                                           // what the first layer is asked for
  const layers = LAYERS.map((L) => {
    const src = mode === 'shared' ? demand : asked;
    const hist = Array(WINDOW).fill(BASE_BW), orders = [];
    let prevTarget = null;
    for (let t = 0; t < N; t++) {
      hist.push(src[t]);
      const forecast = hist.slice(-WINDOW).reduce((a, b) => a + b, 0) / WINDOW;
      const target = (L.lead + 1 + L.cover) * forecast;         // stock to hold, in units
      if (prevTarget === null) prevTarget = target;
      orders.push(Math.max(0, target - prevTarget + asked[t]));  // replace what was asked for, plus any change in target
      prevTarget = target;
    }
    asked = [BASE_BW, ...orders.slice(0, -1)];                  // an order takes a week to reach the next layer
    return { ...L, orders, dev: dev(orders) };
  });
  const rows = [{ id: 'consumer', name: 'Consumer', dev: dev(demand) }, ...layers];
  const peaks = rows.map((r) => ({ id: r.id, up: Math.max(0, ...r.dev), down: Math.max(0, ...r.dev.map((v) => -v)), abs: Math.max(...r.dev.map(Math.abs)) }));
  return { mode, demand, layers, rows, peaks };
}
