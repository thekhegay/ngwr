# Roadmap — v8

> Living document. v7.0.0 shipped 2026-06-12. v8.0 targets the Angular 23
> baseline (~Nov 2026); everything non-breaking ships in 7.x minors along the
> way. Sizes: S / M / L / XL.
>
> Updated 2026-06-12 after a competitive sweep of Angular Material/CDK +
> Angular Aria, PrimeNG, NG-ZORRO, Taiga UI, spartan-ng, Kendo, and the
> React/Vue leaders (shadcn, MUI X, Ant Pro, Mantine). Two facts reframe the
> plan: **Signal Forms and `@angular/aria` are already stable in v22**, and
> ngwr is pre-adoption (near-zero downloads) — so v8 optimizes for adoption
> and positioning, not feature parity with PrimeNG. Positioning bet:
> **"signal-first styled components on official Angular primitives, the most
> AI-legible UI library in the ecosystem."**
>
> **Priority 1: mobile / responsive (theme M).** Every component must be
> usable on a phone before anything else ships. Taiga's `addon-mobile` is
> the only OSS mobile story in Angular — a fully mobile-first catalog is
> both a real gap and a differentiator.

## M — Mobile & responsive (priority 1)

Goal: every component usable on a touch device, every layout component
adaptive. Foundations already exist (breakpoints SCSS API, `WrMedia`
service, density tokens, `drawer position="bottom"`) — this theme wires
them through the catalog.

- [ ] **M1. Showcase mobile adaptation** (L, do first — the storefront is
      unusable on phones today). Audited 2026-06-13 at 375×812:
      - header nav overflows, no hamburger; logo + theme/GitHub/npm actions
        pushed off-screen → collapse to hamburger + sheet, keep logo +
        theme toggle visible
      - **docs sidebar fills the entire viewport — page content is
        unreachable** → off-canvas drawer below `lg`, opened from the
        header, closed on navigation
      - homepage split-text hero overflows horizontally → `clamp()` type
        scale + allow wrapping (mind the descender fix)
      - doc-page gutters too wide at small widths; API tables + code blocks
        need horizontal-scroll containers; playground controls stack under
        the demo
      - dogfood it: build the shell fixes with ngwr's own drawer /
        breakpoints / WrMedia
- [ ] **M2. Responsive overlay presets** (L) — on small viewports, dialog /
      select / dropdown / popover / command-palette collapse to
      bottom-sheet / action-sheet / full-screen presentations. One
      `provideWrResponsiveOverlays()` opt-in + per-component `responsive`
      input; built on the existing drawer plumbing.
- [ ] **M3. Touch interaction pass** (L) — audit + retrofit the whole
      catalog: ≥44px touch targets via a `touch` density preset, long-press
      opens context-menu, swipe-to-close on drawer / lightbox / toast,
      swipe nav on carousel / tabs, touch-sized handles for slider / knob /
      splitter / color-picker, drag-drop touch polish.
- [ ] **M4. Safe-area & viewport correctness** (M) — safe-area-inset tokens
      for toast / speed-dial / back-top / drawer / window; `dvh` for
      full-screen overlays; VisualViewport (virtual keyboard) handling for
      overlays that contain inputs (select search, command palette,
      mention, date-picker).
- [ ] **M5. Container-query adaptive components** (M–L) — table → stacked
      cards mode, descriptions → single column, pagination → compact, tabs →
      scrollable with edge fade, toolbar / page-header wrap, statistic
      grids. Driven by container queries (not viewport) so they adapt
      inside any layout; falls back through the breakpoints API.
- [ ] **M6. Pull-to-refresh + mobile niceties** (M) — pull-to-refresh,
      action-sheet preset on drawer, haptics hook where supported.
- [ ] **M7. Mobile docs polish** (M) — per-demo phone-frame preview toggle,
      and A5 visual regression runs mobile viewports too.

## A — Trust & hardening

The catalog is ~126 entry-points gated by lint + build only. This theme is
what makes v8 a library people can bet on.

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
- [ ] **A4. SSR / hydration audit** (M) — render every entry under SSR +
      incremental hydration smoke in CI; per-component SSR-safety notes.
      Zero NgZone references, OnPush everywhere (v22 default), no
      constructor-time DOM access.
- [ ] **A5. Visual regression** (M) — Playwright screenshot diffs across the
      showcase.

## B — Platform alignment (Signal Forms + Angular Aria)

Both stabilized in Angular 22 — this moved from "strategic bet" to "the
adoption window is open now".

- [ ] **B1. Signal Forms-native controls** (XL, flagship, start first) —
      implement `FormValueControl` on every value-editing component (input,
      select, checkbox, radio, switch, slider, date-picker, rating, knob,
      input-number, input-otp, color-picker, mention, textarea, segmented),
      keeping the CVA shim for reactive-forms back-compat. Document
      `form()` / schema usage on every form page.
- [ ] **B2. Rebuild interactive internals on `@angular/aria`** (XL, candidate
      for v8.0 since DOM/classes may shift) — listbox→select, combobox,
      menu/menubar, tabs, accordion, tree, grid primitives. Position ngwr as
      "styled components over the official primitives" — less a11y logic to
      own, and a story no other styled Angular lib has yet.
- [ ] **B3. `WR_FORM_ERRORS` provider** (M) — centralized, i18n-aware
      validation messages; `wr-form-field` renders them automatically.
- [ ] **B4. Schema-driven `wr-form`** (L, stretch) — generate a form from a
      typed field schema; pairs with B1 + B3 and Signal Forms' schema API.

## C — Data-heavy + missing components

Gaps ranked by demand evidence from competitor issue trackers and roadmaps.

- [ ] **C1. Table v2** (XL) — column pin / resize / **drag-reorder**, row
      selection, expandable rows, virtualized body, server-side sort /
      filter / paginate, **summary/footer rows, row grouping, CSV/Excel
      export**. (Evidence: angular/components #8312 open since 2017; PrimeNG
      "Advanced DataGrid" + Kendo sticky-group-headers on 2026 roadmaps;
      grouping/export are exactly what MUI X license-gates.) Today's API
      stays as the simple tier. Stretch: config-driven "pro table" preset
      (columns → auto filter form + CRUD), the Ant ProTable lesson.
- [ ] **C2. Virtual scroll in overlay pickers** (M) — known v7 regression
      (autocomplete had it; select consolidation lost it). Applies to
      select / cascader / tree / mention. (angular/components #20273 class.)
- [ ] **C3. Combobox / autocomplete proper** (M) — free-text input +
      suggestions is a different ARIA pattern than select-with-search; build
      on the Aria `Combobox` primitive after B2.
- [ ] **C4. Input mask** (M) — evaluate integrating Maskito vs. first-party;
      ngx-mask's download numbers prove the demand. Phone-international /
      card presets later (Taiga's fintech inputs are loved).
- [ ] **C5. Tree-select + tree-table mode** (L) — tree in an overlay
      (re-using `wr-tree openOn="overlay"` plumbing) + tree rows in table.
      (Material #14159 open for years; standard in PrimeNG/NG-ZORRO/Kendo.)
- [ ] **C6. Event calendar / scheduler** (XL, candidate for 8.1) — month /
      week / day event views with drag. (PrimeNG + Kendo 2026 roadmaps.)
- [ ] **C7. Menubar** (M) — horizontal app menu with submenus; Aria ships
      the primitive. Completes dropdown/context-menu into a menu family.
- [ ] **C8. Transfer (dual listbox)** (M) and **Tour / onboarding** (M) —
      spotlight steps anchored to elements, on existing overlay + affix.
- [ ] **C9. Charts round-out** (L) — area / scatter / radar; unified legends
      + theming. Differentiator is theme-token integration + dashboard
      blocks, not chart-engine breadth — do not build an engine.
- [ ] **C10. Rich text editor** (XL, evaluate for 8.1) — the biggest single
      component gap across free Angular libs (Taiga wraps ProseMirror;
      PrimeNG is rebuilding theirs). Likely a ProseMirror-based
      `ngwr/editor`. Validate demand before committing.
## D — Theming & visuals

- [ ] **D1. Theme presets + builder** (L) — algorithmic palette from a seed
      color, 2–3 prebuilt themes, live theme-builder page that **exports
      tokens and shareable preset files** (tweakcn proves standalone demand).
- [ ] **D2. System-token layer** (M) — semantic `--wr-sys-*` roles over the
      raw palette, light/dark/high-contrast via `color-scheme`, plus an
      optional `--mat-sys-*` interop map so ngwr drops into Material apps.
      This is the M3 theming bar.
- [ ] **D3. Squircle: graduate or cut** (S) — decide on `corner-shape`
      browser support; "experimental" shouldn't survive two majors.
- [ ] **D4. Motion tokens** (M) — unify durations / easings as
      `--wr-motion-*` across the animation kit and overlays.
- [ ] **D5. Figma kit** (L, later) — token-synced community kit; credibility
      multiplier once D1/D2 land. (PrimeNG/Kendo/Material all ship kits.)

## E — DX, docs & distribution

- [ ] **E1. Versioned docs** (M) — freeze v7 docs (e.g. a `/7.x` route)
      before v8 content lands; docs search wired into the command palette.
- [ ] **E2. AI-legibility stack** (M–L, highest leverage for adoption) —
      `llms.txt`, per-component markdown export, an **ngwr MCP server**
      (search / docs / examples / install via schematics), agent skills, and
      an open registry schema for community blocks + theme presets. This
      stack drove shadcn's 20%→56% rise; Taiga has an MCP server, nobody in
      Angular has the full stack. Builds directly on E3.
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

## F — AI components (`ngwr/ai`)

A confirmed open lane: Kendo's kit is paid, NG-ZORRO is porting Ant Design X,
nobody ships a free, complete Angular AI kit.

- [ ] **F1. Streaming markdown renderer** (M) — standalone component
      (typed-out streaming, code blocks via the existing shiki setup).
      Foundation for F2 and useful alone.
- [ ] **F2. Chat / agent kit** (XL, the 8.x headline) — message thread,
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

## v8.0 breaking bucket

Kept deliberately small:

- [ ] Angular 23 peer baseline.
- [ ] B2 internals swap (DOM/class changes from Aria primitives).
- [ ] Drop v7 compat leftovers; naming nits (`/pipes/range` → `/pipes/wr-range`).
- [ ] Per-entry bundle budgets enforced in CI.

## Suggested starting order

1. **M1** — showcase mobile adaptation (the site is unusable on phones
   today; it gates everything adoption-related), then **M2 + M3 + M4**
   (responsive overlays + touch + viewport correctness; M5–M7 follow)
2. **B1** — Signal Forms `FormValueControl` (stable now; first-mover window)
3. **E2 + E3** — AI-legibility stack (cheap, compounds with everything,
   biggest lever while download count is the bottleneck)
4. **A1** — tests (start immediately, runs through the whole cycle)
5. **C1 + C2** — table v2 and the vscroll regression
6. **G1** — RTL (mechanical but large; can run as background sweeps)

Then **F1 → F2** as the 8.x marquee, and **B2** lands with v8.0 proper.

## Non-goals (researched, rejected)

- Pure-headless library — `@angular/aria` occupies that for free; we build on it.
- Copy-paste-only distribution — weak traction in Angular; E6 hybrid instead.
- Proprietary chart engine or AG-Grid feature chase.
- Runtime CSS-in-JS — CSS custom properties are already the right model.
