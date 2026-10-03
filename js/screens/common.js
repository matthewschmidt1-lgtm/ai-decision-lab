import { h, eyebrow } from '../ui.js';
import { monthLabel } from '../data.js';
import { ALL_GROUPS, DEFAULT_CAUTION, trainModel } from '../forecast.js';

export const STEP_NAMES = ['The organism', 'The wave', 'Where attention goes', 'How it learns', 'The honest test', 'Safe and aligned', 'Steer'];
export const TOTAL = STEP_NAMES.length;

// The top of every screen: where you are, and the one question.
export const top = (n, lens, title, lede) => [
  eyebrow(lens, `${n} of ${TOTAL}`, STEP_NAMES[n - 1]),
  h('h1', { class: 'h1 wide' }, title),
  lede ? h('p', { class: 'lede' }, lede) : null,
];

// Back on the left, the one thing to do next on the right.
export function actions(ctx, { label, onNext, disabled, hint }) {
  return h('div', { class: 'actions' },
    ctx.hasBack ? h('button', { class: 'back', type: 'button', onClick: ctx.back }, '← Back') : h('span'),
    h('div', { class: 'actions-r' },
      hint ? h('span', { class: 'micro' }, hint) : null,
      h('button', { class: 'btn', type: 'button', disabled, onClick: onNext || ctx.next }, label, h('span', { 'aria-hidden': 'true' }, '→'))));
}

// Month ticks along a range of week indexes.
export function ticksFor(from, to, every = 13) {
  const out = [];
  for (let t = from; t <= to; t += every) out.push({ i: t - from, text: monthLabel(t) });
  return out;
}

// The recipe the rest of the lab uses: the one the learner locked in, or the one set in advance.
export const recipeOf = (state) => ({
  groups: state.locked?.features?.length ? state.locked.features : ALL_GROUPS,
  l2: state.locked ? state.locked.caution : DEFAULT_CAUTION,
});
export const modelFor = (state) => { const r = recipeOf(state); return trainModel(r.groups, { l2: r.l2 }); };

// How to say a change in typical miss, in plain words, whichever way it came out.
const pcs = (v) => `${v < 0 ? '−' : ''}${Math.abs(v * 100).toFixed(0)}%`;
export const rangeText = (b) => `${b.point >= 0 ? 'cuts the miss by' : 'raises the miss by'} ${Math.abs(b.point * 100).toFixed(0)}% (90% range ${pcs(b.lo)} to ${pcs(b.hi)})`;
