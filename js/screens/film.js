// The quarter-end push, as a film in five short acts. The viewer watches; nothing needs clicking.
//   1 The handoff       Marketing and sales run in different lanes and the baton drops. Operations, tied to the number, carries it over the line.
//   2 The reservoir     Demand drips in. Operations floods the rest into the distributor's warehouse, and it counts as sales.
//   3 Two scoreboards   Three quarters hit the number. Accounts bought the same small amount every time. The fourth quarter missed.
//   4 The empty chair   Every department has a scorecard. Nobody's job is creating demand. HQ applauds the one who hit the number.
//   5 The loop          The organization learned that the rescue works, so it relies on it. Each lap needs a bigger one, until the shelf is full.
// Every level, size and caption is read from runPush() in org.js. Motion uses the Web Animations API,
// so pausing, replaying and jumping between acts all work, and it is off for anyone who asks for less motion.
// One animation per property per element: stacked animations on the same property would override each other.

import { h, s, int } from '../ui.js';
import { PUSH, overlapOf, MARKETING_MIX, SALES_MIX } from '../org.js';

const W = 480, H = 300;
const C = { mkt: 'var(--d-mkt)', sales: 'var(--d-sales)', ops: 'var(--d-ops)', fin: 'var(--d-fin)', gold: 'var(--gold)', ink: 'var(--ink)', bad: 'var(--bad)' };
const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const pc = (v) => `${Math.round(v * 100)}%`;
export const ACT_TITLES = ['The handoff', 'The reservoir', 'Two scoreboards', 'The empty chair', 'The loop'];
const ACT_MS = [9800, 10000, 9600, 9800, 11500];
const RATE = [0.76, 0.76, 0.9, 0.85, 0.9];                      // dense acts play a little slower
const hide = (...els) => els.flat().forEach((e) => { e.style.opacity = 0; });

// A department drawn as a lettered disc. The outer group places it; the inner group is what moves.
const token = (letter, color, x, y, r = 15, name = '') => {
  const inner = s('g', { class: 'f-move' }, s('circle', { r, class: 'f-disc', style: { fill: color } }), s('text', { y: 5, class: 'f-letter', 'text-anchor': 'middle' }, letter), name ? s('text', { y: r + 18, class: 'f-small', 'text-anchor': 'middle' }, name) : null);
  return { g: s('g', { transform: `translate(${x} ${y})` }, inner), move: inner };
};
const flag = (x, y) => {
  const wave = s('polygon', { points: '0,0 34,10 0,22', class: 'f-flag' });
  return { g: s('g', { transform: `translate(${x} ${y})` }, s('line', { x1: 0, y1: 0, x2: 0, y2: 46, class: 'f-pole' }), wave, s('text', { x: 6, y: 15, class: 'f-hq' }, 'HQ')), wave };
};
const txt = (x, y, text, cls = '') => s('text', { x, y, class: `f-t ${cls}`, 'text-anchor': 'middle' }, text);
const waveFrames = [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-14deg)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(-10deg)' }, { transform: 'rotate(0deg)' }];
const tr = (x, y = 0) => `translate(${x}px,${y}px)`;

// ---------------------------------------------------------------- 1. The handoff
function act1(P) {
  const g = s('g');
  g.append(...[90, 150, 230].map((y) => s('line', { x1: 20, x2: 424, y1: y, y2: y, class: 'f-lane' })));
  const finish = s('line', { x1: 424, x2: 424, y1: 62, y2: 258, class: 'f-finish' });
  const fl = flag(444, 44);
  const M = token('M', C.mkt, 44, 90, 15, 'Marketing'), Sa = token('S', C.sales, 214, 150, 15, 'Sales'), O = token('O', C.ops, 330, 230, 15, 'Operations');
  const baton = s('rect', { x: 50, y: 85, width: 28, height: 9, rx: 4.5, class: 'f-baton f-center' });
  const box = s('g', { class: 'f-move' }, s('rect', { x: 276, y: 214, width: 42, height: 28, rx: 5, class: 'f-box' }), txt(297, 233, `+${int(P.quarters[0].push)}`, 'f-boxt'));
  const lanes = [txt(22, 62, 'Marketing pays for products A, B', 'f-lane-t'), txt(256, 170, 'Sales sells products C, D', 'f-lane-t')];
  lanes.forEach((l) => l.setAttribute('text-anchor', 'start'));
  const q1 = txt(232, 64, '?', 'f-q'), q2 = txt(178, 160, '?', 'f-q');
  const dots = Array.from({ length: 10 }, (_, i) => s('circle', { cx: 424, cy: 150, r: 3.5, class: 'f-conf', style: { fill: [C.gold, C.ops, C.mkt, C.sales][i % 4] } }));
  g.append(finish, fl.g, ...lanes, M.g, Sa.g, baton, box, O.g, q1, q2, ...dots);
  hide(q1, q2, dots);
  return { g, run(A) {
    A(M.move, [{ transform: tr(0) }, { transform: tr(150) }], { duration: 2200, easing: 'ease-in-out' });
    // the baton goes with Marketing, then falls between the lanes (one animation, so nothing overrides it)
    A(baton, [{ transform: 'translate(0px,0px) rotate(0deg)', offset: 0 }, { transform: 'translate(150px,0px) rotate(0deg)', offset: 0.629 },
      { transform: 'translate(168px,-26px) rotate(70deg)', offset: 0.77 }, { transform: 'translate(180px,28px) rotate(170deg)', offset: 0.93 }, { transform: 'translate(176px,38px) rotate(215deg)', offset: 1 }], { duration: 3500, easing: 'ease-in-out' });
    // the question marks appear, then fade with the two who gave up
    [q1, q2].forEach((q, i) => A(q, [{ opacity: 0, offset: 0 }, { opacity: 0, offset: (3700 + i * 200) / 5200 }, { opacity: 1, offset: (4100 + i * 200) / 5200 }, { opacity: 1, offset: 4600 / 5200 }, { opacity: 0.35, offset: 1 }], { duration: 5200, easing: 'linear' }));
    [M.g, Sa.g].forEach((e) => A(e, [{ opacity: 1, offset: 0 }, { opacity: 1, offset: 4600 / 5200 }, { opacity: 0.35, offset: 1 }], { duration: 5200, easing: 'linear' }));
    A(O.move, [{ transform: tr(0) }, { transform: tr(112) }], { delay: 5200, duration: 2400, easing: 'ease-in-out' });
    A(box, [{ transform: tr(0) }, { transform: tr(112) }], { delay: 5200, duration: 2400, easing: 'ease-in-out' });
    A(finish, [{ strokeWidth: '4px' }, { strokeWidth: '12px', offset: 0.4 }, { strokeWidth: '4px' }], { delay: 6700, duration: 900 });
    A(fl.wave, waveFrames, { delay: 7000, duration: 1800 });
    dots.forEach((d, i) => { const a = (i / dots.length) * Math.PI * 2, r = 34 + (i % 3) * 14; A(d, [{ opacity: 1, transform: tr(0) }, { opacity: 0, transform: tr(Math.cos(a) * r, Math.sin(a) * r + 14) }], { delay: 6900, duration: 1200, easing: 'ease-out' }); });
  } };
}

// ---------------------------------------------------------------- 2. The reservoir
function act2(P) {
  const g = s('g'), q1 = P.quarters[0], plan = P.plan;
  const hd = 160 * (P.created / plan);                                     // demand's share of the bucket, out of 160
  const BX = 130, BY = 90, BW = 80;                                         // the bucket; the gold line is the number
  const bucket = s('rect', { x: BX, y: 60, width: BW, height: 190, rx: 6, class: 'f-outline' });
  const demandFill = s('rect', { x: BX + 2, y: 250 - hd, width: BW - 4, height: hd, class: 'f-bottom', style: { fill: 'var(--s-actual)' } });
  const pushFill = s('rect', { x: BX + 2, y: BY, width: BW - 4, height: 160 - hd, class: 'f-bottom', style: { fill: C.ops } });
  const target = s('line', { x1: BX - 10, x2: BX + BW + 10, y1: BY, y2: BY, class: 'f-target' });
  const targetT = txt(BX + BW + 16, BY - 6, 'The number', 'f-lane-t'); targetT.setAttribute('text-anchor', 'start');
  const tapM = token('M', C.mkt, 152, 26, 12).g, tapS = token('S', C.sales, 190, 26, 12).g;
  const dripM = s('circle', { cx: 152, cy: 54, r: 3.4, style: { fill: C.mkt } }), dripS = s('circle', { cx: 190, cy: 54, r: 3.4, style: { fill: C.sales } });
  const TX = 330, TW = 90, TH = 180, TY = 70;
  const tank = s('rect', { x: TX, y: TY, width: TW, height: TH, rx: 6, class: 'f-outline' });
  const hNow = TH * (q1.cover / PUSH.cap), hStart = TH * (PUSH.cover / PUSH.cap);
  const stock = s('rect', { x: TX + 2, y: TY + TH - hNow, width: TW - 4, height: hNow, class: 'f-bottom', style: { fill: C.ops } });
  const need = s('line', { x1: TX - 6, x2: TX + TW + 6, y1: TY + TH - hStart, y2: TY + TH - hStart, class: 'f-need' });
  const O = token('O', C.ops, 375, 36);
  const oLab = txt(334, 40, 'Operations', 'f-small'); oLab.setAttribute('text-anchor', 'end');
  const pipe = s('line', { x1: 375, x2: 375, y1: 54, y2: TY + TH - hNow + 6, class: 'f-pipe' });
  const link = s('path', { d: 'M 368 112 C 300 112 262 128 214 128', class: 'f-link' });
  const store = s('g', { transform: 'translate(452 226)' }, s('rect', { x: -14, y: -6, width: 28, height: 22, class: 'f-store' }), s('polygon', { points: '-17,-6 0,-20 17,-6', class: 'f-roof' }));
  const stream = s('line', { x1: TX + TW, x2: 438, y1: 242, y2: 242, class: 'f-stream' });
  const n1 = txt(BX + BW + 38, 240, `+${int(P.created)} cases`, 'f-num'), n2 = txt(292, 104, `+${int(q1.push)} cases`, 'f-num f-olive');
  const hit = txt(BX - 14, BY - 6, '✓ number hit', 'f-good'); hit.setAttribute('text-anchor', 'end');
  const labs = [txt(BX + BW / 2, 272, 'What we report', 'f-small'), txt(TX + TW / 2, 272, 'Distributor’s warehouse', 'f-small'), txt(452, 258, 'Accounts', 'f-small')];
  const needT = txt(TX - 8, TY + TH - hStart - 5, `needs ${PUSH.cover} weeks`, 'f-tick'); needT.setAttribute('text-anchor', 'end');
  g.append(bucket, demandFill, pushFill, target, targetT, tank, stock, need, needT, tapM, tapS, dripM, dripS, pipe, link, O.g, oLab, store, stream, n1, n2, hit, ...labs);
  hide(demandFill, pushFill, pipe, link, n1, n2, hit, dripM, dripS);
  return { g, run(A) {
    A(demandFill, [{ opacity: 1, transform: 'scaleY(0)' }, { opacity: 1, transform: 'scaleY(1)' }], { delay: 600, duration: 2600, easing: 'linear' });
    [dripM, dripS].forEach((d, i) => A(d, [{ opacity: 1, transform: tr(0) }, { opacity: 1, transform: tr(0, 250 - hd - 54) }], { delay: 500 + i * 330, duration: 760, iterations: 4, easing: 'ease-in', fill: 'none' }));
    A(n1, [{ opacity: 0 }, { opacity: 1 }], { delay: 3300, duration: 500 });
    A(O.move, [{ transform: tr(0) }, { transform: tr(0, -4) }, { transform: tr(0) }], { delay: 4100, duration: 700 });
    A(pipe, [{ opacity: 0, strokeDashoffset: '0px' }, { opacity: 1, strokeDashoffset: '-48px' }], { delay: 4300, duration: 2400, easing: 'linear' });
    A(stock, [{ transform: `scaleY(${hStart / hNow})`, opacity: 0.55 }, { transform: 'scaleY(1)', opacity: 0.85 }], { delay: 4500, duration: 2200, easing: 'ease-out' });
    A(link, [{ opacity: 0 }, { opacity: 1 }], { delay: 4500, duration: 500 });
    A(pushFill, [{ opacity: 1, transform: 'scaleY(0)' }, { opacity: 1, transform: 'scaleY(1)' }], { delay: 4600, duration: 2000, easing: 'ease-out' });
    A(n2, [{ opacity: 0 }, { opacity: 1 }], { delay: 4700, duration: 500 });
    A(hit, [{ opacity: 0, transform: 'scale(.7)' }, { opacity: 1, transform: 'scale(1)' }], { delay: 6700, duration: 500 });
    A(stream, [{ strokeDashoffset: '0px' }, { strokeDashoffset: '-40px' }], { duration: 2000, iterations: 6, easing: 'linear' });
  } };
}

// ---------------------------------------------------------------- 3. Two scoreboards
function act3(P) {
  const g = s('g'), plan = P.plan, k = 0.9, base = 232, xs = [76, 176, 276, 376];
  const tl = txt(438, base - plan * k - 5, `The number: +${int(plan)}`, 'f-lane-t'); tl.setAttribute('text-anchor', 'end');
  g.append(s('line', { x1: 40, x2: 440, y1: base, y2: base, class: 'f-zero' }), s('line', { x1: 40, x2: 440, y1: base - plan * k, y2: base - plan * k, class: 'f-target' }), tl, txt(240, 40, 'Extra cases against the same quarter last year', 'f-tick'));
  g.append(s('g', null, s('rect', { x: 40, y: 10, width: 11, height: 11, rx: 2, style: { fill: 'var(--s-current)' } }), s('text', { x: 57, y: 20, class: 'f-small f-left' }, 'What we reported'),
    s('rect', { x: 200, y: 10, width: 11, height: 11, rx: 2, style: { fill: 'var(--s-actual)' } }), s('text', { x: 217, y: 20, class: 'f-small f-left' }, 'What accounts bought')));
  const parts = P.quarters.map((q, i) => {
    const rep = q.shipments - P.baseQ, acc = P.created, x = xs[i];
    const rb = s('rect', { x, y: base - rep * k, width: 34, height: rep * k, rx: 3, class: 'f-bottom', style: { fill: 'var(--s-current)' } });
    const ab = s('rect', { x: x + 38, y: base - acc * k, width: 34, height: acc * k, rx: 3, class: 'f-bottom', style: { fill: 'var(--s-actual)' } });
    const rl = txt(x + 17, base - rep * k - 6, `+${int(rep)}`, 'f-num'), al = txt(x + 55, base - acc * k - 6, `+${int(acc)}`, 'f-num');
    const mark = txt(x + 17, base - rep * k - 26, q.hit ? '✓' : '✗', q.hit ? 'f-mark f-good f-center' : 'f-mark f-badt f-center');
    const ql = txt(x + 36, 254, `Quarter ${q.q}`, 'f-small'), st = txt(x + 36, 273, `${q.cover.toFixed(1)} wks stock`, 'f-tick');
    g.append(rb, ab, rl, al, mark, ql, st);
    hide(rb, ab, rl, al, mark, st);
    return { rb, ab, rl, al, mark, st };
  });
  return { g, run(A) {
    parts.forEach((p, i) => {
      const d = 400 + i * 1900;
      A(p.ab, [{ opacity: 1, transform: 'scaleY(0)' }, { opacity: 1, transform: 'scaleY(1)' }], { delay: d, duration: 700 });
      A(p.rb, [{ opacity: 1, transform: 'scaleY(0)' }, { opacity: 1, transform: 'scaleY(1)' }], { delay: d + 500, duration: 800 });
      [p.al, p.rl].forEach((l, j) => A(l, [{ opacity: 0 }, { opacity: 1 }], { delay: d + 800 + j * 500, duration: 300 }));
      A(p.mark, [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1.25)', offset: 0.6 }, { opacity: 1, transform: 'scale(1)' }], { delay: d + 1250, duration: 500 });
      A(p.st, [{ opacity: 0 }, { opacity: 1 }], { delay: d + 1300, duration: 400 });
    });
  } };
}

// ---------------------------------------------------------------- 4. The empty chair
function act4(P) {
  const g = s('g');
  const table = s('ellipse', { cx: 240, cy: 166, rx: 128, ry: 52, class: 'f-table' });
  const seats = [['M', C.mkt, 126, 122, 'Marketing'], ['S', C.sales, 354, 122, 'Sales'], ['F', C.fin, 126, 214, 'Finance'], ['O', C.ops, 354, 214, 'Operations']].map(([l, c, x, y, nm]) => {
    const inner = s('g', { class: 'f-move' }, s('rect', { width: 28, height: 22, rx: 4, class: 'f-card' }), s('text', { x: 14, y: 17, class: 'f-mark f-good', 'text-anchor': 'middle' }, '✓'));
    return { t: token(l, c, x, y, 15, nm), card: s('g', { transform: `translate(${x < 240 ? x - 74 : x + 46} ${y - 12})` }, inner), inner };
  });
  const chairCircle = s('circle', { r: 20, class: 'f-chair f-center' });
  const chair = s('g', { transform: 'translate(240 256)' }, chairCircle, s('text', { y: 8, class: 'f-q2', 'text-anchor': 'middle' }, '?'));
  const chairLab = txt(240, 292, 'Creating demand: nobody’s job', 'f-small');
  const fl = flag(240, 12);
  const box = s('g', { transform: 'translate(354 214)' }, s('g', { class: 'f-move' }, s('rect', { x: -21, y: -40, width: 42, height: 28, rx: 5, class: 'f-box' }), txt(0, -21, `+${int(P.quarters[0].push)}`, 'f-boxt')));
  const claps = Array.from({ length: 6 }, (_, i) => { const a = (-70 + i * 28) * Math.PI / 180; return s('line', { x1: 258 + Math.cos(a) * 30, y1: 38 + Math.sin(a) * 20, x2: 258 + Math.cos(a) * 46, y2: 38 + Math.sin(a) * 30, class: 'f-clap' }); });
  g.append(table, ...seats.map((x) => x.t.g), ...seats.map((x) => x.card), chair, chairLab, fl.g, box, ...claps);
  hide(seats.map((x) => x.inner), claps, box);
  return { g, run(A) {
    seats.forEach((x, i) => A(x.inner, [{ opacity: 0, transform: tr(0, -8) }, { opacity: 1, transform: tr(0) }], { delay: 500 + i * 650, duration: 450 }));
    A(chairCircle, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.25)', opacity: 0.5 }, { transform: 'scale(1)', opacity: 1 }], { delay: 3400, duration: 900, iterations: 3 });
    A(box, [{ opacity: 0 }, { opacity: 1 }], { delay: 6000, duration: 300 });
    A(box.firstChild, [{ transform: tr(0) }, { transform: tr(-114, -52) }], { delay: 6000, duration: 1500, easing: 'ease-in-out' });
    A(fl.wave, waveFrames, { delay: 7500, duration: 1600 });
    claps.forEach((c, i) => A(c, [{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { delay: 7600 + i * 120, duration: 900 }));
    seats.forEach((x) => A(x.t.move, [{ transform: tr(0) }, { transform: tr(0, -6) }, { transform: tr(0) }], { delay: 7700, duration: 600, iterations: 2 }));
  } };
}

// ---------------------------------------------------------------- 5. The loop
function act5(P) {
  const g = s('g'), cx = 170, cy = 150, R = 92, steps = ['Plan', 'Gap', 'Rescue', 'Applause', 'Repeat'], n = P.quarters.length;
  const ring = s('circle', { cx, cy, r: R, class: 'f-ring' });
  const pos = steps.map((_, i) => { const a = (-90 + i * 72) * Math.PI / 180; return [cx + R * Math.cos(a), cy + R * Math.sin(a), a]; });
  const marks = steps.flatMap((l, i) => {
    const [x, y, a] = pos[i];
    return [s('circle', { cx: x, cy: y, r: 9, class: 'f-step', style: { fill: [C.ink, C.bad, C.ops, C.gold, C.ink][i] } }),
      s('text', { x: x + Math.cos(a) * 24, y: y + Math.sin(a) * 24 + 5, class: 'f-small', 'text-anchor': Math.cos(a) > 0.3 ? 'start' : Math.cos(a) < -0.3 ? 'end' : 'middle' }, l)];
  });
  const runner = s('circle', { cx: pos[0][0], cy: pos[0][1], r: 6, class: 'f-run' });
  const GX = 392, GY = 56, GW = 36, GH = 190;
  const gauge = s('rect', { x: GX, y: GY, width: GW, height: GH, rx: 6, class: 'f-outline' });
  const fill = s('rect', { x: GX + 2, y: GY + 2, width: GW - 4, height: GH - 4, rx: 4, class: 'f-bottom', style: { fill: C.ops } });
  const needY = GY + GH * (1 - PUSH.cover / PUSH.cap);
  const need = s('line', { x1: GX - 6, x2: GX + GW + 6, y1: needY, y2: needY, class: 'f-need' });
  const needT = txt(GX - 10, needY - 5, `needs ${PUSH.cover} weeks`, 'f-tick'); needT.setAttribute('text-anchor', 'end');
  const gl = txt(GX + GW / 2, GY + GH + 20, 'Warehouse', 'f-small');
  const lapT = P.quarters.map((q) => txt(GX + GW / 2, GY - 12, q.hit ? `Rescue +${int(q.push)}` : `+${int(q.push)}: full`, `f-num ${q.hit ? 'f-olive' : 'f-badt'}`));
  const lapN = P.quarters.map((q) => txt(cx, cy + 5, q.hit ? `Lap ${q.q}` : 'No room left', `f-lap ${q.hit ? '' : 'f-badt'}`));
  g.append(ring, ...marks, runner, gauge, fill, need, needT, gl, ...lapT, ...lapN);
  hide(lapT, lapN);
  return { g, run(A) {
    const LAP = 2200, T = n * LAP + 900, off = (ms) => Math.min(1, ms / T);
    const lastMiss = !P.quarters[n - 1].hit;
    // the runner circles the loop once per quarter; in the last quarter it stalls at the rescue
    const rf = [];
    P.quarters.forEach((q, l) => {
      const count = q.hit ? 6 : 3;
      for (let i = 0; i < count; i++) rf.push({ transform: tr(pos[i % 5][0] - pos[0][0], pos[i % 5][1] - pos[0][1]), offset: off(l * LAP + (i / 5) * (LAP - 200)) });
    });
    rf[rf.length - 1].offset = Math.max(rf[rf.length - 1].offset, off(n * LAP));
    rf.push({ transform: rf[rf.length - 1].transform, offset: 1 });          // hold the last position to the end
    A(runner, rf, { duration: T, easing: 'linear' });
    // the warehouse fills a step each lap
    const start = PUSH.cover / PUSH.cap, ff = [{ transform: `scaleY(${start})`, offset: 0 }];
    P.quarters.forEach((q, l) => {
      const prev = l ? Math.min(1, P.quarters[l - 1].cover / PUSH.cap) : start, now = Math.min(1, q.cover / PUSH.cap), t0 = l * LAP + LAP * 0.5;
      ff.push({ transform: `scaleY(${prev})`, offset: off(t0) }, { transform: `scaleY(${now})`, offset: off(t0 + 800) });
    });
    ff.push({ transform: ff[ff.length - 1].transform, offset: 1 });
    A(fill, ff, { duration: T, easing: 'linear' });
    P.quarters.forEach((q, l) => {
      const d0 = l * LAP;
      A(lapN[l], [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.85 }, { opacity: l === n - 1 && lastMiss ? 1 : 0 }], { delay: d0 + 100, duration: LAP - 100 });
      A(lapT[l], [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.85 }, { opacity: l === n - 1 && lastMiss ? 1 : 0 }], { delay: d0 + LAP * 0.4, duration: LAP * 0.6 });
    });
    if (lastMiss) {
      A(ring, [{ stroke: 'var(--line-2)' }, { stroke: 'var(--bad)' }], { delay: (n - 1) * LAP + 1300, duration: 700 });
      A(gauge, [{ stroke: 'var(--ink-2)' }, { stroke: 'var(--bad)' }], { delay: (n - 1) * LAP + 1500, duration: 600 });
    }
  } };
}

// ---------------------------------------------------------------- the film itself
const captions = (P) => {
  const q1 = P.quarters[0], last = P.quarters[P.quarters.length - 1], hits = P.quarters.filter((q) => q.hit).length, ov = pc(overlapOf(MARKETING_MIX, SALES_MIX));
  const short = int(P.plan - (last.shipments - P.baseQ));
  return [
    `Marketing pays for some products and sales sells others, so only ${ov} of their effort is in common and the baton drops. Operations is tied to the number. It is not cheating. It is the only one left who can carry it over the line.`,
    `Demand added ${int(P.created)} cases. Operations shipped in ${int(q1.push)} more. That counts as sales, but it lands in the distributor’s warehouse, not with accounts, who keep buying at the same pace.`,
    `The number was +${int(P.plan)} cases: ${int(P.created)} from demand and ${int(q1.push)} pushed in. ${hits} of ${P.quarters.length} quarters hit it, while accounts bought only +${int(P.created)} each time. In quarter ${last.q} the warehouse was full, so the push could not close the gap, and the number was missed by ${short}.`,
    'Every department has a scorecard, and all of them are green. Nobody’s job is creating demand. HQ applauds whoever hits the number, and Operations is the one holding it.',
    `The organization learned that the rescue works, so it relies on it: ${P.quarters.slice(0, 3).map((q) => int(q.push)).join(', ')} cases, each lap bigger, until the warehouse is full. Operations is not the problem. A system that rewards the number and not the demand is.`,
  ];
};

export function pushFilm(P) {
  const builders = [act1(P), act2(P), act3(P), act4(P), act5(P)];
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'film-svg', role: 'img', 'aria-label': 'An animation in five acts: the handoff, the reservoir, two scoreboards, the empty chair, and the loop.' });
  const groups = builders.map((b, i) => { b.g.setAttribute('class', `film-act a${i + 1}`); b.g.style.display = 'none'; svg.append(b.g); return b.g; });
  const caps = captions(P), cap = h('p', { class: 'film-cap', 'aria-live': 'polite' });
  const chips = ACT_TITLES.map((t, i) => h('button', { type: 'button', class: 'film-chip', onClick: () => { touched = true; playing = true; go(i); } }, h('i', null, String(i + 1)), h('span', null, t)));
  const playBtn = h('button', { type: 'button', class: 'btn small', onClick: () => toggle() }, 'Pause');
  const legend = h('div', { class: 'film-key' }, [['Marketing', C.mkt], ['Sales', C.sales], ['Operations', C.ops], ['Finance', C.fin], ['HQ', C.gold]].map(([n, c]) => h('span', null, h('i', { style: { background: c } }), n)));
  const node = h('div', { class: 'film' }, h('div', { class: 'film-stage' }, svg), legend, cap,
    h('div', { class: 'film-bar' }, playBtn, h('div', { class: 'film-chips' }, chips)));

  groups[0].style.display = ''; cap.textContent = caps[0]; chips[0].setAttribute('aria-pressed', 'true');
  let cur = -1, anims = [], playing = false, ended = false, tick = 0, touched = false;
  const A = (el, frames, o = {}) => { const a = el.animate(frames, { duration: 600, fill: 'both', easing: 'ease', ...o }); a.playbackRate = RATE[cur] || 1; anims.push(a); return a; };
  const label = () => { playBtn.textContent = playing ? 'Pause' : ended ? 'Replay' : 'Play'; };

  function go(i) {
    tick++; const mine = tick;
    anims.forEach((a) => a.cancel()); anims = []; ended = false;
    cur = i;
    groups.forEach((g, j) => { g.style.display = j === i ? '' : 'none'; });
    chips.forEach((c, j) => c.setAttribute('aria-pressed', String(j === i)));
    cap.textContent = caps[i];
    builders[i].run(A);
    if (reduced()) { anims.forEach((a) => a.finish()); playing = false; label(); return; }
    // the act's own clock: when it ends, the next act begins, if the film is playing
    const clock = svg.animate([{ opacity: 1 }, { opacity: 1 }], { duration: ACT_MS[i] }); clock.playbackRate = RATE[i] || 1; anims.push(clock);
    clock.onfinish = () => {
      if (mine !== tick) return;
      if (i < ACT_TITLES.length - 1) { if (playing) go(i + 1); } else { playing = false; ended = true; label(); }
    };
    if (!playing) anims.forEach((a) => a.pause());
    label();
  }
  function toggle() {
    touched = true;
    if (ended) { playing = true; go(0); return; }
    playing = !playing; anims.forEach((a) => (playing ? a.play() : a.pause())); label();
  }
  return { node, start() { if (touched) return; playing = !reduced(); go(0); }, stop() { tick++; anims.forEach((a) => a.cancel()); anims = []; } };
}
