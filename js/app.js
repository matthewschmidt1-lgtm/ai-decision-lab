// The shell: a hash router over five screens and a row of step dots.

import { h, mount } from './ui.js';
import { state, save, reset } from './state.js';
import { screens as SCREENS, STEP_NAMES } from './screens/lab.js';
const byId = Object.fromEntries(SCREENS.map((s) => [s.id, s]));

const main = document.getElementById('main');
const exps = document.getElementById('exps');

const idFromHash = () => {
  const id = location.hash.replace(/^#\/?/, '');
  return byId[id] ? id : SCREENS[0].id;
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
    hasBack: i > 0,
    rerender: render,
  };
  let screen;
  try {
    screen = def.render(ctx);
  } catch (err) {
    // Never leave a learner stuck on a dead button: say so, and offer a clean start.
    console.error(err);
    screen = h('div', { class: 'screen stack-l' },
      h('div', { class: 'stack' }, h('h1', { class: 'h1 wide' }, 'Something went wrong.'),
        h('p', { class: 'lede' }, 'Choices saved from an older version of the lab may be the cause. Clearing them starts you fresh.')),
      h('div', null, h('button', { class: 'btn', type: 'button', onClick: () => { reset(); go(SCREENS[0].id); render(); } }, 'Clear my choices and start again')));
  }
  const stage = h('div', { class: 'stage' }, screen);
  mount(main, stage);
  const focusTarget = screen.querySelector('h1');
  if (focusTarget) { focusTarget.setAttribute('tabindex', '-1'); focusTarget.focus({ preventScroll: true }); }
  window.scrollTo({ top: 0, behavior: 'instant' });
  document.title = i === 0 ? 'AI Decision Lab' : `${def.title} · AI Decision Lab`;
  chrome(def);
}

// Seven dots, one per screen: where you are, and a way back to any screen you have passed.
function chrome(def) {
  const at = index(def.id);
  mount(exps, SCREENS.map((sc, i) => h('button', {
    type: 'button', class: 'step', 'aria-current': String(i === at), 'aria-label': `${i + 1} of ${SCREENS.length}: ${STEP_NAMES[i]}`,
    title: STEP_NAMES[i], disabled: i > at, onClick: () => go(sc.id),
  }, h('i'))));
}

// Two taps instead of a browser dialog: the first asks, the second clears.
const restart = document.getElementById('restart');
let armed = null;
restart.addEventListener('click', () => {
  if (armed) { clearTimeout(armed); armed = null; restart.textContent = 'Start over'; reset(); go(SCREENS[0].id); render(); return; }
  restart.textContent = 'Clear my choices?';
  armed = setTimeout(() => { armed = null; restart.textContent = 'Start over'; }, 4000);
});
window.addEventListener('hashchange', render);
render();
