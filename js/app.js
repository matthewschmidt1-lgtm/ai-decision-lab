// The shell: a hash router over an ordered list of screens, the experience nav, and the
// adoption track that shows where an AI idea is in its journey from value to scale-or-stop.

import { h, mount } from './ui.js';
import { state, save, reset } from './state.js';
import { landing } from './screens/landing.js';
import { e1 } from './screens/e1.js';
import { e2 } from './screens/e2.js';
import { e3 } from './screens/e3.js';

const SCREENS = [landing, ...e1, ...e2, ...e3];
const byId = Object.fromEntries(SCREENS.map((s) => [s.id, s]));

const EXPERIENCES = [
  { n: 1, title: 'Find the opportunity', start: 'e1-situation' },
  { n: 2, title: 'Open the hood', start: 'e2-business' },
  { n: 3, title: 'Design the pilot', start: 'e3-value' },
];
const TRACK = [
  ['value', 'Business value'], ['fit', 'AI fit'], ['system', 'System readiness'],
  ['people', 'People & workflow'], ['pilot', 'Pilot'], ['measure', 'Measure'], ['scale', 'Scale or stop'],
];

const main = document.getElementById('main');
const exps = document.getElementById('exps');
const trackEl = document.getElementById('track');
const trackList = document.getElementById('track-list');

const idFromHash = () => {
  const id = location.hash.replace(/^#\/?/, '');
  return byId[id] ? id : 'landing';
};
const index = (id) => SCREENS.findIndex((s) => s.id === id);

export function go(id) {
  if (location.hash === `#/${id}`) render(); else location.hash = `#/${id}`;
}

function render() {
  const id = idFromHash();
  const def = byId[id];
  const i = index(id);
  const ctx = {
    state, save,
    next: () => SCREENS[i + 1] && go(SCREENS[i + 1].id),
    back: () => SCREENS[i - 1] && go(SCREENS[i - 1].id),
    go,
    hasBack: i > 0 && def.exp > 0,
    rerender: render,
  };
  const screen = def.render(ctx);
  const stage = h('div', { class: 'stage' }, screen);
  mount(main, stage);
  const focusTarget = screen.querySelector('h1');
  if (focusTarget) { focusTarget.setAttribute('tabindex', '-1'); focusTarget.focus({ preventScroll: true }); }
  window.scrollTo({ top: 0, behavior: 'instant' });
  document.title = `${def.title ? def.title + ' · ' : ''}AI Decision Lab`;
  chrome(def);
}

function chrome(def) {
  mount(exps, EXPERIENCES.map((e) => h('button', {
    type: 'button', 'aria-current': String(def.exp === e.n), onClick: () => go(e.start),
  }, h('span', { class: 'n' }, e.n), h('span', { class: 't' }, e.title))));

  trackEl.hidden = def.exp === 0;
  const at = TRACK.findIndex(([k]) => k === def.adopt);
  mount(trackList, TRACK.map(([k, label], i) => h('li', { 'data-state': i < at ? 'done' : i === at ? 'now' : 'todo' }, h('i'), h('span', null, label))));
  trackEl.querySelector('.track-now')?.remove();
  if (at >= 0) trackEl.querySelector('.track-in').append(h('div', { class: 'track-now' }, `${at + 1} of ${TRACK.length} · ${TRACK[at][1]}`));
}

// Two taps instead of a browser dialog: the first asks, the second clears.
const restart = document.getElementById('restart');
let armed = null;
restart.addEventListener('click', () => {
  if (armed) { clearTimeout(armed); armed = null; restart.textContent = 'Start over'; reset(); go('landing'); render(); return; }
  restart.textContent = 'Clear my choices?';
  armed = setTimeout(() => { armed = null; restart.textContent = 'Start over'; }, 4000);
});
window.addEventListener('hashchange', render);
render();
