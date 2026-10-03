# AI Decision Lab

An interactive lab for CPG leaders, built on one foundation: running a business is a mix of work that humans do better and work that computers do better, and time and focus are what it runs short of. AI pays off when it moves hours from routine work to judgment, and it only sticks when strategy, systems and people line up.

> AI is not the product. Better decisions are.

## The experience (seven screens, about twelve minutes)

1. **Which loop are you in?** The activity loop (data, spreadsheet, deck, meeting, "can you cut it another way?", spreadsheet) against the learning loop. Then five jobs, one at a time: who should do it, and what happens if each of human, computer and together gets it wrong. The right workflow depends on capability, uncertainty and the cost of a mistake.
2. **Where does the time go?** One planner's week (an illustrative assumption). Slide how far to push automation and choose where the freed hours go. The arithmetic reconciles on the page, automation creates new checking work, the estimate is a range, and capacity is not savings: hours that go nowhere in particular are worth nothing.
3. **How it learns.** A real training run in your browser: one neuron on the forecast data (one example week, one round of learning), then a small neural network on a made-up discount curve, with training error against test error for one, three and twelve neurons.
4. **The honest test.** Today's forecast against a simple no-AI forecast and the AI, on weeks the model never saw, and what still needs a person.
5. **Make it stick.** The three lenses (Business creates value, System creates leverage, People creates capability), where they overlap (scale, capability, leadership, the multiplier), and the gap between them. Then design the review and approvals.
6. **Is it safe to try?** Which announcement would you make as CEO, what each makes an employee hear, the safe and unsafe adoption loops, and six questions people must be able to answer before you announce.
7. **The pilot.** A target, length and scope, a check that a test that size could tell, and a copyable brief.

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
