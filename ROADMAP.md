# Roadmap

What is planned, and nothing else. Why a gate exists, what it cannot see, which
contracts look like bugs — none of that is here. This file used to carry a
second copy of it and no longer does.

Sizes are S / M / L / XL.

## Order

1. **C3** — Combobox / autocomplete
2. **C7** — Menubar
3. **A** — finish it: A1 mode coverage, A2 the SSR remainder
4. **D6** — High-contrast rendering (`prefers-contrast: more` first)

Two notes, then it stands:

- **Nothing is blocked any more.** C3 and C7 were both waiting on a rebuild onto
  `@angular/aria` that is no longer planned — see
  [Non-goals](#non-goals-researched-rejected).
- **A is in the sequence now, not beside it.** It used to be described as
  continuous work that lands between features; the remainder is small enough to
  finish outright, so it gets a slot instead of a habit. **B4 leaves the
  sequence** and stays open but unscheduled.

Everything below the Order is open but unscheduled; everything under
[Deferred](#deferred) is explicitly not now.

## A — Trust & hardening

- [ ] **A1. Mode coverage** (M) — the suite exists, gates CI, and every entry
      point has a spec. What is left is modes INSIDE covered components: a spec
      on `wr-table` says nothing about tree rows unless it exercises them.
      Written as an open-ended tail it could never close, so the bar is
      enumerable instead: **every documented non-default value of a mode-shaped
      input has at least one spec that drives it** — `selectionMode`, `mode`,
      `openOn`, `variant`, `responsive` and their kin, which the API tables
      already list. Caveat when running the suite: `mcp/server.spec.ts` spawns
      `dist/lib/mcp/server.js`, so on a tree that has never run `build:lib` two
      of its specs fail and two skip.
- [ ] **A2. SSR remainder** (S) — per-component SSR-safety notes in the docs,
      and incremental hydration (`withIncrementalHydration()` + `@defer (hydrate
      on …)`).

## B — Platform alignment (Signal Forms)

- [ ] **B4. Schema-driven `wr-form`** (L, stretch) — generate a form from a
      typed field schema; pairs with Signal Forms' schema API. Unblocked.

## C — Data-heavy + missing components

- [ ] **C3. Combobox / autocomplete proper** (M) — free-text input plus
      suggestions is a different ARIA pattern than select-with-search, so it is
      a component rather than a mode on `wr-select`. Unblocked: the interaction
      model is ours to write, and the comparable ones already in the catalog run
      to a few dozen lines apiece.
- [ ] **C7. Menubar** (M) — horizontal app menu with submenus: roving focus,
      typeahead, submenu orchestration. Completes dropdown / context-menu into a
      menu family.

## D — Theming & visuals

- [ ] **D2. System-token layer** (S) — **believed complete.** Its three
      additions shipped (`--wr-disabled-opacity`, the
      `--wr-color-fill{,-subtle,-strong}` scale, `check:tokens`), and its other
      three parts were refused with reasons recorded in git: a `--wr-sys-*`
      synonym layer, `color-scheme` (already shipped), and emitted `--mat-sys-*`
      interop. Close it, or say what else was meant. Its one live remnant is the
      colour role-rename below.
- [ ] **D6. High-contrast rendering** (M) — `prefers-contrast: more` first: the
      fix is token-shaped (~11 declarations — the `-ink` shares re-derived,
      `text-faint` 0.6 → 0.85, a deeper light `on-surface-muted`, an opaque
      `outline`) and it is provable, since Playwright takes `contrast: 'more'`
      on the context, so `check:contrast` gains a mode and keys its baseline
      `${rule} (${theme}, ${mode})`. `forced-colors: active` is mostly NOT
      token-shaped and is a separate, weaker case.

## E — DX, docs & distribution

- [ ] **E5. `ngwr/kit` standalone utilities** (M) — publish the internal signal
      utils / positioning / density / hotkey / storage helpers as a zero-dep
      package usable without the components. Top-of-funnel play (ngxtension does
      ~42k dl/wk).
- [ ] **E6. Ejectable components** (L, stretch) — keep npm + `ng update`, but
      add a schematic that copies a component's source into the user's repo.
      The shadcn ownership model without abandoning the update path;
      copy-paste-only has weak traction in Angular (spartan ~21k dl/wk).
- [ ] **E7. Locale packs** (M) — built-in component strings for ~20 locales on
      top of the i18n service. Two ship today (en / ru); NG-ZORRO ships ~80. A
      pack only multiplies what is actually wired up, so the audit for
      hard-coded English comes first.
- [ ] **E9. Blocks** (L) — `ng g @ngwr/blocks:auth|dashboard|landing|settings`,
      composed from ngwr components and themed through the registry's
      `registry:theme` presets. Proven adoption driver (shadcnblocks, Ant Pro,
      Tremor); virtually no Angular block ecosystem exists.

## F — AI components (`ngwr/ai`)

A confirmed open lane: Kendo's kit is paid, NG-ZORRO is porting Ant Design X,
nobody ships a free, complete Angular AI kit.

- [ ] **F2. Chat / agent kit** (XL) — message thread, prompt input (attachments,
      slash commands via the mention plumbing), tool-call / approval /
      reasoning-trace renderers, sources panel — wired to AG-UI or
      Vercel-AI-SDK-style streams. Showcases the existing toast, command-palette
      and animation kit.

## Deferred

Open and researched, explicitly not now.

- [ ] **C9. Charts: the missing three** (M) — **area, scatter and radar do not
      exist**, and legends are implemented separately in `donut-chart` and
      `line-chart` rather than shared. The differentiator is theme-token
      integration and dashboard blocks — do not build a chart engine.
- [ ] **C10. Rich text editor** (XL) — the biggest single component gap across
      free Angular libraries. Likely a ProseMirror-based `ngwr/editor`. Validate
      demand before committing.
- [ ] **D3. Squircle: graduate or cut** (S) — decide on `corner-shape` browser
      support; "experimental" should not survive two majors.
- [ ] **D5. Figma kit** (L) — token-synced community kit; a credibility
      multiplier. `wrThemeTokens()` is the recipe such a kit would otherwise
      reimplement by hand.

## Breaking changes on the table

- [ ] **Colour role-rename** — **11 values across 7 files** still name
      `--wr-color-{white,dark,light}` or a derivative (`click-spark.ts`,
      `fuzzy-text.ts`, `calendar-heatmap.ts`, `gauge.ts`, `knob.ts`,
      `line-chart.html`, `markdown/styles/_index.scss`), plus dropping `light` /
      `dark` from `WR_COLORS` / `WrColor`. Codemoddable, so it owes a
      `migration-vN` in whichever major carries it.
- [ ] **Angular 23 peer baseline** (~Nov 2026).
- [ ] **Per-entry bundle budgets enforced in CI.**

## What blocks what

Nothing is hard-blocked.

- **D5** — blocked in practice on D2.
- Everything else is unblocked, including C3 and C7, which were held for a
  rebuild that is no longer planned.

## Non-goals (researched, rejected)

- **Input mask** — bless `ngx-mask`, do not own one. `[wrInput]` is a directive
  on the real `<input>`, so a mask composes on the same element with no adapter
  and nothing to keep in sync. Documented at `/reference/components/input` with
  six live masks.
- **Pure-headless library** — not our shape; ngwr ships styled components.
- **Rebuilding the interactive internals on `@angular/aria`** — was planned as
  B2, dropped 2026-09-05. The package is real and stable as of v22, and the
  model it copies won decisively in React, where one Radix primitive
  (`react-dropdown-menu`) outdraws all of MUI roughly five to one. Neither
  argument survives contact with this library.

  **The saving is already banked.** The pitch is "less a11y logic to own", so
  the logic was counted: 31 lines of keyboard and focus handling in `select`,
  24 in `tree`, 11 in `tabs`, 4 in `context-menu`, 0 in `collapse`. Adopting the
  primitive means deleting a few dozen tested lines to inherit someone else's
  behaviour — including where ours diverges on purpose (`wr-list`'s row keeps
  `role="listitem"`; `wr-mention` stays a `textbox`). The virtualized lists
  cannot use it at all: the primitive tracks a live collection of `ngOption`
  directives and our windowing removes them from the DOM.

  **And nobody has gone first.** A year after its first publish and one release
  into stable, no Angular UI library depends on it — not PrimeNG, not NG-ZORRO,
  not Spartan, not Angular Material, which ships from the same repository. Taiga
  wrote its own CDK instead. 98k weekly downloads against the CDK's 4.1M.
  Angular's own roadmap lists Aria beside the CDK and Material as one of three
  options rather than the direction of travel.

  Not a permanent no: revisit per component if one is ever built where the
  interaction model IS the work, and reopen if Material adopts it.
- **Copy-paste-only distribution** — weak traction in Angular; E6 hybrid instead.
- **A proprietary chart engine, or an AG-Grid feature chase.**
- **Runtime CSS-in-JS** — CSS custom properties are already the right model.
