// Ridgeline Bourbon, Texas: three years of weekly data, generated deterministically.
// Everything here is fictional. A seeded generator means every visitor sees the same
// numbers, and the same numbers appear on every screen.
//
// The generator has a hidden truth (underlying demand and the forces behind it). What the
// team can observe is smaller: depletions (cases distributors sold to bars, restaurants and
// stores), shipments (cases the brand shipped to distributors), price, promotion and distribution.
// Three steps in the chain, never interchangeable: shipments (supplier to distributor), depletions
// (distributor to on- and off-premise accounts) and sell-through (consumers buying at retail).
// The lab has no sell-through series, and says nothing that would need one.

export const N = 156;               // weeks
export const WINDOW = [143, 155];   // the last 13 weeks: "down 8%" is measured here
// Three slices of time. Every choice (which inputs, what cushion) is made on VALIDATION.
// The TEST weeks are looked at once, to score the finished choice, and never used to pick anything.
export const TRAIN_START = 60;       // the first week with a full year behind it to compare with
export const VALID_START = 104;     // weeks 104-129: used to choose, never to score the final claim
export const HOLDOUT_START = 130;   // weeks 130-155: the final exam
export const EMBARGO = 4;           // a model fitted for a period may not see the four weeks before it: it could not have known them yet
export const MARGIN_PER_CASE = 95;
export const REVENUE_PER_CASE = 240;
export const CARRY_PER_CASE = 18;

// The hidden truth. Elasticities are log-points of demand per log-point of the driver.
const TRUTH = {
  base: 4000, trend: 0.024, category: 0.004,
  priceEl: -0.9, distEl: 0.5, promoEl: 0.18, competitor: -0.035, censor: 0.6,
};

// The answer key. Real life has none; the lab shows it so learners can see how far a learned effect can drift.
export const CATEGORY_GROWTH = TRUTH.category * 100;   // % a year
export const TRUTH_EFFECTS = { price: TRUTH.priceEl, promo: TRUTH.promoEl, dist: TRUTH.distEl };

function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gaussian(r) {
  let u = 0;
  while (u === 0) u = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

const START = Date.UTC(2023, 9, 2);
export const weekDate = (t) => new Date(START + t * 7 * 86400000);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const weekLabel = (t) => {
  const d = weekDate(t);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
};
export const monthLabel = (t) => {
  const d = weekDate(t);
  return `${MONTHS[d.getUTCMonth()]} ’${String(d.getUTCFullYear()).slice(2)}`;
};

// Promotions, in week-of-year coordinates: [start, length, share of stores on promo].
// Year A and year B differ a little in the spring and early summer, so the history has some
// variation to learn from. They are identical in weeks 39-51, which the headline compares.
const PROMO_A = [[3, 2, .45], [10, 3, .6], [18, 2, .4], [26, 2, .4], [34, 2, .45], [41, 2, .5], [47, 2, .5]];
const PROMO_B = [[3, 2, .45], [10, 3, .6], [17, 3, .5], [26, 2, .4], [33, 3, .5], [41, 2, .5], [47, 2, .5]];
// This year the late-summer promotions were pulled forward into one six-week run (late June to early August).
const PROMO_C = [[3, 2, .45], [10, 3, .6], [18, 2, .4], [26, 2, .4], [34, 2, .45], [39, 6, .55], [47, 2, .5]];

function promoAt(t) {
  const w = t % 52;
  const events = t >= 104 ? PROMO_C : t >= 52 ? PROMO_B : PROMO_A;
  let share = 0.05;
  for (const [s, len, v] of events) if (w >= s && w < s + len) share = Math.max(share, v);
  return share;
}
function seasonal(t) {
  const w = t % 52;
  return 0.22 * Math.cos(2 * Math.PI * (w - 10) / 52)
       + 0.07 * Math.cos(4 * Math.PI * (w - 10) / 52)
       + 0.07 * Math.exp(-(((w - 39) / 2.5) ** 2));
}

function generate() {
  const r = rng(20261001);
  const price = [], list = [], promo = [], dist = [], demand = [], dep = [], ship = [], cf = [], oos = [], comp = [];

  for (let t = 0; t < N; t++) {
    const pBase = t < 78 ? 1.0 : t < 130 ? 1.02 : 1.045;
    list[t] = pBase;                                          // the announced list price: known ahead
    price[t] = +(pBase * (1 + 0.008 * gaussian(r))).toFixed(4);  // what shelves actually showed (the shelf price, a retail-side fact)
    promo[t] = promoAt(t);
    const cut = 0.05 * clamp((t - 139) / 4, 0, 1);         // Chain X pulls facings
    dist[t] = +(0.725 + 0.00015 * t - cut + 0.004 * gaussian(r)).toFixed(4);
    comp[t] = TRUTH.competitor * clamp((t - 137) / 5, 0, 1); // premium rival launches
    const logD = Math.log(TRUTH.base)
      + TRUTH.trend * t / 52 + TRUTH.category * t / 52
      + seasonal(t)
      + TRUTH.priceEl * Math.log(price[t])
      + TRUTH.distEl * Math.log(dist[t] / 0.74)
      + TRUTH.promoEl * promo[t]
      + comp[t];
    demand[t] = Math.exp(logD);
  }

  // Shipments are what the brand ships to distributors. They are not depletions (distributor sales to
  // accounts) and not consumer sell-through. Distributors build inventory before quarter-end, built extra
  // last autumn, and are now running it down. The brand's forecast is built from last year's shipments (a 3-week average, which softens the quarter-end spikes), so it inherits the rest.
  const adjAt = (u) => {
    const w = u % 13;
    const cycle = (w === 11 || w === 12) ? 0.10 : (w === 0 || w === 1) ? -0.08 : 0;
    const level = u < 56 ? 0 : u < 125 ? 0.012 : u < 146 ? -0.008 : -0.036;
    // Distributors take extra shipments ahead of the April price increase (weeks 125-129), then take less.
    const prebuy = (u >= 125 && u < 130) ? 0.05 : (u >= 130 && u < 135) ? -0.03 : 0;
    return cycle + level + prebuy;
  };

  const noise = [];
  for (let t = 0; t < N; t++) {
    // week-to-week noise, plus the occasional shock no model could see coming (weather, an event)
    noise[t] = 0.045 * gaussian(r) + (r() < 0.06 ? (r() < 0.5 ? -1 : 1) * (0.07 + 0.05 * r()) : 0);
    // Stockouts arrive at the tail of the inventory drawdown, when distributors let inventory run too low and accounts cannot get the item.
    const tail = t >= 147 ? 0.045 * Math.sin(Math.PI * clamp((t - 146) / 12, 0, 1)) : 0;
    oos[t] = clamp(0.03 + 0.012 * Math.abs(gaussian(r)) + tail, 0, 0.35);
    dep[t] = demand[t] * (1 - TRUTH.censor * oos[t]) * Math.exp(noise[t]);
    ship[t] = dep[t] * (1 + adjAt(t));
  }
  for (let t = 0; t < N; t++) {
    // The status-quo forecast: last year's shipments for this week (3-week average) plus 3%.
    cf[t] = t >= 55 ? 1.03 * (ship[t - 53] + ship[t - 52] + ship[t - 51]) / 3 : null;
  }

  const weeks = [];
  for (let t = 0; t < N; t++) {
    weeks.push({
      t, date: weekDate(t),
      price: price[t], list: list[t], promo: promo[t], dist: dist[t], oos: oos[t],
      dep: Math.round(dep[t]), ship: Math.round(ship[t]),
      cf: cf[t] == null ? null : Math.round(cf[t]),
      demand: Math.round(demand[t]),   // hidden: underlying demand, smooth, before stockouts and noise (a lab construct; depletions follow it with no lag). Used only by the decomposition
      want: Math.round(demand[t] * Math.exp(noise[t])),  // hidden: depletions with no stockouts
      expect: Math.round(demand[t] * (1 - TRUTH.censor * oos[t])),  // hidden: depletions with the noise taken out
    });
  }
  return { weeks, comp, truth: TRUTH };
}

const GEN = generate();
export const WEEKS = GEN.weeks;
const COMP = GEN.comp;

const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
const mean = (a, f) => sum(a, f) / a.length;

const inWindow = (off) => {
  const out = [];
  for (let t = WINDOW[0]; t <= WINDOW[1]; t++) out.push(t - off);
  return out;
};

// What changed between the last 13 weeks and the same 13 weeks a year ago.
// Each driver's contribution is counterfactual: replace this year's value with last year's.
export function decompose() {
  const now = inWindow(0), then = inWindow(52);
  const dNow = sum(now, (t) => WEEKS[t].dep), dThen = sum(then, (t) => WEEKS[t].dep);
  const sNow = sum(now, (t) => WEEKS[t].ship), sThen = sum(then, (t) => WEEKS[t].ship);
  const depTotal = Math.log(dNow / dThen);
  const total = Math.log(sNow / sThen);
  const T = TRUTH;
  const c = {
    growth: T.trend + T.category,
    price: mean(now, (t) => T.priceEl * Math.log(WEEKS[t].price)) - mean(then, (t) => T.priceEl * Math.log(WEEKS[t].price)),
    distribution: mean(now, (t) => T.distEl * Math.log(WEEKS[t].dist)) - mean(then, (t) => T.distEl * Math.log(WEEKS[t].dist)),
    competitor: mean(now, (t) => COMP[t]) - mean(then, (t) => COMP[t]),
    promo: mean(now, (t) => T.promoEl * WEEKS[t].promo) - mean(then, (t) => T.promoEl * WEEKS[t].promo),
    availability: mean(now, (t) => Math.log(1 - T.censor * WEEKS[t].oos)) - mean(then, (t) => Math.log(1 - T.censor * WEEKS[t].oos)),
  };
  const explained = Object.values(c).reduce((s, x) => s + x, 0);
  c.other = depTotal - explained;          // week-to-week noise
  c.inventory = total - depTotal;          // distributor inventory built last year, drawn down now
  const pct = sNow / sThen - 1;
  const scale = pct / total;               // report in percentage points that add up to the headline
  const pts = {};
  for (const k of Object.keys(c)) pts[k] = c[k] * scale * 100;
  return { pct: pct * 100, depPct: (dNow / dThen - 1) * 100, pts, dNow, dThen, sNow, sThen };
}

// What stockouts cost in the last 13 weeks: depletions with full availability, minus actual depletions.
export function stockoutLoss() {
  const now = inWindow(0), then = inWindow(52);
  const lost = sum(now, (t) => WEEKS[t].want - WEEKS[t].dep);
  const lostThen = sum(then, (t) => WEEKS[t].want - WEEKS[t].dep);
  return {
    cases: Math.round(lost), casesLastYear: Math.round(lostThen),
    margin: Math.round(lost * MARGIN_PER_CASE), marginLastYear: Math.round(lostThen * MARGIN_PER_CASE),
    revenue: Math.round(lost * REVENUE_PER_CASE),
    oosNow: mean(now, (t) => WEEKS[t].oos), oosThen: mean(then, (t) => WEEKS[t].oos),
  };
}

export const windowStats = () => {
  const now = inWindow(0), then = inWindow(52);
  return {
    distNow: mean(now, (t) => WEEKS[t].dist), distThen: mean(then, (t) => WEEKS[t].dist),
    priceNow: mean(now, (t) => WEEKS[t].price), priceThen: mean(then, (t) => WEEKS[t].price),
    promoNow: mean(now, (t) => WEEKS[t].promo), promoThen: mean(then, (t) => WEEKS[t].promo),
  };
};

// Shipments vs. depletions over the last two years: the gap the forecast cannot see.
export function shipmentGap() {
  const span = [];
  for (let t = 104; t < N; t++) span.push(t);
  const gaps = span.map((t) => WEEKS[t].ship - WEEKS[t].dep);
  const worst = span.reduce((a, t) => (Math.abs(WEEKS[t].ship / WEEKS[t].dep - 1) > Math.abs(WEEKS[a].ship / WEEKS[a].dep - 1) ? t : a), span[0]);
  return { worst, gap: WEEKS[worst].ship / WEEKS[worst].dep - 1, mean: mean(gaps, (g) => Math.abs(g)) };
}

export const COMPETITOR_WEEK = 138;
export const CHAIN_CUT_WEEK = 140;
export const SHORTAGE = [141, 150];
export const PROMO_RUN = [143, 148];

export const DISTRIBUTORS = ['Lone Star Beverage', 'Gulf Coast Wine & Spirits', 'Hill Country Distributing'];

// Estimated distributor inventory, in weeks of depletions: shipments minus depletions, added up,
// on top of a starting four weeks. A real analysis would use their reported inventory.
export function inventoryEstimate() {
  const avg = mean(WEEKS, (w) => w.dep);
  let stock = 4 * avg;
  return WEEKS.map((w) => { stock += w.ship - w.dep; return stock / avg; });
}

// How much a 13-week year-over-year comparison moves from noise alone (about 95% of the time).
export function yoyNoise() {
  const diffs = [];
  for (let t = 52; t < N; t++) diffs.push(Math.log(WEEKS[t].dep / WEEKS[t - 52].dep));
  const m = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const sd = Math.sqrt(diffs.reduce((a, b) => a + (b - m) ** 2, 0) / (diffs.length - 1));
  return 1.96 * sd / Math.sqrt(13) * 100;
}

export const PRICE_WEEK = 130;

// Even a forecaster who knew the exact underlying level of depletions would miss, because weeks are noisy.
// This is the floor: no forecast, AI or otherwise, can reliably get under it.
export function noiseFloor(from = HOLDOUT_START, to = N) {
  let err = 0, tot = 0;
  for (let t = from; t < to; t++) { err += Math.abs(WEEKS[t].dep - WEEKS[t].expect); tot += WEEKS[t].dep; }
  return err / tot;
}
