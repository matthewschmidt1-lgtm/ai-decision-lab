// Experience 1: Find the opportunity.
// Business problem -> decision -> AI opportunity. AI is a discovery here, not the starting point.

import { h, choices, stat, note, mount, int, money, signed, table, disclose, waterfall, roundParts, seg } from '../ui.js';
import { VERDICTS, VERDICT, testBeliefs } from '../beliefs.js';
import { lineChart } from '../charts.js';
import { WEEKS, WINDOW, decompose, windowStats, stockoutLoss, shipmentGap, weekLabel, inventoryEstimate, yoyNoise, REVENUE_PER_CASE,
         MARGIN_PER_CASE, CARRY_PER_CASE, COMPETITOR_WEEK, CHAIN_CUT_WEEK, PRICE_WEEK, CATEGORY_GROWTH } from '../data.js';
import { trainModel, evaluate, ALL_GROUPS } from '../forecast.js';
import { SCOPES } from '../value.js';
import { head, actions, ticksFor } from './common.js';

const D = decompose();
const WS = windowStats();
const LOSS = stockoutLoss();
const EV = evaluate(trainModel(ALL_GROUPS));
const DECISIONS = SCOPES.full.decisions;

const ma3 = (arr) => arr.map((_, i) => { const a = arr.slice(Math.max(0, i - 1), i + 2); return a.reduce((x, y) => x + y, 0) / a.length; });
const slice = (key, from, to) => WEEKS.slice(from, to + 1).map((w) => w[key]);
const pc = (v, d = 0) => `${(v * 100).toFixed(d)}%`;
const abs1 = (v) => Math.abs(v).toFixed(1);

// ---------------------------------------------------------------- 1. The situation
const situation = {
  id: 'e1-situation', exp: 1, adopt: 'value', title: 'The situation',
  render(ctx) {
    const from = 130, to = 155;
    const now = ma3(slice('ship', from - 2, to)).slice(2);
    const then = ma3(slice('ship', from - 54, to - 52)).slice(2);
    const chart = lineChart({
      n: now.length, height: 270, yMin: 2800, yFmt: (v) => int(v), direct: true,
      series: [
        { name: 'Last year', short: 'Last year', values: then, color: 'var(--s-current)', dash: '5 5', width: 2 },
        { name: 'This year', short: 'This year', values: now, color: 'var(--s-actual)', width: 2.5 },
      ],
      fills: [{ a: 0, b: 1, posClass: 'loss', negClass: 'gain' }],
      ticks: ticksFor(from, to, 6).filter((_, i) => i % 2 === 0),
      xLabel: (i) => `Week of ${weekLabel(from + i)}`,
      tipFmt: (v) => `${int(v)} cases`,
      spans: [{ from: WINDOW[0] - from, to: WINDOW[1] - from, text: 'Last 13 weeks' }],
      desc: 'Weekly shipments to Texas distributors, this year against last year. The last 13 weeks run below last year, and the gap is shaded.',
    });
    return h('div', { class: 'screen stack-l' },
      h('div', { class: 'stack' },
        ...head({ lens: 'biz', exp: 1, stage: 'Signal', title: 'Ridgeline Bourbon is down 8% in Texas.' }),
        h('p', { class: 'lede' }, 'Texas is your second-largest market. Shipments to distributors over the last 13 weeks are ',
          h('strong', null, `${int(D.sThen - D.sNow)} cases`), ' below the same weeks a year ago, about ',
          h('strong', null, money((D.sThen - D.sNow) * REVENUE_PER_CASE)), ' of revenue in one quarter.')),
      h('div', { class: 'stack-s' },
        h('div', { class: 'micro' }, 'Weekly shipments to distributors, 3-week average · the shaded area is what is missing · hover for detail'),
        chart,
        h('div', { class: 'micro' }, `Weeks are noisy: if weeks were independent, a 13-week comparison would move by about ±${yoyNoise().toFixed(0)} points by chance alone.`)),
      h('div', { class: 'stack' },
        h('p', { class: 'prose' }, 'The Monday review is close and the picture is incomplete. You have time to get ',
          h('strong', null, 'three'), ' questions answered. Choose the ones that would change what you do.'),
        actions(ctx, { label: 'Start investigating' })));
  },
};

// ---------------------------------------------------------------- 2. Investigate
const INV_STOCK = inventoryEstimate();
const stockPeak = Math.max(...INV_STOCK.slice(100, 140));
const stockNow = INV_STOCK[155];
const stockBefore = INV_STOCK[100];

const INVESTIGATIONS = [
  {
    id: 'category', q: 'Is the whole category down?', sub: 'Texas bourbon category, last 13 weeks',
    nb: `The category is flat (${signed(CATEGORY_GROWTH, 1)}%), so this is about Ridgeline, not about bourbon.`,
    build: () => ({
      says: 'The category is flat. This is about Ridgeline, not about bourbon.',
      body: h('div', { class: 'stats' },
        stat('Texas bourbon category', `${signed(CATEGORY_GROWTH, 1)}%`, 'last 13 weeks vs. a year ago'),
        stat('Ridgeline shipments', `${signed(D.pct, 1)}%`, 'the same comparison', 'bad')),
      gap: 'It does not tell you which part of Ridgeline moved, or whether shoppers or distributors drove it.',
    }),
  },
  {
    id: 'pull', q: 'Are shoppers actually buying less?', sub: 'Depletions: cases retailers sold through',
    nb: `Shipments fell ${abs1(D.pct)}%, but shopper pull-through fell only ${abs1(D.depPct)}%.`,
    build: () => {
      const from = 130, to = 155;
      const dep = ma3(slice('dep', from - 2, to)).slice(2), ship = ma3(slice('ship', from - 2, to)).slice(2);
      const share = (D.pct - D.depPct) / D.pct;
      const gaps = ship.map((v, i) => v - dep[i]);
      const inner = gaps.map((g, i) => [g, i]).filter(([, i]) => i >= 4 && i <= gaps.length - 5);
      const iUp = inner.reduce((a, b) => (b[0] > a[0] ? b : a))[1], iDown = inner.reduce((a, b) => (b[0] < a[0] ? b : a))[1];
      return {
        says: `Shoppers bought about ${Math.abs(D.depPct).toFixed(0)}% less. Distributors bought ${Math.abs(D.pct).toFixed(0)}% less.`,
        body: lineChart({
          n: dep.length, height: 270, yMin: 3000, yFmt: (v) => int(v), direct: true,
          series: [
            { name: 'Shipments: what distributors bought', short: 'Shipments', values: ship, color: 'var(--s-current)', dash: '5 5', width: 2 },
            { name: 'Depletions: what shoppers bought', short: 'Shoppers', values: dep, color: 'var(--s-actual)', width: 2.5 },
          ],
          fills: [{ a: 0, b: 1, posClass: 'up', negClass: 'down' }],
          labels: [
            { i: iUp, v: (ship[iUp] + dep[iUp]) / 2 + 30, text: 'Stocking up', cls: 'up' },
            { i: iDown, v: (ship[iDown] + dep[iDown]) / 2 - 40, text: 'Running stock down' },
          ],
          ticks: ticksFor(from, to, 6).filter((_, i) => i % 2 === 0), xLabel: (i) => `Week of ${weekLabel(from + i)}`, tipFmt: (v) => `${int(v)} cases`,
          spans: [{ from: WINDOW[0] - from, to: WINDOW[1] - from, text: 'Last 13 weeks' }],
          desc: 'Weekly shipments and shopper purchases over the last 26 weeks. Where distributors bought more than shoppers the gap is shaded blue; where less, grey.',
        }),
        gap: `About ${Math.round(share * 100)}% of the drop sits between shoppers and distributors. Blue is stock they were building; grey is stock they were running down. What explains it?`,
      };
    },
  },
  {
    id: 'supply', q: 'How much stock are distributors holding?', sub: 'Estimated weeks of sales on their shelves',
    nb: `Distributors built up about ${(stockPeak - stockBefore).toFixed(1)} extra weeks of stock around the price increase and have been working it down.`,
    build: () => {
      const from = 91, to = 155;
      return {
        says: 'Distributors stocked up before the price increase, and have been working it down since.',
        body: lineChart({
          n: to - from + 1, height: 240, yFmt: (v) => v.toFixed(1), yMin: 3.5,
          series: [{ name: 'Estimated stock, weeks of sales', values: INV_STOCK.slice(from, to + 1), color: 'var(--s-actual)', width: 2.5 }],
          ticks: ticksFor(from, to, 13), xLabel: (i) => `Week of ${weekLabel(from + i)}`, tipFmt: (v) => `${v.toFixed(1)} weeks`,
          markers: [{ i: PRICE_WEEK - from, text: 'Price increase' }],
          spans: [{ from: 125 - from, to: 129 - from }],
          labels: [{ i: 127 - from, v: INV_STOCK[127] + 0.25, text: 'Pre-buy', anchor: 'end' }],
          desc: 'Estimated distributor stock in weeks of sales. It rises before the April price increase and drifts down afterwards.',
        }),
        gap: `This is an estimate: what they bought minus what they sold, added up. Their own inventory reports would settle it, and getting those is the first thing to ask for. Stock is about ${(stockPeak - stockNow).toFixed(1)} weeks lower than the peak.`,
      };
    },
  },
  {
    id: 'promo', q: 'Are we promoting less?', sub: 'Share of stores on promotion',
    nb: `Promotion was up, not down: ${pc(WS.promoNow)} of stores vs ${pc(WS.promoThen)} a year ago.`,
    build: () => {
      const from = 130, to = 155;
      const now = slice('promo', from, to), then = slice('promo', from - 52, to - 52);
      return {
        says: 'We promoted more, not less. The summer promotions ran as one six-week stretch.',
        body: lineChart({
          n: now.length, height: 230, yMin: 0, yFmt: (v) => pc(v), direct: true,
          series: [
            { name: 'Last year', short: 'Last year', values: then, color: 'var(--s-current)', dash: '5 5', width: 2 },
            { name: 'This year', short: 'This year', values: now, color: 'var(--s-actual)', width: 2.5 },
          ],
          ticks: ticksFor(from, to, 6).filter((_, i) => i % 2 === 0), xLabel: (i) => `Week of ${weekLabel(from + i)}`, tipFmt: (v) => pc(v),
          desc: 'Share of Texas stores on promotion each week, this year against last year. This year has a six-week run in summer.',
        }),
        gap: 'More promotion with lower sales raises a question this data cannot answer: did the extra promotion pay back? It shows share of stores, not depth of discount or lift.',
      };
    },
  },
  {
    id: 'distribution', q: 'Are we in fewer stores?', sub: 'Retail distribution by week',
    nb: `Distribution fell ${((WS.distThen - WS.distNow) * 100).toFixed(0)} points after Chain X reset our range in week ${CHAIN_CUT_WEEK - 103} of this year.`,
    build: () => {
      const from = 104, to = 155;
      return {
        says: `We lost about ${((WS.distThen - WS.distNow) * 100).toFixed(0)} points of distribution when Chain X reset our range.`,
        body: lineChart({
          n: to - from + 1, height: 230, yMin: 0.6, yFmt: (v) => pc(v),
          series: [{ name: 'Stores that carry Ridgeline', values: slice('dist', from, to), color: 'var(--s-actual)', width: 2.5 }],
          ticks: ticksFor(from, to, 13), xLabel: (i) => `Week of ${weekLabel(from + i)}`, tipFmt: (v) => pc(v, 1),
          markers: [{ i: CHAIN_CUT_WEEK - from, text: 'Chain X resets our range' }],
          desc: 'Share of stores carrying Ridgeline over a year. It drops in week 140 when Chain X resets our range.',
        }),
        gap: 'It does not tell you how many cases that cost. Stores and sales do not move one for one: a store that keeps two of our items still sells some.',
      };
    },
  },
  {
    id: 'price', q: 'Did price or competition change?', sub: 'Shelf price and new launches',
    nb: `Price rose ${((WS.priceNow / WS.priceThen - 1) * 100).toFixed(1)}% in April and a premium rival, Harlan Reserve, launched eight weeks later.`,
    build: () => {
      const from = 104, to = 155;
      return {
        says: `We raised price ${((WS.priceNow / WS.priceThen - 1) * 100).toFixed(1)}% in April, and a premium rival launched eight weeks later.`,
        body: lineChart({
          n: to - from + 1, height: 230, yFmt: (v) => `${Math.round(v * 100)}`, yMin: 1.0,
          series: [{ name: 'Shelf price index, 3-week average', values: ma3(slice('price', from - 2, to)).slice(2), color: 'var(--s-actual)', width: 2.5 }],
          ticks: ticksFor(from, to, 13), xLabel: (i) => `Week of ${weekLabel(from + i)}`, tipFmt: (v) => `${(v * 100).toFixed(1)}`,
          markers: [{ i: PRICE_WEEK - from, text: 'Price increase' }, { i: COMPETITOR_WEEK - from, text: 'Harlan Reserve launches', dy: 18 }],
          desc: 'Shelf price index over a year, with a price increase at week 130 and a competitor launch at week 138.',
        }),
        gap: 'Two things happened close together. Data alone cannot say how much each one cost.',
      };
    },
  },
  {
    id: 'field', q: 'What is the field saying?', sub: 'Sales team and distributor conversations',
    nb: 'The field has four explanations. Each is partly right and none sees the whole picture.',
    build: () => ({
      says: 'Four people, four explanations. Each saw one corner of the market.',
      body: h('div', { class: 'quotes' },
        [['“Chain X dropped three of our items in the reset. That’s the story.”', 'Regional sales manager, Gulf Coast'],
         ['“Retailers keep asking me about Harlan Reserve.”', 'Key account lead, Austin'],
         ['“We’re managing cash this quarter. Ask me again in the fall.”', 'Buyer, Lone Star Beverage'],
         ['“Nothing about how we forecast has changed in three years.”', 'Demand planner, Dallas']]
          .map(([q, who]) => h('div', { class: 'quote' }, h('p', null, q), h('cite', null, who)))),
      gap: 'Stories are signals, not measurements. Notice who each person is closest to, and what each cannot see.',
    }),
  },
];
const INV = Object.fromEntries(INVESTIGATIONS.map((i) => [i.id, i]));
const MAX_PICKS = 3;

const investigate = {
  id: 'e1-investigate', exp: 1, adopt: 'value', title: 'Investigate',
  render(ctx) {
    const { state, save } = ctx;
    let view = state.picks[state.picks.length - 1] || null;
    const root = h('div', { class: 'screen stack-l' });

    const paint = () => {
      const left = MAX_PICKS - state.picks.length;
      const finding = view ? INV[view].build() : null;
      const list = h('div', { class: 'ask', role: 'list' }, INVESTIGATIONS.map((inv) => {
        const done = state.picks.includes(inv.id);
        const n = state.picks.indexOf(inv.id) + 1;
        return h('button', {
          class: 'ask-item', type: 'button', role: 'listitem', 'data-done': String(done), disabled: !done && left === 0,
          onClick: () => {
            if (!done) { state.picks.push(inv.id); save(); }
            view = inv.id; paint();
            requestAnimationFrame(() => root.querySelector('.finding')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
          },
        }, h('span', { class: 'ask-n' }, done ? n : ''), h('span', { class: 'ask-q' }, inv.q, h('span', { class: 'ask-sub' }, inv.sub)));
      }));

      const notebook = h('div', { class: 'notebook' },
        h('h3', null, 'What you know'),
        state.picks.length
          ? h('ol', null, state.picks.map((id) => h('li', null, INV[id].nb)))
          : h('p', { class: 'empty' }, 'Nothing yet. Pick a question.'));

      mount(root,
        h('div', { class: 'stack' },
          ...head({ lens: 'biz', exp: 1, stage: 'Signal', title: left ? 'What would you look at first?' : 'Three questions answered.', wide: true }),
          h('p', { class: 'prose' }, left
            ? `You can ask ${left === MAX_PICKS ? 'three' : left === 2 ? 'two more' : 'one more'}. Each answer shows what the data says, and what it cannot say.`
            : 'That is your limit. Click any answered question to look at it again.')),
        h('div', { class: 'split' },
          h('div', { class: 'stack' }, list, notebook),
          finding
            ? h('div', { class: 'finding reveal' },
                h('div', { class: 'finding-head' },
                  h('div', { class: 'micro' }, INV[view].q),
                  h('p', { class: 'says' }, finding.says)),
                finding.body,
                h('p', { class: 'gap' }, h('b', null, 'What this cannot tell you. '), finding.gap))
            : h('div', { class: 'finding placeholder' }, h('p', { class: 'muted' }, 'The answer appears here.'))),
        actions(ctx, { label: 'Make your read', disabled: left > 0, hint: left > 0 ? `${left} question${left > 1 ? 's' : ''} left` : '' }));
    };
    paint();
    return root;
  },
};

// ---------------------------------------------------------------- 3. The read
const READS = [
  { id: 'consumers', title: 'Shoppers want it less', sub: 'Underlying demand for the brand has weakened.' },
  { id: 'competitor', title: 'A competitor is taking our shoppers', sub: 'The premium launch is pulling people away.' },
  { id: 'distribution', title: 'We lost retail distribution', sub: 'Fewer stores carry us, so fewer people can buy.' },
  { id: 'price', title: 'Our price increase is hurting', sub: 'We asked shoppers to pay more and they said no.' },
  { id: 'inventory', title: 'Distributors are carrying too much', sub: 'They are ordering less than shoppers are buying.' },
  { id: 'unsure', title: 'I cannot tell yet', sub: 'I would want to run more tests before saying.' },
];

const read = {
  id: 'e1-read', exp: 1, adopt: 'value', title: 'Your read',
  render(ctx) {
    const { state, save } = ctx;
    const btn = actions(ctx, { label: 'Show me what the data says', disabled: !state.read });
    const enable = () => { btn.querySelector('.btn').disabled = false; };
    return h('div', { class: 'screen stack-l' },
      h('div', { class: 'stack' },
        ...head({ lens: 'biz', exp: 1, stage: 'Understanding', title: 'What do you think is driving the 8%?', wide: true }),
        h('p', { class: 'prose' }, 'Commit to a read before you see the full picture. Seeing what you expected, or what surprised you, is how the learning happens.')),
      choices({ name: 'Your read', items: READS, value: state.read, onPick: (id) => { state.read = id; save(); enable(); } }),
      btn);
  },
};

// ---------------------------------------------------------------- 4. The evidence
const ROWS = [
  { id: 'growth', label: 'Underlying growth', group: 'market', looked: ['category'] },
  { id: 'price', label: 'Price increase', group: 'market', looked: ['price'] },
  { id: 'distribution', label: 'Lost retail distribution', group: 'market', looked: ['distribution'] },
  { id: 'competitor', label: 'Competitor launch', group: 'market', looked: ['price'] },
  { id: 'promo', label: 'More promotion', group: 'market', looked: ['promo'] },
  { id: 'other', label: 'Week-to-week noise', group: 'market', looked: [] },
  { id: 'inventory', label: 'Distributor inventory swing', group: 'supply', looked: ['pull', 'supply'], note: 'Payback from the April pre-buy' },
  { id: 'availability', label: 'Stockouts', group: 'supply', looked: ['pull'], note: 'Late in the destock' },
];
const READ_TO_ROW = { competitor: 'competitor', distribution: 'distribution', price: 'price', inventory: 'inventory' };

const evidence = {
  id: 'e1-evidence', exp: 1, adopt: 'value', title: 'See why',
  render(ctx) {
    const { state } = ctx;
    const market = ROWS.filter((r) => r.group === 'market'), supply = ROWS.filter((r) => r.group === 'supply');
    const sum = (rs) => rs.reduce((s, r) => s + D.pts[r.id], 0);
    const mkt = sum(market), sup = sum(supply);
    const mine = READ_TO_ROW[state.read];
    const tagFor = (r) => (r.id === mine ? 'Your read' : state.picks.some((p) => r.looked.includes(p)) ? `You looked here${r.note ? '. ' + r.note : ''}` : r.looked.length ? `You did not look here${r.note ? '. ' + r.note : ''}` : '');
    const biggest = [...ROWS].sort((a, b) => D.pts[a.id] - D.pts[b.id])[0];
    const supplyShare = sup / D.pct, invShare = D.pts.inventory / D.pct, stockShare = D.pts.availability / D.pct;
    const fmt = (v) => signed(v, 1);
    const share = (x) => (x > 0.62 && x < 0.72 ? 'About two thirds' : `${Math.round(x * 100)}%`);

    const lead = {
      consumers: `You read it as weaker shopper demand. Shopper pull-through did fall ${abs1(D.depPct)}%, but that is only about half of the ${Math.abs(D.pct).toFixed(0)}%.`,
      unsure: 'You held back, which is fair. Here is what the data says, and what is still a judgment.',
    }[state.read] || (mine ? `You picked ${ROWS.find((r) => r.id === mine).label.toLowerCase()}. That is real, and it is one of eight forces.` : '');

    const rows = [
      { header: 'Market and commercial forces', note: fmt(mkt) },
      ...market.map((r) => ({ label: r.label, value: D.pts[r.id], mark: r.id === mine, tag: tagFor(r) })),
      { header: 'Inventory and availability', note: fmt(sup) },
      ...supply.map((r) => ({ label: r.label, value: D.pts[r.id], mark: r.id === mine, tag: tagFor(r) })),
      { total: true, label: 'Change in shipments', value: D.pct, shown: `${fmt(D.pct)}%` },
      { label: 'Where it came from', split: [{ value: mkt, color: 'var(--s-current)' }, { value: sup, color: 'var(--ink)' }], shown: '' },
    ];

    return h('div', { class: 'screen stack-l' },
      h('div', { class: 'stack' },
        ...head({ lens: 'biz', exp: 1, stage: 'Understanding', title: `${share(supplyShare)} of the drop was inventory and availability.`, wide: true }),
        h('p', { class: 'lede' }, lead)),
      h('div', { class: 'finding' },
        h('div', { class: 'finding-head' },
          h('div', { class: 'micro' }, 'Change in shipments vs. a year ago, in percentage points. Each bar starts where the last one ended.'),
          h('p', { class: 'says' }, `No single villain. Eight forces added up to ${fmt(D.pct)}%.`)),
        waterfall({ rows, min: -9, max: 4 }),
        h('div', { class: 'wf-legend micro' },
          h('span', null, h('i', { style: { background: 'var(--s-current)' } }), `Market and commercial ${fmt(mkt)} (${Math.round((mkt / D.pct) * 100)}%)`),
          h('span', null, h('i', { style: { background: 'var(--ink)' } }), `Inventory and availability ${fmt(sup)} (${Math.round(supplyShare * 100)}%)`)),
        h('p', { class: 'gap' }, h('b', null, 'A modelled split, not a measurement. '),
          `The lab knows the true effect of each force, so it can show them cleanly. A real analysis estimates them, and a 13-week comparison moves by about ±${yoyNoise().toFixed(0)} points on noise alone. Read the bars as sizes, not as exact figures.`)),
      h('div', { class: 'stats' },
        stat('Empty shelves cost', money(LOSS.margin), `in margin over 13 weeks, against ${money(LOSS.marginLastYear)} a year earlier: ${int(LOSS.cases)} cases shoppers wanted and could not buy. A modelled figure: the lab knows what shoppers wanted.`),
        stat('Today’s forecast', `${pc(EV.biasCurrent)} high`, `against what shoppers bought, over the last 26 weeks, and off by ${pc(EV.wapeCurrent, 1)} in a typical week. It is last year’s shipments plus 3%.`)),
      note('Part of this is temporary', `The inventory swing is not a lasting loss. Distributors cannot destock forever, so as it ends shipments should recover by roughly ${abs1(D.pts.inventory)} points. Tell finance. The part that is not temporary is shopper pull, down ${abs1(D.depPct)}%, and what caused that is mostly commercial.`),
      note('Why this matters', `The biggest single item is ${biggest.label.toLowerCase()}. But most of the drop came from how stock moved and how it was planned. That is a decision made thousands of times a year, and it is where better information, and maybe AI, could help.`),
      actions(ctx, { label: 'What is everyone assuming?' }));
  },
};

// ---------------------------------------------------------------- 5. The blind spot
// Six beliefs, each tested against the data. The learner calls each one first, then checks. The four
// verdicts are defined once (beliefs.js) and every number below is computed, so the screen cannot
// drift from the data. At least one belief holds, and several are true on average and fail where it counts.
const GAP = shipmentGap();
const T = testBeliefs();
const pcs = (v, d = 1) => `${signed(v * 100, d)}%`;
const pct1 = (v) => `${(v * 100).toFixed(1)}%`;
const distPts = (WS.distThen - WS.distNow) * 100;

const BELIEFS = [
  { id: 'forecast', title: 'Our forecast represents demand.', test: T.forecast,
    why: (t) => `In its first full year it ran ${pcs(t.biasYearOne)} against what shoppers bought, about right. Over the last 26 weeks it ran ${pc(t.biasRecent)} high, and across all ${t.weeks} weeks it landed within 5% in only ${t.within5}. It is last year’s shipments (a 3-week average) plus 3%, so it carries the distributors’ loading, and it assumed growth that was not there. Right on average is no help in the week you place the order.` },
  { id: 'distributors', title: 'Distributors order what they expect to sell.', test: T.distributors,
    why: (t) => `Over a year they bought ${pcs(t.gapYear)} versus what shoppers bought, and in ${t.ordWithin3} of ${t.ordinary} ordinary weeks they were within 3%. But the last two weeks of every quarter ran ${pcs(t.quarterEnd)}, the first two ${pcs(t.quarterStart)}, and the five weeks before the April price increase ${pcs(t.preBuy)}, then ${pcs(t.postBuy)} for five weeks after (${t.quarterEndInPreBuy} of those five weeks were also quarter-end weeks). They track shoppers, except when they have a reason not to.` },
  { id: 'promo', title: 'Promotion adds volume.', test: T.promo,
    why: (t) => `It did: about ${abs1(t.pts)} points of volume in this comparison. Whether it paid is a different question, and this data cannot answer it, because it holds no discount depth or margin by week. As a test to run: if a store on promotion sells about ${(t.perStore * 100).toFixed(0)}% more (the lab’s assumption), the discount has to cost less than about $${t.breakEven.toFixed(0)} a case (${pct1(t.breakEvenPct)} of the price) for it to pay back.` },
  { id: 'field', title: 'The people closest to the account see what matters.', test: T.field,
    why: (t) => `Three of the four people you heard described a force the data confirms: Chain X (${abs1(t.chain)} points of the decline), the rival launch (${abs1(t.rival)}) and distributor destocking (${abs1(t.stock)}). The planner was right too: nothing about the forecast had changed, and that was the problem. Each saw one corner of a ${abs1(t.total)}-point drop. Nobody saw all of it.` },
  { id: 'distribution', title: 'Losing distribution costs us volume one for one.', test: T.distribution,
    why: (t) => `Distribution fell about ${distPts.toFixed(0)} points (${((distPts / (WS.distThen * 100)) * 100).toFixed(0)}% of our stores). Comparing each week with the same week a year ago puts the effect at about ${t.slope.toFixed(1)} for each 1% of stores, give or take ${t.half.toFixed(1)}. That range holds both one-for-one (1.0) and half that (0.5), because the Chain X cut and the rival’s launch landed within weeks of each other and cannot be pulled apart. The lab’s own answer key uses ${t.model}. Real life has no answer key, so this is an estimate to make carefully, not a fact to assume.` },
  { id: 'shelves', title: 'Promotions are what empty our shelves.', test: T.shelves,
    why: (t) => `During the six-week promotion run the out-of-stock rate was ${pct1(t.during)}, against ${pct1(t.duringLast)} in the same weeks a year ago. It rose to ${pct1(t.after)} only afterward, from the week of ${weekLabel(t.afterFrom)} (${pct1(t.afterLast)} a year ago). The timing points at distributors cutting orders too hard late in the destock, not at the promotion. The data cannot prove that, but it does not point at the promotion either.` },
];

const assume = {
  id: 'e1-assume', exp: 1, adopt: 'value', title: 'The blind spot',
  render(ctx) {
    const { state, save } = ctx;
    const root = h('div', { class: 'screen stack-l' });
    const paint = () => {
      const bets = state.bets || (state.bets = {});
      const all = BELIEFS.every((b) => bets[b.id]);
      const from = 104, to = 155;
      const dep = ma3(slice('dep', from - 2, to)).slice(2), ship = ma3(slice('ship', from - 2, to)).slice(2);
      const hits = BELIEFS.filter((b) => bets[b.id] === b.test.verdict).length;
      const count = (id) => BELIEFS.filter((b) => b.test.verdict === id).length;

      const head1 = h('div', { class: 'stack' },
        ...head({ lens: 'biz', exp: 1, stage: 'Understanding', title: 'What is everyone assuming?', wide: true }),
        h('p', { class: 'prose' }, state.checked ? 'Six beliefs sit inside how Ridgeline plans. Here is how each one held up against the data, and how your call compared. Each can land in one of four places:' : 'Six beliefs sit inside how Ridgeline plans. Nobody wrote them down, and most are never tested. Before you see the data, make a call on each one. Each can land in one of four places:'),
        h('div', { class: 'legend' }, VERDICTS.map((v) => h('div', { class: 'legend-i' }, h('span', { class: `chip ${v.tone}` }, v.short), h('span', { class: 'small' }, v.def)))));

      if (!state.checked) {
        mount(root, head1,
          h('div', { class: 'beliefs' }, BELIEFS.map((b) => h('div', { class: 'belief' },
            h('p', { class: 'belief-q' }, b.title),
            seg(VERDICTS.map((v) => [v.id, v.short]), bets[b.id], (id) => { bets[b.id] = id; save(); paint(); })))),
          h('div', { class: 'actions' }, h('span', { class: 'micro' }, `${BELIEFS.filter((b) => bets[b.id]).length} of ${BELIEFS.length} called`),
            h('div', { class: 'actions-r' }, h('button', { class: 'btn', type: 'button', disabled: !all, onClick: () => { state.checked = true; save(); paint(); window.scrollTo({ top: 0 }); } }, 'Check against the data', h('span', { 'aria-hidden': 'true' }, '→')))));
        return;
      }

      mount(root, head1,
        h('div', { class: 'finding reveal' },
          h('div', { class: 'finding-head' },
            h('div', { class: 'micro' }, `You matched the data on ${hits} of ${BELIEFS.length}`),
            h('p', { class: 'says' }, `${count('holds')} holds, ${count('conditions')} hold only in some conditions, ${count('unsupported')} not supported, ${count('untestable')} can’t be tested here.`)),
          h('p', { class: 'prose' }, 'Most of these are not wrong. They are true on average and fail in the weeks that decide a quarter, which is exactly where a plan built on them gets hurt.')),
        h('div', { class: 'beliefs reveal' }, BELIEFS.map((b) => {
          const v = VERDICT[b.test.verdict], mine = VERDICT[bets[b.id]], hit = mine.id === v.id;
          return h('div', { class: `belief result${hit ? ' hit' : ''}` },
            h('p', { class: 'belief-q' }, b.title),
            h('div', { class: 'belief-chips' },
              h('span', { class: `chip ${v.tone}` }, v.short),
              h('span', { class: 'micro' }, hit ? 'You called it' : `You said: ${mine.short}`)),
            h('p', { class: 'prose' }, b.why(b.test)));
        })),
        h('div', { class: 'stack-s reveal' },
          h('h3', { class: 'h3' }, 'Where two of them break'),
          lineChart({
            n: dep.length, height: 240, yMin: 2800, yFmt: (v) => int(v), direct: true,
            series: [
              { name: 'Shipments: what distributors bought', short: 'Shipments', values: ship, color: 'var(--s-current)', dash: '5 5', width: 2 },
              { name: 'Depletions: what shoppers bought', short: 'Shoppers', values: dep, color: 'var(--s-actual)', width: 2.5 },
            ],
            fills: [{ a: 0, b: 1, posClass: 'up', negClass: 'down' }],
            markers: [{ i: GAP.worst - from, text: 'Quarter-end loading' }, { i: PRICE_WEEK - from, text: 'Price increase', dy: 18 }],
            ticks: ticksFor(from, to, 13), xLabel: (i) => `Week of ${weekLabel(from + i)}`, tipFmt: (v) => `${int(v)} cases`,
            desc: 'Shipments and shopper purchases over a year. The two track each other closely except around quarter-end and the price increase. The shaded gap is distributor loading (blue) and destocking (grey).',
          })),
        note('The point', 'A belief is not wrong because nobody tested it. It is that none of these were visible until someone asked, and several hold on average and fail at the moments that matter. A forecast built on them will keep making the same mistake, however fast it runs.'),
        actions(ctx, { label: 'Where could AI help?' }));
    };
    paint();
    return root;
  },
};

// ---------------------------------------------------------------- 6. The opportunity
const CAPS = [
  ['Prediction', 'What is likely to happen?'],
  ['Classification', 'What kind of thing is this?'],
  ['Generation', 'What can we create?'],
  ['Retrieval', 'What do we already know?'],
  ['Optimization', 'Given limits, what is best?'],
  ['Agents', 'Can a system watch, decide and act?'],
];

const CANDIDATES = [
  { id: 'stock', cap: 'A rule, not AI', title: 'Warn when a distributor’s stock drifts out of range', fit: 'maybe', fitLabel: 'A rule is enough',
    does: 'Flag any distributor whose weeks of supply leave an agreed band. A spreadsheet formula can do this.',
    rows: [
      ['How often', 'Weekly, for each of three distributors.'],
      ['Data', 'Needs weekly distributor inventory reports. Today those arrive monthly, by email.'],
      ['Can we check it?', 'Immediately: either stock left the band or it did not.'],
      ['Cost of being wrong', 'Low. A false alarm is a phone call.'],
      ['Where humans stay', 'All of it. Someone calls the distributor and agrees what to do.'],
    ],
    verdict: 'This is the cheapest and fastest answer to the problem you diagnosed, and it needs no AI. Do it first. It also gives any forecast the distributor visibility it will need.' },
  { id: 'forecast', cap: 'Prediction', title: 'Forecast what shoppers will buy, week by week', fit: 'strong', fitLabel: 'Worth testing',
    does: 'Predict shopper sell-through by distributor and SKU group, so a shared plan, suggested orders and allocation start from demand instead of last year’s shipments.',
    rows: [
      ['How often', `About ${int(DECISIONS)} times a year at distributor and SKU-group grain: 3 × 12 × 52.`],
      ['Data', 'Three years of weekly depletions, price, promotion and distribution. Distributor stock levels are not in the feed.'],
      ['Can we check it?', 'Yes, within a few weeks, once distributor depletion reports arrive.'],
      ['Cost of being wrong', `Real. A missing case costs about $${MARGIN_PER_CASE} of margin. Each extra case sits in the pipeline at about $${CARRY_PER_CASE}.`],
      ['Where humans stay', 'Anything the data cannot see: a chain’s reset, a competitor launch. And distributors place their own orders: we advise, we do not decide.'],
    ],
    verdict: 'A repeated decision with data and a scoreboard. One honest caution: much of the gain on offer may come from forecasting shoppers instead of shipments, which needs no AI. The question for AI is what it adds on top, and a pilot can answer that.' },
  { id: 'promo', cap: 'Optimization', title: 'Plan next year’s promotion calendar', fit: 'maybe', fitLabel: 'Not yet',
    does: 'Choose which weeks, stores and depths of promotion would earn the most.',
    rows: [
      ['How often', 'About seven events a year.'],
      ['Data', 'Few examples, and each is tangled up with stockouts and distribution changes. Hard to learn from.'],
      ['Can we check it?', 'Slowly. One calendar is judged once a year.'],
      ['Cost of being wrong', 'High. Promotion is a large part of the commercial budget.'],
      ['Where humans stay', 'Most of it: retailer negotiations, brand strategy, trade terms.'],
    ],
    verdict: 'Optimization needs a trustworthy demand forecast underneath it, and more examples than you have. Come back to this after the forecast works.' },
  { id: 'chain', cap: 'Not AI', title: 'Win back Chain X’s lost shelf space', fit: 'no', fitLabel: 'AI isn’t the answer',
    does: 'Nothing a model would do better than a good account lead.',
    rows: [
      ['How often', 'One or two times a year.'],
      ['Data', 'A handful of past negotiations. Nothing a model can learn from.'],
      ['Can we check it?', 'Only by whether the chain says yes.'],
      ['Cost of being wrong', 'Meaningful, but each case is unique.'],
      ['Where humans stay', 'All of it. This is a relationship and a negotiation.'],
    ],
    verdict: 'AI isn’t the right solution here. It could help prepare, for example by pulling together sell-through data for the meeting. The decision and the trust are human.' },
  { id: 'copy', cap: 'Generation', title: 'Rewrite the brand’s consumer messaging', fit: 'no', fitLabel: 'No evidence for it',
    does: 'Generate new copy and creative concepts quickly.',
    rows: [
      ['How often', 'A few campaigns a year.'],
      ['Data', 'Plenty of examples, but nothing in the evidence says messaging is the problem.'],
      ['Can we check it?', 'Slowly, and noisily.'],
      ['Cost of being wrong', 'Modest, which is also why it is tempting.'],
      ['Where humans stay', 'Taste, brand voice, final say.'],
    ],
    verdict: 'Generation is cheap and easy to demo. Without a diagnosed problem it produces activity, not value. Nothing you found points here.' },
];

const opportunity = {
  id: 'e1-opportunity', exp: 1, adopt: 'fit', title: 'The opportunity',
  render(ctx) {
    const { state, save } = ctx;
    const root = h('div', { class: 'screen stack-l' });
    const paint = () => {
      const c = CANDIDATES.find((x) => x.id === state.candidate) || null;
      mount(root,
        h('div', { class: 'stack' },
          ...head({ lens: 'sys', exp: 1, stage: 'Decision', title: 'Where could AI actually help?', wide: true }),
          h('p', { class: 'prose' }, 'You now know the problem lives in how stock is planned and ordered. Here are five things someone might do about it. Look at each. Some of them should not get AI at all.')),
        choices({
          name: 'Candidate decisions', value: state.candidate,
          items: CANDIDATES.map((x) => ({ id: x.id, title: x.title })),
          onPick: (id) => { state.candidate = id; if (!state.looked.includes(id)) state.looked.push(id); save(); paint(); },
        }),
        c ? h('div', { class: 'finding reveal' },
          h('div', { class: 'finding-head' },
            h('div', { class: `chip ${c.fit}` }, c.fitLabel),
            h('p', { class: 'says' }, c.verdict)),
          h('p', { class: 'prose' }, h('strong', null, 'What it would do: '), c.does, h('span', { class: 'micro' }, `  ·  ${c.cap}`)),
          table(['The test', 'This decision'], c.rows)) : null,
        disclose('Six things AI can do', h('div', { class: 'caps' }, CAPS.map(([name, q]) =>
          h('div', { class: 'cap', 'data-on': String(c?.cap === name) }, h('b', null, name), h('span', null, q))))),
        c && c.fit === 'strong'
          ? h('div', { class: 'stack' },
              note('What you found', `A decision made about ${int(DECISIONS)} times a year, where today’s forecast misses by ${pc(EV.wapeCurrent, 1)} in a typical week and runs ${pc(EV.biasCurrent)} above what shoppers bought. You did not start with AI. You started with a problem. And you have already met two cheaper moves: see distributor stock, and forecast shoppers instead of shipments.`),
              actions(ctx, { label: 'Open the hood' }))
          : actions(ctx, { label: 'Open the hood', disabled: true, hint: c ? 'Look at the forecast question to continue.' : 'Choose a decision to look at.' }));
    };
    paint();
    return root;
  },
};

export const e1 = [situation, investigate, read, evidence, assume, opportunity];
