// One chart: a line chart with an optional band, the area between two lines, markers, annotated
// points, shaded spans, a persistent cursor and a hover readout. It is drawn at the width it is
// given, so type stays readable on a phone.

import { h, s, reducedMotion } from './ui.js';

function niceScale(min, max, n = 4) {
  const span = max - min || 1;
  const raw = span / n, mag = 10 ** Math.floor(Math.log10(raw)), norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const lo = Math.floor(min / step + 1e-9) * step, hi = Math.ceil(max / step - 1e-9) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step * 1e-6; v += step) ticks.push(+v.toFixed(10));
  return { ticks, lo, hi };
}

// The filled region between two series, split where they cross so each side takes its own colour.
function areaBetween(a, b, X, Y) {
  const pos = [], neg = [];
  const n = Math.min(a.values.length, b.values.length);
  const from = a.from || 0;
  for (let i = 0; i < n - 1; i++) {
    const a0 = a.values[i], a1 = a.values[i + 1], b0 = b.values[i], b1 = b.values[i + 1];
    if (a0 == null || a1 == null || b0 == null || b1 == null) continue;
    const x0 = X(i + from), x1 = X(i + 1 + from);
    const d0 = a0 - b0, d1 = a1 - b1;
    const poly = (pts, d) => (d >= 0 ? pos : neg).push(`M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L')}Z`);
    if (d0 >= 0 && d1 >= 0 || d0 <= 0 && d1 <= 0) {
      poly([[x0, Y(a0)], [x1, Y(a1)], [x1, Y(b1)], [x0, Y(b0)]], d0 + d1);
    } else {
      const t = d0 / (d0 - d1), xc = x0 + (x1 - x0) * t, yc = Y(a0 + (a1 - a0) * t);
      poly([[x0, Y(a0)], [xc, yc], [x0, Y(b0)]], d0);
      poly([[xc, yc], [x1, Y(a1)], [x1, Y(b1)]], d1);
    }
  }
  return { pos: pos.join(''), neg: neg.join('') };
}

export function lineChart(initial) {
  let o = { height: 280, yFmt: (v) => String(Math.round(v)), ...initial };
  const wrap = h('div', { class: 'chart' });
  const legendEl = h('div', { class: 'legend' });
  const stage = h('div', { class: 'chart-stage' });
  const tip = h('div', { class: 'chart-tip', hidden: true });
  wrap.append(legendEl, stage);
  let animated = !reducedMotion();
  let width = 0;

  function render() {
    width = Math.max(260, stage.clientWidth || 640);
    const compact = width < 520;
    const H = o.height;
    const m = { t: 14, r: !o.direct ? 14 : compact ? 58 : 96, b: 28, l: compact ? 40 : 50 };
    const iw = width - m.l - m.r, ih = H - m.t - m.b;
    const n = o.n ?? Math.max(...o.series.map((x) => x.values.length));

    const all = [];
    o.series.forEach((x) => x.values.forEach((v) => { if (v != null) all.push(v); }));
    if (o.band) { o.band.lo.forEach((v) => all.push(v)); o.band.hi.forEach((v) => all.push(v)); }
    (o.refs || []).forEach((r) => all.push(r.y));
    const ty = o.log ? Math.log10 : (v) => v;
    let lo = o.yMin ?? Math.min(...all), hi = o.yMax ?? Math.max(...all);
    let ticks;
    if (o.log) {
      const a = Math.floor(Math.log10(lo)), b = Math.ceil(Math.log10(hi));
      ticks = []; for (let e = a; e <= b; e++) ticks.push(10 ** e);
      lo = ticks[0]; hi = ticks[ticks.length - 1];
    } else {
      const sc = niceScale(lo, hi);
      ticks = sc.ticks; lo = sc.lo; hi = sc.hi;
    }
    const X = (i) => m.l + (n <= 1 ? 0 : (i / (n - 1)) * iw);
    const Y = (v) => m.t + ih - ((ty(v) - ty(lo)) / (ty(hi) - ty(lo))) * ih;

    const svg = s('svg', { viewBox: `0 0 ${width} ${H}`, width, height: H, role: 'img', 'aria-label': o.desc || o.title || 'Chart' });
    const cid = `clip-${Math.random().toString(36).slice(2, 8)}`;
    svg.append(s('defs', null, s('clipPath', { id: cid }, s('rect', { x: m.l - 2, y: m.t - 2, width: iw + 4, height: ih + 4 }))));
    const clip = `url(#${cid})`;

    // grid + y labels
    ticks.forEach((v) => {
      svg.append(s('line', { x1: m.l, x2: width - m.r, y1: Y(v), y2: Y(v), class: 'ch-grid' }));
      svg.append(s('text', { x: m.l - 8, y: Y(v) + 4, class: 'ch-ytick', 'text-anchor': 'end' }, o.yFmt(v)));
    });
    svg.append(s('line', { x1: m.l, x2: width - m.r, y1: m.t + ih, y2: m.t + ih, class: 'ch-base' }));

    // x ticks
    let lastX = -99;
    (o.ticks || []).forEach((t) => {
      const x = X(t.i);
      if (x - lastX < (compact ? 64 : 56) || x > width - m.r + 2) return;
      lastX = x;
      svg.append(s('line', { x1: x, x2: x, y1: m.t + ih, y2: m.t + ih + 4, class: 'ch-base' }));
      svg.append(s('text', { x, y: H - 8, class: 'ch-xtick', 'text-anchor': 'middle' }, t.text));
    });

    // spans, labelled from their right edge so a long label never runs off the chart
    (o.spans || []).forEach((sp) => {
      const x1 = X(sp.from), x2 = X(sp.to);
      svg.append(s('rect', { x: x1, y: m.t, width: Math.max(2, x2 - x1), height: ih, class: `ch-span${sp.cls ? ' ' + sp.cls : ''}` }));
      if (sp.text) svg.append(s('text', { x: sp.anchor === 'start' ? x1 + 6 : x2 - 6, y: m.t + 13, class: 'ch-spantext', 'text-anchor': sp.anchor === 'start' ? 'start' : 'end' }, sp.text));
    });

    // band
    if (o.band) {
      let d = '';
      o.band.hi.forEach((v, i) => { d += `${i ? 'L' : 'M'}${X(i + (o.band.from || 0))},${Y(v)}`; });
      for (let i = o.band.lo.length - 1; i >= 0; i--) d += `L${X(i + (o.band.from || 0))},${Y(o.band.lo[i])}`;
      svg.append(s('path', { d: d + 'Z', class: 'ch-band', 'clip-path': clip }));
    }

    // the area between two lines
    (o.fills || []).forEach((f) => {
      const { pos, neg } = areaBetween(o.series[f.a], o.series[f.b], X, Y);
      if (pos) svg.append(s('path', { d: pos, class: `ch-fill ${f.posClass || 'up'}`, 'clip-path': clip }));
      if (neg) svg.append(s('path', { d: neg, class: `ch-fill ${f.negClass || 'down'}`, 'clip-path': clip }));
    });

    // refs
    (o.refs || []).forEach((r) => {
      svg.append(s('line', { x1: m.l, x2: width - m.r, y1: Y(r.y), y2: Y(r.y), class: 'ch-ref' }));
      if (r.text) svg.append(s('text', { x: width - m.r - 4, y: Y(r.y) + (r.below ? 15 : -6), class: 'ch-reftext', 'text-anchor': 'end' }, r.text));
    });

    // markers
    (o.markers || []).forEach((mk) => {
      const x = X(mk.i);
      svg.append(s('line', { x1: x, x2: x, y1: m.t, y2: m.t + ih, class: 'ch-marker' }));
      const right = x < width - m.r - 120;
      svg.append(s('text', { x: right ? x + 6 : x - 6, y: m.t + 12 + (mk.dy || 0), class: 'ch-markertext', 'text-anchor': right ? 'start' : 'end' }, mk.text));
    });

    // series
    o.series.forEach((x) => {
      let d = '', pen = false;
      x.values.forEach((v, i) => {
        const idx = i + (x.from || 0);
        if (v == null) { pen = false; return; }
        d += `${pen ? 'L' : 'M'}${X(idx).toFixed(1)},${Y(v).toFixed(1)}`; pen = true;
      });
      const solid = !x.dash;
      svg.append(s('path', {
        d, 'clip-path': clip, class: `ch-line${solid && animated ? ' draw' : ''}${!solid ? ' fade' : ''}`,
        stroke: x.color, 'stroke-width': x.width || 2, 'stroke-dasharray': x.dash || null, pathLength: solid && animated ? 1 : null,
      }));
    });

    // annotated points: the one thing to look at
    (o.dots || []).forEach((d) => {
      const x = X(d.i), y = Y(d.v);
      if (d.drop) svg.append(s('line', { x1: x, x2: x, y1: y, y2: m.t + ih, class: 'ch-drop', stroke: d.color }));
      svg.append(s('circle', { cx: x, cy: y, r: 5.5, fill: d.color, class: 'ch-dot' }));
      if (d.text) svg.append(s('text', { x: x + (d.dx ?? 10), y: y + (d.dy ?? -10), class: 'ch-dottext', 'text-anchor': d.anchor || 'start' }, d.text));
    });

    // free text labels, to name the thing worth looking at
    (o.labels || []).forEach((l) => svg.append(s('text', { x: X(l.i), y: Y(l.v), class: `ch-note${l.cls ? ' ' + l.cls : ''}`, 'text-anchor': l.anchor || (l.i < n * 0.22 ? 'start' : l.i > n * 0.78 ? 'end' : 'middle') }, l.text)));

    // direct labels at line ends (four series or fewer)
    if (o.direct) {
      const ends = o.series.map((x) => {
        let j = x.values.length - 1; while (j > 0 && x.values[j] == null) j--;
        return { x, y: Y(x.values[j]) };
      }).sort((a, b) => a.y - b.y);
      for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 15) ends[i].y = ends[i - 1].y + 15;
      ends.forEach((e) => svg.append(s('text', { x: width - m.r + 8, y: e.y + 4, class: 'ch-direct' }, e.x.short || e.x.name)));
    }

    // cursor and hover layers
    const cur = s('g', { class: 'ch-cursor' });
    svg.append(cur);
    const drawCursor = (i, withTip) => {
      cur.replaceChildren();
      if (i == null || i < 0 || i >= n) { tip.hidden = true; return; }
      const x = X(i);
      cur.append(s('line', { x1: x, x2: x, y1: m.t, y2: m.t + ih, class: 'ch-cross' }));
      const rows = [];
      o.series.forEach((sr) => {
        const v = sr.values[i - (sr.from || 0)];
        if (v == null) return;
        cur.append(s('circle', { cx: x, cy: Y(v), r: 4.5, fill: sr.color, class: 'ch-dot' }));
        rows.push({ name: sr.name, v, color: sr.color, dash: sr.dash });
      });
      if (withTip && !o.onPick) {
        const title = o.xLabel ? o.xLabel(i) : String(i);
        tip.replaceChildren(
          h('div', { class: 'tip-title' }, title),
          ...rows.map((r) => h('div', { class: 'tip-row' }, h('i', { style: { background: r.dash ? 'transparent' : r.color, borderColor: r.color } }), h('span', null, r.name), h('b', { class: 'num' }, (o.tipFmt || o.yFmt)(r.v)))),
          ...(o.tipExtra ? [o.tipExtra(i)].filter(Boolean) : []));
        tip.hidden = false;
        const tw = tip.offsetWidth;
        tip.style.left = `${x < width / 2 ? Math.min(x + 14, width - tw) : Math.max(0, x - tw - 14)}px`;
        tip.style.top = `${m.t + 4}px`;
      }
    };
    drawCursor(o.cursor ?? null, false);
    if (o.hover !== false) {
      const hit = s('rect', { x: m.l, y: m.t, width: iw, height: ih, fill: 'transparent', class: `ch-hit${o.onPick ? ' pick' : ''}` });
      const at = (ev) => {
        const r = svg.getBoundingClientRect();
        const i = Math.round(((ev.clientX - r.left - m.l) / iw) * (n - 1));
        return Math.max(0, Math.min(n - 1, i));
      };
      let down = false;
      hit.addEventListener('pointermove', (ev) => {
        if (o.onPick) { if (down) o.onPick(at(ev)); return; }
        drawCursor(at(ev), true);
      });
      hit.addEventListener('pointerdown', (ev) => {
        if (o.onPick) { down = true; hit.setPointerCapture?.(ev.pointerId); o.onPick(at(ev)); return; }
        drawCursor(at(ev), true);
      });
      hit.addEventListener('pointerup', () => { down = false; });
      hit.addEventListener('pointercancel', () => { down = false; });
      hit.addEventListener('pointerleave', () => { if (!o.onPick) { tip.hidden = true; drawCursor(o.cursor ?? null, false); } });
      svg.append(hit);
    }
    stage.replaceChildren(svg, tip);

    // legend: always present for two or more series, never colour-alone
    legendEl.replaceChildren();
    if (o.series.length > 1 && o.legend !== false) {
      o.series.forEach((x) => legendEl.append(h('span', { class: 'legend-item' },
        h('i', { class: x.dash ? 'dash' : '', style: { background: x.dash ? 'none' : x.color, borderColor: x.color } }), x.name)));
      if (o.band) legendEl.append(h('span', { class: 'legend-item' }, h('i', { class: 'band' }), o.band.name || 'Range'));
    }
  }

  const ro = new ResizeObserver(() => { if (stage.clientWidth && Math.abs(stage.clientWidth - width) > 1) { animated = false; render(); } });
  ro.observe(stage);
  requestAnimationFrame(render);
  wrap.update = (patch) => { o = { ...o, ...patch }; animated = false; render(); };
  return wrap;
}

// A distribution of simulated outcomes, drawn as bars, with rules at the points that matter.
// `worlds`: [{ samples, color, label }]. `markers`: [{ v, label }]. Bars at or past `passAt` are solid.
export function histogram({ worlds, markers, passAt, height = 190, fmt = (v) => `${(v * 100).toFixed(0)}%` }) {
  let o = { worlds, markers, passAt };
  const wrap = h('div', { class: 'chart' });
  const legendEl = h('div', { class: 'legend' });
  const stage = h('div', { class: 'chart-stage' });
  wrap.append(legendEl, stage);
  let width = 0;
  function render() {
    width = Math.max(260, stage.clientWidth || 640);
    const m = { t: 22, r: 12, b: 28, l: 12 }, iw = width - m.l - m.r, ih = height - m.t - m.b;
    const all = o.worlds.flatMap((w) => w.samples);
    const marks = o.markers.map((k) => k.v);
    let lo = Math.min(...all, ...marks), hi = Math.max(...all, ...marks);
    const pad = (hi - lo) * 0.05; lo -= pad; hi += pad;
    const BINS = 36, bw = (hi - lo) / BINS;
    const X = (v) => m.l + ((v - lo) / (hi - lo)) * iw;
    const counts = o.worlds.map((w) => { const c = new Array(BINS).fill(0); w.samples.forEach((v) => { c[Math.min(BINS - 1, Math.max(0, Math.floor((v - lo) / bw)))]++; }); return c; });
    const top = Math.max(...counts.flat()) || 1;
    const svg = s('svg', { viewBox: `0 0 ${width} ${height}`, width, height, role: 'img', 'aria-label': 'Distribution of simulated pilot results' });
    svg.append(s('line', { x1: m.l, x2: width - m.r, y1: m.t + ih, y2: m.t + ih, class: 'ch-base' }));
    o.worlds.forEach((w, wi) => {
      counts[wi].forEach((c, b) => {
        if (!c) return;
        const x0 = lo + b * bw, passes = x0 + bw / 2 >= o.passAt;
        const hgt = (c / top) * ih;
        svg.append(s('rect', { x: X(x0) + 0.5, y: m.t + ih - hgt, width: Math.max(1, X(x0 + bw) - X(x0) - 1), height: hgt, rx: 1.5,
          fill: w.color, 'fill-opacity': passes ? 0.9 : 0.32, class: 'hist-bar' }));
      });
    });
    o.markers.forEach((k, i) => {
      svg.append(s('line', { x1: X(k.v), x2: X(k.v), y1: m.t - 4, y2: m.t + ih, class: i === 0 ? 'ch-marker' : 'ch-ref' }));
      const left = i === 0;
      svg.append(s('text', { x: X(k.v) + (left ? -6 : 6), y: m.t - 8 + (i === 2 ? -0 : 0), class: 'ch-markertext', 'text-anchor': left ? 'end' : 'start' }, k.label));
    });
    const ticks = [lo + pad, ...marks, hi - pad].filter((v, i, a) => a.findIndex((u) => Math.abs(X(u) - X(v)) < 40) === i);
    ticks.forEach((v) => svg.append(s('text', { x: X(v), y: height - 8, class: 'ch-xtick', 'text-anchor': 'middle' }, fmt(v))));
    stage.replaceChildren(svg);
    legendEl.replaceChildren(...o.worlds.map((w) => h('span', { class: 'legend-item' }, h('i', { style: { background: w.color, borderColor: w.color } }), w.label)));
  }
  new ResizeObserver(() => { if (stage.clientWidth && Math.abs(stage.clientWidth - width) > 1) render(); }).observe(stage);
  requestAnimationFrame(render);
  wrap.update = (patch) => { o = { ...o, ...patch }; render(); };
  return wrap;
}
