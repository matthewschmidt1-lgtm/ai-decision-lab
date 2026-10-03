// What the learner has decided so far. Kept on this device only, so a refresh does not lose
// their place. There are no accounts, and nothing is sent anywhere.

import { DEFAULTS } from './value.js';

const KEY = 'adlab.v5';

const fresh = () => ({
  loop: null,           // which loop they think their organization is in
  sorts: {},            // who they think does each job better
  sorted: false,        // whether they have checked those calls
  autoShare: 0.6,       // how much of the routine work the computer takes over, on the time screen
  destination: 'judgment',   // where the freed hours go
  gap: null,            // which gap between the lenses they would close first
  value: { ...DEFAULTS },
  pilot: { target: 0.1, weeks: 13, scope: 'lean', human: 'band', primary: 'both', guard: ['excess', 'override'], rule: 'scale' },
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
