# Roadmap

What is planned, and nothing else. Why a gate exists, what it cannot see, which
contracts look like bugs — none of that is here. This file used to carry a
second copy of it and no longer does.

Sizes are S / M / L / XL.

## Order

Nothing is scheduled and nothing is blocked. Everything below is open but
unscheduled; everything under [Deferred](#deferred) is explicitly not now.

## E — DX, docs & distribution

- [ ] **E5. `ngwr/kit` standalone utilities** (M) — publish the internal signal
      utils / positioning / density / hotkey / storage helpers as a zero-dep
      package usable without the components.
- [ ] **E6. Ejectable components** (L, stretch) — keep npm + `ng update`, but
      add a schematic that copies a component's source into the user's repo.
      Ownership of the source without abandoning the update path.

## F — Catalog

- [ ] **F1. Parity with React Bits** (XL) — `ngwr/bits` has 21 entries;
      [React Bits](https://www.reactbits.dev) lists over 200 across text
      animations, animations, components and backgrounds. Backgrounds first
      (threads, dot grid, ripple grid, iridescence, …), then the text and
      cursor effects. Each one a
      Signal-input component on theme tokens, honouring
      `prefers-reduced-motion`, with a docs page under `/bits`.
- [ ] **F2. More charts** (L) — `ngwr/charts` has seven (bar, line, donut,
      gauge, sparkline, meter group, calendar heatmap). **Area, scatter and
      radar do not exist**, and legends are implemented three times over, in
      `donut-chart`, `line-chart` and `meter-group`, rather than shared. The
      differentiator is theme-token integration — do not build a chart engine.

## Deferred

Open and researched, explicitly not now.

- Nothing deferred right now.
