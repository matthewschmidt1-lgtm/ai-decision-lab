// Time and focus: one planner's week, and what happens to it when a computer takes over the routine
// parts of the work. The hours below are an illustrative assumption, labelled as one on screen. The
// lab holds no real time-and-motion data. What it can show honestly is the arithmetic, and the one
// rule that decides whether time saved is value: the hours only count once they are redeployed.

import { DEFAULTS, PLANNERS } from './value.js';

// A 40-hour week. `automatable` is the share of that work a computer could take over at full effort.
export const WEEK = [
  { id: 'gather', label: 'Gathering and cleaning data', hours: 12, automatable: 0.8 },
  { id: 'forecast', label: 'Building the forecast', hours: 8, automatable: 0.6 },
  { id: 'decks', label: 'Decks and status meetings', hours: 6, automatable: 0.5 },
  { id: 'review', label: 'Review and approvals', hours: 6, automatable: 0.4 },
  { id: 'judgment', label: 'Judgment and customers', hours: 8, automatable: 0 },
];
export const WORK_WEEKS = 46;
export const TEAM = PLANNERS;
export const RATE = DEFAULTS.rate;
export const WEEK_HOURS = WEEK.reduce((s, w) => s + w.hours, 0);

// Where the freed hours go decides whether there is any value at all.
export const DESTINATIONS = [
  { id: 'fill', label: 'Nowhere in particular', sub: 'The calendar fills with more decks and meetings.', counts: false },
  { id: 'markets', label: 'Cover more brands and markets', sub: 'The same team does more without a new hire.', counts: true },
  { id: 'judgment', label: 'Judgment and customers', sub: 'More time on the calls that need a person.', counts: true },
];
export const DEST = Object.fromEntries(DESTINATIONS.map((d) => [d.id, d]));

// Hours a planner gets back in a week when the computer takes over `share` of what it can.
export const freedHours = (share) => WEEK.reduce((s, w) => s + w.hours * w.automatable * share, 0);

// The week after: each routine job shrinks, and the freed hours land in one place.
export function weekAfter(share, dest) {
  const freed = freedHours(share);
  const rows = WEEK.map((w) => ({ id: w.id, label: w.label, hours: w.hours * (1 - w.automatable * share) }));
  if (dest === 'fill') rows.find((r) => r.id === 'decks').hours += freed;
  else if (dest === 'judgment') rows.find((r) => r.id === 'judgment').hours += freed;
  else rows.push({ id: 'markets', label: 'More brands and markets', hours: freed });
  return rows;
}

// Value in planner time, per year for the team. Zero unless the hours are really redeployed.
export function annual(share, dest) {
  const perWeek = freedHours(share);
  const hours = perWeek * TEAM * WORK_WEEKS;
  return { perWeek, hours, value: DEST[dest].counts ? hours * RATE : 0 };
}

// Review time per planner per week under each way of reviewing. "Exceptions only" matches the
// share of review work the week above treats as automatable.
export const REVIEW = [
  { id: 'review', label: 'Review every forecast', factor: 1, note: 'Safest and slowest. Overrides become data on where the model is wrong.' },
  { id: 'band', label: 'Review exceptions', factor: 1 - WEEK.find((w) => w.id === 'review').automatable, note: 'Humans see only what falls outside the range. Faster, but a quiet error inside it can slip through.' },
  { id: 'auto', label: 'Automatic inside guardrails', factor: 0.2, note: 'Fastest. Only sensible once trust is earned, with a weekly audit.' },
];
export const reviewHours = (id) => WEEK.find((w) => w.id === 'review').hours * REVIEW.find((r) => r.id === id).factor;
