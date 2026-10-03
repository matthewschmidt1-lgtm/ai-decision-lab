// Five beliefs about how AI behaves, each tested by running the lab's own models. A learner calls
// each one first, then checks. Every verdict and number is computed, so it moves if the models do.
// Nothing here reads the hidden truth columns of the data.
//
// Four verdicts, defined once so a learner can predict them:
//   holds       the evidence backs it, including where it matters
//   conditions  true in some cases and false in others
//   unsupported the evidence does not back it
//   untestable  the lab holds nothing that could say

import { WEEKS, PRICE_WEEK, N } from './data.js';
import { ALL_GROUPS, DEFAULT_CAUTION, TRAIN_WEEKS, trainModel, evaluate, predict } from './forecast.js';
import { toyData, trainNet, mse } from './nn.js';

export const VERDICTS = [
  { id: 'holds', short: 'Holds', tone: 'strong', def: 'The evidence backs it.' },
  { id: 'conditions', short: 'Sometimes', tone: 'maybe', def: 'True in some cases, false in others.' },
  { id: 'unsupported', short: 'Not supported', tone: 'no', def: 'The evidence does not back it.' },
  { id: 'untestable', short: 'Can’t tell', tone: 'none', def: 'The lab holds nothing that could say.' },
];
export const VERDICT = Object.fromEntries(VERDICTS.map((v) => [v.id, v]));

const sum = (idx, k) => idx.reduce((s, t) => s + WEEKS[t][k], 0);
const range = (a, b) => { const r = []; for (let t = a; t <= b; t++) r.push(t); return r; };
const gap = (idx) => sum(idx, 'ship') / sum(idx, 'dep') - 1;       // shipments vs. depletions

// Quarter structure as the data shows it: shipments swell in the last two weeks of a 13-week quarter
// and sag in the first two.
const isQuarterEnd = (t) => t % 13 === 11 || t % 13 === 12;

const NET_STEPS = 2500;
const netError = (hidden, trainSet, testSet) => Math.sqrt(mse(trainNet(trainSet, { hidden, steps: NET_STEPS, lr: 0.03, seed: 3, at: [NET_STEPS] }).params, testSet)) * 100;
const netPair = (hidden, trainSet, testSet) => {
  const p = trainNet(trainSet, { hidden, steps: NET_STEPS, lr: 0.03, seed: 3, at: [NET_STEPS] }).params;
  return { train: Math.sqrt(mse(p, trainSet)) * 100, test: Math.sqrt(mse(p, testSet)) * 100 };
};

export function testBeliefs() {
  // The forecasting neuron, on the lab's data.
  const m = trainModel(ALL_GROUPS, { l2: DEFAULT_CAUTION });
  const ev = evaluate(m);
  const learnWeeks = TRAIN_WEEKS;
  const trainWape = learnWeeks.reduce((s, t) => s + Math.abs(predict(m, t) - WEEKS[t].dep), 0) / sum(learnWeeks, 'dep');

  // The toy network: 14 examples to learn from, 60 points it never sees, and a second run with 60 examples.
  const small = toyData(14, 60, 0.1, 5), big = toyData(60, 60, 0.1, 5);
  const nets = { 1: netPair(0, small.train, small.test), 3: netPair(3, small.train, small.test), 12: netPair(12, small.train, small.test) };
  const withMore = netError(12, big.train, small.test);

  // 1. If it is accurate on past data, it will be accurate on new data.
  const history = { trainWape, examWape: ev.wapeAI, net: nets[12] };
  const modelGap = history.examWape - history.trainWape, netGap = (nets[12].test - nets[12].train) / 100;
  history.verdict = modelGap < 0.02 && netGap > 0.04 ? 'conditions' : (netGap <= 0.04 ? 'holds' : 'unsupported');

  // 2. A bigger model is a better model.
  const bigger = { t1: nets[1].test, t3: nets[3].test, t12: nets[12].test, wapeAI: ev.wapeAI, wapeSimple: ev.wapeSimple };
  bigger.verdict = bigger.t12 > bigger.t3 ? 'unsupported' : 'holds';

  // 3. More examples make a flexible model more reliable.
  const examples = { few: nets[12].test, many: withMore, nFew: small.train.length, nMany: big.train.length };
  examples.verdict = examples.many < examples.few - 1 ? 'holds' : (examples.many > examples.few + 1 ? 'unsupported' : 'conditions');

  // 4. The numbers we have measure what we care about. (Shipments are what the supplier sees.)
  const year = range(N - 52, N - 1), all = range(0, N - 1);
  const preBuy = range(PRICE_WEEK - 5, PRICE_WEEK - 1);
  const proxy = { gapYear: gap(year), quarterEnd: gap(all.filter(isQuarterEnd)), preBuy: gap(preBuy) };
  proxy.verdict = Math.abs(proxy.gapYear) <= 0.02 && Math.max(Math.abs(proxy.quarterEnd), Math.abs(proxy.preBuy)) > 0.05 ? 'conditions' : (Math.abs(proxy.gapYear) <= 0.02 ? 'holds' : 'unsupported');

  // 5. If it is accurate, people will use it. The lab holds no data on what people do with a forecast.
  const adoption = { verdict: 'untestable' };

  return { history, bigger, examples, proxy, adoption };
}
