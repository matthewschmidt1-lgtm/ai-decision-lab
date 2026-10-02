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

// A term the learner has just earned a reason to care about.
export function term(name, def) {
  return h('div', { class: 'term' }, h('span', { class: 'term-name' }, name), h('span', { class: 'term-def' }, def));
}

export function disclose(summary, ...kids) {
  return h('details', { class: 'disclose' }, h('summary', null, summary), h('div', { class: 'disclose-body' }, ...kids));
}

export function table(head, rows, { num = [] } = {}) {
  return h('table', { class: 'tbl' },
    h('thead', null, h('tr', null, head.map((c, i) => h('th', { class: num.includes(i) ? 'num r' : '' }, c)))),
    h('tbody', null, rows.map((r) => h('tr', null, r.map((c, i) => h('td', { class: num.includes(i) ? 'num r' : '' }, c))))));
}


// A waterfall: each step floats from where the last one ended, so the learner watches the total
// being built. Rows: { label, value, tag, mark, color } float; { total: true } anchors at zero;
// { header } is a group label; { split: [{value, color, label}] } is one bar cut into parts.
export function waterfall({ rows, fmt = (v) => signed(v, 1), min, max, ghost = null }) {
  const base = min != null && min > 0 ? min : 0;
  let run = 0, lo = base, hi = base;
  const laid = rows.map((r) => {
    if (r.header || r.split) { const t = r.split ? r.split.reduce((a, p) => a + p.value, 0) : 0; if (r.split) { lo = Math.min(lo, t); hi = Math.max(hi, t); } return { ...r, from: base, to: r.split ? t : base }; }
    if (r.total) { run = r.value; lo = Math.min(lo, run); hi = Math.max(hi, run); return { ...r, from: base, to: run }; }
    const from = run; run += r.value; lo = Math.min(lo, run); hi = Math.max(hi, run);
    return { ...r, from, to: run };
  });
  lo = min ?? lo; hi = max ?? hi;
  const span = (hi - lo) || 1, pos = (v) => `${((v - lo) / span) * 100}%`;
  const root = h('div', { class: 'wf', style: { '--zero': pos(base) } });
  laid.forEach((r, i) => {
    if (r.header) { root.append(h('div', { class: 'wf-head' }, h('span', null, r.header), r.note ? h('span', { class: 'num' }, r.note) : null)); return; }
    const a = Math.min(r.from, r.to), b = Math.max(r.from, r.to);
    let fills;
    if (r.split) {
      let acc = 0;
      fills = r.split.map((p) => { const f = h('i', { class: 'wf-bar', style: { left: pos(Math.min(acc, acc + p.value)), width: `${(Math.abs(p.value) / span) * 100}%`, background: p.color, animationDelay: `${i * 70}ms` } }); acc += p.value; return f; });
    } else {
      fills = [h('i', { class: `wf-bar${r.total ? ' total' : r.value < 0 ? ' neg' : ' pos'}`, style: { left: pos(a), width: `${Math.max(((b - a) / span) * 100, 0.6)}%`, background: r.color || null, animationDelay: `${i * 70}ms` } })];
    }
    root.append(h('div', { class: `bar-row wf-row${r.mark ? ' mark' : ''}${r.total ? ' wf-total' : ''}` },
      h('div', { class: 'bar-label' }, r.label, r.tag ? h('span', { class: 'bar-tag' }, r.tag) : null),
      h('div', { class: 'bar-track wf-track' }, fills, ghost && r.total && i === laid.length - 1 ? h('i', { class: 'wf-ghost', style: { left: pos(ghost.value) }, title: ghost.label }) : null),
      h('div', { class: 'bar-val num' }, r.shown ?? (r.split ? fmt(r.to) : fmt(r.value)))));
  });
  return root;
}

// A range for each item, with a marker for the base case: the tornado for "what matters most".
export function rangeBars({ items, base = 0, fmt = (v) => String(v) }) {
  const lo = Math.min(base, ...items.map((i) => i.low)), hi = Math.max(base, 0, ...items.map((i) => i.high));
  const span = (hi - lo) || 1, pos = (v) => `${((v - lo) / span) * 100}%`;
  const root = h('div', { class: 'wf rb', style: { '--zero': pos(0), '--base': pos(base) } });
  items.forEach((it) => {
    root.append(h('div', { class: 'bar-row wf-row' },
      h('div', { class: 'bar-label' }, it.label),
      h('div', { class: 'bar-track wf-track' },
        h('i', { class: 'wf-bar range', style: { left: pos(it.low), width: `${((it.high - it.low) / span) * 100}%` } }),
        h('i', { class: 'wf-base' })),
      h('div', { class: 'bar-val num' }, `${fmt(it.low)} to ${fmt(it.high)}`)));
  });
  return root;
}

// A chain of stages joined by a line. A stage that is a gap breaks the line. The stage the learner is
// worried about is lit, and what it means for the pilot appears beside it.
export function chain(nodes, { active = null } = {}) {
  const root = h('ol', { class: 'chain' });
  nodes.forEach((n) => {
    root.append(h('li', { class: `chain-node${n.id === active ? ' active' : ''}`, 'data-tone': n.tone || 'unknown' },
      h('span', { class: 'chain-dot' }),
      h('span', { class: 'chain-name' }, n.name),
      h('span', { class: 'chain-detail' }, n.detail),
      h('span', { class: 'chip', 'data-tone': n.tone || 'unknown' }, n.status)));
  });
  return root;
}

// A dot plot: one row per case, one dot per method, on a shared axis. Good for "who wins, each time".
export function dotPlot({ rows, fmt = (v) => `${(v * 100).toFixed(1)}%`, legend }) {
  const all = rows.flatMap((r) => r.points.map((p) => p.v));
  const lo = 0, hi = Math.max(...all) * 1.12, pos = (v) => `${((v - lo) / (hi - lo)) * 100}%`;
  const root = h('div', { class: 'dots' });
  if (legend) root.append(h('div', { class: 'dots-legend' }, legend.map((l) => h('span', { class: 'legend-item' }, h('i', { style: { background: l.color, borderColor: l.color } }), l.name))));
  rows.forEach((r) => {
    const best = r.points.reduce((a, p) => (p.v < a.v ? p : a), r.points[0]);
    root.append(h('div', { class: 'dots-row' },
      h('div', { class: 'dots-label' }, r.label, r.sub ? h('span', { class: 'bar-tag' }, r.sub) : null),
      h('div', { class: 'dots-track' }, r.points.map((p) => h('i', { class: `dots-dot${p === best ? ' best' : ''}`, style: { left: pos(p.v), background: p.color }, title: `${p.name}: ${fmt(p.v)}` }))),
      h('div', { class: 'dots-best num' }, `${best.name} ${fmt(best.v)}`)));
  });
  return root;
}

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Round parts to whole numbers so that they still add up to the rounded total.
export function roundParts(values, total) {
  const target = Math.round(total);
  const floors = values.map(Math.floor);
  let rest = target - floors.reduce((a, b) => a + b, 0);
  const order = values.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]);
  const out = floors.slice();
  for (const [, i] of order) { if (rest <= 0) break; out[i]++; rest--; }
  return out;
}

// A segmented control: one of a few short choices, always visible.
export const seg = (items, value, onPick) => h('div', { class: 'seg', role: 'group' },
  items.map(([id, label]) => h('button', { type: 'button', class: 'seg-b', 'aria-pressed': String(id === value), onClick: () => onPick(id) }, label)));
