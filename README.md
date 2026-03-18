# Wolf Sheep Simulation

A small ecosystem simulation built with React + TypeScript + Vite.

Sheep move around and graze, wolves hunt sheep, grass regrows, and stone walls can be used to divide the world in separate, or semi-separate paddocks.

[play it live](https://secretgeek.github.io/wolf-sheep/) (coming soon)

I've built similar things before, see:

- [some life](https://github.com/secretGeek/some-life/blob/master/README.md) ([view it live](https://secretgeek.github.io/some-life/))
- [hexerly: evolve sample](https://secretgeek.github.io/hexerly/samples/evolve.html)
- [robots v electric sheep](https://github.com/secretGeek/robots-versus-electric-sheep)

## What It Does

- Simulates a grid-based world, home to a grassy plateau.
- Lets you paint `mud`, `grass`, `walls` into this world.
- You can also inject `sheep`, and `wolves` into the world.
- You can adjust the speed at which the world runs.
- We track population and energy stats for sheep and wolves.
- You can inspect a cell, to view details about animals.
- Includes birth/death/decay/reproduction cycles.
- Reproduction includes genetic copies with crossover and mutation.

## Controls

- `mud`: set a cell to bare ground.
- `grass`: set a cell to full grass.
- `wall`: place a wall (also clears animals on that cell).
- `sheep`: add a sheep (if the cell is free).
- `wolf`: add a wolf (if the cell is free).
- `inspect`: click a cell to see grass and animal details.
- `speed 0-5`: pause (`0`) or run faster (`1-5`).

## Run Locally

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal.

## Build

```bash
npm run build
npm run preview
```

## Notes

- The simulation currently uses `Math.random()`, so runs are non-deterministic.
- Tuning constants for movement, aging, energy, and reproduction are in `src/simulation.ts`.

## Discussion

It's been challenging to "balance" the predators (wolves) such that they don't cause global extinction of sheep (and thus themselves).

While this can be seen as a stern rebuke of the folly of humans (*we* are the "wolves" in this metaphor) -- I think I ought to just work on improving the balance, by programming my way to a better solution.

I remember the same problem arose in [robots v electric sheep](https://github.com/secretGeek/robots-versus-electric-sheep) and to improve the situation I ran the program in a loop, crashing the world every time extinction occurred, and tweaking the parameters via simulated annealing until improvements were found.

I'd like to use a different approach entirely. Something less mathematical and more philosophical.

For example, I'm trying to find an approach that involves gently evolving from "no predatory behaviour", to "just a little bit of light predation", such that predator and prey can co-evolve.

I'll definitely want to add in more (gene-controlled) behaviour for the sheep, such as flocking, warning of predators, running from predators etc.