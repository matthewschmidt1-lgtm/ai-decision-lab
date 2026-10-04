# AI Decision Lab

An interactive lab for CPG leaders, built on one thesis: **people choose what their own departments optimize, the organization is the sum of all those results, and AI shows what it is actually optimizing.**

A company behaves like one living model: data, representations, weights, attention, a loss function, and learning. Each department is its own loss function, and nobody owns the sum. Effort cancels, signals decay on the way up, and the organization gets in its own way. AI's job is to read the whole organism, show what it is really optimizing, give time and focus back to judgment, and help people choose one shared measure.

> AI is not the product. Better decisions are.

## The experience (seven screens, about twelve minutes)

1. **The organism.** Four departments, each pulling toward its own goal, and the mantra everyone repeats: *Beat the market*. Drag how hard each pulls. Ask the AI what the company is really optimizing and watch the sum of the pulls draw in.
2. **The wave, then the campaign.** Consumer demand rises 3%. Four layers (retailer, distributor, supplier, plant) each make a sensible ordering decision, and a wave of orders grows and distorts as it moves up the chain. The camera starts close and pulls back to show the consumer's change as a thin gold band beside a plant swinging up to 47%. Every layer responded rationally; the system did not. Switch to sharing real demand with every layer and the plant's swing falls to 15%. A second view runs a campaign: Marketing launches, Operations is measured on lean stock, the shelf runs empty at the peak, then a glut. Compare Operations alone, the plan trusted at face value, and an AI that reads how past campaigns landed.
3. **Where attention goes.** One planner's week as a calendar of 40 tiles. Push automation and watch hours return, choose where they go, and open any block to see who should do it and what happens if a human, a computer, or both get it wrong. Capacity is not savings.
4. **How it learns.** Opens on the organization: four mirrors, one per department, each reflecting only its own slice of the campaign ("Launched on time", "My forecast was close", "I held the least stock", "Carrying cost was the lowest") with a small loop spinning inside each. Pull the camera back and an AI lens lights all seven links, and learning becomes one large loop through every department. Each department was right; the company paid $57K, against $13K when it learned from the whole chain. Then how a machine learns, in your browser: one neuron on the forecast data, then a small neural network on a made-up discount curve, with training error against test error for one, three and twelve neurons.
5. **The honest test.** Today's forecast (the organization's belief) against a simple no-AI forecast and the AI, on weeks the model never saw, and what still needs a person.
6. **Aligned, and safe to try.** The three lenses and where they overlap (scale, capability, leadership, the multiplier); name the weakest and it drifts away. Then psychological safety: which announcement would you make, and do problems reach leadership or stop at a wall?
7. **Steer.** Give every department a share of one common measure and watch the pulls line up. Then design the pilot: a target, length and scope, a check that a test that size could tell, and a copyable brief.

Shipments are product the brand ships to distributors. Depletions are what distributors sell to on- and off-premise accounts. Sell-through is consumers buying at retail; the lab has no data for it.

## Run it

No Node needed.

```bash
python3 scripts/dev.py 4180
```

Open http://localhost:4180. Model tests: http://localhost:4180/tests/run.html.

## What is real and what is fictional

The brand, distributors, people and every number in the data are fictional, generated deterministically so everyone sees the same thing. The department pulls and the campaign are labelled illustrations with real arithmetic: the pulls add as vectors, the stock simulation conserves units, and the bullwhip chain applies one ordering rule layer after layer. The models are not fictional: weights are learned by gradient descent on the page, the exam weeks are never seen in training or used to make choices, and every input is knowable four weeks ahead.

See [CLAUDE.md](CLAUDE.md) for the design principles, constraints and the story's moving parts.
