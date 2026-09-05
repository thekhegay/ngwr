# Roadmap — v14

What is planned, and nothing else. The reasoning a contributor or an agent needs
while working — why a gate exists, what it cannot see, which contracts look like
bugs — lives in [AGENTS.md](AGENTS.md). This file used to carry a second copy of
all of it; it no longer does.

Sizes are S / M / L / XL.

## Order

1. **C3** — Combobox / autocomplete _(hard-blocked on B2)_
2. **B2** — Rebuild internals on `@angular/aria`
3. **B4** — Schema-driven `wr-form`
4. **D6** — High-contrast rendering (`prefers-contrast: more` first)

Two notes, then it stands:

- **C3 sits above B2 and is blocked by it.** In practice either B2 moves up or
  C3 moves down.
- **A1 and A5 are deliberately unsequenced** — continuous work that lands
  between features rather than a queue to pull from.

Everything below the Order is open but unscheduled; everything under
[Deferred](#deferred) is explicitly not now.

## A — Trust & hardening

- [ ] **A1. Test foundation** (XL, continuous) — the suite exists and gates CI.
      What remains is **mode coverage inside components that are already
      covered**: a mode is covered when a spec EXERCISES it, and a component
      with six inputs has more combinations than any list here can name.
      Caveat when running it: `mcp/server.spec.ts` spawns
      `dist/lib/mcp/server.js`, so on a tree that has never run `build:lib` two
      of its specs fail and two skip.
- [ ] **A5. Visual regression** (M) — the painted-a11y half landed
      (`check:contrast`, `check:state-a11y`, `check:rtl-layout`). Remaining:
      **Playwright screenshot diffs across the showcase**, and the last 24
      state-dependent classes, several of which need a gesture rather than a
      selector (a scroll for back-top, a chosen file for file-upload). B2 wants
      the screenshot diffs.
- [ ] **SSR remainder** (S) — per-component SSR-safety notes in the docs, and
      incremental hydration (`withIncrementalHydration()` + `@defer (hydrate on
      …)`).

## B — Platform alignment (Signal Forms + Angular Aria)

- [ ] **B2. Rebuild interactive internals on `@angular/aria`** (XL — DOM and
      BEM classes will shift, so it needs a major) — listbox→select, combobox,
      menu/menubar, tabs, accordion, tree, grid primitives. Positions ngwr as
      "styled components over the official primitives": less a11y logic to own,
      and a story no other styled Angular library has yet. **Blocks C3, holds
      C7.** Its precondition is met — A1 pins the DOM and classes it will churn;
      what A5 still owes it is screenshot diffs.
- [ ] **B4. Schema-driven `wr-form`** (L, stretch) — generate a form from a
      typed field schema; pairs with Signal Forms' schema API. Unblocked.

## C — Data-heavy + missing components

- [ ] **C3. Combobox / autocomplete proper** (M, **hard-blocked on B2**) —
      free-text input plus suggestions is a different ARIA pattern than
      select-with-search; build on the Aria `Combobox` primitive.

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

- [ ] **C7. Menubar** (M) — horizontal app menu with submenus. **Held for B2 by
      decision**, not merely "cheaper after": the component is roving focus,
      typeahead and submenu orchestration, which is what the Aria primitive
      carries — building it first means writing that twice.
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
- [ ] **B2 internals swap** — DOM and BEM class changes from the Aria
      primitives. Public API by this project's own rules, so it needs a major.
- [ ] **Angular 23 peer baseline** (~Nov 2026).
- [ ] **Per-entry bundle budgets enforced in CI.**

## What blocks what

The one hard edge is B2.

- **C3** — hard-blocked on B2; it needs the Aria `Combobox` primitive.
- **C7** — technically unblocked, held for B2 by decision.
- **D5** — blocked in practice on D2.
- **B2** — unblocked; A1 met its precondition, A5 still owes it screenshot diffs.
- Everything else is unblocked.

## Non-goals (researched, rejected)

- **Input mask** — bless `ngx-mask`, do not own one. `[wrInput]` is a directive
  on the real `<input>`, so a mask composes on the same element with no adapter
  and nothing to keep in sync. Documented at `/reference/components/input` with
  six live masks.
- **Pure-headless library** — `@angular/aria` occupies that for free; build on it.
- **Copy-paste-only distribution** — weak traction in Angular; E6 hybrid instead.
- **A proprietary chart engine, or an AG-Grid feature chase.**
- **Runtime CSS-in-JS** — CSS custom properties are already the right model.
