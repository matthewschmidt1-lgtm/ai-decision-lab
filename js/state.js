// What the learner has decided so far. Kept on this device only, so a refresh does not lose
// their place. There are no accounts, and nothing is sent anywhere.

import { ALL_GROUPS, DEFAULT_CAUTION } from './forecast.js';
import { DEFAULTS, CURRENT_CUSHION } from './value.js';

const KEY = 'adlab.v2';

const fresh = () => ({
  picks: [],            // investigations opened, in order
  read: null,           // what they believe is driving the decline
  bets: {},             // their call on each belief in the blind-spot screen, before they see the data
  checked: false,       // whether they have checked those calls against the data
  candidate: null,      // the decision they point AI at
  looked: [],           // other candidates they examined
  features: [...ALL_GROUPS],
  caution: DEFAULT_CAUTION,   // how far the AI may depart from the simple forecast
  locked: null,         // { features, caution } the learner scored on the exam weeks
  cushion: CURRENT_CUSHION,
  lr: 0.1,
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
