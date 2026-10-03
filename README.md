# AI Decision Lab

An interactive lab for CPG leaders. See what really happened to a brand's shipments, teach a neuron to forecast, learn what neural nets are, and design the pilot that would show whether AI helps.

> AI is not the product. Better decisions are.

## The experience (five screens, about eight minutes)

1. **How the business works.** The chain from supplier to distributor to accounts to consumers: what flows each way, what each link can see, and where information gets distorted. Then pick which decision to point AI at, and see whether AI, a simple rule or neither is the right tool.
2. **How it learns.** A real training run in your browser: one neuron on the forecast data (random start, measure the miss, nudge the weights; try too slow and too fast), then a small neural network that bends to fit a pattern a line cannot, and memorizes noise when it has too many neurons.
3. **What it can learn.** Five claims people make about AI. Call each one, then check it against the models you just trained.
4. **The honest test.** Today's forecast against a simple no-AI forecast and the AI, on weeks the model never saw.
5. **The pilot.** The three questions (Business, System, People), then a target, length and scope, a check that a test that size could tell, and a copyable brief.

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
