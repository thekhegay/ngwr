# Roadmap — v11

> Living document. Only **open** work lives here — shipped items are removed as
> they land; [CHANGELOG.md](CHANGELOG.md) is the record of what happened.
> Sizes: S / M / L / XL.
>
> **State (2026-08-07):** v10.0.0 is released and installable. The catalog is
> **127 secondary entry points / 193 component and directive classes**, gated by
> `pnpm lint` + `build:lib` + `build:showcase` — there is still no test suite
> (0 `*.spec.ts`, no `test` target). Docs are prerendered and live, with past
> majors archived under `/v7/`, `/v8/`, `/v9/`.

## Order

The sequence to work in. Everything not listed here is open but unscheduled;
everything under [Deferred](#deferred) is explicitly not now.

1. **E2** — AI-legibility stack
2. **D4** — Motion tokens
3. **C3** — Combobox / autocomplete _(hard-blocked on B2)_
4. **C5** — Tree-table mode
5. **C6** — Event calendar / scheduler
6. **C8** — Transfer + Tour
7. **B3** — `WR_FORM_ERRORS` provider
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

The catalog is 127 entry points. Lint, both builds, the a11y sweep and the API
drift check gate it today; unit tests are the hole. This theme is what makes
ngwr a library people can bet on.

- [ ] **A1. Test foundation** (XL, spans a cycle) — vitest via `ng test` (Karma
      is gone; vitest is the blessed runner), CI-gated. Order: utils /
      validators / pipes / services first (pure logic), then interaction tests
      for the top overlay + form components (select, date-picker, dialog,
      popover, toast).
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
      showcase, run at mobile viewports too.

**Remaining from the SSR pass:** per-component SSR-safety notes in the docs, and
incremental hydration (`withIncrementalHydration()` + `@defer (hydrate on …)`).

## B — Platform alignment (Signal Forms + Angular Aria)

- [ ] **B2. Rebuild interactive internals on `@angular/aria`** (XL — DOM and
      classes will shift) — listbox→select, combobox, menu/menubar, tabs,
      accordion, tree, grid primitives. Positions ngwr as "styled components
      over the official primitives": less a11y logic to own, and a story no
      other styled Angular lib has yet. **Blocks C3.** Do not start it before
      A1 / A5 have coverage — it churns DOM and BEM classes that are public API.
- [ ] **B3. `WR_FORM_ERRORS` provider** (M) — centralized, i18n-aware validation
      messages; `wr-form-field` renders them automatically.
- [ ] **B4. Schema-driven `wr-form`** (L, stretch, soft-depends on B3) —
      generate a form from a typed field schema; pairs with Signal Forms'
      schema API.

## C — Data-heavy + missing components

- [ ] **C3. Combobox / autocomplete proper** (M, **hard-blocked on B2**) —
      free-text input + suggestions is a different ARIA pattern than
      select-with-search; build on the Aria `Combobox` primitive.
- [ ] **C5. Tree-table mode** (M) — tree rows inside `wr-table`
      (expand/collapse hierarchy). Tree-select already ships as
      `wr-tree openOn="overlay"`. (Material #14159 open for years; standard in
      PrimeNG / NG-ZORRO / Kendo.)
- [ ] **C6. Event calendar / scheduler** (XL) — month / week / day event views
      with drag. (PrimeNG + Kendo 2026 roadmaps.)
- [ ] **C8. Transfer (dual listbox)** (M) and **Tour / onboarding** (M) —
      spotlight steps anchored to elements, on the existing overlay + affix.

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
      lines. **Remaining:** per-component markdown export, an **ngwr MCP
      server** (search / docs / examples / install via schematics), agent
      skills, and an open registry schema for community blocks + theme presets.
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
- [ ] **G2. CSP audit** (S) — document nonce handling; verify no inline-style
      violations from the animation / canvas components.

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
