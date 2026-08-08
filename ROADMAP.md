# Roadmap — v11

> Living document. Only **open** work lives here — shipped items are removed as
> they land; [CHANGELOG.md](CHANGELOG.md) is the record of what happened.
> Sizes: S / M / L / XL.
>
> **State (2026-08-07):** v10.0.0 is released and installable. The catalog is
> **130 secondary entry points / 196 component and directive classes**, gated by
> `pnpm lint` + `build:lib` + `build:showcase` — there is still no test suite
> (0 `*.spec.ts`, no `test` target). Docs are prerendered and live, with past
> majors archived under `/v7/`, `/v8/`, `/v9/`.

## Order

The sequence to work in. Everything not listed here is open but unscheduled;
everything under [Deferred](#deferred) is explicitly not now.

1. **E2** — AI-legibility stack
2. ~~**D4** — Motion tokens~~ *(shipped)*
3. **C3** — Combobox / autocomplete _(hard-blocked on B2)_
4. ~~**C5** — Tree-table mode~~ (shipped)
5. ~~**C6** — Event calendar / scheduler~~ *(shipped)*
6. ~~**C8** — Transfer + Tour~~ *(shipped)*
7. ~~**B3** — `WR_FORM_ERRORS` provider~~ *(shipped)*
8. **B2** — Rebuild internals on `@angular/aria`
9. **B4** — Schema-driven `wr-form`
10. **D1** — Theme presets + builder
11. **D2** — System-token layer

Two notes on the order, then it stands as written:

- **C3 sits above B2 but is hard-blocked by it** — it needs the Aria `Combobox`
  primitive, so in practice either B2 moves up or C3 moves down.
- **A1 (tests) is not in the list.** Worth making that call with open eyes: B2
  rewrites DOM and BEM classes that are public API, and there is no suite to
  catch what it breaks.

## A — Trust & hardening

The catalog is 130 entry points. Lint, unit tests, both builds, the a11y sweep
and the API drift check gate it today — the hole is now the SHAPE of the test
suite, not its absence: pure logic is covered, component behaviour is not. This
theme is what makes ngwr a library people can bet on.

- [ ] **A1. Test foundation** (XL, spans a cycle) — **runner landed and
      CI-gated.** `pnpm test` is `ng test lib`: vitest through Angular's own
      `@angular/build:unit-test` builder, so there is no `vitest.config.ts` and
      no `@analogjs/*` — the target is in `angular.json` with
      `projects/lib/tsconfig.spec.json`, and specs sit next to the code they
      cover. `tsconfig.lib.json` excludes them, so nothing ships to npm.
      **Covered:** the pure-logic layer — `ngwr/utils` (math, guards, keyboard
      predicates, debounce / throttle on fake timers, `randomId`),
      `ngwr/validators` (all eleven) and `ngwr/pipes` (bytes, truncate, range,
      plural, mark). 83 specs.
      Two findings on the first run, both now pinned by a spec: `randomId`'s
      random segment can start with a digit, so it is the PREFIX that keeps the
      id a valid CSS selector; and **`WrValidators.match` reports nothing on a
      mismatched INITIAL value** — Angular runs a control's validators in its
      own constructor, before it has a parent, so `control.parent?.get(...)`
      finds nothing and the group reports itself valid. Closed by
      `WrValidators.matchFields` (see B3 below), which narrowed the finding on
      the way: `formControlName` revalidates when it binds, so a RENDERED form
      corrects itself on its first change detection — the window belongs to
      whatever reads validity before that.
      The service layer followed — `parseHotkeySpec` / `matchesHotkey` and
      `WrI18n` + `wrInterpolate` — plus the first COMPONENT spec, `wr-tabs`,
      which sets the pattern for the rest: a tiny host that uses the component
      the way a consumer would, asserting against the rendered DOM (roles, ARIA
      state and the `.wr-*` classes, all public API) rather than component
      internals. 122 specs.
      That first component spec immediately paid for itself: **`<wr-tabs>` wrote
      a generated id back through `[(active)]`** when no tab was pre-selected.
      `WrTab` reported its key from its own constructor, where a signal input is
      still on its default, so the parent seeded `active` with
      `wr-tab-b1crta5aix0v` instead of `overview`. The strip still highlighted
      the right tab — `activeTab()` falls back to `tabs[0]` — so the only
      symptom was a two-way binding holding a key the consumer had never heard
      of. Fixed by seeding from `contentChildren` once inputs are bound.
      `wr-select` followed — the first overlay component under test, and the
      one B2 rewrites first. 178 specs.
      It turned up the more serious of the two bugs so far: **no ngwr component
      would render in an app that had never called `provideWrI18n()`.** Every
      component routes its built-in strings through `useI18nText`, which injects
      `WrI18n` OPTIONALLY — but `WrI18n` is `providedIn: 'root'`, so an optional
      inject still constructs it, and construction died on `NG0201: No provider
      found for WR_I18N_LOADER`. The `if (!i18n)` fallback branch in the helpers
      was therefore unreachable: i18n was documented as optional and was in fact
      mandatory. `WR_I18N_LOADER` now defaults to a loader serving an empty
      catalog, so every lookup misses, `t()` returns the key, and the component
      falls through to its English default — which is what the helpers always
      meant to do.
      **Remaining:** the rest of the services, then date-picker, dialog, popover
      and toast. A2 (CDK test harnesses) and B2 both wait on that second half.
- [ ] **A2. CDK test harnesses** (L, soft-blocked on A1) — ship
      `ngwr/<entry>/testing` harnesses so consumers can test against wr
      components. Consumer-facing feature; target vitest.
- [x] **A3. a11y CI** (L) — `pnpm check:a11y` runs axe-core over all 211
      prerendered pages and fails CI on any serious or critical violation. The
      seeded baseline is empty: the ten rules it started with are fixed, which
      cost `ariaLabel` inputs on switch / checkbox / select / tree / cascader /
      date-picker / input-number / textarea, a real `<label for>` link from
      `<wr-form-field>` to its projected `wrInput`, a valid grid in the
      calendar, and structural fixes to descriptions and file-upload.
      **Remaining:** the APG-pattern conformance pass per component, and the
      service layer (LiveAnnouncer-style announcements, focus-trap utils).
      Colour contrast and target size need painted pixels — they belong to A5.
- [ ] **A5. Visual regression** (M) — Playwright screenshot diffs across the
      showcase, run at mobile viewports too. It also owns the half of a11y that
      `check:a11y` cannot see: that gate runs axe over unstyled prerendered HTML,
      so `color-contrast` and `target-size` are disabled there. Running them
      against a real browser found a systematic gap in the light theme, now
      fixed by the `--wr-color-*-ink` ramp: every intent painted as TEXT
      (outlined buttons and badges, tags, form errors, typography tones,
      statistic deltas, result icons) failed AA, warning worst at 1.71:1.
      `/reference/components/button` went from 16 violations to 2, and both
      survivors are `<wr-btn disabled>` — WCAG exempts inactive controls, and
      axe cannot see it because `disabled` sits on a custom element. The docs
      code blocks followed: shiki's `github-light` / `github-dark` failed on
      four and one token colour respectively against the block's own tinted
      background, so both were swapped for their `-high-contrast` siblings.
      Ten routes now measure zero in both themes apart from those two disabled
      buttons.

**Remaining from the SSR pass:** per-component SSR-safety notes in the docs, and
incremental hydration (`withIncrementalHydration()` + `@defer (hydrate on …)`).

## B — Platform alignment (Signal Forms + Angular Aria)

- [ ] **B2. Rebuild interactive internals on `@angular/aria`** (XL — DOM and
      classes will shift) — listbox→select, combobox, menu/menubar, tabs,
      accordion, tree, grid primitives. Positions ngwr as "styled components
      over the official primitives": less a11y logic to own, and a story no
      other styled Angular lib has yet. **Blocks C3.** Do not start it before
      A1 / A5 have coverage — it churns DOM and BEM classes that are public API.
- [x] **B3. `WR_FORM_ERRORS` provider** (M) — `provideWrFormErrors()` registers
      app-wide validation copy, and `<wr-form-field>` renders a message for
      every error the markup does not already answer. Resolution order is
      projected `<wr-form-error key>` → app catalog → `ngwr/i18n`
      `validation.*` → a built-in English sentence, so a form with **no
      configuration at all** shows the right localized message with the
      validator's payload interpolated (`Не короче 4 символов.` /
      `Enter at least 4 characters.`). 19 keys ship in en and ru, covering
      every Angular built-in and every `WrValidators` key — and a spec now
      fails the build if a validator ever ships a key with no copy, because a
      missing entry renders an EMPTY error block rather than nothing at all.
      **`WrValidators.matchFields` joined the set**: the group-level
      counterpart to `match`, added because `match` cannot report a mismatch
      until something revalidates the control it is on. Pure and group-only —
      it never writes to a child, which was the tempting shortcut: mirroring
      the error down strands it on a control the group later removes, and
      inverts the event order so the child settles before the parent has
      assigned its own errors. `<wr-form-field>` reads only the control
      projected into it, so the documented shape is to run BOTH: `matchFields`
      on the group for correctness, `match` on the child for the message.
      Scoping it also turned up three shipping defects in `<wr-form-field>`,
      all fixed first: `<wr-form-error key>` was never matched (every message
      rendered at once), the error state never recomputed under classic
      reactive forms because `AbstractControl`'s accessors are read inside
      `untracked()`, and neither `aria-invalid` nor `aria-describedby` was
      wired.
- [ ] **B4. Schema-driven `wr-form`** (L, stretch, soft-depends on B3) —
      generate a form from a typed field schema; pairs with Signal Forms'
      schema API.

## C — Data-heavy + missing components

- [ ] **C3. Combobox / autocomplete proper** (M, **hard-blocked on B2**) —
      free-text input + suggestions is a different ARIA pattern than
      select-with-search; build on the Aria `Combobox` primitive.
- [x] **C5. Tree-table mode** (M) — `childrenKey` on `wr-table` makes `items`
      the roots and flattens the forest into the same `<tbody>`, so child rows
      are ordinary `<tr>`s and column pin / resize / drag-reorder plus
      `[wrTableCell]` templates keep working at every depth. Open state reuses
      `[(expanded)]`, identity reuses `rowKey`; `treeColumn` picks the indented
      column. Selection, CSV and the summary row walk the whole forest, while
      select-all sweeps the VISIBLE nodes. The table announces `role="treegrid"`
      with `aria-level` / `aria-posinset` / `aria-setsize` / `aria-expanded` per
      row, emitted only in tree mode so the flat table's markup is untouched.
      **Refused, not half-supported:** `groupBy` (a forest has no flat list to
      bucket) and `[wrTableExpand]` detail rows (both own the row's disclosure).
      **Deferred, with reasons:** cascade selection — unlike a group band a
      parent is itself a selectable row, so "parent checked" and "every
      descendant checked" are different states and the design review could not
      settle the semantics; a treegrid keyboard cursor — a `keydown` on
      `<table>` bubbles up from every interior checkbox, sort button and cell
      template, so it needs a focus model rather than a handler; and tree +
      `virtualScroll` — the window is a pure function of a pixel offset, so
      expanding mid-list slides rows under the viewport and needs scroll
      anchoring first.
- [x] **C6. Event calendar / scheduler** (XL) — `ngwr/event-calendar` ships
      month / week / day in one component, with drag to move and resize.
      `events` is an input the calendar never writes to: a drag emits
      `eventChange` with where the event *would* land and stops. Ignoring the
      output cancels the drag, an optimistic update is one `update`, and a
      rejected server write needs no rollback path inside the component.
      Every chip lives inside the `role="gridcell"` where it starts and reaches
      out with a `calc()` width or a percentage height. That is the load-bearing
      decision: a floating events layer reads better in a template and leaves
      `role="row"` owning something other than cells, which the axe gate
      rejects — and it forces pixel measurement, where cell-relative units need
      none. Bands pack into lanes per week by interval-graph colouring, so a
      long event holds ONE lane across a whole week instead of stair-stepping,
      and splits at the week boundary into segments that drop their outer
      rounding. Drag targets are read with `elementFromPoint` rather than
      geometry — the dragged chip goes `pointer-events: none`, and no layout
      assumption can put the drop in the wrong cell. Keyboard parity throughout:
      one tab stop with a roving cursor, and `Alt` + arrows move an event,
      emitting the same `eventChange` as the pointer.
- [x] **C8. Transfer + Tour** (M) — both shipped. `ngwr/transfer` is the dual
      listbox: `[items]` is the full set and `[(value)]` is the RIGHT pane, with
      the per-pane ticks kept as transient staging so a form never sees a
      half-made choice. Signal-forms native, searchable, i18n'd in en/ru. Its
      panes are a plain `<ul>` of checkboxes, not a `role="listbox"` of
      `role="option"` rows: an option may not contain an interactive control, and
      the axe gate rejected the dressed-up version.
      `ngwr/tour` is the onboarding walkthrough — `WrTour.start([...])` takes
      steps as data and owns the overlay, the cut-out, focus and the keyboard.
      The spotlight is one element with a 9999px spread shadow rather than a
      clip-path polygon: everything outside dims, the target is untouched, and a
      reflow only moves a box. **A step whose target is missing is skipped, not
      floated** — a tour has to survive a feature sitting behind a flag or a
      permission, and skipping carries the direction so a dead step can't trap
      the run between two ends.

**Virtual scrolling, for reference:** `wr-table`, `wr-tree` and `wr-select`
(search mode) window with hand-rolled spacer rows. **Cascader is deferred** — it
uses native tabstops with no container-owned arrow-nav model, so windowing would
strip off-screen rows out of the tab order; it needs that keyboard refactor
first. **Mention is excluded** — its list is capped at `maxResults` (~8).

## D — Theming & visuals

- [ ] **D1. Theme presets + builder** (L) — algorithmic palette from a seed
      colour, 2–3 prebuilt themes, and a live theme-builder page that **exports
      tokens and shareable preset files** (tweakcn proves standalone demand).
      Starts from lift-and-generalise, not zero:
      `showcase/app/_core/services/primary-color.ts` already derives the full
      `--wr-color-primary*` ramp from a hex seed at runtime.
- [ ] **D2. System-token layer** (M, partially shipped) — a neutral gray ramp
      plus surface role aliases already landed, documented at `/guides/tokens`.
      **Remaining:** the full semantic `--wr-sys-*` roles over the raw palette,
      light / dark / high-contrast via `color-scheme`, and the optional
      `--mat-sys-*` interop map so ngwr drops into Material apps. This is the M3
      theming bar.
- [x] **D4. Motion tokens** (S) — `--wr-duration-*` / `--wr-ease-*` /
      `--wr-transition-*` live in `theme/styles/_variables.scss`, documented at
      `/guides/tokens/motion`, and every component stylesheet now reads them:
      the last eight hardcoded `cubic-bezier` values (circular-text, segmented,
      toast, marquee, dialog, table, drag-drop) are gone, verified in a browser
      by overriding `--wr-ease-out` and watching the segmented thumb and the
      dialog backdrop follow. The shipped prefixes are unchanged — renaming
      public custom properties would be a gratuitous break.
      **Two motion values stay literal on purpose:** the `wr-bounce` keyframes
      in `styles/_animations.scss`, because `animation-timing-function` inside a
      keyframe resolves at parse time and a `var()` there silently falls back to
      the element's own timing function; and the `easing` input defaults on
      `wr-split-text` / `wr-rotating-text`, because they feed the Web Animations
      API, which does not resolve custom properties.

## E — DX, docs & distribution

- [ ] **E2. AI-legibility stack** (M–L, highest leverage for adoption) —
      `llms.txt` / `llms-full.txt`, `AGENTS.md` and the `ng update` codemods
      already ship, and the docs are prerendered, so crawlers and agents get
      real HTML with section links and highlighted code. `llms-full.txt` is now
      accurate and gated by `pnpm check:llms` — it had been reporting 123 of 127
      entry points (the nested ones were invisible), shipping four descriptions
      scraped off the wrong element, and naming a type or a token in six import
      lines. **Per-component markdown export shipped:** every docs page also
      serves at the same URL plus `.md` (190 pages, ~450 KB), converted from the
      prerendered HTML by `scripts/gen-md-docs.ts` — so it cannot drift from
      what shipped, and a floor check fails the build if it thins out. Live
      demos are dropped and their source blocks kept; each HTML page advertises
      its twin as `<link rel="alternate" type="text/markdown">`. One caveat that
      is not in this repo's hands: nginx on the box needs `text/markdown md;` in
      its `mime.types` for a browser to render a twin inline instead of
      downloading it — agents fetching bytes are unaffected either way.
      **Remaining:** an **ngwr MCP server** (search / docs / examples / install
      via schematics), agent skills, and an open registry schema for community
      blocks + theme presets.
      On the MCP server, note the finding that killed the first design pass:
      `dist/lib/types/ngwr-<entry>.d.ts` (892 KB, already in the tarball)
      already carries every class summary, `@example` and input description, so
      a second copy has to justify itself on top of that — and a hand-rolled
      JSON-RPC server on the Trusted-Publisher release path wants A1 first. This stack drove shadcn's
      20%→56% rise; Taiga has an MCP server, nobody in Angular has the full
      stack. Builds directly on E3.
- [x] **E3. API reference auto-extraction** (L) — `pnpm gen:api-docs` reads the
      library's JSDoc into `#core/generated/api`, and `pnpm check:api-docs`
      fails CI when a page's table disagrees with the source. Every showcase
      page now matches: the pages that were a second hand-maintained copy read
      `API.WrFoo`, and the ones that legitimately document interfaces, CSS
      variables or service methods keep their own tables and are checked
      against the source anyway.
- [ ] **E4. Playground embeds** (M) — StackBlitz per component page.
- [ ] **E5. `ngwr/kit` standalone utilities** (M) — publish the internal signal
      utils / positioning / density / hotkey / storage helpers as a zero-dep
      package usable without the components. The Mantine-hooks top-of-funnel
      lesson (ngxtension does ~42k dl/wk).
- [ ] **E6. Ejectable components** (L, stretch) — keep npm + `ng update`, but
      add a schematic that copies any component's source into the user's repo
      (registry-style). Hybrid of the shadcn ownership model without abandoning
      the update path; copy-paste-only has weak traction in Angular
      (spartan ~21k dl/wk).
- [ ] **E7. Locale packs** (M) — built-in component strings for ~20 locales on
      top of the i18n service. Two locales ship today (en / ru); NG-ZORRO ships
      ~80. Worth pairing with a pass over the catalog: **44 of 101 keys are
      still unread by any component**, and a locale pack multiplies only what is
      actually wired up.
- [ ] **E8. Global defaults provider** (S–M) — `provideWrConfig()` for component
      defaults (sizes, shapes, icons), the NzConfigService lesson.
- [ ] **E9. Blocks** (L) — `ng g @ngwr/blocks:auth|dashboard|landing|settings`
      composed from ngwr components and themed by D1. Proven adoption driver
      (shadcnblocks economy, Ant Pro, Tremor); virtually no Angular block
      ecosystem exists today.

## F — AI components (`ngwr/ai`)

A confirmed open lane: Kendo's kit is paid, NG-ZORRO is porting Ant Design X,
nobody ships a free, complete Angular AI kit.

- [ ] **F1. Streaming markdown renderer** (M) — standalone component (typed-out
      streaming, code blocks via the existing shiki setup). Foundation for F2
      and useful alone.
- [ ] **F2. Chat / agent kit** (XL) — message thread, prompt input (attachments,
      slash commands via the mention plumbing), tool-call + approval +
      reasoning-trace renderers, sources panel — wired to AG-UI /
      Vercel-AI-SDK-style streams. Showcases the existing toast /
      command-palette / animation kit.

## G — Reach

- [ ] **G1. RTL / bidi** (L) — still close to a total gap: **4** stylesheets use
      logical properties against **44** using physical left/right, and there is
      no `Directionality` anywhere. Sweep to logical properties, wire CDK
      `Directionality` into overlays / sliders / carousels, add a `dir="rtl"`
      toggle to the showcase. Table stakes for Material / PrimeNG / Kendo parity
      (MENA enterprise).
- [x] **G2. CSP audit** (S) — documented at `/guides/csp`, verified by serving
      the prerendered site under a policy with no escape hatches. The library
      needs nothing unusual: no `eval`, no `new Function`, no `Worker`, no
      WebAssembly, and the canvas / WebGL components only call `getContext`,
      which CSP does not govern. The one real finding is that **27 entry points
      declare a `styleUrl` that re-exports their own `styles/_index.scss`**, so
      Angular injects a duplicate `<style>` — blocked under `style-src 'self'`,
      but harmless because every one of those rules is also in the linked
      stylesheet when the app does `@use 'ngwr'` (checked rule by rule). Under
      SSR / prerendering Angular writes component CSS into the document itself,
      so `ngCspNonce` on the app root cannot help — verified, the styles ship as
      `<style ng-app-id="ng">` in the HTML. `'wasm-unsafe-eval'` is a docs-site
      requirement (shiki's Oniguruma engine), not a library one.

## Deferred

Open and researched, but explicitly not now.

- [ ] **D5. Figma kit** (L) — token-synced community kit; a credibility
      multiplier, but only once D1 + D2 land. (PrimeNG / Kendo / Material all
      ship kits.)
- [ ] **C10. Rich text editor** (XL) — the biggest single component gap across
      free Angular libs (Taiga wraps ProseMirror; PrimeNG is rebuilding theirs).
      Likely a ProseMirror-based `ngwr/editor`. Validate demand before
      committing.
- [ ] **C4. Input mask** (M) — cheaper than it reads: `ngx-mask` is already a
      workspace dependency and `wr-input`'s JSDoc documents composing with it,
      so the open question is _own it or bless it_, not _build it_.
      Phone-international / card presets later.
- [ ] **C7. Menubar** (M) — horizontal app menu with submenus. Unblocked, but
      much cheaper after B2 ships the Aria primitive. Completes
      dropdown / context-menu into a menu family.
- [ ] **D3. Squircle: graduate or cut** (S) — decide on `corner-shape` browser
      support; "experimental" should not survive two majors.
- [ ] **C9. Charts: the missing three** (M) — the base set ships (bar, line,
      donut, sparkline, gauge, calendar-heatmap, meter-group), so what is left
      is narrower than this item used to claim: **area, scatter and radar do not
      exist**, and legends are implemented separately in `donut-chart` and
      `line-chart` rather than shared. The differentiator is theme-token
      integration and dashboard blocks, not chart-engine breadth — do not build
      an engine.

## Breaking changes on the table

- [ ] **Colour role-rename** — component stylesheets are fully on the surface
      roles; what remains is **10 default values across 7 files** still naming
      `--wr-color-{white,dark,light}` (`click-spark.ts`, `fuzzy-text.ts`,
      `calendar-heatmap.ts`, `gauge.ts`, `knob.ts`, `line-chart.html`,
      `popover/styles/_index.scss`), plus dropping `light` / `dark` from
      `WR_COLORS` / `WrColor`. Needs a `migration-v11` codemod. (D2's remaining
      piece.)
- [ ] **B2 internals swap** — DOM and BEM class changes from the Aria
      primitives. Public API by the project's own rules, so it needs a major.
- [ ] **Angular 23 peer baseline** (~Nov 2026).
- [ ] **Per-entry bundle budgets enforced in CI.**

## What blocks what

Almost nothing is blocked; the one hard edge is B2.

- **C3** — **hard-blocked on B2**; it needs the Aria `Combobox` primitive.
- **A2** — soft-blocked on **A1**: harnesses with no suite behind them are just
  more untested API surface.
- **B4** — soft-depends on **B3**.
- **D5** — blocked in practice on **D1** + **D2**.
- **C7** — unblocked, but cheaper after **B2**.
- **B2** itself — unblocked on paper, but do not start it before **A1** / **A5**
  have coverage.
- **Everything else is unblocked.**

## Non-goals (researched, rejected)

- Pure-headless library — `@angular/aria` occupies that for free; we build on it.
- Copy-paste-only distribution — weak traction in Angular; E6 hybrid instead.
- Proprietary chart engine, or an AG-Grid feature chase.
- Runtime CSS-in-JS — CSS custom properties are already the right model.
