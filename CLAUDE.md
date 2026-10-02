# AI Decision Lab

An interactive lab for nontechnical CPG leaders. They start with a business problem (a bourbon brand down 8% in Texas), find the decision worth improving, open the hood on a real forecasting model, and design the pilot that would test it. **AI is not the product. Better decisions are.**

- Live: https://ai-decision-lab-production-56eb.up.railway.app (a second domain, `ai-decision-lab-production.up.railway.app`, also serves it)
- Repo: github.com/matthewschmidt1-lgtm/ai-decision-lab (public, branch `main`)
- Railway: project `brave-joy`, service `ai-decision-lab`

Sibling of Decision OS, Friction and Matthew's site. It carries their philosophy: Business / System / People lenses, the learning loop (Signal → Understanding → Decision → Action → Learning), the adoption loop (Value → AI fit → System readiness → People → Pilot → Measure → Scale or stop), and "What is everyone assuming?".

## Hard constraints

- **Zero build.** Vanilla ES modules, plain CSS, hand-drawn SVG, no dependencies. This Mac has no Node/npm, and every sibling project is zero-build. The master prompt prefers React/TS/Vite; the deviation is deliberate. Do not introduce npm tooling.
- **The ML is real.** Never fake model behaviour with a decorative animation. The model in `js/forecast.js` trains in the browser; the loss curve, weights, divergence at a high learning rate, and the source shown on the code screen (`Function.toString()`) are all the real thing. If a screen shows an AI/ML process, it must be computed.
- **All data is fictional and deterministic** (seeded generator in `js/data.js`). Numbers must agree across screens, which is why every screen reads from `data.js` / `forecast.js` / `value.js` instead of hard-coding.
- **Never "guaranteed savings".** Use "potential value", show every assumption, let the user change them, show a range ("scenario bounds, not probabilities"), and say back-tests flatter.
- **Evaluation integrity (learned the hard way, from six review passes).** Do not weaken these:
  - **No look-ahead.** Every model input must be knowable four weeks before the week it describes: announced values (list price, promotion calendar) may be used for the week itself; reported values (sales, distribution) only with a lag. `tests/run.html` perturbs newer data and the hidden-truth fields and asserts features do not move.
  - **Three slices of time, with a gap.** Learn (weeks 60-99), choose (104-129), exam (130-155); `EMBARGO` = 4 weeks: a model fitted for a period never learns from the four weeks before it (those had not happened when its first forecast would have been made). Features, caution and cushions are chosen on the choosing weeks by a model that never saw them.
  - **The exam is shown once for the recipe set in advance** (business view: all four inputs, caution "careful"), then a second time when the learner locks in. The lab says plainly that the second look is less clean. Every screen after the features screen uses `recipeOf(state)` (the locked recipe, else the one set in advance), never raw `state.features`.
  - **Dollar gains are ranges, not numbers.** `pairGain` reports the gain three ways (each forecast's cushion chosen in advance, both at today's +4%, each at its hindsight best) plus a circular-block bootstrap, and uses the middle as the estimate and the whole spread as the range. Cost curves are flat near the bottom, so any single pick is partly luck.
  - **Always show the no-AI baseline** (`simpleForecast`: same week last year x recent trend) next to today's method. Most of the gain is from forecasting shopper sales instead of shipments, not from AI. Never present AI vs today's method alone.
  - **Score replays against what shoppers wanted** (`want`), not a smooth hidden series, and tune every forecast's cushion the same way.
  - **Uncertainty on every headline**: block-bootstrap 90% ranges, rolling-origin folds, out-of-sample forecast bands. A range that crosses zero is reported as "cannot tell".
  - **Computed text, not canned text.** Any sentence that interprets a number (competitor shift, overconfidence, learning-rate limit, "AI vs simple") must be generated from the numbers, including the case where it comes out the other way.
  - **Teaching beliefs must be decidable and not rigged.** The "What is everyone assuming?" screen (`js/beliefs.js`) has six beliefs, each tested with a measurable rule on the observable data, with four verdicts (holds / some conditions / not supported / can't be tested). At least one must genuinely hold and several must be "true on average, false where it counts"; a lesson where every answer is "false" teaches the wrong thing. Learners call each verdict before the data is shown. Verdicts and numbers are computed, and tests assert they never read the hidden `demand`/`want`/`expect` columns.
  - **Label oracles.** The decomposition and the "learned vs true" table use hidden generator truth; the screens say so.
  - **Bootstraps use circular blocks** (block starts uniform over all weeks), otherwise edge weeks are under-sampled and false alarms understated. `tests/run.html` asserts the simulated worlds are unbiased.
  - **The pilot simulation is null-aware**: it reports power and the false-alarm rate, calls a win halfway between nothing and the target, and its power depends on how many independent series the pilot covers (the headline uses a stress case where only a third of them average out noise). A target above the best case the back-test allowed is flagged.
- **No scores, badges, points, leaderboards, accounts, backend.** Choices persist in `localStorage` (`adlab.v2`; bump the key when the state shape changes) so a refresh keeps your place. Nothing leaves the device.
- **Credibility over promotion.** The opportunity screen must be able to conclude "AI isn't the right solution here" (it does, for the Chain X negotiation) and "a rule is enough" (distributor stock alert). The brief opens with what to do first without AI.
- **Do not expand the MVP** (one scenario, one opportunity, open the hood, three lenses, pilot designer) until this loop is excellent. Depth over breadth.

## Design language

Apple / Mike Markkula restraint: **empathy** (start from the learner's business situation, never from technology), **focus** (one question per screen, leave things out), **impute** (craft in the details signals credibility: real model, honest labels, precise type).

Ivory `#F6F5F0`, ink `#15171A`, one accent blue `#2457D6` (used for the AI series and primary state). The lens colours (Business orange, System teal, People green) appear only where a lens is the subject. Green/red are for meaning only. System font stack, no webfonts. Chart series: ink = what happened, grey dashed = today's process, khaki dotted = the simple no-AI forecast, blue = the AI.

Every screen answers: what am I looking at, what can I change, what happened, why, what next. The eyebrow line names the lens, the experience and the loop stage.

## Run and test

```bash
python3 scripts/dev.py 4180      # no-store dev server; open http://localhost:4180
```

Model tests: http://localhost:4180/tests/run.html (expects "ALL PASSED"). Add a test whenever a formula in `forecast.js` or `value.js` changes. The browser pane caches stylesheets aggressively across reloads; if CSS looks stale, open a fresh tab.

After a visible change: check the console, desktop (1280) and 375px, and `document.documentElement.scrollWidth === clientWidth` on every route.

## Deploy

GitHub `matthewschmidt1-lgtm/ai-decision-lab`, deployed on Railway from `main`. **Auto deploy is currently disabled on the Railway service** (unlike the sibling sites), so a push does not update the live site until it is enabled (service Settings → Source → Enable) or a deploy is triggered by hand. Railway runs `scripts/serve-site.sh`, which copies only the public site (`index.html`, `robots.txt`, `serve.json`, `css/`, `js/`) into `dist/` and serves it with `npx serve -s dist`. Tests, scripts and these notes are not deployed, and `/tests/run.html` falls through to the app. If you add a new top-level public file, add it to that script.

`serve.json` sets a strict CSP (`script-src 'self'`, no third-party origins, no inline scripts) and security headers. Do not add inline scripts, `setAttribute('style', ...)`, or external fonts without updating it. To check a change against the production headers, serve the folder locally with the headers from `serve.json` and look for `securitypolicyviolation` events. This Mac has no `gh` or Railway CLI, so the repo and the Railway service were created in the web dashboards (new Railway project: GitHub Repository, then paste the repo URL if the picker will not advance; then Settings → Networking → Generate Domain).

## Map

```
index.html             shell: header, experience nav, adoption track, footer
css/tokens.css         palette, type scale, motion
css/base.css           reset, chrome, type, layout helpers, buttons
css/components.css     choices, bars, sliders, toggles, charts, notes, tables
css/screens.css        landing, depth gauge, calculator, brief, print
js/app.js              hash router, experience nav, adoption track
js/state.js            what the learner has chosen (localStorage)
js/ui.js               DOM helpers (h, s), bars, waterfall, rangeBars (tornado), dotPlot, chain, slider, choices, stat, note, term
js/charts.js           lineChart (bands, fills between lines, markers, annotated points, drag-to-pick, log axis) and histogram
js/data.js             the hidden truth + observed series; decompose(); stockoutLoss(); inventoryEstimate(); noiseFloor()
js/forecast.js         features, gradient descent, exact solve, stability limit, explain, evaluate, rolling origin, bootstrap
js/value.js            replay, cost curves, calculator, sensitivity, break-even, pilot power simulation
js/screens/            landing, e1 (find), e2 (hood), e3 (pilot), common
tests/run.html         browser test runner
```

## The story (keep it consistent)

Ridgeline Bourbon, Texas, week 155 = Sep 21, 2026. Shipments down ~8.0% over the last 13 weeks; shopper depletions down only ~3.8%. The gap is distributor inventory: they bought ahead of the April price increase (weeks 125-129), have been destocking since, and stockouts arrived at the tail. The forecast is last year's shipments + 3%, so it inherits the loading ("Our forecast represents demand" is the blind spot). Eight forces: underlying growth, price, lost distribution (Chain X resets our range, week 140), competitor launch (Harlan Reserve, week 138), promotion (a six-week summer run), stockouts, inventory swing, noise. About two thirds of the drop is inventory and availability; part of it is temporary. The decomposition is an oracle (hidden generator truth), shown to one decimal with a caveat that a 13-week comparison moves about +/-4 points on noise.

The model starts from the **simple forecast** (same week last year x recent trend) and learns corrections to it: a momentum correction, price change, promotion change and distribution change (distribution as last reported, five weeks old; list price is announced, promotions are planned). With every weight at zero it IS the simple forecast. A ridge penalty ("caution": Free / Some / Careful / Very careful, default 0.8, a judgment call made after seeing results and labelled as such) pulls corrections back toward zero. Calm history rewards confidence and a market that changes rewards caution, and the choosing weeks only see the calm: that trade-off is a deliberate lesson. Honest results on the 26 exam weeks: today's forecast ~8.5% typical miss (9.6% if scored on shipments, what it actually forecasts), simple no-AI ~5.2%, AI ~5.2% at "careful", noise floor ~3.9%. **Most of the gain is forecasting shopper sales instead of shipments, with no AI; AI is statistically tied with the simple method at market level** (rolling origin: AI beats the simple method in 4 of 5 windows and today's in 5 of 5, and the windows overlap the choosing and exam weeks). The case for AI is a hypothesis about finer grain (distributor x SKU group, ~100 cases a week per series) and about a model that shares what it learns across series, which this lab's model does not do; the pilot exists to test it. Dropping the distribution input or the caution looks better on the choosing weeks and worse on the exam (a regime change validation could not see).

Per-case economics: $95 margin lost, $18 to carry a case in the pipeline; replays score against `want` (what shoppers wanted, hidden in real life; the lab says so). The calculator compares AI with a simple no-AI forecast by default (planner time is not counted as AI value then), uses the middle of the gain range, shows the multiple of the back-test gain that would have to hold for it to pay for itself, and the brief opens with a recommendation, a trigger for running the AI test, and who owns the scoreboard.

If you change the generator, re-run the tests and re-check the headline (-8%), the decomposition, and the findings that depend on specific effects (the validation-vs-exam lesson, the AI-vs-simple tie, band coverage). Every number in the prose is computed, so the text will adapt, but the story may need rewording if a conclusion flips.

## Roadmap Matthew might set

A grain-level scenario (distributor x SKU series) so the finer-grain hypothesis can be tested rather than asserted, a second scenario that exercises a different capability (retrieval or generation, e.g. research synthesis), and enabling Railway auto deploy so pushes go live.
