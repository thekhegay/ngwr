# Roadmap — v11

> Living document. v7.0.0–v7.3.0 shipped 2026-06-12…2026-06-25; **v8.0.0
> shipped 2026-06-30**; **v9.0.0 / v9.1.0** followed, and **v10.0.0 shipped
> 2026-08-06**. Sizes: S / M / L / XL.
>
> **Status (2026-08-07):** the released version is **10.0.0** and it is
> installable — the release backlog this document was written around is gone.
> Everything below marked "merged to main" has shipped. v10's three breaking
> changes were all CSS/token-level (WCAG contrast on `--wr-color-*-contrast`,
> table header casing, tooltip theming), so it deliberately carries **no
> `migration-v10`** codemod: nothing there can be rewritten mechanically, and an
> empty codemod would tell consumers their visual regressions were handled when
> they were not. The static prerendered docs are live on ngwr.dev, and past
> majors are archived under `/v7/`, `/v8/`, `/v9/`.
>
> **The forward scope for v11 is not decided yet** — the unchecked items below
> are a backlog, not a plan.
>
> **v8.0.0** shipped early with a deliberately small breaking set: density
> values renamed (`compact|default|comfortable` → `sm|md|lg`, `touch` unchanged,
> default now `md`), the pagination size scale trimmed (`xs`/`xl` dropped, now
> `sm|md|lg`), and the unreliable `WrReveal` / `WrScrambleText` removed. The
> mobile theme (M) shipped its first wave in **7.2.0** (M1 + M2 done, M3–M5
> partially); **7.3.0** continued M3 + M5 — a `touch` density preset, swipe
> gestures (drawer / lightbox / toast / carousel), and more container-query
> components (table / pagination / toolbar / tabs). v8 also folded in a
> QA/polish pass and a batch of additive niceties (a design-tokens docs section,
> a neutral gray ramp + surface role aliases, a header settings dropdown for
> theme/density/primary, the docs version switcher, statistic count-up,
> lightbox `aspectRatio`, the url validator `requireProtocol` option, an
> interfaces Overview page, toast overflow queue, and a Migration-guide page +
> the `ng update ngwr@8` codemod).
>
> **Next: cut v9.0.0** (the breaking set is already on main), then **B2** — the
> `@angular/aria` internals swap, which is what unblocks C3. The **Angular 23
> peer baseline** (~Nov 2026) travels with B2 to **v10**; the colour role-rename
> can still ride v9, since `migration-v9` already exists to carry the rule.
>
> Drafted 2026-06-12 after a competitive sweep of Angular Material/CDK +
> Angular Aria, PrimeNG, NG-ZORRO, Taiga UI, spartan-ng, Kendo, and the
> React/Vue leaders (shadcn, MUI X, Ant Pro, Mantine). Two facts reframe the
> plan: **Signal Forms and `@angular/aria` are already stable in v22**, and
> ngwr is pre-adoption (near-zero downloads) — so v8 optimizes for adoption
> and positioning, not feature parity with PrimeNG. Positioning bet:
> **"signal-first styled components on official Angular primitives, the most
> AI-legible UI library in the ecosystem."**
>
> **Mobile / responsive (theme M) — delivered.** M1–M7 all shipped: every
> component is usable on a phone and every layout component adapts. Taiga's
> `addon-mobile` was the only other OSS mobile story in Angular, so this is now
> ngwr's differentiator to keep, not a gap to close.

## M — Mobile & responsive (complete)

Goal: every component usable on a touch device, every layout component
adaptive. Foundations already existed (breakpoints SCSS API, `WrMedia`
service, density tokens, `drawer position="bottom"`) — this theme wired
them through the catalog.

- [x] **M1. Showcase mobile adaptation** (L) — **shipped (7.x).** Mobile
      header (hamburger + sheet, drawer over the menu), off-canvas docs sidebar
      below `lg`, a `clamp()` hero type scale, horizontal-scroll containers for
      API tables + code blocks, and stacked playground controls — dogfooded on
      ngwr's own drawer / breakpoints / `WrMedia`.
- [x] **M2. Responsive overlay presets** (L) — **shipped (7.x).** On small
      viewports dialog / select / dropdown / popover collapse to a bottom-sheet
      and command-palette to a full-screen sheet. `provideWrResponsiveOverlays()`
      opt-in + per-component `responsive` input, shared `.wr-overlay-sheet`
      styles; built on the existing overlay plumbing.
- [x] **M3. Touch interaction pass** (L) — **shipped (7.x + #439).** 44px
      touch targets via a `touch-target` mixin gated on `@media (pointer:
coarse)`, applied to overlay close buttons (alert, lightbox) and dense
      controls (select chips, tree / cascader toggles, toast actions); a
      `touch` density preset (y 1.7 / x 1.25 / gap 1.5); swipe-to-close on
      drawer (grab handle), lightbox (down) and toast (sideways), swipe-nav on
      carousel (finger-following track); long-press context-menu, touch-sized
      handles for slider / knob / splitter / color-picker, and drag-drop touch
      polish. Swipe-nav on tabs is deferred — the content panel often holds
      horizontally-scrollable content (code blocks, wide tables) the gesture
      would hijack; the strip already scrolls for overflow.
- [x] **M4. Safe-area & viewport correctness** (M) — **shipped (7.x + #440).**
      `env(safe-area-inset-*)` across the overlay hosts (toast,
      command-palette, back-top, speed-dial, window; drawer already had its
      `--safe-area` opt-in) and `dvh` for full-screen overlays.
      `WrVisualViewport` (`ngwr/platform`) publishes `--wr-keyboard-inset`,
      applied once at the overlay layer so every overlay containing an input
      (select search, command palette, mention, date-picker) clears the
      on-screen keyboard.
- [x] **M5. Container-query adaptive components** (M–L) — **shipped (7.x +
      #441).** Opt-in `responsive` container-query reflow on descriptions
      (inline → single column), stepper (horizontal → vertical), page-header
      (title/actions → stacked), toolbar (wrap), pagination (→ compact current
      / total), table (→ stacked cards with `data-label` headers) and the
      `wr-statistic-group` dashboard grid, via `container-type: inline-size`
      scoped to the modifier; plus an always-on scrollable tab strip with a
      scroll-driven edge fade. Driven by container queries (not viewport) so
      they adapt inside any layout; falls back through the breakpoints API.
- [x] **M6. Pull-to-refresh + mobile niceties** (M) — **shipped (#442 haptics,
      #443 pull-to-refresh, #444 action-sheet) — shipped in v9.0.0.**
      `WrHaptics` (`ngwr/platform`) wraps the Vibration API,
      `<wr-pull-to-refresh>` and `<wr-action-sheet>` are their own entry points.
- [x] **M7. Mobile docs polish** (M) — **shipped (#446).** Per-demo phone-frame
      preview toggle.

## A — Trust & hardening

The catalog is 127 secondary entry points gated by lint + build only. This
theme is what makes ngwr a library people can bet on.

- [ ] **A1. Test foundation** (XL, spans the cycle) — vitest via `ng test`
      (Karma is gone; vitest is the blessed runner), CI-gated. Order: utils /
      validators / pipes / services first (pure logic), then interaction
      tests for the top overlay + form components (select, date-picker,
      dialog, popover, toast).
- [ ] **A2. CDK test harnesses** (L) — ship `ngwr/<entry>/testing` harnesses
      so consumers can test against wr components. Consumer-facing feature;
      target vitest.
- [ ] **A3. a11y CI** (L) — axe-core sweep over every showcase route + an
      APG-pattern conformance pass per component. Expose the service layer
      too (LiveAnnouncer-style announcements, focus-trap utils).
- [x] **A4. SSR / hydration audit** (M) — **shipped 2026-07-15.** Every
      browser-API file in lib + showcase (80) was audited, and the showcase now
      prerenders every route under `outputMode: 'static'` with
      `provideClientHydration()` — so every component's demo page is rendered in
      Node on each build, which is the "render every entry under SSR" smoke this
      item asked for. It held up well: only ONE real blocker existed across all
      127 entry points. Fixed along the way: `WrCookie` reads (documented
      SSR-safe but only writes were guarded — domino implements no
      `document.cookie`), `wrAutosize` (`getComputedStyle` in a constructor
      effect), `WR_DATE_LOCALE` (a `typeof navigator` probe baked the build
      machine's locale — Node 21+ defines `navigator`), `wr-qr` (a
      platform-gated `<canvas>` made server and client structures disagree), and
      server-side text for typewriter / counter / count-up. **`build:showcase`
      now fails on prerender errors** (`scripts/build-showcase.ts`) — the
      builder logs them, still emits HTML and exits 0, so CI would otherwise
      stay green while pages silently degraded. **Remaining:** per-component
      SSR-safety notes in the docs; incremental hydration
      (`withIncrementalHydration` + `@defer (hydrate on …)`).
- [ ] **A5. Visual regression** (M) — Playwright screenshot diffs across the
      showcase, run at mobile viewports too.

## B — Platform alignment (Signal Forms + Angular Aria)

Both stabilized in Angular 22 — this moved from "strategic bet" to "the
adoption window is open now".

- [x] **B1. Signal Forms-native controls** (XL, flagship) — **shipped in v9.0.0.** All 16 public value controls (plus the
      internal time panel) implement `FormValueControl` / `FormCheckboxControl`,
      and `ControlValueAccessor` is gone from the library entirely
      (`NG_VALUE_ACCESSOR`: 0 hits repo-wide). `wr-segmented` and `wr-calendar`
      stay plain `model()` components — they never carried a CVA. Dropping CVA
      turned out to be **non-breaking**: Angular 22 synthesises the accessor for
      a signal-forms control, so `[(ngModel)]` and reactive forms keep working
      alongside `[formField]`. Last stragglers: the internal time panel (#458)
      and the checkbox (#459, whose group-identity `value` had to become
      `checkboxValue` because `FormCheckboxControl` reserves `value` — a v9
      migration ships with it).
- [ ] **B2. Rebuild interactive internals on `@angular/aria`** (XL, **v10** —
      DOM/classes will shift) — listbox→select, combobox, menu/menubar, tabs,
      accordion, tree, grid primitives. Position ngwr as "styled components over
      the official primitives" — less a11y logic to own, and a story no other
      styled Angular lib has yet. **Blocks C3.** Do not start it before A1/A5
      have coverage: it moves DOM and BEM classes that are public API.
- [ ] **B3. `WR_FORM_ERRORS` provider** (M) — centralized, i18n-aware
      validation messages; `wr-form-field` renders them automatically.
- [ ] **B4. Schema-driven `wr-form`** (L, stretch) — generate a form from a
      typed field schema; pairs with B1 + B3 and Signal Forms' schema API.

## C — Data-heavy + missing components

Gaps ranked by demand evidence from competitor issue trackers and roadmaps.

- [x] **C1. Table v2** (XL) — **shipped in
      v9.0.0**, one PR per feature: column pin (#447) / resize (#448) /
      drag-reorder (#449), row selection (#450), expandable rows (#451),
      summary/footer rows (#452), CSV export (#453), row grouping (#454),
      virtualized body (#455, opt-in via `[virtualScroll]` + `[rowHeight]` /
      `[overscan]`). Server-side sort / filter / paginate is served by
      `[totalItems]` + the `[(sort)]` model (`(sortChange)`) and the
      `(filterChange)` output. Today's API stayed the simple tier — every
      feature is opt-in. `ngwr/table` is now the heaviest bundle in the catalog.
      Deferred: **Excel (.xlsx)** export (needs a third-party dependency —
      CSV is dependency-free) and the stretch "pro table" preset.
- [x] **C2. Virtual scroll in overlay pickers** (M) — **merged to main,
      shipped in v9.0.0**; the v7 regression is closed. `wr-tree`
      (#456) and `wr-select` search mode (#457) window their lists with
      hand-rolled spacer-row virtualization (same shape as `wr-table`, not the
      CDK viewport, which cannot host `<tr>` / role-owned list children), and
      switch to `aria-activedescendant` while virtual so keyboard nav still
      reaches un-rendered rows. Both are opt-in via `[virtualScroll]` +
      `[viewportHeight]`. **Select virtualization engages only on the
      `[options]` array path** — projected `<wr-option>` children keep the
      full-render registry, because their labels and selection are derived from
      the DOM. **Cascader deferred** — its options are per-column
      native tabstops with no container-owned arrow-nav model, so windowing
      would strip off-screen rows out of the tab order; it needs that
      keyboard refactor first. **Mention excluded** — its list is already
      capped at `maxResults` (~8), so there is nothing to window.
- [ ] **C3. Combobox / autocomplete proper** (M, **blocked on B2**) — free-text
      input + suggestions is a different ARIA pattern than select-with-search;
      build on the Aria `Combobox` primitive after B2.
- [ ] **C4. Input mask** (M) — cheaper than it reads: `ngx-mask@^22.1.0` is
      already a workspace dependency and `wr-input`'s JSDoc already documents
      composing with it, so the open question is _own it or bless it_, not
      _build it from scratch_. ngx-mask's download numbers prove the demand.
      Phone-international / card presets later (Taiga's fintech inputs are
      loved).
- [ ] **C5. Tree-table mode** (M) — tree rows inside `wr-table`
      (expand/collapse hierarchy). Tree-select already ships as
      `wr-tree openOn="overlay"` (consolidated in v7).
      (Material #14159 open for years; standard in PrimeNG/NG-ZORRO/Kendo.)
- [ ] **C6. Event calendar / scheduler** (XL, candidate for v10) — month /
      week / day event views with drag. (PrimeNG + Kendo 2026 roadmaps.)
- [ ] **C7. Menubar** (M) — horizontal app menu with submenus; Aria ships
      the primitive. Completes dropdown/context-menu into a menu family.
- [ ] **C8. Transfer (dual listbox)** (M) and **Tour / onboarding** (M) —
      spotlight steps anchored to elements, on existing overlay + affix.
- [ ] **C9. Charts round-out** (L) — area / scatter / radar; unified legends + theming. Differentiator is theme-token integration + dashboard
      blocks, not chart-engine breadth — do not build an engine.
- [ ] **C10. Rich text editor** (XL, evaluate for v10) — the biggest single
      component gap across free Angular libs (Taiga wraps ProseMirror;
      PrimeNG is rebuilding theirs). Likely a ProseMirror-based
      `ngwr/editor`. Validate demand before committing.

## D — Theming & visuals

- [ ] **D1. Theme presets + builder** (L) — algorithmic palette from a seed
      color, 2–3 prebuilt themes, live theme-builder page that **exports
      tokens and shareable preset files** (tweakcn proves standalone demand).
      Starts from lift-and-generalise, not zero:
      `showcase/app/_core/services/primary-color.ts` already derives the full
      `--wr-color-primary*` ramp from a hex seed at runtime.
- [ ] **D2. System-token layer** (M) — **partially shipped in v8:** a neutral
      gray ramp plus surface role aliases landed, documented at
      `/guides/tokens` (colors / sizing / typography / density / motion).
      **Remaining:** the full semantic `--wr-sys-*` roles over the raw
      palette, light/dark/high-contrast via `color-scheme`, and the optional
      `--mat-sys-*` interop map so ngwr drops into Material apps. This is the M3
      theming bar.
- [ ] **D3. Squircle: graduate or cut** (S) — decide on `corner-shape`
      browser support; "experimental" shouldn't survive two majors.
- [ ] **D4. Motion tokens** (S, mostly shipped) — `--wr-duration-*` /
      `--wr-ease-*` / `--wr-transition-*` live in
      `theme/styles/_variables.scss`, are consumed by 49 stylesheets, and are
      documented at `/guides/tokens/motion`. Keep the shipped prefixes —
      renaming public custom properties now would be a gratuitous break.
      **Remaining:** the 8 stylesheets still hardcoding `cubic-bezier`
      (circular-text, segmented, toast, marquee, dialog,
      `styles/_animations.scss`, table, drag-drop).
- [ ] **D5. Figma kit** (L, later) — token-synced community kit; credibility
      multiplier once D1/D2 land. (PrimeNG/Kendo/Material all ship kits.)

## E — DX, docs & distribution

- [x] **E1. Versioned docs** (M) — **shipped in v8.** A header version
      switcher plus the archive-docs approach (v7 docs frozen) landed before v8
      content. Docs search wired into the command palette remains.
- [ ] **E2. AI-legibility stack** (M–L, highest leverage for adoption) —
      **partially in v8** (`llms.txt` / `llms-full.txt` + `AGENTS.md` + the
      `ng update ngwr@8` codemod ship). **2026-07-15: the docs build itself is
      now legible without JS** — ngwr.dev serves an empty shell, so crawlers and
      agents get nothing but a `<title>`; static prerendering (A4) means every
      page ships real content, its section links, and shiki-highlighted code as
      HTML — **live only once v9.0.0 is cut**, since `deploy.yml` fires on a
      release commit. That was an unstated prerequisite for everything below.
      **Remaining:** per-component markdown export, an **ngwr MCP server**
      (search / docs / examples / install via schematics), agent skills, and an
      open registry schema for community blocks + theme presets. This stack
      drove shadcn's 20%→56% rise; Taiga has an MCP server, nobody in Angular
      has the full stack. Builds directly on E3.
- [ ] **E3. API reference auto-extraction** (L) — generate the per-component
      type tables from JSDoc instead of maintaining them by hand.
- [ ] **E4. Playground embeds** (M) — StackBlitz per component page.
- [ ] **E5. `ngwr/kit` standalone utilities** (M) — publish the internal
      signal utils / positioning / density / hotkey / storage helpers as a
      zero-dep package usable without the components. The Mantine-hooks
      top-of-funnel lesson (ngxtension does ~42k dl/wk).
- [ ] **E6. Ejectable components** (L, stretch) — keep npm + `ng update`,
      but add a schematic that copies any component's source into the user's
      repo (registry-style). Hybrid of the shadcn ownership model without
      abandoning the update path; copy-paste-only has weak traction in
      Angular (spartan ~21k dl/wk).
- [ ] **E7. Locale packs** (M) — built-in component strings (date-picker,
      pagination, empty, select) for ~20 locales on top of the translate
      service. (NG-ZORRO ships ~80; en/ru today.)
- [ ] **E8. Global defaults provider** (S–M) — `provideWrConfig()` for
      component defaults (sizes, shapes, icons), the NzConfigService lesson.
- [ ] **E9. Blocks** (L) — `ng g @ngwr/blocks:auth|dashboard|landing|settings`
      composed from ngwr components and themed by D1. Proven adoption driver
      (shadcnblocks economy, Ant Pro, Tremor); virtually no Angular block
      ecosystem exists today.
- [ ] **Docs chore: `/pipes/range` → `/pipes/wr-range`** (S) — the sole
      unprefixed pipe folder; `app/routing.ts` still maps `range: 'range'`
      beside six `wr-`-prefixed siblings. A docs-route rename with a redirect,
      not a breaking change.

## F — AI components (`ngwr/ai`)

A confirmed open lane: Kendo's kit is paid, NG-ZORRO is porting Ant Design X,
nobody ships a free, complete Angular AI kit.

- [ ] **F1. Streaming markdown renderer** (M) — standalone component
      (typed-out streaming, code blocks via the existing shiki setup).
      Foundation for F2 and useful alone.
- [ ] **F2. Chat / agent kit** (XL, the v10 marquee) — message thread,
      prompt input (attachments, slash commands via mention plumbing),
      tool-call + approval + reasoning-trace renderers, sources panel —
      wired to AG-UI / Vercel-AI-SDK-style streams. Showcases the existing
      toast/command-palette/animation kit.

## G — Reach

- [ ] **G1. RTL / bidi** (L) — confirmed total gap: 1 SCSS file uses logical
      properties vs 42 using physical left/right; no `Directionality`
      anywhere. Sweep to logical properties, wire CDK `Directionality` into
      overlays/sliders/carousels, add a `dir="rtl"` toggle to the showcase.
      Table stakes for Material/PrimeNG/Kendo parity (MENA enterprise).
- [ ] **G2. CSP audit** (S) — document nonce handling; verify no inline-style
      violations from animations/canvas components.

## Breaking — shipped in v8.0 / landed for v9 / still deferred

v8.0.0 shipped only the three small renames/removals below. Three more are
shipped in **v9.0.0**; the rest travelled on to **v10**
with the Angular 23 baseline.

- [x] **Density values renamed** — **shipped in v8.** `compact|default|comfortable`
      → `sm|md|lg` (`touch` unchanged, default now `md`) across `WrDensity`, the
      `wrDensity` directive, `provideWrDensity({ defaultDensity })`, and
      `[data-wr-density]`; covered by the `ng update ngwr@8` codemod (`migration-v8`).
- [x] **Pagination size scale trimmed** — **shipped in v8.** `xs` / `xl`
      dropped; `WrPaginationSize` is now `sm|md|lg`.
- [x] **Removed unreliable components** — **shipped in v8.** `WrReveal` (the
      `wrReveal` directive, `ngwr/directives`) and `WrScrambleText`
      (`<wr-scramble-text>`, `ngwr/scramble-text`) deleted.

**Shipped in v9.0.0:**

- [x] **`<wr-checkbox>` `value` → `checkboxValue`** (#459) — `FormCheckboxControl`
      reserves `value` for the form value, so the boolean state is the `checked`
      model and group membership moves to `checkboxValue`. Covered by
      `migration-v9`. Fails **silently** without the codemod: a leftover static
      `value="x"` lands on the host as a plain DOM attribute, every checkbox in
      the group keeps the default identity `null`, and they all toggle together.
- [x] **Lucide icon names registered verbatim** (#445) —
      `lucideIcons({ chevronDown })` now registers `chevronDown`, not
      `chevron-down`. **No codemod**; the icon just stops rendering. Fix by
      quoting multi-word keys.
- [x] **`info` added to `WR_COLORS` / `WrColor`** (#432) — breaks exhaustive
      switches over the colour union. No codemod.

**Still deferred (v9 candidate or v10):**

- [ ] **Colour role-rename** (v9 candidate) — component stylesheets are already
      fully on the surface roles; what remains is eight TS/HTML/SCSS default
      values still naming `--wr-color-{white,dark,light}` (`click-spark.ts:76`,
      `fuzzy-text.ts:59`, `calendar-heatmap.ts:72`, `gauge.ts:44`,
      `knob.ts:74,75`, `line-chart.html:27,77`, `popover/styles/_index.scss:36`)
      plus dropping `light` / `dark` from `WR_COLORS` / `WrColor`. Add the rule
      to the **existing** `migration-v9` codemod. (D2's remaining piece.)
- [ ] Angular 23 peer baseline (v10, ~Nov 2026).
- [ ] B2 internals swap (v10) — DOM/class changes from Aria primitives.
- [ ] Per-entry bundle budgets enforced in CI.

## What blocks what

Almost nothing is blocked; the one hard edge is B2. Check here before picking
up an item.

- **C3** (combobox) — **hard-blocked on B2**; it needs the Aria `Combobox`
  primitive.
- **A2** (CDK harnesses) — soft-blocked on **A1**: harnesses with no suite
  behind them are just more untested API surface.
- **B4** (schema-driven `wr-form`) — soft-depends on **B3**.
- **D5** (Figma kit) — blocked in practice on **D1** + **D2**.
- **C7** (menubar) — unblocked, but cheaper after **B2** ships the primitive.
- **B2** itself — unblocked on paper, but do not start it before **A1** / **A5**
  have coverage; it churns DOM and BEM classes that are public API.
- **Everything else is unblocked** — A1, A3, A5, B3, C4–C6, C8–C10, D1–D4,
  E2–E9, F1, F2, G1, G2.

## Suggested starting order

Rewritten 2026-08-07. The previous ordering existed to unblock a stalled release
and is spent: v10.0.0 shipped, the docs are live and archived per major, and the
whole "finished work is unreleased" premise is gone.

**The v11 scope is deliberately not set here.** Picking it is a product decision,
not a backlog sort, so this section lists only what is objectively still open —
in the order the debt compounds, not in the order it must be done.

1. **A1. A test suite.** Still the largest structural gap: there is no `test`
   target, no `*.spec.ts` and no runner, so `pnpm lint` plus the two builds are
   the only gates. Every item below is cheaper and safer once this exists.
2. **A3. Accessibility in CI.** The 2026-08-07 audit found naming and
   focus-management defects that an automated axe pass would have caught the day
   they landed.
3. **The remaining backlog** — A5, B3, C4–C6, C8–C10, D1–D4, E2–E9, F1, F2,
   G1, G2 — is unblocked and unordered.

## Non-goals (researched, rejected)

- Pure-headless library — `@angular/aria` occupies that for free; we build on it.
- Copy-paste-only distribution — weak traction in Angular; E6 hybrid instead.
- Proprietary chart engine or AG-Grid feature chase.
- Runtime CSS-in-JS — CSS custom properties are already the right model.
