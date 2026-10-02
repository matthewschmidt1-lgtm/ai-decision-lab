# AI Decision Lab

An interactive lab for CPG leaders. Find where AI could improve a real decision, open the hood on how it works, and design the pilot that would show whether it works.

> AI is not the product. Better decisions are.

## The experience (about 25 minutes)

1. **Find the opportunity.** A fictional bourbon brand is down 8% in Texas. You have three questions. Commit to a read, see where the 8% really went, name the assumptions everyone is making, and decide which decision is worth pointing AI at, including the ones that should not get AI at all.
2. **Open the hood.** A real forecasting model trains in your browser, and is tested honestly against today's method and a simple method with no AI. Choose its inputs on one slice of history, score once on weeks it never saw, ask it why it said what it said, turn a forecast into a shipping decision, watch it learn from a random start (and break it with a learning rate that is too high), then read the math and the actual source code.
3. **Design the pilot.** Size the value with assumptions you can change, look for friction in the system and the people, and write the experiment: hypothesis, baseline, intervention, human role, metric, test period and the decision after. See whether a pilot of that size could even tell a real gain from noise. Ends with a brief you can copy or print, which starts with what to do first without AI, and the question: *what would we need to learn?*

Three lenses run through it: **Business** (does it create value?), **System** (can it work?), **People** (will they use it?).

## Run it

No Node needed.

```bash
python3 scripts/dev.py 4180
```

Open http://localhost:4180. Model tests: http://localhost:4180/tests/run.html.

## What is real and what is fictional

The brand, distributors, people and every number in the data are fictional, generated deterministically so everyone sees the same thing. The model is not fictional: weights are learned by gradient descent on the page, the exam weeks are never seen in training or used to make choices, every input is knowable four weeks ahead, and the code on the "math and code" screen is printed from the functions that are running.

See [CLAUDE.md](CLAUDE.md) for the design principles, constraints and the story's moving parts.
