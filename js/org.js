// The organism: departments that each pull toward their own goal, and the campaign that shows what
// the sum of those pulls costs. Both are small, labelled illustrations. The lab holds no real
// department data, so the directions, strengths and campaign are assumptions stated on screen.
// What is real is the arithmetic: the pulls add as vectors, and the stock simulation conserves units.

// Each department is its own loss function. `angle` is the direction of what it is paid to optimize,
// in degrees clockwise from the star ("Beat the market" is straight up).
export const DEPTS = [
  { id: 'mkt', name: 'Marketing', goal: 'Campaigns', angle: -40, color: 'var(--d-mkt)' },
  { id: 'sales', name: 'Sales', goal: 'Volume', angle: 40, color: 'var(--d-sales)' },
  { id: 'fin', name: 'Finance', goal: 'Cash', angle: 80, color: 'var(--d-fin)' },
  { id: 'ops', name: 'Operations', goal: 'Lean stock', angle: 140, color: 'var(--d-ops)' },
];
export const PULL_DEFAULT = Object.fromEntries(DEPTS.map((d) => [d.id, 1]));
export const PULL_MAX = 2;

const rad = (deg) => (deg * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
export const clampPull = (v) => (Number.isFinite(v) ? Math.min(PULL_MAX, Math.max(0, v)) : 1);

// What a department pulls toward once part of its goal is a measure everyone shares: its direction
// turns toward the star by that share. A shared measure of 0 leaves every department on its own goal.
export const blendAngle = (angle, shared) => angle * (1 - Math.min(1, Math.max(0, shared)));

// The company moves along the sum of the pulls. `reach` is the share of all the pulling that ends up
// moving it toward the star. `cancelled` is the share that cancels itself out.
export function sumPulls(pulls, shared = 0) {
  let x = 0, y = 0, total = 0;
  for (const d of DEPTS) {
    const s = clampPull(pulls && pulls[d.id]), a = rad(blendAngle(d.angle, shared));
    x += s * Math.sin(a); y += s * Math.cos(a); total += s;
  }
  const mag = Math.hypot(x, y);
  return { x, y, total, mag, angle: mag > 1e-9 ? deg(Math.atan2(x, y)) : 0, reach: total ? Math.max(0, y) / total : 0, cancelled: total ? 1 - mag / total : 0 };
}

// ---------------------------------------------------------------- The campaign
// A weekly stock simulation. Marketing runs a six-week campaign. Orders take three weeks to arrive.
// Demand is 1,000 cases a week, and the campaign lifts it. Three ways to set the stock behind it.
export const WEEKS_SIM = 18;
export const LEAD = 3;
export const BASE = 1000;
export const CAMPAIGN_START = 4;                          // zero-based: the campaign runs weeks 5 to 10
export const PLAN_LIFT = [0.6, 1.2, 1.5, 1.2, 0.8, 0.4];  // what the campaign plan says it will add each week
export const REALIZED = 0.8;                              // past campaigns landed at about 80% of plan (an assumption)
export const SAFETY = 0.15;                               // weeks of extra cover on top of the forecast
export const MARGIN = 30;                                 // dollars of margin on a case, illustrative
export const HOLD = 0.5;                                  // dollars to hold a case for a week, illustrative

export const BUFFERS = [
  { id: 'alone', label: 'Operations alone', sub: 'Stock follows last four weeks of sales.' },
  { id: 'calendar', label: 'Plan with the campaign', sub: 'Stock follows Marketing’s plan.' },
  { id: 'ai', label: 'AI reads past campaigns', sub: 'Stock follows the plan, adjusted for how past campaigns landed.' },
];

const planAt = (t) => (t >= CAMPAIGN_START && t < CAMPAIGN_START + PLAN_LIFT.length ? PLAN_LIFT[t - CAMPAIGN_START] : 0);
export const campaignWeeks = () => PLAN_LIFT.map((_, i) => CAMPAIGN_START + i);

export function runCampaign(mode) {
  const N = WEEKS_SIM;
  const demand = Array.from({ length: N }, (_, t) => BASE * (1 + REALIZED * planAt(t)));   // what actually happens
  const forecastOf = {
    alone: (hist) => () => hist.slice(-4).reduce((a, b) => a + b, 0) / 4,                 // reacts to recent sales, which an empty shelf also hides
    calendar: () => (u) => BASE * (1 + planAt(Math.min(u, N - 1))),                       // trusts the plan
    ai: () => (u) => BASE * (1 + REALIZED * planAt(Math.min(u, N - 1))),                  // the plan, as past campaigns landed
  }[mode];
  if (!forecastOf) throw new Error(`unknown buffer: ${mode}`);
  let onhand = BASE * (1 + SAFETY);
  const arrivals = Array.from({ length: N + LEAD + 2 }, (_, t) => (t < LEAD ? BASE : 0));
  const hist = [BASE, BASE, BASE, BASE];
  const avail = [], sold = [], lost = [], stock = [];
  for (let t = 0; t < N; t++) {
    onhand += arrivals[t];
    avail.push(onhand);
    const s = Math.min(demand[t], onhand);
    sold.push(s); lost.push(demand[t] - s); onhand -= s; stock.push(onhand);
    hist.push(s);
    const f = forecastOf(hist);
    let target = 0;
    for (let u = t + 1; u <= t + LEAD + 1; u++) target += f(u);
    target += SAFETY * f(t + LEAD + 1);
    let inTransit = 0;
    for (let u = t + 1; u <= t + LEAD; u++) inTransit += arrivals[u];
    arrivals[t + LEAD] += Math.max(0, target - onhand - inTransit);
  }
  const camp = campaignWeeks();
  const campDemand = camp.reduce((a, t) => a + demand[t], 0), campSold = camp.reduce((a, t) => a + sold[t], 0);
  const lostTotal = lost.reduce((a, b) => a + b, 0), stockWeeks = stock.reduce((a, b) => a + b, 0);
  const missed = lostTotal * MARGIN, holding = stockWeeks * HOLD;
  const last = camp[camp.length - 1];
  return {
    mode, demand, avail, sold, lost, stock,
    served: campSold / campDemand, lostTotal, avgStock: stockWeeks / N,
    missed, holding, total: missed + holding,
    emptyWeek: lost.findIndex((v) => v > 1),                                              // the first week demand outran stock, or -1
    glut: Math.max(...stock.slice(last + 1)),                                             // the biggest pile after the campaign ends
    peakDuring: Math.max(...camp.map((t) => stock[t])),
  };
}

// ---------------------------------------------------------------- Mirrors
// The campaign touches a chain of links. Each department's scorecard reflects only some of them, so each
// learns from a slice. Who sees what is an illustrative assumption; what each mirror shows is computed
// from the campaign run when Operations sets the stock alone.
export const CHAIN = [
  { id: 'campaign', label: 'Campaign' }, { id: 'demand', label: 'Demand' }, { id: 'orders', label: 'Orders' },
  { id: 'inventory', label: 'Inventory' }, { id: 'production', label: 'Production' }, { id: 'margin', label: 'Margin' }, { id: 'customer', label: 'Customer' },
];
export const SEES = { mkt: ['campaign', 'demand'], sales: ['demand', 'orders'], ops: ['orders', 'inventory', 'production'], fin: ['inventory'] };
export const unseenLinks = () => CHAIN.filter((c) => !DEPTS.some((d) => SEES[d.id].includes(c.id)));

export function mirrorFacts() {
  const runs = Object.fromEntries(BUFFERS.map((b) => [b.id, runCampaign(b.id)]));
  const a = runs.alone, camp = campaignWeeks();
  const planned = camp.reduce((acc, t) => acc + BASE * (1 + planAt(t)), 0), actual = camp.reduce((acc, t) => acc + a.demand[t], 0);
  const all = Object.values(runs);
  return {
    peakLift: Math.max(...a.demand) / BASE - 1,                       // Marketing: the campaign launched and demand rose
    forecastErr: (planned - actual) / actual,                          // Sales: the plan against what happened, over the campaign weeks
    avgStock: a.avgStock, leanest: all.every((r) => a.avgStock <= r.avgStock),          // Operations: stock held
    holding: a.holding, cheapest: all.every((r) => a.holding <= r.holding),             // Finance: the cost of carrying it
    served: a.served, lost: a.lostTotal, missed: a.missed, glut: a.glut, emptyWeek: a.emptyWeek,   // the whole chain
    total: a.total, best: Math.min(...all.map((r) => r.total)),
  };
}
