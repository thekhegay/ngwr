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

- [ ] **F1. Parity with React Bits** (XL) — `ngwr/bits` has 23 entries;
      [React Bits](https://www.reactbits.dev) lists over 200 across text
      animations, animations, components and backgrounds. Backgrounds first
      (ripple grid, iridescence, …), then the text and
      cursor effects. Each one a
      Signal-input component on theme tokens, honouring
      `prefers-reduced-motion`, with a docs page under `/bits`.

## Deferred

Open and researched, explicitly not now.

- Nothing deferred right now.
