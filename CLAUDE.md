# AI Decision Lab

An interactive lab for nontechnical CPG leaders, built on one thesis: **people choose what their own departments optimize, the organization is the sum of all those results, and AI shows what it is actually optimizing.** A company is read as one living model (data, representations, weights, attention, a loss function, learning) in which every department is its own loss function. Nobody owns the sum, so effort cancels and the organization gets in its own way. AI's job is interpretability for the organization: show the sum, find where signals decay, return time and focus to judgment, and help people choose one shared measure. Seven screens, about twelve minutes: the organism (departments pulling toward their own goals, with "Beat the market" as the mantra everyone repeats); the wave (a 3% rise in consumer demand passes four layers that each order sensibly and arrives as a 47% swing at the plant: the bullwhip) and the campaign (Marketing launches, Operations minimizes stock, the shelf runs empty, then a glut); where attention goes (a week as a 40-tile calendar, and who should do each job); how it learns (opens on four mirrors and one lens: each department's local loop against one loop through the whole chain; then a neuron and a small network, training vs test error); the honest test against a no-AI baseline; aligned and safe to try (the three lenses and their overlaps, psychological safety); and steer (a shared measure that realigns the pulls, then the pilot). **AI is not the product. Better decisions are.**

- Live: https://ai-decision-lab-production-56eb.up.railway.app (a second domain, `ai-decision-lab-production.up.railway.app`, also serves it)
- Repo: github.com/matthewschmidt1-lgtm/ai-decision-lab (public, branch `main`)
- Railway: project `brave-joy`, service `ai-decision-lab`

Sibling of Decision OS, Friction and Matthew's site. It carries their philosophy: Business / System / People lenses, the learning loop (Signal → Understanding → Decision → Action → Learning), the adoption loop (Value → AI fit → System readiness → People → Pilot → Measure → Scale or stop), and "What is everyone assuming?".

## Hard constraints

- **Use the three chain terms exactly.** **Shipments** = product the supplier ships to the distributor, nothing else. **Depletions** = product the distributor sells to on- and off-premise accounts, nothing else (the `dep` series). **Sell-through** = consumers buying at retail; the lab has no such series and must never cite one as evidence. Distributor inventory is the gap between shipments and depletions. Never say "shoppers bought", "shopper sales" or "pull-through" for depletions, and never use the three as synonyms. Today's forecast is a forecast of shipments; the simple and AI forecasts forecast depletions. A test run reads the copy for these words.
- **Zero build.** Vanilla ES modules, plain CSS, hand-drawn SVG, no dependencies. This Mac has no Node/npm, and every sibling project is zero-build. The master prompt prefers React/TS/Vite; the deviation is deliberate. Do not introduce npm tooling.
- **The ML is real.** Both models on screen 4 train live: the forecasting neuron on the lab's data, and a small neural network (`js/nn.js`) on a labelled toy pattern, with back-propagation checked against a numerical gradient in the tests. The toy's seed was chosen to illustrate memorizing noise, and a test confirms the effect holds in most random draws. Never fake model behaviour with a decorative animation. The model in `js/forecast.js` trains in the browser; the forecast settling, the weights, and divergence at a high learning speed are all the real thing. If a screen shows an AI/ML process, it must be computed.
- **All data is fictional and deterministic** (seeded generator in `js/data.js`). Numbers must agree across screens, which is why every screen reads from `data.js` / `forecast.js` / `value.js` instead of hard-coding.
- **Never "guaranteed savings".** Use "potential value", show every assumption, let the user change them, show a range ("scenario bounds, not probabilities"), and say back-tests flatter.
- **Evaluation integrity (learned the hard way, from six review passes).** Do not weaken these:
  - **No look-ahead.** Every model input must be knowable four weeks before the week it describes: announced values (list price, promotion calendar) may be used for the week itself; reported values (sales, distribution) only with a lag. `tests/run.html` perturbs newer data and the hidden-truth fields and asserts features do not move.
  - **Three slices of time, with a gap.** Learn (weeks 60-99), choose (104-129), exam (130-155); `EMBARGO` = 4 weeks: a model fitted for a period never learns from the four weeks before it (those had not happened when its first forecast would have been made). Features, caution and cushions are chosen on the choosing weeks by a model that never saw them.
  - **The exam is shown once for the recipe set in advance** (business view: all four inputs, caution "careful"), then a second time when the learner locks in. The lab says plainly that the second look is less clean. Every screen after the features screen uses `recipeOf(state)` (the locked recipe, else the one set in advance), never raw `state.features`.
  - **Dollar gains are ranges, not numbers.** `pairGain` reports the gain three ways (each forecast's cushion chosen in advance, both at today's +4%, each at its hindsight best) plus a circular-block bootstrap, and uses the middle as the estimate and the whole spread as the range. Cost curves are flat near the bottom, so any single pick is partly luck.
  - **Always show the no-AI baseline** (`simpleForecast`: same week last year x recent trend) next to today's method. Most of the gain is from forecasting depletions (distributor sales to accounts) instead of shipments, not from AI. Never present AI vs today's method alone.
  - **Score replays against depletions with no stockouts** (`want`), not a smooth hidden series, and tune every forecast's cushion the same way.
  - **Uncertainty on every headline**: block-bootstrap 90% ranges, rolling-origin folds, out-of-sample forecast bands. A range that crosses zero is reported as "cannot tell".
  - **Computed text, not canned text.** Any sentence that interprets a number (competitor shift, overconfidence, learning-rate limit, "AI vs simple") must be generated from the numbers, including the case where it comes out the other way.
  - **Numbers on screen must reconcile.** The time page shows the slider setting, the share of routine hours, gross and net hours, yearly hours and dollars, and its assumptions (46 working weeks, 6 planners, $70 an hour); a test checks every figure against the others. Automation creates new checking work, the result is a range, and capacity is not savings or business value.
  - **Job sorting teaches failure modes, not a score.** Each job shows what happens if a human, a computer, or both get it wrong, plus a usual design; context can change the answer, so there is no "matched N of 5".
  - **Time saved is not value.** The time screen (`js/time.js`) counts planner hours as value only when they are redeployed; "nowhere in particular" is worth $0 because the calendar refills. The week's hours are an illustrative assumption, labelled as one, and a spreadsheet frees some of the same hours, so the pilot compares AI with it. Sorting jobs between humans and computers has a defensible answer for each job and all three answers (human, computer, together) must appear.
  - **Label oracles.** The decomposition and the "learned vs true" table use hidden generator truth; the screens say so.
  - **Bootstraps use circular blocks** (block starts uniform over all weeks), otherwise edge weeks are under-sampled and false alarms understated. `tests/run.html` asserts the simulated worlds are unbiased.
  - **The pilot simulation is null-aware**: it reports power and the false-alarm rate, calls a win halfway between nothing and the target, and its power depends on how many independent series the pilot covers (the headline uses a stress case where only a third of them average out noise). A target above the best case the back-test allowed is flagged.
- **No scores, badges, points, leaderboards, accounts, backend.** Choices persist in `localStorage` (`adlab.v7`; bump the key when the state shape changes) so a refresh keeps your place. Nothing leaves the device.
- **Credibility over promotion.** The lab must be able to conclude "AI isn't the right solution here": screen 5 says most of the gain is not AI, and the pilot brief opens with what to do first without AI.
- **Keep it short.** The lab was cut from 21 screens to 5 and grew back to 7 as time and focus, the lens gap and psychological safety earned their own screens (still about 80% fewer words than the original) because testers found it too long. One idea and one thing to do per screen, and let colour, shape and motion carry the story before words do. A test (`tests/run.html`) fails if the lab grows past 7 screens, 320 words on any screen (screen 7 counts its two halves separately), or 1,900 in total. Cut before adding, and do not expand the MVP until this loop is excellent. Depth over breadth.
- **The organism is an illustration with real arithmetic.** Department directions, pull strengths, the campaign (1,000 cases a week, a six-week lift, a three-week lead time, $30 margin, $0.50 a case a week to hold stock, past campaigns landing at 80% of plan) are assumptions, labelled on screen. What must stay true: the pulls add as vectors (`sumPulls`), blending a shared measure turns every direction toward the star, the stock simulation conserves units (sold + unmet = demand, stock never negative), and the story's claims are asserted by tests (Operations alone holds the least stock and still costs the most; trusting the plan over-builds; the AI-adjusted plan never runs out). Do not claim the AI "knows" the 80%: it is stated as an assumption.
- **The bullwhip is a standard effect with stated assumptions.** Each layer orders up to a four-week average of what it is asked for plus a little cover, with lead times of 2, 2, 3 and 3 weeks. Cover and lead times are illustrative and labelled; the amplification (3% to 5%, 10%, 22% and 47%) is real arithmetic, a test asserts it grows at every layer and shrinks when real demand is shared, and the shared case still shows a one-off stock build, which the copy says. Words on the wave sit in HTML rows (readable on a phone), never in the SVG.
- **Mirrors quote real numbers.** What each department's mirror says (demand peak, forecast error, average stock, carrying cost) is computed from the campaign run when Operations sets stock alone (`mirrorFacts` in `js/org.js`), and tests assert every local claim is true while the whole chain still loses. Who sees which of the seven links is an illustrative assumption, and margin and the customer outcome sit on no scorecard by design.
- **Motion is quiet, and optional.** Arms grow out of the core, the star glows with how much reaches it, a playhead walks the campaign, tiles pop when hours move, signals stall at a wall. Everything stops under `prefers-reduced-motion`, and no screen may need the animation to be understood.

## Design language

Apple / Mike Markkula restraint: **empathy** (start from the learner's business situation, never from technology), **focus** (one question per screen, leave things out), **impute** (craft in the details signals credibility: real model, honest labels, precise type).

Ivory `#F6F5F0`, ink `#15171A`, one accent blue `#2457D6` (used for the AI series, the AI's reading of the sum and primary state). The lens colours (Business orange, System teal, People green) appear only where a lens is the subject. The department colours (Marketing plum, Sales orange, Finance teal, Operations olive) and the gold of the "Beat the market" star appear only where the organism is drawn. Green/red are for meaning only. System font stack, no webfonts. Chart series: ink = actual depletions, grey dashed = today's process, khaki dotted = the simple no-AI forecast, blue = the AI.

Every screen answers: what am I looking at, what can I change, what happened, what next. The eyebrow line names the step ("3 of 7") and its lens. Seven step dots in the header show progress and go back.

## Run and test

```bash
python3 scripts/dev.py 4180      # no-store dev server; open http://localhost:4180
```

Model tests: http://localhost:4180/tests/run.html (expects "ALL PASSED"). Add a test whenever a formula in `forecast.js` or `value.js` changes. The browser pane caches stylesheets aggressively across reloads; if CSS looks stale, open a fresh tab.

After a visible change: check the console, desktop (1280) and 375px, and `document.documentElement.scrollWidth === clientWidth` on every route.

## Deploy

GitHub `matthewschmidt1-lgtm/ai-decision-lab`, deployed on Railway from `main`. **Auto deploy is enabled on the Railway service** (service Settings → Source shows "Auto deploys when pushed to GitHub"). If a push does not deploy, the dashboard toggle can look right while the trigger is stale: Disable then Enable it, and check the GitHub connection. Railway runs `scripts/serve-site.sh`, which copies only the public site (`index.html`, `robots.txt`, `serve.json`, `css/`, `js/`) into `dist/` and serves it with `npx serve -s dist`. Tests, scripts and these notes are not deployed, and `/tests/run.html` falls through to the app. If you add a new top-level public file, add it to that script.

`serve.json` sets a strict CSP (`script-src 'self'`, no third-party origins, no inline scripts) and security headers. Do not add inline scripts, `setAttribute('style', ...)`, or external fonts without updating it. To check a change against the production headers, serve the folder locally with the headers from `serve.json` and look for `securitypolicyviolation` events. This Mac has no `gh` or Railway CLI, so the repo and the Railway service were created in the web dashboards (new Railway project: GitHub Repository, then paste the repo URL if the picker will not advance; then Settings → Networking → Generate Domain).

## Map

```
index.html             shell: header with step dots, footer
css/tokens.css         palette (incl. department colours), type scale, motion
css/base.css           reset, chrome, type, layout helpers, buttons
css/components.css     choices, bars, sliders, toggles, charts, notes, tables
css/screens.css        brief, pilot controls, lens layout, learn controls, print
css/org.css            the organism, campaign chart and shelf, week calendar, signals, reduced motion
js/app.js              hash router, step dots, recovery screen
js/state.js            what the learner has chosen (localStorage, key adlab.v7)
js/ui.js               DOM helpers (h, s), bars, slider, choices, seg, stat, note, whenVisible
js/charts.js           lineChart (bands, fills between lines, markers, log axis)
js/data.js             the hidden truth + observed series; decompose(); stockoutLoss(); inventoryEstimate(); noiseFloor()
js/forecast.js         features, gradient descent, exact solve, stability limit, explain, evaluate, rolling origin, bootstrap
js/value.js            replay, cost curves, calculator, sensitivity, break-even, pilot power simulation
js/beliefs.js          computed evidence from the lab's own models (accuracy on history vs new data, bigger vs better, more examples, proxy data); screen 5 quotes it
js/time.js             one planner's 40-hour week, what the computer takes over, where freed hours go (no value unless redeployed), review hours by design
js/org.js              the departments and their pulls (vector sum, shared measure), and the campaign stock simulation with its ledger
js/bullwhip.js         the four-layer order chain: one ordering rule applied layer after layer, with and without real demand shared
js/wavefig.js          the bullwhip drawn as a wave: ribbon through five stations, a camera that pulls back as the swing grows, swing capsules at the end
js/orgfig.js           the organism drawn once and eased: core, arms, star, the AI's reading of the sum
js/nn.js               a tiny neural network (tanh hidden layer, Adam), seeded; the toy bend data; used by screen 4
js/screens/common.js   step names, the top of every screen, actions
js/screens/org.js      screens 1 and 2: the organism, and the wave and campaign (two views of screen 2)
js/screens/mirrors.js  the four mirrors and the AI lens on screen 4 (loops, beams from each department to the links it sees, one big loop)
js/screens/lab.js      screens 3 to 7: attention (calendar and jobs), how it learns, the honest test, aligned and safe, steer (shared measure, then the pilot)
tests/run.html         browser test runner
```

## The story (keep it consistent)

Ridgeline Bourbon, Texas, week 155 = Sep 21, 2026. Shipments down ~8.0% over the last 13 weeks; depletions down only ~3.8%. The gap is distributor inventory: they took extra shipments ahead of the April price increase (weeks 125-129), have been drawing inventory down since, and stockouts arrived at the tail. The forecast is last year's shipments + 3%, so it inherits last year's inventory build ("Our shipment forecast tells us what will sell" is the blind spot). Eight forces: underlying growth, price, lost distribution (Chain X resets our range, week 140), competitor launch (Harlan Reserve, week 138), promotion (a six-week summer run), stockouts, inventory swing, noise. About two thirds of the drop is inventory and availability; part of it is temporary. The decomposition is an oracle (hidden generator truth), shown to one decimal with a caveat that a 13-week comparison moves about +/-4 points on noise.

The model starts from the **simple forecast** (same week last year x recent trend) and learns corrections to it: a momentum correction, price change, promotion change and distribution change (distribution as last reported, five weeks old; list price is announced, promotions are planned). With every weight at zero it IS the simple forecast. A ridge penalty ("caution": Free / Some / Careful / Very careful, default 0.8, a judgment call made after seeing results and labelled as such) pulls corrections back toward zero. Calm history rewards confidence and a market that changes rewards caution, and the choosing weeks only see the calm: that trade-off is a deliberate lesson. Honest results on the 26 exam weeks: today's forecast ~8.5% typical miss (9.6% if scored on shipments, what it actually forecasts), simple no-AI ~5.2%, AI ~5.2% at "careful", noise floor ~3.9%. **Most of the gain is forecasting depletions instead of shipments (with a trend measured from recent weeks), with no AI; AI is statistically tied with the simple method at market level** (rolling origin: AI beats the simple method in 4 of 5 windows and today's in 5 of 5, and the windows overlap the choosing and exam weeks). The case for AI is a hypothesis about finer grain (distributor x SKU group, ~100 cases a week per series) and about a model that shares what it learns across series, which this lab's model does not do; the pilot exists to test it. Dropping the distribution input or the caution looks better on the choosing weeks and worse on the exam (a regime change validation could not see).

Per-case economics: $95 margin lost, $18 to carry a case as distributor inventory; replays score against `want` (depletions with no stockouts, hidden in real life; the lab says so). The calculator compares AI with a simple no-AI forecast by default (planner time is not counted as AI value then), uses the middle of the gain range, shows the multiple of the back-test gain that would have to hold for it to pay for itself, and the brief opens with a recommendation, a trigger for running the AI test, and who owns the scoreboard.

If you change the generator, re-run the tests and re-check the headline (-8%), the decomposition, and the findings that depend on specific effects (the validation-vs-exam lesson, the AI-vs-simple tie, band coverage). Every number in the prose is computed, so the text will adapt, but the story may need rewording if a conclusion flips.

## Roadmap Matthew might set

A grain-level scenario (distributor x SKU series) so the finer-grain hypothesis can be tested rather than asserted, a second scenario that exercises a different capability (retrieval or generation, e.g. research synthesis).
