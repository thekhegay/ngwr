# Roadmap — v11

> Living document, and it carries **only open work**. Shipped items are not kept
> here: [CHANGELOG.md](CHANGELOG.md) is the record of what happened, git history
> holds why, and the decisions worth obeying live in [AGENTS.md](AGENTS.md) —
> including the sixteen "contracts that look like bugs" this file used to carry.
> Sizes: S / M / L / XL.
>
> **State (2026-08-12):** **v11 is the current major line** (Angular 22 peer). It
> is a major because five palette intents moved so their labels could go white —
> `secondary`, `success`, `danger`, `info`, `medium`; the arithmetic is under A5,
> and there is deliberately no codemod, because a codemod cannot repaint a
> screenshot. The catalog is **166 secondary entry points / 184 component and
> directive classes**.
> **Seven gates run on every PR:** `pnpm lint` (multi-stage — the first stage
> prints `All files pass linting.` even when a later one fails, so trust the
> exit code), `pnpm test` (**3113 specs across 184 files**), `check:api-docs`,
> `check:llms`, `build:lib`, `build:showcase`, `check:a11y` (220 prerendered
> pages). `check:contrast` and `check:rtl-layout` need a browser and run
> **nightly**. Docs are prerendered — **219 routes**, 196 canonical plus 23
> redirect stubs, with 195 markdown twins beside them — and past majors are
> archived under `/v7/`, `/v8/`, `/v9/`.

## Order

The sequence to work in. Everything not listed here is open but unscheduled;
everything under [Deferred](#deferred) is explicitly not now.

1. **E2** — AI-legibility stack (the MCP server and the markdown twins landed;
   agent skills and the registry schema remain)
2. **C3** — Combobox / autocomplete _(hard-blocked on B2)_
3. **B2** — Rebuild internals on `@angular/aria`
4. **B4** — Schema-driven `wr-form`
5. **D1** — Theme presets + builder
6. **D2** — System-token layer

Two notes on the order, then it stands as written:

- **C3 sits above B2 but is hard-blocked by it** — it needs the Aria `Combobox`
  primitive, so in practice either B2 moves up or C3 moves down.
- **A1 / A2 are deliberately not in the list** — they are continuous rather than
  sequenced. What used to be the argument for keeping B2 back is now answered:
  3113 specs assert rendered DOM, roles and `.wr-*` classes, which is exactly
  what B2 churns. What is left in A1 is mode coverage, not existence.

## A — Trust & hardening

The catalog is 166 entry points. Lint, unit tests, both builds, the a11y sweep,
the API-drift check and the llms floor gate it today. The hole is the SHAPE of
the suite, not its absence: every entry point that carries behaviour has a spec,
but a spec on `wr-table` says nothing about tree rows unless it exercises them.

- [ ] **A1. Test foundation** (XL) — **the suite exists and gates CI.**
      `pnpm test` is `ng test lib` (vitest through `@angular/build:unit-test`, no
      `vitest.config.ts`); specs sit next to the code they cover and
      `tsconfig.lib.json` excludes them, so nothing ships to npm. **3113 specs
      across 184 files**, and every component with a page under
      `reference/components` has one. How to write one, and the traps that cost
      real time (`--filter` is a test-name regex, deferred DOM work needs
      `afterNextRender`, jsdom has no layout), are documented in
      [AGENTS.md](AGENTS.md) — the durable half of what this item learned lives
      there, and the campaign's per-component findings are in git history.
      **What remains:**
      - **Mode coverage inside covered components.** A spec on `wr-table` says
        nothing about tree rows unless it exercises them; the same holds for
        `wr-select`'s tag mode, `wr-date-picker`'s datetime range, and every
        `responsive` variant.
      - **Five entry points have no spec at all:** `ngwr/version`,
        `ngwr/icon/adapters/{lucide,feather}` (88 and 67 lines of real name-conversion
        logic) and `ngwr/i18n/{en,ru}` (pinned only indirectly, by the key-parity
        spec).
      - `mcp/server.spec.ts` spawns `dist/lib/mcp/server.js`, so on a tree that has
        never run `build:lib` two of its specs fail and two skip. Run `build:lib`
        first, or accept the skip.
- [ ] **A2. CDK test harnesses** (L, soft-blocked on A1) — ship
      `ngwr/<entry>/testing` harnesses so consumers can test against wr
      components. Consumer-facing feature; target vitest.
      **Shipped: 38 nested entry points, ~934 harness specs** — every form control
      (`button`, `input`, `textarea`, `checkbox`, `switch`, `radio`, `select`,
      `input-number`, `input-otp`, `slider`, `rating`, `file-upload`,
      `color-picker`, `knob`, `form`,
      `segmented`), every overlay (`date-picker`, `dropdown`, `popover`, `dialog`,
      `drawer`, `action-sheet`, `toast`, `context-menu`, `popconfirm`,
      `command-palette`, `cascader`, `mention`), both data views (`table`, `tree`),
      the navigation and disclosure set (`tabs`, `stepper`, `carousel`,
      `pagination`, `collapse`, `transfer`), `splitter` and `markdown` — nested, so a spec
      import pulls nothing into the app bundle — plus the `/guides/testing` page.

    **The design rules, all of them earned:**

    - A harness answers what the control DOES, not how it is built:
      `isDisabled()` reads both `disabled` and `aria-disabled` because the
      element form needs both, and `getColor()` matches `WR_COLORS` rather than
      "the first `wr-btn--*` class", which would answer `icon` as readily as
      `primary`.
    - **A panel is scoped by the id its trigger publishes**, never by its class:
      a query for `.wr-select-panel` answers with whichever select opened first.
      The only case that catches a leak is two instances open at once, and the
      SINGLE-element and LIST queries are separate code paths — the list one
      leaked while the single one was covered.
    - `getOptions()` drops what a client-side search filtered out (the options
      stay in the DOM so registration order survives) and throws while the panel
      is closed rather than answering `[]`.
    - `WrDialogHarness` is a `ContentContainerComponentHarness`, so a consumer's
      own harnesses resolve INSIDE one dialog.
    - **Pointer-driven writes are lies in jsdom**, so every value control is
      driven by the keyboard — the accessible path anyway — and the walk asserts
      its landing: with `max=100 step=3` the thumb stops at 99, where `setValue(100)`
      used to resolve silently on the wrong number.
    - **Two questions, not one:** a number field shows a string and holds a number,
      and an OTP's assembled code can differ from the bound model. Separate
      methods say so.
    - **The tab stop is not the selection** — a radio group with nothing picked
      still has one — and `getAccessibleName()` shipped resolving `aria-label`
      before `aria-labelledby`, backwards, in the one method whose job is checking
      a11y wiring.
    - `setValue` dispatches `input` AND `change`; the stated reason was wrong and
      is corrected in the harness and the guide — Angular's `DefaultValueAccessor`
      listens to `input`, `blur` and the composition events, so the `change` is for
      a consumer's own handler.

    **Two library changes the harnesses forced:** the toast's actions were both
    `.wr-toast__action`, so `dismiss()` had no stable target (`--copy` / `--close`
    now), and `[wrPopover]` needed a `wr-popover-trigger` marker class, because
    bound popover content leaves nothing in the DOM and a closed tooltip publishes
    no ARIA either.

    **Nine library defects came out of writing them**, which is the argument for
    harnesses on its own. Two came from `[wrColorPickerTrigger]`, which had no spec
    of any kind before: it published `aria-haspopup` and `aria-expanded` but never
    `aria-controls`, so nothing on the page connected the button to the picker it
    opened — the same gap `[wrContextMenu]` and `[wrPopconfirm]` were fixed for, and
    the reason the harness could not scope a panel to its own trigger. And its
    `disabled` input never reached the DOM at all: it gates `toggle()` and is
    forwarded to the inner picker, so the button announced itself as live and did
    nothing when pressed. Both now follow the shape the rest of the library uses.
    The seventh is the quietest: both drawer
    flavours resolved the panel's `aria-labelledby` ONCE, so a `[wrDrawerTitle]`
    that arrived, changed or vanished while the drawer stayed open left the
    reference naming an element that was no longer there — an `aria-modal` dialog
    announced as unnamed, with nothing on screen to say so. A conditionally
    rendered title was never named at all in the component flavour, whose one-shot
    lookup was a `queueMicrotask` rather than a render hook (the trap AGENTS.md
    documents, and the manager beside it had already avoided). Both re-resolve
    after every render now, and clear the attribute rather than dangle it. The
    action-sheet harness found it: an untitled sheet names its dialog with a
    screen-reader-only string, so `isNamed()` had to check the wiring rather than
    the string, and the wiring was what was broken. The other six:
    `[wrMention]` dismissed on Escape's keydown and reopened
    on the keyup, so Escape did not work in a real browser (a keydown-only spec
    hides it — the CDK sends real pairs); `wr-context-menu-item`'s `aria-expanded`
    went stale because it was bound to a plain field; neither `[wrContextMenu]` nor
    `[wrPopconfirm]` published `aria-controls`; and `wr-tabs` twice ignored that
    `disabled` means nothing to an `<a>` — a disabled ROUTER tab navigated on
    click, and the roving `tabindex="0"` followed `active` without checking
    `disabled`, leaving the strip with no tab stop at all. Worth remembering from
    the first: `preventDefault()` does NOT stop `RouterLink`, which navigates from
    its own handler — withhold the commands (`[routerLink]="disabled ? null : link"`).
    Mutation testing also corrected the library's own docs: select-all on a
    virtualized table selects the whole dataset, not the window, and `aria-setsize`
    counts the row itself.

    **Still uncovered:** calendar, event-calendar, window, tour, lightbox,
    image-cropper, speed-dial, virtual-scroll, plus the charts and the animation
    set. Every CONTROL and every OVERLAY has one now, so what is left is
    the rest of the layout set, the two calendars and the animations. None is
    blocked.
- [ ] **A5. Visual regression** (M) — **the painted-a11y half landed:**
      `pnpm check:contrast` (`scripts/check-contrast.ts`) drives a real Chromium
      over every canonical route in BOTH themes and runs the two rules JSDOM
      cannot answer, `color-contrast` and `target-size`, gated against
      `scripts/contrast-baseline.json`. It runs **nightly**, not per PR: a browser
      and 392 page loads (196 routes × 2 themes) took the PR job from ~5 minutes
      to nearly 17, and painted-colour drift is worth catching the next morning
      rather than inside a review cycle. Two things it needed to be trustworthy:
      emulate `prefers-reduced-motion`, or an animation caught mid-flight reports
      a frame rather than a design; and print axe's OWN measured ratio, because a
      `color-mix` computes to `color(srgb 0.19 0.41 0.77)` and hand-rolled maths
      that assumes 0–255 turns it into nonsense.
      **What it found and what came of it.** `wr-alert` still painted the bare
      intent as its title — the exact failure the `-ink` ramp exists to prevent
      (warning 1.71:1, success 3.33, info 3.68, all light, all shipped in
      v10.1.0). The ramp was then recalibrated off a full audit (2576 measurements
      over every text node whose colour IS an intent token): the original shares
      cleared AA's 4.5 exactly, leaving every intent between 4.59 and 4.83, so any
      background that was not pure surface dropped it under. Re-derived against
      each intent's own `-soft` tint at **5.0:1** — the most saturated share that
      reaches it, in both themes. `-contrast` was re-derived differently, because
      that token PICKS rather than blends: `$contrast-dark` was a near-black,
      which cost 0.74–1.95 across the ramp, so both candidates are now the
      extremes and every intent sits at its theoretical maximum. One case is
      irreducible: `primary` in the LIGHT theme at 4.89:1, where white already
      wins and pure white is the ceiling.
      **The v11 palette shift belongs to the same arithmetic** — shipped, and it is
      why v11 is a major. A sixth intent followed in a patch: the DARK theme's
      `primary` went from `#5b85ff` (white 3.36 / black 6.24, so it took a black
      label while the light theme's took white — one intent labelled two ways) to
      `#3567ff`, white 4.63 / black 4.54. Saturation was held at 100% rather than
      scaling the channels toward black, which reaches the same ratio at `#4c6fd6`
      and costs 37 points of saturation on the one theme whose palette is
      deliberately vivid. It cost two follow-on changes, both found by the nightly
      sweep rather than by reading: `primary`'s `-ink` share re-derived from 86% to
      78% (the deeper base had dropped it to 4.48:1 on its own tint), and the
      showcase's twenty bare `color: var(--wr-color-primary)` declarations moved to
      `-ink`, because a white label and a readable body text are provably
      unreachable at once on a dark canvas. Then the same audit ran over the
      LIBRARY: 29 declarations paint a bare intent through a text property, and 11
      of them are text while 18 are `<svg>`-only graphics that WCAG holds to 3:1
      and that the bare token clears. The eleven moved. Five of them
      (`wr-option--selected`, `wr-tree__row--selected`, `wr-cascader__opt--active`,
      the command-palette option, `wr-segmented__option:hover`) had been under AA
      in the LIGHT theme too, at 4.17–4.19:1, since long before v11 — invisible
      because every one of them lives in a hover state or an overlay panel, which
      neither shipped gate ever paints. Five intents move so their labels can
      be white: in the
      light palette `secondary` goes from `#f51c6a` to `#e21a62`, `success` from
      `#00a400` to `#008800`, `danger` from `#fa383e` to `#dc3137`, `info` from
      `#3b82f6` to `#3472d9` and `medium` from `#8594a4` to `#6a7683`; in the dark
      one `success` from `#34c759` to `#23863c`, `danger` from `#ff5c5c` to
      `#ca4949` and the `medium` fill from `#9aa6b8` to `#6d7682`. `_contrast()`
      picks whichever of black and white scores higher, and the two are equal at
      **√21 ≈ 4.58** — so any intent lighter than that gets a black label whatever
      anyone prefers, and at the old tones white measured 3.10–3.99 against
      black's 5.26–6.77. Aiming at 4.5 does NOT work and was tried: at 4.51 black
      still reads 4.66 and the picker does not move. **`warning` and `light` are
      deliberately excluded and cannot be included** — white needs `#906900` on
      warning, which is brown rather than a warning colour; their black labels are
      correct at 12.28 and 14.14. The cost is highest in the dark theme, where a
      lighter fill was the point (`success` is visibly duller). The `medium` FILL
      moved and `--wr-color-muted-text` did not, because that is text on the
      canvas, where lighter is what makes it legible. **The `-ink` shares in
      `$ink-mix` were NOT re-derived**, and that reasoning is worth knowing before
      someone "fixes" it: `-ink` and `-soft` come off the same base and move
      together, so a deeper base darkens the ink and deepens the tint in the same
      proportion. It was not confirmed by hand — three attempts to measure the pair
      from the tokens produced nonsense, each caught by a control case, because
      `getComputedStyle().color` hands back an unresolved `color-mix(…)`. The
      evidence is the gate: both themes, every route, no new violations, including
      the tag / alert / typography pages that paint ink on its own tint.
      **Baselined, each needing a design call rather than a patch:**
      `wr-carousel`'s dots are 8×8 with 14px centres where WCAG 2.5.8 wants 24
      (the `touch-target` mixin does not help — it is gated on `pointer: coarse`,
      and 2.5.8 applies to every pointer); `wr-event-calendar`'s event chips are
      20px, and raising them fits one fewer event per month cell; and the token
      gallery labels every shade of a ramp with `{intent}-contrast`, which is
      calibrated for the base shade only.
      **A layout defect reached an app before any gate saw it**, which is the
      clearest argument for the half still open. `WrDialog` mounts the consumer's
      component BETWEEN `.wr-dialog-panel` and the dialog's parts, so that host was
      the panel's only flex item — and with `overflow: visible` its automatic
      minimum size is its content height, so it refused to shrink: on an 883px
      viewport the host measured 1098 and the footer's buttons sat at 1102,
      unreachable, with no scrollbar anywhere. Nothing in an app could fix it, since
      the host is inserted by the service. Fixed by making that host a shrinkable
      flex column (`> *:not(.wr-dialog__close)`), both halves measured to be
      load-bearing (`min-height: 0` alone leaves the footer 861px past the fold).
      **The defect class is closed, so nobody needs to sweep it again:** exactly
      three services take a consumer's `ComponentType` and so interpose a host —
      dialog, drawer, window — and `WrDrawerManager` already carried the identical
      rule. `WrWindowManager` is immune by shape rather than by patch:
      `.wr-window__body` IS the scroller and the host lands INSIDE it. Keep that
      distinction — the trap needs the host to be an ANCESTOR of the scroller.
      **Two more gate lessons.** A jsdom spec shaped like "the content scrolls"
      passes identically before and after the fix, so `dialog-scroll.spec.ts` guards
      the RULE and says so in its docblock; only a browser guards the behaviour. And
      running the FULL axe rule set in a real browser over every route — which
      neither gate does, since `check:a11y` disables the three rules needing layout
      and the nightly runs only two of them — found exactly one class of failure:
      every `<pre>` scrolls horizontally and a scrollable region that cannot take
      focus cannot be scrolled by keyboard. Shiki adds no `tabindex`; it does now.
      Worth repeating after any change to a scroll container or an overflow rule,
      as a scratch script rather than a gate.
      **Remaining:** Playwright screenshot diffs across the showcase, at mobile
      viewports too — and **interactive-state contrast**, which no gate covers:
      both walk prerendered HTML or a page at rest, so every hover, focus ring and
      overlay panel is unpainted and therefore unmeasured. Driving Playwright into
      those states found six real AA failures the gates had been green through, and
      one still open: `wr-command-palette__option-shortcut` (the `<kbd>`) measures
      **4.17:1 in the LIGHT theme**, `#5f6c7d` on `#dce4f1` — the muted role is
      calibrated for `#ebeff4`, and the active option's tint is darker than that.
      Unrelated to the intent tokens, so it was left alone rather than folded into
      a patch about them. An audit here must assert the state PAINTED: a clean axe
      run over an element that never rendered looks exactly like a pass.

**Remaining from the SSR pass:** per-component SSR-safety notes in the docs, and
incremental hydration (`withIncrementalHydration()` + `@defer (hydrate on …)`).

## B — Platform alignment (Signal Forms + Angular Aria)

- [ ] **B2. Rebuild interactive internals on `@angular/aria`** (XL — DOM and
      classes will shift) — listbox→select, combobox, menu/menubar, tabs,
      accordion, tree, grid primitives. Positions ngwr as "styled components
      over the official primitives": less a11y logic to own, and a story no
      other styled Angular lib has yet. **Blocks C3.** The precondition — a suite
      that catches churn in DOM and BEM classes, which are public API — is now
      met by A1; what A5 still owes it is screenshot diffs.
- [ ] **B4. Schema-driven `wr-form`** (L, stretch) —
      generate a form from a typed field schema; pairs with Signal Forms'
      schema API.

## C — Data-heavy + missing components

- [ ] **C3. Combobox / autocomplete proper** (M, **hard-blocked on B2**) —
      free-text input + suggestions is a different ARIA pattern than
      select-with-search; build on the Aria `Combobox` primitive.
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
## E — DX, docs & distribution

- [ ] **E2. AI-legibility stack** (M–L, highest leverage for adoption) —
      `llms.txt` / `llms-full.txt`, `AGENTS.md` and the `ng update` codemods
      already ship, and the docs are prerendered, so crawlers and agents get
      real HTML with section links and highlighted code. `llms-full.txt` is
      accurate and gated by `pnpm check:llms` — **166 entry points, 118
      described**; it had been reporting 123 of 127 (the nested ones were
      invisible), shipping four descriptions scraped off the wrong element, and
      naming a type or a token in six import lines.
      **Per-component markdown export shipped:** every docs page also serves at
      the same URL plus `.md` (**195 pages, 579 KB**), converted from the
      prerendered HTML by `scripts/gen-md-docs.ts` — so it cannot drift from what
      shipped, and a floor check fails the build if it thins out. Live demos are
      dropped and their source blocks kept; each HTML page advertises its twin as
      `<link rel="alternate" type="text/markdown">`. One caveat not in this
      repo's hands: nginx on the box needs `text/markdown md;` in its
      `mime.types` for a browser to render a twin inline instead of downloading
      it — agents fetching bytes are unaffected either way.
      **The MCP server shipped.** `ngwr-mcp` is a `bin` on the existing package —
      stdio, JSON-RPC 2.0, hand-rolled, **zero dependencies** (node builtins
      only), because an SDK would put a dependency tree behind every `npm i ngwr`
      for a feature most consumers never run. Four tools: `search_ngwr`,
      `get_ngwr_component`, `get_ngwr_api`, `get_ngwr_setup`, documented at
      `/guides/mcp`. It returns commands and never runs them, and the only files
      it opens are three inside its own installed package — `llms-full.txt`, the
      schematics' `symbol-map.json` and the `.d.ts` bundle — so it adds **no
      second copy of anything**. That was the objection that killed the first
      design pass: `dist/lib/types/` is already in the tarball and already carries
      every summary, `@example` and input description. What the server adds is the
      part none of those files have, a way to ASK — an agent that does not know an
      entry point's name cannot use a `.d.ts`, and `ngwr-table.d.ts` is 42 KB of
      declarations to answer "what inputs does `wr-table` take".
      **Thirty-one defects, found by audit and not by any gate** — twenty in the
      first draft and eleven MORE in the code written to fix them, which is the
      part worth remembering: a rewrite is new code with new failure modes, and
      the second audit is not optional. Two classes recur. On the wire, a batch
      produced zero bytes and any handler exception was reported as a PARSE error
      against a null id, so the id the client waited on was never answered — and
      58,000 valid requests overflowed `JSON.stringify` and killed the process
      with nothing written; batches are capped at 256 now. In the reader, one
      regular expression per member had an optional-but-EXPANDABLE JSDoc prefix,
      so every member it could not read let the match grow to the next comment and
      swallow the ones in between (`WrTable.scrollToRow` came back with a
      5806-character "description" naming 42 internals, `WrDialog.open` vanished,
      67 public members were missing). It is a scanner now, verified 1:1 against
      the TypeScript AST over the whole shipped corpus — but only after a fenced
      `@for` in a code sample was found terminating `@example` bodies, an inline
      object constraint in a class's type parameters was found being read as the
      class body, and an apostrophe inside a nested JSDoc was found opening a
      string that never closed, which turned the rest of a class into one member
      with a 241,013-character "type". 123 specs pin it.
      **Remaining:** agent skills, and an open registry schema for community
      blocks + theme presets. This stack drove shadcn's rise from 20% to 56%;
      Taiga has an MCP server, nobody in Angular has the full stack. Builds
      on the API-reference extraction that already ships.
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
      ~80. Worth pairing with a pass over the catalog: **49 of the 187 keys are
      still unread by any component** — including all twelve `date.months.*`,
      which nothing reads at all — and a locale pack multiplies only what is
      actually wired up. (The 19 `validation.*` keys ARE read, dynamically, by
      `<wr-form-field>`; a naive grep calls them dead.)
- [ ] **E9. Blocks** (L) — `ng g @ngwr/blocks:auth|dashboard|landing|settings`
      composed from ngwr components and themed by D1. Proven adoption driver
      (shadcnblocks economy, Ant Pro, Tremor); virtually no Angular block
      ecosystem exists today.

## F — AI components (`ngwr/ai`)

A confirmed open lane: Kendo's kit is paid, NG-ZORRO is porting Ant Design X,
nobody ships a free, complete Angular AI kit.

- [ ] **F2. Chat / agent kit** (XL) — message thread, prompt input (attachments,
      slash commands via the mention plumbing), tool-call + approval +
      reasoning-trace renderers, sources panel — wired to AG-UI /
      Vercel-AI-SDK-style streams. Showcases the existing toast /
      command-palette / animation kit.

## Deferred

Open and researched, but explicitly not now.

- [ ] **D5. Figma kit** (L) — token-synced community kit; a credibility
      multiplier, but only once D1 + D2 land. (PrimeNG / Kendo / Material all
      ship kits.)
- [ ] **C10. Rich text editor** (XL) — the biggest single component gap across
      free Angular libs (Taiga wraps ProseMirror; PrimeNG is rebuilding theirs).
      Likely a ProseMirror-based `ngwr/editor`. Validate demand before
      committing.
- [ ] **C7. Menubar** (M) — horizontal app menu with submenus. **Deferred by
      decision until B2 ships**, not merely "cheaper after": the whole component
      is roving focus, typeahead and submenu orchestration, which is precisely
      what the Aria primitive provides — building it first means writing that
      twice and throwing one away. Completes dropdown / context-menu into a menu
      family.
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

The v11 palette shift is no longer on this list — it shipped; the arithmetic and
what it cost are recorded under A5.

- [ ] **Colour role-rename** — component stylesheets are fully on the surface
      roles; what remains is **11 values across 7 files** still naming
      `--wr-color-{white,dark,light}` or a derivative (`click-spark.ts`,
      `fuzzy-text.ts`, `calendar-heatmap.ts`, `gauge.ts`, `knob.ts`,
      `line-chart.html`, `markdown/styles/_index.scss`), plus dropping `light` /
      `dark` from `WR_COLORS` / `WrColor`. Needs a `migration-v11` codemod.
      (D2's remaining piece.)
- [ ] **B2 internals swap** — DOM and BEM class changes from the Aria
      primitives. Public API by the project's own rules, so it needs a major.
- [ ] **Angular 23 peer baseline** (~Nov 2026).
- [ ] **Per-entry bundle budgets enforced in CI.**

## What blocks what

Almost nothing is blocked; the one hard edge is B2.

- **C3** — **hard-blocked on B2**; it needs the Aria `Combobox` primitive.
- **A2** — soft-blocked on **A1**: harnesses with no suite behind them are just
  more untested API surface. In practice A1's existence half is done, so A2 is
  moving.
- **B4** — its dependency (the `WR_FORM_ERRORS` provider) has shipped, so it is
  unblocked.
- **D5** — blocked in practice on **D1** + **D2**.
- **C7** — technically unblocked, but **held for B2 by decision**: its entire
  cost is the menu interaction model the Aria primitive already carries.
- **B2** itself — unblocked, and its stated precondition is now met: A1 pins the
  DOM and classes it will churn. A5 still owes it screenshot diffs.
- **Everything else is unblocked.**

## Non-goals (researched, rejected)

- **Input mask (was C4)** — decided: **bless `ngx-mask`, do not own one.**
  `[wrInput]` is a directive on the real `<input>`, so the mask composes on the
  same element with no adapter, no wrapper and nothing to keep in sync — which
  is the whole argument. The deliverable was documentation, and it already
  exists: `/reference/components/input` has a setup block and six live masks
  (phone, card, expiry, CVC, date, separated money), and `wr-input.ts`'s JSDoc
  names it. Owning one would mean reimplementing caret arithmetic, paste,
  composition events and locale separators — the part of masking that is
  genuinely hard — to end up where a `pnpm add` already is. Phone-international
  and card presets die with it; they are `ngx-mask` config, not our surface.
- Pure-headless library — `@angular/aria` occupies that for free; we build on it.
- Copy-paste-only distribution — weak traction in Angular; E6 hybrid instead.
- Proprietary chart engine, or an AG-Grid feature chase.
- Runtime CSS-in-JS — CSS custom properties are already the right model.
