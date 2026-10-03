// Time and focus: one planner's week, and what happens to it when a computer takes over the routine
// parts of the work. The hours below are an illustrative assumption, labelled as one on screen. The
// lab holds no real time-and-motion data. What it can show honestly is the arithmetic, which must
// reconcile on the page, and three ideas that decide whether time saved is value:
//   1. Automation shifts work as well as removing it: checking AI output is new work.
//   2. Capacity is not savings, and neither is business value. Hours only matter once redeployed.
//   3. The hours are an estimate, so they come as a range.

import { DEFAULTS, PLANNERS } from './value.js';

// A 40-hour week. `automatable` is the share of that work a computer could realistically take over.
export const WEEK = [
  { id: 'gather', label: 'Gathering and cleaning data', hours: 12, automatable: 0.8 },
  { id: 'forecast', label: 'Building the forecast', hours: 8, automatable: 0.6 },
  { id: 'decks', label: 'Decks and status meetings', hours: 6, automatable: 0.5 },
  { id: 'review', label: 'Review and approvals', hours: 6, automatable: 0.4 },
  { id: 'judgment', label: 'Judgment and customers', hours: 8, automatable: 0 },
];
export const WORK_WEEKS = 46;               // after holidays, leave and sick days
export const TEAM = PLANNERS;
export const RATE = DEFAULTS.rate;          // fully loaded cost per planner hour
export const WEEK_HOURS = WEEK.reduce((s, w) => s + w.hours, 0);
export const ROUTINE_HOURS = WEEK.filter((w) => w.automatable > 0).reduce((s, w) => s + w.hours, 0);
export const OVERHEAD = 0.2;                // share of freed hours that returns as checking, monitoring and exceptions
export const RANGE = { low: 0.6, high: 1.3 };   // how far the real result could sit from the estimate

// Where the freed hours go decides whether there is any value at all, and what kind.
export const DESTINATIONS = [
  { id: 'fill', label: 'Nowhere in particular', sub: 'The calendar fills with more decks and meetings.', kind: 'none' },
  { id: 'markets', label: 'Cover more brands and markets', sub: 'The same team does more without a new hire.', kind: 'cost' },
  { id: 'judgment', label: 'Judgment and customers', sub: 'More time on the calls that need a person.', kind: 'capacity' },
  { id: 'experiments', label: 'Test new ideas', sub: 'Try pricing and promotion ideas and learn from them.', kind: 'learning' },
];
export const DEST = Object.fromEntries(DESTINATIONS.map((d) => [d.id, d]));

// Hours a planner gets back in a week when the computer takes over `share` of what it realistically can.
export const grossHours = (share) => WEEK.reduce((s, w) => s + w.hours * w.automatable * share, 0);
// Some of that returns as new work: checking AI output, monitoring, exceptions.
export const netHours = (share) => grossHours(share) * (1 - OVERHEAD);
export const freedHours = netHours;
// The same thing as a share of the routine hours, so the slider and the bars reconcile.
export const routineShare = (share) => grossHours(share) / ROUTINE_HOURS;

// The week after: routine jobs shrink, checking AI output appears, and the net hours land in one place.
export function weekAfter(share, dest) {
  const gross = grossHours(share), net = netHours(share);
  const rows = WEEK.map((w) => ({ id: w.id, label: w.label, hours: w.hours * (1 - w.automatable * share) }));
  rows.push({ id: 'checking', label: 'New work: checking AI output', hours: gross - net });
  if (dest === 'fill') rows.find((r) => r.id === 'decks').hours += net;
  else if (dest === 'judgment') rows.find((r) => r.id === 'judgment').hours += net;
  else if (dest === 'markets') rows.push({ id: 'markets', label: 'More brands and markets', hours: net });
  else rows.push({ id: 'experiments', label: 'Testing new ideas', hours: net });
  return rows;
}

// Capacity, per year for the team, and what it could be worth at cost. Zero unless it is redeployed.
// It is an upper bound: a saving only if hiring or headcount actually changes.
export function annual(share, dest, scale = 1) {
  const perWeek = netHours(share) * scale;
  const hours = perWeek * TEAM * WORK_WEEKS;
  return { perWeek, hours, value: DEST[dest].kind === 'none' ? 0 : hours * RATE, kind: DEST[dest].kind };
}

// The same estimate as a range, because real results are not deterministic.
export const annualRange = (share, dest) => ({ low: annual(share, dest, RANGE.low), mid: annual(share, dest, 1), high: annual(share, dest, RANGE.high) });

// Review time per planner per week under each way of reviewing. "Exceptions only" matches the
// share of review work the week above treats as automatable.
export const REVIEW = [
  { id: 'review', label: 'Review every forecast', factor: 1, note: 'Safest and slowest. Overrides become data on where the model is wrong.' },
  { id: 'band', label: 'Review exceptions', factor: 1 - WEEK.find((w) => w.id === 'review').automatable, note: 'Humans see only what falls outside the range. Faster, but a quiet error inside it can slip through.' },
  { id: 'auto', label: 'Automatic inside guardrails', factor: 0.2, note: 'Fastest. Only sensible once trust is earned, with a weekly audit.' },
];
export const reviewHours = (id) => WEEK.find((w) => w.id === 'review').hours * REVIEW.find((r) => r.id === id).factor;
