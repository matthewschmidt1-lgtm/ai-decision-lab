# AI Decision Lab

An interactive lab for CPG leaders. See what really happened to a brand's shipments, teach a neuron to forecast, learn what neural nets are, and design the pilot that would show whether AI helps.

> AI is not the product. Better decisions are.

## The experience (seven screens, about ten minutes)

1. **The problem.** A fictional bourbon brand's shipments are down 8% in Texas. Pick the biggest piece of the drop, then see what depletions did.
2. **The blind spot.** Five beliefs inside how the brand plans. Call each one, then check it against the data.
3. **Teach a neuron.** A real training run in your browser: random start, measure the miss, nudge the weights. Try too slow and too fast.
4. **The honest test.** Today's forecast against a simple no-AI forecast and the AI, on weeks the model never saw.
5. **Neural nets.** One neuron, a network, a language model: the same loop at three sizes.
6. **Three questions.** Business, System and People.
7. **The pilot.** Choose a target, length and scope, check that a test that size could tell, and copy the brief.

Shipments are product the brand ships to distributors. Depletions are what distributors sell to on- and off-premise accounts. Sell-through is consumers buying at retail; the lab has no data for it.

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
