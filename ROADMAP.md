# Roadmap — v11

> Living document, and it carries **only open work**. Shipped items are not kept
> here: [CHANGELOG.md](CHANGELOG.md) is the record of what happened, git history
> holds why, and the decisions worth obeying live in [AGENTS.md](AGENTS.md) —
> including the sixteen "contracts that look like bugs" this file used to carry.
> Sizes: S / M / L / XL.
>
> **State (2026-08-14):** **v11 is the current major line** (Angular 22 peer). It
> is a major because five palette intents moved so their labels could go white —
> `secondary`, `success`, `danger`, `info`, `medium`; the arithmetic is under A5,
> and there is deliberately no codemod, because a codemod cannot repaint a
> screenshot. The catalog is **202 secondary entry points / 184 component and
> directive classes**, seventy of those entry points being the `<name>/testing`
> CDK harnesses — A2 closed with the animation set, and what it learned lives in
> [AGENTS.md](AGENTS.md) under "Writing a HARNESS".
> **Seven gates run on every PR:** `pnpm lint` (multi-stage — the first stage
> prints `All files pass linting.` even when a later one fails, so trust the
> exit code), `pnpm test` (**3640 specs across 226 files**), `check:api-docs`,
> `check:llms`, `build:lib`, `build:showcase`, `check:a11y` (220 prerendered
> pages). `check:contrast`, `check:state-a11y` and `check:rtl-layout` need a
> browser and run **nightly**. Docs are prerendered — **219 routes**, 196 canonical plus 23
> redirect stubs, with 195 markdown twins beside them — and past majors are
> archived under `/v7/`, `/v8/`, `/v9/`.

## Order

The sequence to work in. Everything not listed here is open but unscheduled;
everything under [Deferred](#deferred) is explicitly not now.

1. **E2** — AI-legibility stack (the MCP server, the markdown twins and
   the agent skill landed too; the registry schema remains)
2. **C3** — Combobox / autocomplete _(hard-blocked on B2)_
3. **B2** — Rebuild internals on `@angular/aria`
4. **B4** — Schema-driven `wr-form`
5. **D1** — Theme presets + builder
6. **D2** — System-token layer

Two notes on the order, then it stands as written:

- **C3 sits above B2 but is hard-blocked by it** — it needs the Aria `Combobox`
  primitive, so in practice either B2 moves up or C3 moves down.
- **A1 is deliberately not in the list** — it is continuous rather than
  sequenced. What used to be the argument for keeping B2 back is now answered:
  3640 specs assert rendered DOM, roles and `.wr-*` classes, which is exactly
  what B2 churns, and seventy harnesses assert the same surface from the outside.
  What is left in A1 is mode coverage, not existence.

## A — Trust & hardening

The catalog is 202 entry points. Lint, unit tests, both builds, the a11y sweep,
the API-drift check and the llms floor gate it today. The hole is the SHAPE of
the suite, not its absence: every entry point that carries behaviour has a spec,
but a spec on `wr-table` says nothing about tree rows unless it exercises them.

- [ ] **A1. Test foundation** (XL) — **the suite exists and gates CI.**
      `pnpm test` is `ng test lib` (vitest through `@angular/build:unit-test`, no
      `vitest.config.ts`); specs sit next to the code they cover and
      `tsconfig.lib.json` excludes them, so nothing ships to npm. **3640 specs
      across 226 files**, and **every entry point has one** — the last five landed
      with the animation pass. How to write one, and the traps that cost
      real time (`--filter` is a test-name regex, deferred DOM work needs
      `afterNextRender`, jsdom has no layout), are documented in
      [AGENTS.md](AGENTS.md) — the durable half of what this item learned lives
      there, and the campaign's per-component findings are in git history.
      **What remains:**
      - **Mode coverage inside covered components.** Most of what this bullet used
        to name turned out to be covered already — `wr-table`'s tree rows and
        grouping, `wr-select`'s tag and search modes, `wr-date-picker`'s
        per-end datetime range — and the `responsive` half has now landed:
        `wrPresentAsSheet` is pinned directly (the precedence rule is `??`, not
        `||`, so a bound `false` survives a global provider), the two overlays that
        switch presentation have sheet suites, and `wr-table` proves it gives
        virtualization up in card mode, which is the fourth pair it refuses and the
        only one that was not written down. What is left is the long tail: a mode
        is covered when a spec EXERCISES it, and a component with six inputs has
        more combinations than any list here can name.
      - ~~Five entry points have no spec at all~~ — closed. `ngwr/version` now
        compares its constant against the library manifest (the one drift a release
        script cannot catch by itself); the two icon adapters pin the SVG envelope
        byte for byte, since it has to keep matching what upstream emits, and that a
        registered name is the key VERBATIM; and the two catalogs are checked as
        DATA, which turned up the assertion nobody had: a Russian string owes its
        English counterpart the same `{{placeholders}}`, or the number quietly
        vanishes from the sentence.
      - `mcp/server.spec.ts` spawns `dist/lib/mcp/server.js`, so on a tree that has
        never run `build:lib` two of its specs fail and two skip. Run `build:lib`
        first, or accept the skip.
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
      **The seventh is closed, and it is the clearest example of the class:**
      `wr-command-palette__option-shortcut` (the `<kbd>`) measured **4.17:1 in the
      LIGHT theme**, `#5f6c7d` on `#dce4f1`. Nothing about the chip was wrong —
      `--wr-color-hover` is translucent, so on a plain row it composites to a light
      grey where the muted role reads 4.63:1, and only over the ACTIVE row's
      `-soft` tint does the same declaration land on a background the role was
      never calibrated for. Fixed by putting the chip back on the panel's own
      `--wr-color-surface` for that one state, which restores the exact pairing
      `--wr-color-on-surface-muted` is derived against and keeps the chip reading
      as a keycap rather than as part of the highlight: measured in a real
      Chromium, **5.34:1 light and 7.63:1 dark**, up from 4.17 and 6.29. An audit
      here must assert the state PAINTED: a clean axe run over an element that
      never rendered looks exactly like a pass, so the probe checked the box had a
      size and the palette had an active option before believing any number.
      **Interactive-state a11y is now the third gate** — `pnpm check:state-a11y`,
      nightly beside the other two. It exists because both of the others read a
      page at rest, so every hover, focus ring and overlay panel goes unpainted
      and therefore unmeasured; driving Playwright into those states by hand
      found seven real AA failures the gates had been green through, and nothing
      stopped the eighth. It drives a curated table of states — every overlay
      panel, the hover and selection states, focus rings — asserts each one
      PAINTED before measuring, and runs the FULL axe rule set there.
      **The full set, not the two painted rules it started with.** Colour was
      where the gap was noticed and not where it ends: `check:a11y` reads
      prerendered HTML, so `nested-interactive` and every other structural rule
      had never run inside an overlay either. The window taskbar's close button
      proved it — a `role="button"` span with `tabindex="0"` inside the tab's own
      `<button>`, found by reading a template rather than by any gate. Putting the
      bug back and re-running is what proved the rules fire: a clean run over a
      rule set that never executed looks exactly like a clean run.
      **And that is not hypothetical, it happened inside this change.**
      `target-size` is in `axe.getRules()` and is NOT in a default `axe.run()` —
      the WCAG 2.2 rules are opt-in — so widening from `runOnly` to the full set
      silently dropped it, and the sweep printed four cheerful "no longer fails,
      drop it from the baseline" lines about findings still sitting on the page.
      The fix is not the enable list, which is a promise; it is the assertion
      after the run that `color-contrast`, `target-size` and `nested-interactive`
      each appear somewhere in the result. A rule that never ran reports exactly
      like a rule that found nothing, one level up from a state that never
      painted, and the same answer applies: check that it happened.
      **Four things it had to get right**, each learned by getting it wrong first.
      It FAILS when a state does not appear, because a clean axe run over an
      element that never rendered is the failure mode this whole item keeps
      hitting. Its baseline is keyed by NODE rather than by count, so a new
      violation inside an already-failing state cannot hide the way
      `wr-calendar__day--today` did — and the keys have their `:nth-child()`
      stripped, or the calendar entries would expire when the month changes.
      `:hover` and `:focus-visible` are forced through CDP `CSS.forcePseudoState`,
      since a real pointer has one position and cannot reach a row inside an open
      overlay. And it waits for the state to STOP MOVING — five identical samples
      of every ancestor's opacity and transform plus a count of running
      colour-affecting animations — because `reducedMotion` does not stop an
      overlay's enter animation: caught mid-flight the dialog reports its own
      title at 3.68:1, a composite of a half-faded panel over a half-faded
      backdrop that exists for 200ms.
      **Three traps, all worth knowing before touching it.** A `catch` that
      returned "settled" hid `__name is not defined` — esbuild's keep-names
      transform, thrown by every `page.evaluate` holding a named inner function —
      through four rounds of debugging; that is the swallow-nothing rule in
      miniature. The wait has to be sampled from Node, one short evaluate at a
      time: a three-second loop INSIDE the page runs its timers and still observes
      the same six transitions running the whole way, because a headless renderer
      nothing is asking for a frame does not advance them. And "settled" cannot
      mean `transform: none`, since every CDK pane carries a permanent positioning
      translate — a condition that can never be met is indistinguishable from one
      that always fails.
      **What the first run found** is a correction rather than a new defect:
      `wr-calendar__day--out-of-month` measures 2.23:1 light / 3.11:1 dark, and the
      route baseline had been filing it under WCAG-exempt inactive controls. It is
      not exempt — those cells are enabled `<button>`s reachable with the arrow
      keys. The colour is right (`#5f6c7d`, 4.63:1 on white) and `opacity: 0.55` is
      what drops it, which cannot be tuned out: 0.75 gives 3.2:1, and reaching 4.5
      needs the full-strength muted tone, which is no de-emphasis at all. Baselined
      as a design call with the arithmetic written down, and the older note
      corrected.
      **Coverage is reported rather than assumed.** The table is hand-maintained,
      so every full run counts the state-dependent classes in the BUILT stylesheet
      and says how many it actually painted — **71 of 95** across **70 states**,
      up from 21 of 95 across 24 in the first pass. A curated list that has stopped
      growing looks exactly like one that covers the catalog, and that number is
      the only cheap way to tell them apart. Extending it is what `--probe` is
      for: it reports every unreachable state instead of stopping at the first,
      which turns a table-growing session from one full sweep per broken selector
      into one sweep for all of them. Three traps that pass reviewing and fail on
      the site: the showcase is built out of the library, so the FIRST
      `.wr-dropdown-trigger` on every page is the header's own version switcher —
      every entry goes through `demo()`; axe's node targets carry Angular's
      `_ngcontent-ng-cNNNNNNN` build hash, so a baseline key holding one expires on
      the next build (they are stripped, along with `:nth-child()`, down to the
      failing node itself); and a state that needs more than a selector can create
      is not in scope — `wr-anchor__link--active` needs a scroll position, so the
      table takes its hover twin, which is the rule that paints an intent as text.
      **What the second pass found, all invisible to both other gates because they
      only exist inside a state:** the window's traffic-light buttons are 14×14px
      and its taskbar close is 16×16 where WCAG 2.5.8 wants 24; the carousel dots
      show up here too, for the same reason they are already baselined by route.
      The taskbar close was the only one recorded as a DEFECT rather than a
      design call, and it is fixed: the pill is now a plain container holding two
      SIBLING buttons, because the close had been a `role="button"` span with
      `tabindex="0"` inside the tab's own `<button>` — interactive content inside
      interactive content — and the 16×16 hit area came out of the same markup.
      24px now, which the 28px pill absorbs without changing the taskbar's
      height. Neither half was reachable by any gate: a tab exists only while a
      window is minimized, and `check:a11y` reads prerendered HTML, where the
      rail is not rendered at all.
      **A scope is resolved as the target's ANCESTOR**, not as the first element
      matching the selector — a docs page renders the same component several
      times, and `table/row-selected` clicked a checkbox in the third demo and
      then measured the first, which is exactly how a state whose job was to
      paint `wr-table__tr--selected` reported it unpainted. The resolved element
      is marked with a `data-` attribute and axe runs on that, so the run and the
      class census cannot disagree about which instance they mean.
      **`pointer` is a real mouse, `hover` is a forced pseudo-class**, and both
      are needed: a component that styles `:hover` is reachable without moving a
      cursor, but the toast stack fans out on a `mouseenter` HANDLER and its
      "Close all" button does not exist until it has. Four states are absent for
      an honest reason rather than a broken selector — back-top needs a scroll
      position, file-upload needs a chosen file, the calendar's selected chip and
      the drag handle need a gesture — and a state a selector cannot create is
      out of this gate's reach by construction.
      **Remaining:** Playwright screenshot diffs across the showcase, at mobile
      viewports too, and the last 24 state classes.

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
      **The agent skill shipped**, and it is the piece the other three were
      missing. `llms-full.txt`, the markdown twins and the MCP server all answer
      "what exists"; none of them carries the dozen rules that separate code that
      compiles from code that works — `wr-btn` and not `wr-button`,
      `checkboxValue` and not `value`, no `ControlValueAccessor` anywhere, import
      from the entry point rather than a barrel. An agent learns those by shipping
      something broken. `skills/ngwr/` is a `SKILL.md` of about a page plus two
      `references/` files, generated by the same `collect()` pass that writes
      `llms-full.txt`, shipped inside the npm tarball (so an agent in a repo that
      depends on ngwr reads it with no network and no configuration) and served at
      `/skills/ngwr/SKILL.md`. Progressive disclosure is the format's point, so
      the catalog's 202 rows live in a reference file rather than in the always-in-context
      one. Two details worth keeping: the provider table is IMPORTED from the MCP
      server's own (`projects/lib/mcp/providers.ts` — one list, two readers,
      instead of two lists that agree until someone edits one), and `check:llms`
      gates the OUTPUT rather than the inputs, because a `SKILL.md` with no
      frontmatter or a catalog table with a header and nothing under it passes
      every input floor and is useless to its one reader. Documented at
      `/guides/agent-skill`.
      **Remaining:** an open registry schema for community blocks + theme
      presets. This stack drove shadcn's rise from 20% to 56%;
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
      ~80. A locale pack multiplies only what is actually wired up, and a pass
      over the catalog found five keys unread because the COMPONENT hard-coded
      English instead — `inputNumber.increment` / `.decrement` (the steppers'
      only accessible names), all four `toast.*` labels (their defaults were
      English literals in `DEFAULT_TOAST_CONFIG`, so an app on the Russian
      catalog got an English close button), `tree.placeholder` (`wr-select` fell
      through to the catalog for an unset placeholder and `wr-tree` did not) and
      `table.loading` (whose overlay had no role and no name at all). All fixed,
      each with a spec that fails without it, and the toast's live region gained
      the `toast.region` key it never had — 199 keys now.
      **36 of the 199 are still unread, and most of them should be**: the 20
      `common.*` are a convenience catalog for consuming apps rather than
      anything the library renders, and the 12 `date.months.*` are dead by
      design — every date string goes through the adapter's `Intl` formatting.
      What is left is four to decide on: `pagination.pageOf`, `select.empty`,
      `fileUpload.invalid` and `fileUpload.tooBig`. (The 19 `validation.*` keys
      ARE read, dynamically, by `<wr-form-field>`; a naive grep calls them dead.)
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
