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

## Deferred

Open and researched, explicitly not now.

- [ ] **C9. Charts: the missing three** (M) — **area, scatter and radar do not
      exist**, and legends are implemented three times over, in `donut-chart`,
      `line-chart` and `meter-group`, rather than shared. The differentiator is
      theme-token integration — do not build a chart engine.
