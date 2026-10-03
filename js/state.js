// What the learner has decided so far. Kept on this device only, so a refresh does not lose
// their place. There are no accounts, and nothing is sent anywhere.

import { DEFAULTS } from './value.js';

const KEY = 'adlab.v4';

const fresh = () => ({
  decision: null,       // the decision they would point AI at on the business map
  bets: {},             // their call on each belief, before they see the data
  checked: false,       // whether they have checked those calls against the data
  value: { ...DEFAULTS },
  sysWorry: null,
  pplWorry: null,
  pilot: { target: 0.1, weeks: 13, scope: 'lean', human: 'review', primary: 'both', guard: ['excess', 'override'], rule: 'scale' },
});

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && typeof raw === 'object') return { ...fresh(), ...raw, value: { ...DEFAULTS, ...raw.value }, pilot: { ...fresh().pilot, ...raw.pilot } };
  } catch (e) { /* storage can be blocked; the lab still works */ }
  return fresh();
}

export const state = load();

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}
export function reset() {
  Object.keys(state).forEach((k) => delete state[k]);
  Object.assign(state, fresh());
  save();
}
