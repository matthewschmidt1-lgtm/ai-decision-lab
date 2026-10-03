// What the learner has decided so far. Kept on this device only, so a refresh does not lose
// their place. There are no accounts, and nothing is sent anywhere.

import { DEFAULTS } from './value.js';

const KEY = 'adlab.v7';

const fresh = () => ({
  pulls: { mkt: 1, sales: 1, fin: 1, ops: 1 },   // how hard each department pulls toward its own goal (screen 1)
  reveal: false,        // whether they have asked the AI what the sum of the pulls is doing
  buffer: 'alone',      // who sets the stock behind the campaign (screen 2)
  job: null,            // the block of the week they have opened to see who should do it (screen 3)
  autoShare: 0.6,       // how much of the routine work the computer takes over, on the time screen
  destination: 'judgment',   // where the freed hours go
  gap: null,            // which gap between the lenses they would close first
  announce: null,       // the AI announcement they would make as CEO
  safeAns: [],          // which of the six pre-announcement questions their people can answer
  shared: 0.4,          // how much of every department's goal is one shared measure (screen 7)
  measure: 'depletions',   // which measure that is
  steer: 'align',       // which half of screen 7 they are on
  value: { ...DEFAULTS },
  pilot: { target: 0.1, weeks: 13, scope: 'lean', human: 'band', primary: 'both', guard: ['excess', 'override'], rule: 'scale' },
});

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && typeof raw === 'object') return { ...fresh(), ...raw, pulls: { ...fresh().pulls, ...(raw.pulls && typeof raw.pulls === 'object' ? raw.pulls : {}) }, value: { ...DEFAULTS, ...raw.value }, pilot: { ...fresh().pilot, ...raw.pilot } };
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
