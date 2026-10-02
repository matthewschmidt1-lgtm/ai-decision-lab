import { h, s, eyebrow, reducedMotion } from '../ui.js';
import { lineChart } from '../charts.js';
import { WEEKS, decompose, weekLabel } from '../data.js';
import { ticksFor } from './common.js';

const LOOP = [
  ['Signal', 'What is happening?'],
  ['Understanding', 'What matters?'],
  ['Decision', 'What should we do?'],
  ['Action', 'What did we actually do?'],
  ['Learning', 'What happened?'],
];

function ring() {
  const cx = 320, cy = 224, r = 148;
  const pos = (i, k = 1) => {
    const a = (-90 + i * 72) * Math.PI / 180;
    return [cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k, Math.cos(a), Math.sin(a)];
  };
  const svg = s('svg', { viewBox: '0 0 640 440', class: 'loop-ring', role: 'img', 'aria-label': 'The learning loop: signal, understanding, decision, action, learning, and back to signal' });
  const circle = `M${cx},${cy - r} A${r},${r} 0 1,1 ${cx - 0.01},${cy - r}`;
  svg.append(s('path', { id: 'loop-path', d: circle, class: 'loop-path' }));
  LOOP.forEach(([name, q], i) => {
    const [x, y, ux, uy] = pos(i);
    const lx = x + ux * 26, ly = y + uy * 26;
    const anchor = Math.abs(ux) < 0.3 ? 'middle' : ux > 0 ? 'start' : 'end';
    svg.append(s('circle', { cx: x, cy: y, r: 7, class: 'loop-node' }));
    svg.append(s('text', { x: lx, y: ly + (uy < -0.5 ? -8 : uy > 0.5 ? 10 : 0), 'text-anchor': anchor, class: 'loop-name' }, name));
    svg.append(s('text', { x: lx, y: ly + (uy < -0.5 ? 8 : uy > 0.5 ? 28 : 18), 'text-anchor': anchor, class: 'loop-q' }, q));
  });
  svg.append(s('text', { x: cx, y: cy - 6, 'text-anchor': 'middle', class: 'loop-center' }, 'AI sits inside'));
  svg.append(s('text', { x: cx, y: cy + 14, 'text-anchor': 'middle', class: 'loop-center' }, 'the loop'));
  if (!reducedMotion()) {
    const dot = s('circle', { r: 5, class: 'loop-dot' },
      s('animateMotion', { dur: '14s', repeatCount: 'indefinite', rotate: 'auto' }, s('mpath', { href: '#loop-path' })));
    svg.append(dot);
  }
  return svg;
}

function list() {
  return h('ol', { class: 'loop-list' }, LOOP.map(([name, q]) => h('li', null, h('b', null, name), h('span', null, q))));
}

function teaser() {
  const D = decompose();
  const from = 104, to = 155;
  const ma3 = (arr) => arr.map((_, i) => { const a = arr.slice(Math.max(0, i - 1), i + 2); return a.reduce((x, y) => x + y, 0) / a.length; });
  const ship = ma3(WEEKS.slice(from - 2, to + 1).map((w) => w.ship)).slice(2);
  const dep = ma3(WEEKS.slice(from - 2, to + 1).map((w) => w.dep)).slice(2);
  return h('section', { class: 'teaser stack-s' },
    h('div', { class: 'micro' }, 'Two lines, one year: what distributors bought and what shoppers bought. Why are they not the same?'),
    lineChart({
      n: ship.length, height: 230, yMin: 2800, yFmt: (v) => v.toLocaleString('en-US'), direct: true, hover: false,
      series: [
        { name: 'What distributors bought', short: 'Shipments', values: ship, color: 'var(--s-current)', dash: '5 5', width: 2 },
        { name: 'What shoppers bought', short: 'Shoppers', values: dep, color: 'var(--s-actual)', width: 2.5 },
      ],
      fills: [{ a: 0, b: 1, posClass: 'up', negClass: 'down' }],
      ticks: ticksFor(from, to, 13), xLabel: (i) => weekLabel(from + i),
      desc: 'A year of weekly cases: what distributors bought and what shoppers bought, with the gap between them shaded.',
    }));
}

export const landing = {
  id: 'landing', exp: 0, adopt: null, title: '',
  render({ go }) {
    return h('div', { class: 'screen landing' },
      h('div', { class: 'hero-block stack' },
        eyebrow(null, 'AI Decision Lab', 'for CPG leaders'),
        h('h1', { class: 'hero' }, 'AI is not the product.', h('br'), 'Better decisions are.'),
        h('p', { class: 'lede' }, 'Take a real CPG problem. Find where AI could help. See what it is actually doing under the hood. Then design the test that would show whether it works. ',
          h('strong', null, 'About 25 minutes. No code, no sign-up.')),
        h('div', { class: 'row' },
          h('button', { class: 'btn', type: 'button', onClick: () => go('e1-situation') }, 'Start with a business problem', h('span', { 'aria-hidden': 'true' }, '→')))),

      teaser(),

      h('section', { class: 'landing-loop' },
        h('div', { class: 'loop-copy stack' },
          h('h2', { class: 'h2' }, 'Every good decision runs the same loop.'),
          h('p', { class: 'prose' }, 'Signal becomes understanding. Understanding becomes a decision. The decision becomes action, and the action teaches you something. AI can strengthen any step. It does not replace the loop.'),
          list()),
        ring()),

      h('section', { class: 'lenses' },
        h('h2', { class: 'h2' }, 'Three questions decide whether an AI idea is real.'),
        h('div', { class: 'lens-row' },
          [['biz', 'Business', 'Does this create value?'], ['sys', 'System', 'Can this actually work?'], ['ppl', 'People', 'Will people use it?']].map(([k, n, q]) =>
            h('div', { class: 'lens', 'data-lens': k }, h('span', { class: 'lens-dot' }), h('b', null, n), h('span', null, q))))),

      h('section', { class: 'path' },
        h('ol', null,
          [['Find the opportunity', 'A bourbon brand is down 8%. Investigate with limited time, then decide which decision is worth improving.'],
           ['Open the hood', 'Train a real forecasting model in your browser, then test it honestly against a method with no AI. Go as deep as you are curious: weights, math, code.'],
           ['Design the pilot', 'Size the value, look for friction, and write the experiment: hypothesis, baseline, human role, metric.']]
            .map(([t, d], i) => h('li', null, h('span', { class: 'path-n mono' }, `0${i + 1}`), h('div', null, h('b', null, t), h('p', null, d)))))));
  },
};
