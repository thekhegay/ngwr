# Roadmap

What is planned, and nothing else. Why a gate exists, what it cannot see, which
contracts look like bugs — none of that is here. This file used to carry a
second copy of it and no longer does.

Sizes are S / M / L / XL.

## Order

1. **D7** — Colour is never the only channel (it sizes D6)
2. **D6** — High-contrast rendering (`prefers-contrast: more` first)

Two notes, then it stands:

- **Nothing is blocked, and section C is empty.** C3 turned out to be shipped
  already and C7 is cancelled — both are in
  [Non-goals](#non-goals-researched-rejected); C9 and C10 are
  [Deferred](#deferred).
- **Sections A and B are closed.** Mode coverage and the SSR remainder finished
  A; `ngwr/schema-form` finished B.
- **D2 is closed.** Three of its parts shipped (`--wr-disabled-opacity`, the
  `--wr-color-fill{,-subtle,-strong}` scale, `check:tokens`) and three were
  refused with reasons in git — a `--wr-sys-*` synonym layer, `color-scheme`
  (already shipped), emitted `--mat-sys-*` interop. Its one live remnant, the
  colour role-rename, is a [breaking change](#breaking-changes-on-the-table)
  rather than a theming task, and is tracked there.

Everything below the Order is open but unscheduled; everything under
[Deferred](#deferred) is explicitly not now.

## D — Theming & visuals

- [ ] **D7. Colour is never the only channel** (M) — and it comes BEFORE D6,
      because it decides how much of D6 is a token problem at all. Measured off
      the shipped `$base-colors`: six of the nine intents — primary, secondary,
      success, danger, info, medium — sit inside a **1.06:1** band of relative
      luminance, and `success` against `danger` is **1.004:1**, the same grey.
      Sixteen of the thirty-six pairs collapse. It is not an oversight: v11
      deepened five intents so `_contrast()` would pick a WHITE label, and
      tuning nine colours to one ratio against the same two candidates IS
      tuning them to one luminance. **So the palette cannot carry a second
      channel and the components have to.** A sweep upheld 32 findings; the six
      that were plain defects are fixed, the rest are decisions — `wr-toast`
      has no per-type glyph, `wr-timeline`'s dot varies by one declaration
      across five intents, the donut and line charts separate series by fill
      alone, and `wr-typography--tone-*` is an API whose whole purpose is to put
      meaning in colour. The instrument is **`check:color-only`**, a `pnpm lint`
      stage in the `check:rtl` / `check:tokens` "say why" shape: a state
      modifier whose own declarations are all colour fails without a
      `// color-ok: <reason>` naming the second channel; a prototype finds ~31.
      It has to be a SOURCE check — axe ships no 1.4.1 rule, and no assertion
      about the colours themselves is satisfiable while the intents must share
      a luminance to keep their labels legible. Two models already in the tree:
      `wr-statistic` draws two different triangles, `wr-calendar-heatmap` ramps
      opacity over one hue. Unlike the `--wr-color-outline` 1.4.11 trade, none
      of this is written down yet — recording it is part of the item.
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

- **D5** — was blocked in practice on D2, which is now closed. What it waits
  on instead is a token EXPORT: a kit reimplements `wrThemeTokens()` by hand
  otherwise, and the recipe is light-only, so dark has to come off the built
  stylesheet the way `check:theme` reads it.

## Non-goals (researched, rejected)

- **Input mask** — bless `ngx-mask`, do not own one. `[wrInput]` is a directive
  on the real `<input>`, so a mask composes on the same element with no adapter
  and nothing to keep in sync. Documented at `/reference/components/input` with
  six live masks.
- **Pure-headless library** — not our shape; ngwr ships styled components.
- **A separate combobox / autocomplete component** — was C3, closed 2026-09-05
  as already shipped. The item claimed free-text-plus-suggestions is a different
  ARIA pattern from select-with-search; it is the same one, and `wr-select` was
  already rendering it. `mode="search"` puts `role="combobox"` on a real
  `<input>` with `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls` and
  `aria-activedescendant`, and `freeText` commits a query that matched no option
  as the value — which is autocomplete. The component's own JSDoc calls it "the
  unified combobox primitive". One thing was genuinely missing and it was one
  attribute: `aria-autocomplete`, which the command palette and `wr-mention`
  both carry and the only EDITABLE combobox of the three did not. Shipped
  static on the search input and conditional on the tag input, whose combobox
  role is itself conditional. Building a second component would have duplicated
  a working one.
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
- **Menubar** — was C7, cancelled 2026-09-06. The item's own pitch was that it
  "completes dropdown / context-menu into a menu family", and the family turned
  out to be the part already built: `wr-context-menu-item` takes a nested
  `[submenu]` that opens as its own overlay pane on hover, with an open delay and
  a close grace window, and `context-menu/menu-focus.ts` implements the APG menu
  pattern — one tab stop per pane, arrows / Home / End roving over the enabled
  rows, CDK's keyboard dispatcher routing to whichever pane is on top. What a
  menubar would add over that is a horizontal strip of triggers and typeahead
  (which nothing in the library has today). That is a desktop-application idiom;
  a web app spells the same thing as a nav bar plus dropdowns, and both ship.
  Reopen only for a concrete app-shell request, and lift the submenu machinery
  rather than rebuilding it.
- **Copy-paste-only distribution** — weak traction in Angular; E6 hybrid instead.
- **A proprietary chart engine, or an AG-Grid feature chase.**
- **Runtime CSS-in-JS** — CSS custom properties are already the right model.
