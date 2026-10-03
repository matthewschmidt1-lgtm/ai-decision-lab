// Small DOM helpers. Text is only ever inserted as text nodes, so there is no innerHTML path.

const SVG_NS = 'http://www.w3.org/2000/svg';

function apply(el, props) {
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.setAttribute('class', v);
    else if (k === 'style' && typeof v === 'object') { for (const [sk, sv] of Object.entries(v)) { if (sv == null) continue; if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv; } }
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked' || k === 'disabled' || k === 'hidden') el[k] = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  }
}
function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}

export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  apply(el, props); append(el, kids);
  return el;
}
export function s(tag, props, ...kids) {
  const el = document.createElementNS(SVG_NS, tag);
  apply(el, props); append(el, kids);
  return el;
}

export const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
export const mount = (el, ...kids) => { clear(el); append(el, kids); return el; };

// ---- Formatting ----
export const int = (n) => Math.round(n).toLocaleString('en-US');
export const pct = (x, d = 1) => `${(x * 100).toFixed(d)}%`;
export const pts = (x, d = 1) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x).toFixed(d)}`;
export function money(n, { sign = false } = {}) {
  const a = Math.abs(n);
  const body = a >= 1e6 ? `$${(a / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M` : a >= 1e4 ? `$${Math.round(a / 1e3)}K` : a >= 1e3 ? `$${(a / 1e3).toFixed(1)}K` : `$${Math.round(a)}`;
  return `${n < 0 ? '−' : sign ? '+' : ''}${body}`;
}
export const signed = (n, d = 1, suffix = '') => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(d)}${suffix}`;

// ---- Components ----

export function eyebrow(lens, ...parts) {
  const items = [];
  parts.forEach((p, i) => { if (i) items.push(h('span', { class: `sep p${i}` }, '/')); items.push(h('span', { class: `p${i}` }, p)); });
  return h('div', { class: 'eyebrow', 'data-lens': lens }, h('span', { class: 'dot' }), items);
}

// A single labelled slider with a live value readout.
export function slider({ label, min, max, step, value, fmt = String, onInput, hint, id }) {
  const out = h('output', { class: 'slider-out num' }, fmt(value));
  const input = h('input', { type: 'range', min, max, step, value, id, 'aria-label': label });
  const paint = () => input.style.setProperty('--fill', `${((input.value - min) / (max - min)) * 100}%`);
  input.addEventListener('input', () => { out.textContent = fmt(+input.value); paint(); onInput && onInput(+input.value); });
  paint();
  return h('label', { class: 'slider' },
    h('span', { class: 'slider-top' }, h('span', { class: 'slider-label' }, label), out),
    input,
    hint ? h('span', { class: 'micro' }, hint) : null);
}

// One-of-many choices. Selecting does not advance: the person stays in control.
export function choices({ items, value, onPick, name }) {
  const root = h('div', { class: 'choices', role: 'radiogroup', 'aria-label': name });
  const paint = (v) => root.querySelectorAll('.choice').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.id === v)));
  items.forEach((it) => {
    root.append(h('button', {
      class: 'choice', role: 'radio', type: 'button', 'data-id': it.id, 'aria-checked': String(it.id === value),
      onClick: () => { paint(it.id); onPick(it.id); },
    },
      h('span', { class: 'choice-mark' }),
      h('span', { class: 'choice-body' },
        h('span', { class: 'choice-title' }, it.title),
        it.sub ? h('span', { class: 'choice-sub' }, it.sub) : null)));
  });
  return root;
}

// Diverging bars: label, a bar either side of zero, a value. Pure HTML so it reflows on a phone.
export function bars({ items, max, fmt = (v) => signed(v, 1), zeroLabel, animate = true, cols = false }) {
  const top = max ?? Math.max(...items.map((i) => Math.abs(i.value)), 0.0001);
  const root = h('div', { class: `bars${animate ? '' : ' still'}${cols ? ' cols' : ''}` });
  items.forEach((it) => {
    const w = Math.min(50, (Math.abs(it.value) / top) * 50);
    const neg = it.value < 0;
    root.append(h('div', { class: `bar-row${it.dim ? ' dim' : ''}${it.mark ? ' mark' : ''}`, 'data-id': it.id || '' },
      h('div', { class: 'bar-label' }, it.label, it.tag ? h('span', { class: 'bar-tag' }, it.tag) : null),
      h('div', { class: 'bar-track' },
        h('i', { class: `bar-fill ${neg ? 'neg' : 'pos'}`, style: { width: `${w}%`, [neg ? 'right' : 'left']: '50%', background: it.color || null } })),
      h('div', { class: 'bar-val num' }, fmt(it.value))));
  });
  if (zeroLabel) root.append(h('div', { class: 'bar-zero micro' }, zeroLabel));
  return root;
}

export function stat(label, value, sub, tone) {
  return h('div', { class: `stat${tone ? ' ' + tone : ''}` },
    h('div', { class: 'stat-label' }, label),
    h('div', { class: 'stat-value num' }, value),
    sub ? h('div', { class: 'stat-sub' }, sub) : null);
}

// A quiet note that names the one idea worth keeping from a screen.
export function note(label, ...kids) {
  return h('div', { class: 'note' }, h('div', { class: 'note-label' }, label), h('div', { class: 'note-body' }, ...kids));
}

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Run `fn` once the element is mostly on screen, so nobody misses the start of an animation.
// A polling check, not an observer: it also works when the page loads already scrolled or in a background tab.
export function whenVisible(el, fn) {
  const t = setInterval(() => {
    if (!el.isConnected) { clearInterval(t); return; }
    const r = el.getBoundingClientRect();
    if (r.height && r.top < window.innerHeight - r.height * 0.5 && r.bottom > r.height * 0.5) { clearInterval(t); fn(); }
  }, 250);
  return () => clearInterval(t);
}

// A segmented control: one of a few short choices, always visible.
export const seg = (items, value, onPick) => h('div', { class: 'seg', role: 'group' },
  items.map(([id, label]) => h('button', { type: 'button', class: 'seg-b', 'aria-pressed': String(id === value), onClick: () => onPick(id) }, label)));
