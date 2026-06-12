# Roadmap — v8

> Living document. v7.0.0 shipped 2026-06-12. v8.0 targets the Angular 23
> baseline (~Nov 2026); everything non-breaking ships in 7.x minors along the
> way. Sizes: S / M / L / XL.

## A — Trust & hardening

The catalog is ~126 entry-points gated by lint + build only. This theme is
what makes v8 a library people can bet on.

- [ ] **A1. Test foundation** (XL, spans the cycle) — vitest via `ng test`,
      CI-gated. Order: utils / validators / pipes / services first (pure
      logic), then interaction tests for the top overlay + form components
      (select, date-picker, dialog, popover, toast).
- [ ] **A2. CDK test harnesses** (L) — ship `ngwr/<entry>/testing` harnesses
      so consumers can test against wr components. Consumer-facing feature.
- [ ] **A3. a11y CI** (L) — axe-core sweep over every showcase route + an
      APG-pattern conformance pass per component.
- [ ] **A4. SSR / hydration audit** (M) — render every entry under SSR +
      hydration smoke in CI; per-component SSR-safety notes in the docs.
- [ ] **A5. Visual regression** (M) — Playwright screenshot diffs across the
      showcase. Catches the "tabs 1px off / skeleton invisible in light mode"
      class of bugs automatically.

## B — Signal Forms

- [ ] **B1. Signal Forms support across all form controls** (XL, flagship) —
      dual support (Reactive + signal forms), starting with input / select /
      checkbox / radio / switch / slider.
- [ ] **B2. `WR_FORM_ERRORS` provider** (M) — centralized, i18n-aware
      validation messages; `wr-form-field` renders them automatically.
- [ ] **B3. Schema-driven `wr-form`** (L, stretch) — generate a form from a
      typed field schema; pairs with B1 + B2.

## C — Data-heavy components

- [ ] **C1. Table v2** (XL) — column pin / resize / reorder, row selection,
      expandable rows, virtualized body, server-side sort / filter / paginate.
      Today's API stays as the simple tier.
- [ ] **C2. Virtual scroll in overlay pickers** (M) — known regression:
      `wr-autocomplete` had opt-in virtual scroll that didn't survive the
      select consolidation. Applies to select / cascader / tree / mention.
- [ ] **C3. Event calendar / scheduler** (XL, candidate for 8.1) — month /
      week / day event views with drag. Distinct from the date-picker grid.
- [ ] **C4. Transfer (dual listbox)** (M).
- [ ] **C5. Tour / onboarding** (M) — spotlight steps anchored to elements,
      built on the existing overlay + affix primitives.
- [ ] **C6. Charts round-out** (L) — area / scatter / radar; unified legends
      and theming across the seven existing charts.

## D — Theming & visuals

- [ ] **D1. Theme presets + builder** (L) — algorithmic palette from a seed
      color, 2–3 prebuilt themes, live theme-builder page in the showcase.
- [ ] **D2. Squircle: graduate or cut** (S) — decide based on `corner-shape`
      browser support; "experimental" shouldn't survive two majors.
- [ ] **D3. Motion tokens** (M) — unify durations / easings as
      `--wr-motion-*` across the animation kit and overlays.

## E — DX & docs

- [ ] **E1. Versioned docs** (M) — freeze v7 docs (e.g. a `/7.x` route)
      before v8 content lands; docs search wired into the command palette.
- [ ] **E2. llms.txt + markdown export per page** (M) — make the docs
      consumable by AI coding agents; stretch: an ngwr MCP server.
- [ ] **E3. API reference auto-extraction** (L) — generate the per-component
      type tables from JSDoc instead of maintaining them by hand.
- [ ] **E4. Playground embeds** (M) — StackBlitz per component page.

## v8.0 breaking bucket

Kept deliberately small:

- [ ] Angular 23 peer baseline.
- [ ] Drop v7 compat leftovers.
- [ ] Naming nits: `/pipes/range` → `/pipes/wr-range`.
- [ ] Per-entry bundle budgets enforced in CI.

## Suggested starting order

1. **A1** — tests (start immediately, runs through the whole cycle)
2. **B1** — signal forms (the strategic bet)
3. **C1** — table v2 (most-requested enterprise gap)
4. **C2** — vscroll regression (a real v7 loss, cheap to recover)
5. **E1** — freeze v7 docs early; it only gets harder later
