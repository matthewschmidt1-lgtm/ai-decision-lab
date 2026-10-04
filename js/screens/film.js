// The year-end push, as a film in five acts. The viewer watches; nothing needs clicking.
//   1 The handoff       Marketing and sales run in different lanes and the baton drops. HQ's number stands, so Operations is asked to cover it.
//   2 The reservoir     Demand drips in. Operations floods the rest into the distributor's warehouse in the last week, and Finance books it as revenue.
//   3 Two scoreboards   The number is hit. Accounts bought far less. The warehouse went from the 3 weeks it needs to nearly the 6 it can hold.
//   4 The empty chair   Every department has a scorecard. Nobody's scorecard measures demand. HQ applauds the one who hit the number.
//   5 The loop          Next year's plan is built on this year's reported number. The push it would need is far bigger than the warehouse can hold.
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
const ACT_MS = [11000, 10000, 9600, 9800, 11500];
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
  const g = s('g'), y1 = P.years[0];
  g.append(...[90, 150, 230].map((y) => s('line', { x1: 20, x2: 424, y1: y, y2: y, class: 'f-lane' })));
  const finish = s('line', { x1: 424, x2: 424, y1: 62, y2: 258, class: 'f-finish' });
  const fl = flag(444, 44), hq = txt(438, 36, `HQ’s number: +${int(P.plan)}`, 'f-lane-t'); hq.setAttribute('text-anchor', 'end');
  const M = token('M', C.mkt, 44, 90, 15, 'Marketing'), Sa = token('S', C.sales, 214, 150, 15, 'Sales'), O = token('O', C.ops, 330, 230, 15, 'Operations');
  const baton = s('rect', { x: 50, y: 85, width: 28, height: 9, rx: 4.5, class: 'f-baton f-center' });
  const box = s('g', { class: 'f-move' }, s('rect', { x: 266, y: 214, width: 46, height: 28, rx: 5, class: 'f-box' }), txt(289, 233, `+${int(y1.push)}`, 'f-boxt'));
  const q1 = txt(232, 64, '?', 'f-q'), q2 = txt(178, 160, '?', 'f-q');
  const ask = s('g', null, s('rect', { x: 250, y: 174, width: 160, height: 24, rx: 12, class: 'f-ask' }), txt(330, 190, 'Asked to cover the gap', 'f-lane-t'));
  const dots = Array.from({ length: 10 }, (_, i) => s('circle', { cx: 424, cy: 150, r: 3.5, class: 'f-conf', style: { fill: [C.gold, C.ops, C.mkt, C.sales][i % 4] } }));
  const lanes = [txt(22, 62, 'Marketing funds A, B by plan', 'f-lane-t'), txt(232, 172, 'Sales sells C, D to accounts', 'f-lane-t')];
  lanes.forEach((l) => l.setAttribute('text-anchor', 'start'));
  g.append(finish, fl.g, hq, ...lanes, M.g, Sa.g, baton, box, O.g, ask, q1, q2, ...dots);
  hide(q1, q2, dots, ask);
  return { g, run(A) {
    A(M.move, [{ transform: tr(0) }, { transform: tr(150) }], { duration: 2200, easing: 'ease-in-out' });
    // the baton goes with Marketing, then falls between the lanes (one animation, so nothing overrides it)
    A(baton, [{ transform: 'translate(0px,0px) rotate(0deg)', offset: 0 }, { transform: 'translate(150px,0px) rotate(0deg)', offset: 0.629 },
      { transform: 'translate(168px,-26px) rotate(70deg)', offset: 0.77 }, { transform: 'translate(180px,28px) rotate(170deg)', offset: 0.93 }, { transform: 'translate(176px,38px) rotate(215deg)', offset: 1 }], { duration: 3500, easing: 'ease-in-out' });
    // the question marks appear, then fade with the two who gave up
    [q1, q2].forEach((q, i) => A(q, [{ opacity: 0, offset: 0 }, { opacity: 0, offset: (3700 + i * 200) / 5200 }, { opacity: 1, offset: (4100 + i * 200) / 5200 }, { opacity: 1, offset: 4600 / 5200 }, { opacity: 0.35, offset: 1 }], { duration: 5200, easing: 'linear' }));
    [M.g, Sa.g].forEach((e) => A(e, [{ opacity: 1, offset: 0 }, { opacity: 1, offset: 4600 / 5200 }, { opacity: 0.35, offset: 1 }], { duration: 5200, easing: 'linear' }));
    // HQ's number stands, so Operations is asked to cover the gap, and then does
    A(ask, [{ opacity: 0, offset: 0 }, { opacity: 0, offset: 0.1 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.72 }, { opacity: 0, offset: 0.82 }, { opacity: 0, offset: 1 }], { delay: 4800, duration: 3200, easing: 'linear' });
    A(O.move, [{ transform: tr(0) }, { transform: tr(112) }], { delay: 6200, duration: 2400, easing: 'ease-in-out' });
    A(box, [{ transform: tr(0) }, { transform: tr(112) }], { delay: 6200, duration: 2400, easing: 'ease-in-out' });
    A(finish, [{ strokeWidth: '4px' }, { strokeWidth: '12px', offset: 0.4 }, { strokeWidth: '4px' }], { delay: 7700, duration: 900 });
    A(fl.wave, waveFrames, { delay: 8000, duration: 1800 });
    dots.forEach((d, i) => { const a = (i / dots.length) * Math.PI * 2, r = 34 + (i % 3) * 14; A(d, [{ opacity: 1, transform: tr(0) }, { opacity: 0, transform: tr(Math.cos(a) * r, Math.sin(a) * r + 14) }], { delay: 7900, duration: 1200, easing: 'ease-out' }); });
  } };
}

// ---------------------------------------------------------------- 2. The reservoir
function act2(P) {
  const g = s('g'), q1 = P.years[0], plan = P.plan;
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
  const fullT = txt(TX + TW + 8, TY + 4, `holds ${PUSH.cap}`, 'f-tick'); fullT.setAttribute('text-anchor', 'start');
  const fin = token('F', C.fin, 112, 289, 10), finT = txt(128, 293, 'books it as revenue', 'f-lane-t'); finT.setAttribute('text-anchor', 'start');
  const O = token('O', C.ops, 375, 36);
  const oLab = txt(334, 40, 'Operations', 'f-small'); oLab.setAttribute('text-anchor', 'end');
  const pipe = s('line', { x1: 375, x2: 375, y1: 54, y2: TY + TH - hNow + 6, class: 'f-pipe' });
  const link = s('path', { d: 'M 368 112 C 300 112 262 128 214 128', class: 'f-link' });
  const store = s('g', { transform: 'translate(452 226)' }, s('rect', { x: -14, y: -6, width: 28, height: 22, class: 'f-store' }), s('polygon', { points: '-17,-6 0,-20 17,-6', class: 'f-roof' }));
  const stream = s('line', { x1: TX + TW, x2: 438, y1: 242, y2: 242, class: 'f-stream' });
  const n1 = txt(BX + BW + 38, 240, `+${int(P.created)} cases`, 'f-num'), n2 = txt(292, 104, `+${int(q1.push)} cases`, 'f-num f-olive');
  const hit = txt(BX - 14, BY - 6, '✓ number hit', 'f-good'); hit.setAttribute('text-anchor', 'end');
  const labs = [txt(BX + BW / 2 + 12, 272, 'What we report', 'f-small'), txt(TX + TW / 2, 272, 'Distributor’s warehouse', 'f-small'), txt(452, 258, 'Accounts', 'f-small')];
  const needT = txt(TX - 8, TY + TH - hStart - 5, `needs ${PUSH.cover} weeks`, 'f-tick'); needT.setAttribute('text-anchor', 'end');
  g.append(bucket, demandFill, pushFill, target, targetT, tank, stock, need, needT, fullT, fin.g, finT, tapM, tapS, dripM, dripS, pipe, link, O.g, oLab, store, stream, n1, n2, hit, ...labs);
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
  const g = s('g'), y1 = P.years[0], plan = P.plan, k = 0.34, base = 232;
  const rep = y1.shipments - P.baseY, acc = P.created;
  const tl = txt(228, base - plan * k - 5, `The number: +${int(plan)}`, 'f-lane-t'); tl.setAttribute('text-anchor', 'end');
  g.append(s('line', { x1: 40, x2: 232, y1: base, y2: base, class: 'f-zero' }), s('line', { x1: 40, x2: 232, y1: base - plan * k, y2: base - plan * k, class: 'f-target' }), tl);
  g.append(s('g', null, s('rect', { x: 40, y: 10, width: 11, height: 11, rx: 2, style: { fill: 'var(--s-current)' } }), s('text', { x: 57, y: 20, class: 'f-small f-left' }, 'What we reported'),
    s('rect', { x: 40, y: 30, width: 11, height: 11, rx: 2, style: { fill: 'var(--s-actual)' } }), s('text', { x: 57, y: 40, class: 'f-small f-left' }, 'What accounts bought')));
  const rb = s('rect', { x: 64, y: base - rep * k, width: 60, height: rep * k, rx: 3, class: 'f-bottom', style: { fill: 'var(--s-current)' } });
  const ab = s('rect', { x: 140, y: base - acc * k, width: 60, height: acc * k, rx: 3, class: 'f-bottom', style: { fill: 'var(--s-actual)' } });
  const rl = txt(94, base - rep * k - 8, `+${int(rep)}`, 'f-num'), al = txt(170, base - acc * k - 8, `+${int(acc)}`, 'f-num');
  const mark = txt(94, base - rep * k - 30, '✓', 'f-mark f-good f-center');
  const cases = txt(136, 254, 'extra cases against last year', 'f-tick');
  // the warehouse, before and after
  const TX = 308, TY = 64, TW = 72, TH = 170;
  const tank = s('rect', { x: TX, y: TY, width: TW, height: TH, rx: 6, class: 'f-outline' });
  const hAfter = TH * (y1.cover / PUSH.cap), hBefore = TH * (PUSH.cover / PUSH.cap);
  const fill = s('rect', { x: TX + 2, y: TY + TH - hAfter, width: TW - 4, height: hAfter, class: 'f-bottom', style: { fill: C.ops } });
  const needY = TY + TH - hBefore;
  const need = s('line', { x1: TX - 6, x2: TX + TW + 6, y1: needY, y2: needY, class: 'f-need' }), needT = txt(TX + TW + 10, needY + 4, `needs ${PUSH.cover}`, 'f-tick');
  const fullT = txt(TX + TW + 10, TY + 4, `holds ${PUSH.cap}`, 'f-tick');
  [needT, fullT].forEach((t) => t.setAttribute('text-anchor', 'start'));
  const wk = txt(TX + TW / 2, TY - 10, `${y1.cover.toFixed(1)} weeks`, 'f-num f-olive');
  const wl = txt(TX + TW / 2, 256, 'Distributor’s warehouse', 'f-small');
  g.append(rb, ab, rl, al, mark, cases, tank, fill, need, needT, fullT, wk, wl);
  hide(rb, ab, rl, al, mark, wk);
  return { g, run(A) {
    A(ab, [{ opacity: 1, transform: 'scaleY(0)' }, { opacity: 1, transform: 'scaleY(1)' }], { delay: 500, duration: 800 });
    A(al, [{ opacity: 0 }, { opacity: 1 }], { delay: 1200, duration: 400 });
    A(rb, [{ opacity: 1, transform: 'scaleY(0)' }, { opacity: 1, transform: 'scaleY(1)' }], { delay: 1900, duration: 1200 });
    A(rl, [{ opacity: 0 }, { opacity: 1 }], { delay: 2900, duration: 400 });
    A(mark, [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1.25)', offset: 0.6 }, { opacity: 1, transform: 'scale(1)' }], { delay: 3400, duration: 600 });
    A(fill, [{ transform: `scaleY(${hBefore / hAfter})`, opacity: 0.6 }, { transform: 'scaleY(1)', opacity: 0.9 }], { delay: 4300, duration: 2400, easing: 'ease-out' });
    A(wk, [{ opacity: 0 }, { opacity: 1 }], { delay: 6600, duration: 500 });
  } };
}

// ---------------------------------------------------------------- 4. The empty chair
function act4(P) {
  const g = s('g'), push = P.years[0].push;
  const table = s('ellipse', { cx: 240, cy: 166, rx: 128, ry: 52, class: 'f-table' });
  const seats = [['M', C.mkt, 126, 122, 'Marketing'], ['S', C.sales, 354, 122, 'Sales'], ['F', C.fin, 126, 214, 'Finance'], ['O', C.ops, 354, 214, 'Operations']].map(([l, c, x, y, nm]) => {
    const inner = s('g', { class: 'f-move' }, s('rect', { width: 28, height: 22, rx: 4, class: 'f-card' }), s('text', { x: 14, y: 17, class: 'f-mark f-good', 'text-anchor': 'middle' }, '✓'));
    return { t: token(l, c, x, y, 15, nm), card: s('g', { transform: `translate(${x < 240 ? x - 74 : x + 46} ${y - 12})` }, inner), inner };
  });
  const chairCircle = s('circle', { r: 20, class: 'f-chair f-center' });
  const chair = s('g', { transform: 'translate(240 256)' }, chairCircle, s('text', { y: 8, class: 'f-q2', 'text-anchor': 'middle' }, '?'));
  const chairLab = txt(240, 292, 'Creating demand: on nobody’s scorecard', 'f-small');
  const fl = flag(240, 12);
  const box = s('g', { transform: 'translate(354 214)' }, s('g', { class: 'f-move' }, s('rect', { x: -21, y: -40, width: 42, height: 28, rx: 5, class: 'f-box' }), txt(0, -21, `+${int(push)}`, 'f-boxt')));
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
  const g = s('g'), cx = 160, cy = 150, R = 90, steps = ['Plan', 'Gap', 'Rescue', 'Applause', 'Repeat'], y1 = P.years[0], y2 = P.years[1];
  const ring = s('circle', { cx, cy, r: R, class: 'f-ring' });
  const pos = steps.map((_, i) => { const a = (-90 + i * 72) * Math.PI / 180; return [cx + R * Math.cos(a), cy + R * Math.sin(a), a]; });
  const marks = steps.flatMap((l, i) => {
    const [x, y, a] = pos[i];
    return [s('circle', { cx: x, cy: y, r: 9, class: 'f-step', style: { fill: [C.ink, C.bad, C.ops, C.gold, C.ink][i] } }),
      s('text', { x: x + Math.cos(a) * 24, y: y + Math.sin(a) * 24 + 5, class: 'f-small', 'text-anchor': Math.cos(a) > 0.3 ? 'start' : Math.cos(a) < -0.3 ? 'end' : 'middle' }, l)];
  });
  const runner = s('circle', { cx: pos[0][0], cy: pos[0][1], r: 6, class: 'f-run' });
  const GX = 392, GY = 64, GW = 40, GH = 172;
  const gauge = s('rect', { x: GX, y: GY, width: GW, height: GH, rx: 6, class: 'f-outline' });
  const fill = s('rect', { x: GX + 2, y: GY + 2, width: GW - 4, height: GH - 4, rx: 4, class: 'f-bottom', style: { fill: C.ops } });
  const needY = GY + GH * (1 - PUSH.cover / PUSH.cap);
  const need = s('line', { x1: GX - 6, x2: GX + GW + 6, y1: needY, y2: needY, class: 'f-need' });
  const needT = txt(GX - 10, needY + 4, `needs ${PUSH.cover}`, 'f-tick'); needT.setAttribute('text-anchor', 'end');
  const gl = txt(GX + GW / 2 - 10, GY + GH + 20, 'Warehouse', 'f-small');
  const t1 = txt(GX + GW, GY - 28, `This year: +${int(y1.push)}`, 'f-num f-olive'), t2a = txt(GX + GW + 8, GY - 30, `Next year needs +${int(y2.needed)}`, 'f-num f-badt'), t2b = txt(GX + GW + 8, GY - 12, `The warehouse has room for ${int(y2.room)}`, 'f-small');
  [t1, t2a, t2b].forEach((t) => t.setAttribute('text-anchor', 'end'));
  const c1 = txt(cx, cy - 2, 'This year', 'f-lap'), c2 = txt(cx, cy - 8, 'Next year', 'f-lap f-badt'), c3 = txt(cx, cy + 16, 'No room left', 'f-lap f-badt');
  g.append(ring, ...marks, runner, gauge, fill, need, needT, gl, t1, t2a, t2b, c1, c2, c3);
  hide(t1, t2a, t2b, c1, c2, c3);
  return { g, run(A) {
    const LAP = 3800, T = 2 * LAP + 1600, off = (ms) => Math.min(1, ms / T);
    // lap one: the runner goes all the way round. lap two: it reaches the rescue and stalls.
    const rf = [];
    for (let i = 0; i <= 5; i++) rf.push({ transform: tr(pos[i % 5][0] - pos[0][0], pos[i % 5][1] - pos[0][1]), offset: off(300 + (i / 5) * (LAP - 600)) });
    for (let i = 0; i <= 2; i++) rf.push({ transform: tr(pos[i][0] - pos[0][0], pos[i][1] - pos[0][1]), offset: off(LAP + 300 + (i / 5) * (LAP - 600)) });
    rf.push({ transform: rf[rf.length - 1].transform, offset: 1 });
    rf.unshift({ transform: tr(0), offset: 0 });
    A(runner, rf, { duration: T, easing: 'linear' });
    const start = PUSH.cover / PUSH.cap, a1 = Math.min(1, y1.cover / PUSH.cap);
    A(fill, [{ transform: `scaleY(${start})`, offset: 0 }, { transform: `scaleY(${start})`, offset: off(LAP * 0.45) }, { transform: `scaleY(${a1})`, offset: off(LAP * 0.45 + 1200) }, { transform: `scaleY(${a1})`, offset: 1 }], { duration: T, easing: 'linear' });
    A(c1, [{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1, offset: 0.9 }, { opacity: 0 }], { delay: 200, duration: LAP - 200 });
    A(t1, [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }], { delay: LAP * 0.5, duration: LAP * 0.55 });
    A(c2, [{ opacity: 0 }, { opacity: 1 }], { delay: LAP + 300, duration: 500 });
    A(t2a, [{ opacity: 0 }, { opacity: 1 }], { delay: LAP + 1400, duration: 600 });
    A(t2b, [{ opacity: 0 }, { opacity: 1 }], { delay: LAP + 1900, duration: 600 });
    A(c3, [{ opacity: 0 }, { opacity: 1 }], { delay: LAP + 2600, duration: 600 });
    A(ring, [{ stroke: 'var(--line-2)' }, { stroke: 'var(--bad)' }], { delay: LAP + 2400, duration: 700 });
    A(gauge, [{ stroke: 'var(--ink-2)' }, { stroke: 'var(--bad)' }], { delay: LAP + 2600, duration: 600 });
  } };
}

// ---------------------------------------------------------------- the film itself
const captions = (P) => {
  const y1 = P.years[0], y2 = P.years[1], ov = pc(overlapOf(MARKETING_MIX, SALES_MIX));
  return [
    `Marketing funds A and B by plan. Sales sells C and D, where accounts buy. Only ${ov} of their effort overlaps, so the baton drops. HQ’s number still stands, and Operations is asked to cover it. That is not cheating. It is the one function left that can ship.`,
    `Demand added ${int(P.created)} cases over the year. Operations shipped in ${int(y1.push)} more in the last week. Finance books it as revenue and Sales counts it as sold, but it lands in the distributor’s warehouse. Accounts keep buying at the same pace.`,
    `The number was +${int(P.plan)} cases: ${int(P.created)} from demand and ${int(y1.push)} pushed in. The number was hit, and accounts bought only +${int(P.created)}. The warehouse went from the ${PUSH.cover} weeks of stock it needs to ${y1.cover.toFixed(1)}, close to the ${PUSH.cap} it can hold.`,
    'Every department has a scorecard, and all of them are green. Nobody’s scorecard measures demand. HQ applauds whoever hits the number, and Operations is the one holding it.',
    `The organization learned that the rescue works, so next year’s plan is built on this year’s reported number. It would need a push of ${int(y2.needed)} cases, and the warehouse has room for ${int(y2.room)}. Operations is not the problem. A system that rewards the number and not the demand is.`,
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
  const so = h('p', { class: 'film-so' }, 'What would change it: put what accounts actually buy next to the shipments number, and give someone the job of creating demand. That is the shared measure on the last screen.');
  so.hidden = true;
  const note = h('p', { class: 'micro' }, 'Illustrative: the product mix, the 8% plan, 3 weeks of healthy stock and a 6-week limit are assumptions, and real causes of a mismatch vary (distributor priorities, promotions, supply). Not shown: freight and overtime for the year-end load, whether the distributor accepted it, and what comes after (returns, credits, discounts).');
  const node = h('div', { class: 'film' }, h('div', { class: 'film-stage' }, svg), legend, cap, so,
    h('div', { class: 'film-bar' }, playBtn, h('div', { class: 'film-chips' }, chips)), note);

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
    cap.textContent = caps[i]; so.hidden = true; legend.style.visibility = i === 2 ? 'hidden' : '';
    builders[i].run(A);
    if (reduced()) { anims.forEach((a) => a.finish()); playing = false; so.hidden = i !== ACT_TITLES.length - 1; label(); return; }
    // the act's own clock: when it ends, the next act begins, if the film is playing
    const clock = svg.animate([{ opacity: 1 }, { opacity: 1 }], { duration: ACT_MS[i] }); clock.playbackRate = RATE[i] || 1; anims.push(clock);
    clock.onfinish = () => {
      if (mine !== tick) return;
      if (i < ACT_TITLES.length - 1) { if (playing) go(i + 1); } else { playing = false; ended = true; so.hidden = false; label(); }
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
