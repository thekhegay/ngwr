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
      **The four overlay / form components followed** (2026-08-09): `wr-dialog`,
      `wr-popover`, `wr-toast` and `wr-date-picker`, +118 specs, suite now 296.
      Each pins the contract B2 is about to churn — roles, ARIA state, the
      `.wr-*` classes — rather than internals.
      They paid for themselves immediately: **`WrDialog`'s dismiss button
      announced the raw catalog key `dialog.close`** to anyone who had not
      configured i18n, because it called `i18n.t()` bare where the rest of the
      library routes through `readI18nText(key, fallback)`. axe cannot see it —
      a name IS present — so only a spec was ever going to find it. Fixed.
      The other eight suspected defects were each reproduced before anything was
      touched — **seven held, one did not.** The one that did not is worth
      recording: `wr-popover` was reported to leak a subscription per open,
      because `openOverlay()` binds with `takeUntilDestroyed(this.destroyRef)`
      while `closeOverlay()` only disposes the `OverlayRef`. CDK's
      `OverlayRef.dispose()` completes `_keydownEvents` and
      `_outsidePointerEvents` and removes the overlay from both dispatchers, so
      the subscriptions end themselves. Reasoning from the ngwr side alone would
      have "fixed" a non-bug.
      The seven that held are fixed: `wr-popover`'s `role="dialog"` panel now
      takes a name (new `ariaLabel` input, `popover.label` in both catalogs) and
      its tooltip carries `role="tooltip"` once rather than twice nested;
      `wr-date-picker`'s popup is now the dialog its trigger has always
      advertised — `role="dialog"`, a mode-specific name, and `aria-controls`
      wired to the panel; the toast stack expands on FOCUS as well as hover, so
      "Close all" is no longer mouse-only; and three pieces of documentation
      that contradicted the code were corrected to match it — `maxStack` queues
      the newest rather than dismissing the oldest, `position` moves the whole
      shared stack, and `provideWrToastConfig`'s signature now accepts the
      single-label override its JSDoc had always promised.
      Taking the focus half on then turned up **two shipped defects in
      `wr-calendar` that had nothing to do with the picker**, both reproduced
      before anything was changed. (1) Arrow-key navigation moved the focus RING
      but not real focus: `focusActiveCell()` was queued with `queueMicrotask`,
      and under zoneless CD the scheduler runs in a MACROTASK, so the microtask
      fired while `--focused` was still on the cell just left. Measured
      ArrowRight from the 15th: ring 16, `activeElement` 15, permanently — the
      ring said one day and a screen reader said another. Worth recording how
      nearly it was missed: a first probe that called `detectChanges()`
      synchronously showed ring and focus agreeing, because that updates the DOM
      before the microtask, which never happens in a real app. (2) The roving
      tabindex was seeded without checking the day was selectable, so a `min` in
      the future put the grid's ONLY `tabindex="0"` on a disabled button and
      dropped the whole grid out of the tab order. Both fixed, both pinned, and
      both guards verified by reverting the fix and watching them fail.
      Focus now moves INTO the popup, split by how it was opened: the trigger
      button and `Alt+ArrowDown` take focus to the roving cell, a click that
      placed a caret in the text field does not — a bare `ArrowDown` is the way
      in from there. Every close path hands focus back only if it was still
      inside the panel, so a click on another control keeps it. The guards are
      mutation-verified; one of them, typing-with-the-popup-open, exists because
      a surviving mutation showed the arrow guard was untested and every
      keystroke would have routed into the grid.
      `wr-date-range-picker` then got the same contract across BOTH its fields —
      panel role / name / id, `aria-controls`, and focus that returns to the
      field or button that opened the popup rather than always the start input.
      It had no tests at all; it has 30 now, and writing them is what found the
      rest. Four value-layer defects, each reproduced before it was touched: the
      time steppers were bound through `[ngModel]`, whose deferred first write
      lost its race with the panel's echo guard under zoneless CD, so a range
      bound to 16:00–17:00 opened showing **00:00** on both ends and the first
      click committed midnight over the real value; raising a same-day start past
      the end sorted mid-edit, so the start stepper froze and each further click
      pushed the END up instead; tabbing from the start field to the end field
      sorted too, moving the just-typed start date into the field being tabbed
      into; and the first blur on an untouched picker wrote `[null, null]` over
      the `null` it was bound to, marking a `[formField]` dirty and flipping a
      consumer's `@if` to truthy with nothing picked. The unifying rule, already
      written in this file for typing, now applies everywhere: an edit to one end
      is never reordered while the user is still on it — ordering settles when
      the interaction ends (focus leaves the pair, or the popup closes).
      A third `wr-calendar` defect surfaced the same way, and it is the worst of
      the lot: arrow keys moved the ring onto days `min` / `dateFilter` had
      closed off. Those cells render natively `disabled` AND carry the grid's
      only `tabindex="0"`, so `[minDate]` alone left **zero tabbable cells** —
      tab out of the calendar once and there was no way back in. Navigation now
      skips in the direction of travel, which also matters: probing forward
      first, as the seeding helper does, would bounce an ArrowLeft over a
      disabled weekend back onto the day it started from.
      **Still open, deliberately:** only the two range endpoints carry
      `aria-selected`, so the extent of a 30-day range is invisible to a screen
      reader — changing that announces 30 selected cells and is a design call,
      not a patch; and changing `[format]` at runtime leaves both pickers' text
      stale, which is shared and pre-existing, so fixing it in one would only
      create a new divergence.
      **The service layer is now covered too** — storage, theme, density,
      media, clipboard, the hotkey dispatcher, the loading bar and the drawer
      manager, at 440 specs. Writing them turned up eight defects, every one
      reproduced before it was touched, and the pattern is that a service's
      side effects are exactly what nothing was watching:
      `WrStorage.watch(key, fallback)` dropped the fallback on `remove()` /
      `clear()`, so it and `get()` disagreed about what an absent key means;
      `WrHotkey` never released its document listeners when its injector died,
      and a stale handle unbinding twice tore down the listener a LIVE binding
      depended on; `WrClipboard`'s textarea fallback — the path every plain
      `http://` origin takes — selected a node it then removed, dropping focus
      to `<body>` on every copy; `WrLoadingBar` flashed to 100% on a stray
      `complete()`, and a task starting inside its 220 ms hold kept
      `progress` at 1 and then trickled BACKWARDS toward 0.9, which a
      redirecting route guard hits on every navigation. Its worst was on the
      live site: with no platform guard, the prerenderer ran the whole cycle
      and serialized the bar at full width — **193 of 217 pages** shipped a
      primary bar across the top of every cold load, now 0.
      Two dismiss buttons were misnamed, and the second only surfaced because
      the first was being fixed: `WrDrawerManager` announced the raw key
      `"drawer.close"` where no catalog was configured, and `WrDialog`, already
      patched for that case, resolved its label ONCE at injection — before any
      async catalog had loaded — so a localized app got an English button on
      every dialog forever. Both now resolve per open. axe cannot see either
      one: a name is present, it is just the wrong one.
      Two traps worth recording, both of the shape AGENTS.md already warns
      about. jsdom's `textarea.select()` does NOT move focus while a real
      browser's does, so the clipboard focus test passed for the wrong reason
      until the stub was taught the real semantics. And an assertion that a
      hotkey stops FIRING after teardown is not an assertion that its listener
      was REMOVED — clearing the registry silences the handler while the leak
      survives, so the guard has to count `addEventListener` against
      `removeEventListener`.
      Those last six followed — `WrOutsideClick`, the window manager, all three
      platform services and the icon registry — which closes the service layer
      at 501 specs. Only one defect left in them, and it was in the piece every
      overlay in the library dismisses through: `WrOutsideClick` judges a click
      by where the PRESS started, but a click activated by Enter or Space has no
      `pointerdown` of its own. A press inside a panel that never produced a
      click — a drag released off-window, a node removed under the finger, a
      cancelled touch — left that origin behind, so the next keyboard activation
      anywhere on the page read as "inside" and the panel refused to close, for
      keyboard users only. Fixed by trusting a stored origin only when the click
      really came from a pointer (`detail > 0`).
      Two of the mutation checks survived here and BOTH were the tests' fault,
      not redundant code: a two-deep overlay stack cannot tell "stop at the pane
      that was clicked" from "skip it", because the containing pane is always
      last — it takes three; and a watcher that unsubscribes ITSELF mid-walk
      never exposes the missing snapshot, because splicing the last element
      shifts nothing. A watcher that closes a DIFFERENT one does. A third
      survivor was left alone on purpose: the defensive copy in `closeAll()`
      cannot be observed, since reading a signal already hands back an immutable
      array.
      The window entry point gave up three more, all reproduced with numbers
      before anything moved. `WrWindowRef._closed` was a plain `Subject`, so
      `afterClosed()` resolved `undefined` for any caller that awaited it after
      the window had already closed — two reads of one result disagreed, and a
      saved document was indistinguishable from a dismissal. `WrDialogRef` had
      solved that with a `ReplaySubject(1)` and a comment explaining why; the
      window ref had not. And `saveLayout` snapshotted the geometry the STATE
      imposes rather than the one the user chose: a maximized 720x480 editor
      saved as `[0, 0, 1024, 768]`, so restoring re-maximized over
      viewport-sized restore geometry and "Restore down" left it filling the
      screen; a minimized window saved its collapsed header height of **40**,
      which the restore then clamped to `minHeight` and handed back as a stub.
      The window knew the right numbers all along — `saveLayout` was reading the
      effective signals instead of the raw ones.
      **`bringToFront()` was inert, and is now fixed** — measured, not reasoned.
      A unit suite cannot see this at all (jsdom paints nothing), and the
      in-app browser pane reports a 0x0 viewport, which poisons every layout
      read. Playwright was already a dependency for `check:contrast`, so the
      answer was a real headless Chromium over `dist/showcase`: open two
      overlapping windows, hit-test the overlap with `elementFromPoint`, click
      the older window's title bar, hit-test again. Its `z` went 1001 to 1003,
      above the other window's 1002, and the hit test kept returning the NEWER
      window. Focus-follows-click — the core promise of a window manager — did
      nothing.
      Two causes, stacked, and the first one alone was not enough. Each window's
      z-index was written on `.wr-window`, which sits INSIDE its own CDK wrapper;
      that wrapper is `position: fixed` with a numeric z-index, so it is a
      stacking context and nothing written inside it can order one window
      against another. Moving the z-index onto the overlay host fixed the
      numbers and changed nothing on screen — because the hosts are also
      `popover="manual"` and live in the TOP LAYER, which orders strictly by
      entry and ignores z-index entirely. Window overlays now pass
      `usePopover: false`: the top layer's "last opened wins" is right for a
      menu or a modal and exactly wrong for windows. It also fixes the ordering
      against modals, since a dialog stays in the top layer and now sits above
      every window rather than below whichever one opened after it.
      Worth recording how nearly the diagnosis went wrong: the first check read
      the `popover` attribute off the PANE, which does not carry it, and
      concluded the top layer was not involved. It was the wrapper.
      **Components started:** the three checkbox-shaped form controls first,
      because they are `FormValueControl` / `FormCheckboxControl` implementations
      where the BINDING is the contract — `wr-checkbox` (+ group), `wr-radio`
      (+ group) and `wr-switch`, 27 specs. Nothing was broken in them; the point
      is the documented trap in `<wr-checkbox>` now has a guard that fails when
      it reappears. Group membership is `checkboxValue`, never `value` (which
      `FormCheckboxControl` reserves), and a stray `value="x"` leaves every box
      in the group on the default identity `null`, so they all toggle as one
      control. Mutating the identity to `null` fails two specs.
      Then the three value controls whose keyboard IS their contract —
      `wr-rating`, `wr-slider` (single and range) and `wr-input-otp`, 37 specs.
      The assertions sit on the ARIA a screen reader reads, not on the pixels: a
      slider whose `aria-valuenow` never moves is silent however far the thumb
      travels, and in `range` mode each thumb has to bound the OTHER
      (`aria-valuemax` of the low thumb is the high value), or the announced room
      is the whole track. Nothing was broken here either. Three jsdom gaps worth
      knowing for the next component: `ClipboardEvent` and `DataTransfer` do not
      exist at all (a paste has to be a plain `Event` with the payload attached
      by hand), and `getData('text')` is NOT aliased to `text/plain` the way a
      browser aliases it.
      **Writing the pagination spec then found the worst defect of the run, in
      the library's most-used component.** `wr-btn` has two host forms —
      `<button wr-btn>` and the bare `<wr-btn>` element, both documented, the
      element form used by the pagination, event-calendar and popconfirm chrome
      and by 25 showcase demos. A custom element has no button semantics of its
      own, and the component supplied none: no `role`, no `tabindex`, no
      Enter/Space. Measured in Chromium against the built site, the entire
      `wr-pagination` subtree — 26 elements — contained **zero** focusable
      nodes, and sixty Tab presses never entered it. The control was completely
      unreachable by keyboard, and `disabled` was decoration: inert on a custom
      element, doing nothing but styling.
      `check:a11y` was silent about all of it and was right to be: an unknown
      element with no role is not an interactive control to axe, so there was
      nothing for it to fault. That is the same blind spot recorded earlier for
      `disabled` on a custom element, and it is worth stating plainly — the
      structural gate cannot see a control it does not recognise AS a control.
      The element form now carries `role="button"`, a `tabindex` it drops while
      off, `aria-disabled` (since the `disabled` attribute cannot speak for
      itself there), and Enter/Space activation with `preventDefault` so Space
      does not scroll the page. Native hosts are deliberately left alone — a
      `<button>` already has all of it, and a stamped `tabindex` would override
      the browser's own handling of its disabled state. Verified the same way it
      was found: 7 focusable controls where there were 0, Tab moves between
      them, and Enter moves `aria-current` from page 1 to page 2.
      Then the two disclosure / toggle patterns, `wr-collapse` (+ accordion
      group) and `wr-segmented`, 22 specs — `aria-expanded` moving with the
      panel, `aria-controls` pointing at a region that actually exists, exactly
      one `aria-pressed` segment, and the sliding thumb correctly hidden.
      **A lead worth recording, deliberately NOT acted on.** After the button
      fix, the obvious question was whether anything else in the library is
      clickable but unreachable. The first sweep drove a browser over 154 routes
      looking for elements with a click listener and no way in, and reported
      zero — which turned out to be zero for the wrong reason: `jsaction` is a
      HYDRATION marker and Angular strips it once the page hydrates, so by the
      time the sweep looked there was nothing left to find. Caught it by undoing
      the button fix in the live DOM and watching the sweep still report clean.
      Scanning the prerendered HTML instead does work — 193 files, 14329 click
      listeners — but the signal needs judgement rather than a mass fix: a
      `tabindex="-1"` grid cell is a correct roving-tabindex pattern, and a
      control with a role but no tabindex is usually just disabled. Left as a
      lead with the method written down, not as a patch applied on a noisy
      detector.
      `wr-breadcrumbs` was written next precisely BECAUSE of the projection
      trap recorded in AGENTS.md — and the spec found a different defect
      instead. `RouterLink` was bound unconditionally on the single anchor, so
      the directive was always live and owned the `href`, writing null into it
      whenever `routerLink` was null: every crumb given the documented `href`
      input rendered as text that navigates nowhere. Confirmed by removing the
      binding and watching the assertion pass. The anchor is now two branches,
      RouterLink only on the router one — which walks straight into the
      projection trap, so the label lives in an `<ng-template>` that either
      branch stamps. Both paths are covered, and re-introducing either defect
      fails specs.
      `wr-alert` closed the batch, 12 specs, and the contract worth pinning
      there is that it does NOT use one live region: a danger alert interrupts
      (`role="alert"` / `assertive`), a warning is assertive without
      interrupting, everything else waits its turn — and all of it goes away on
      dismiss, so a closed alert does not leave an empty announcer behind. Its
      dismiss button was already resolved correctly through `useI18nText`, so
      no repeat of the drawer/dialog defect here.
      `wr-input-number` added 13 more, aimed at the thing that usually escapes
      a number field: the three ways in — typing, the steppers and the arrow
      keys — agreeing about the bounds, since a value clamped for the buttons
      but not for the keyboard lets a form submit what the control calls
      impossible. Nothing broken. Two contracts worth having written down
      because they look like bugs until you read them: an emptied field is
      `null` and not `0` (a required check has to tell them apart), and
      unparseable text LEAVES the committed number alone rather than clearing
      it — the same rule `wr-date-picker` follows for a partial date.
      `wr-list` closed the night, 7 specs. Its interactive row turned out to
      be sound — focusable, Enter/Space activated, silent while disabled — but
      its JSDoc promised "the appropriate ARIA role for click handling" while
      the role is hardcoded `listitem`. That is the right call, not a bug: the
      row sits in a `<ul role="list">`, where a `button` or `option` child role
      breaks the structure the container promises. The doc now says so, and
      says what to do instead — project a real button into
      `[wrListItemTrailing]` when the action itself must be announced as one.
      `wr-stepper` and `wr-file-upload` followed, 24 specs. The stepper's
      contract is that `linear` REFUSES rather than greys: a disabled header is
      the hint, `onHeaderClick` is the rule. Pinning that needed the trick
      `date-picker.spec.ts` already documents — a real `.click()` on a
      `<button disabled>` is swallowed by the DOM, so the guard never runs and
      "the gate holds" passes for the wrong reason; dispatching the event
      directly still reaches the Angular listener. Caught by a surviving
      mutation, not by reading. The upload suite is all about refusals — wrong
      type, too large, one too many — each of which has to reach the host WITH
      a reason, since a silently dropped file looks like a broken upload.
      Neither component was broken. One more jsdom gap for the list: there is
      no `DataTransfer` and `input.files` is read-only, so both entry points
      are driven by attaching a `FileList`-shaped object to the event.
      `wr-tree` brought 17 more and no defects — the ARIA is properly built
      (`role="tree"` / `treeitem`, `aria-level`, `aria-expanded`,
      `aria-multiselectable`) and the roving cursor keeps the whole tree to one
      tab stop. Two things the spec had to learn rather than assume: `openOn`
      defaults to `inline`, so there is no combobox trigger unless you ask for
      one; and inline selection is `[(selected)]`, while `[(value)]` — the
      `FormValueControl` binding — is documented as meaningful in `overlay`
      mode only. A spec written against `[(value)]` inline looks exactly like a
      dead two-way binding, which is what it looked like here until the JSDoc
      settled it.
      **Remaining:** the rest of the components — twenty-three of eighty-one
      have specs.
      A2 (CDK test harnesses) and B2 both wait on this half, which is now mostly
      done.
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
- [ ] **A5. Visual regression** (M) — **the painted-a11y half landed:**
      `pnpm check:contrast` (`scripts/check-contrast.ts`) drives a real Chromium
      over every prerendered route in BOTH themes and runs the two rules JSDOM
      cannot answer, `color-contrast` and `target-size`, gated against
      `scripts/contrast-baseline.json`. It runs **nightly**, not per PR: a
      browser and 386 page loads took the PR job from ~5 minutes to nearly 17,
      and painted-colour drift is worth catching the next morning rather than
      inside a review cycle. It found, on its first full pass, that
      **`wr-alert` still painted the bare intent as its title** — the exact
      failure the `-ink` ramp exists to prevent, and the exact number the ramp
      was built from: warning at 1.71:1, success 3.33, info 3.68, all in the
      light theme, all shipped in v10.1.0. Fixed. Showcase chrome had three more
      of the same shape: the active sidebar link at 4.28:1 on 190 routes, the
      `required` badge in every API table at 3.12:1, and the grid guide's demo
      cells. Two things the harness needed to be trustworthy: emulate
      `prefers-reduced-motion`, or an animation caught mid-flight reports a
      frame rather than a design; and print axe's OWN measured ratio, because a
      `color-mix` computes to `color(srgb 0.19 0.41 0.77)` and hand-rolled
      maths that assumes 0–255 turns it into nonsense.
      **The ramp itself was then recalibrated** (2026-08-09) off a full audit —
      every text node on the site whose colour IS an intent token, 2576
      measurements over 193 routes × 2 themes, contrast from axe's own
      `commons.color`. It showed `-ink` was not wrong but had no margin: the
      original shares were picked to clear AA's 4.5 exactly, leaving every
      intent between 4.59 and 4.83, so any background that was not pure surface
      dropped it under. Re-derived against each intent's own `-soft` tint at
      5.0:1 — the most saturated share that reaches it, in both themes — which
      took the worst `-ink` case from **-0.26 to +0.20** and cut the cases
      sitting under +0.5 from **20 to 3**, for 2–7 points of share. Note this is
      a visible token shift: every intent painted as text is now slightly
      deeper.
      **Per-site swaps followed** (2026-08-09): every remaining spot painting a
      bare intent as text moved to `-ink`, and the hardcoded `white` labels on
      filled intents moved to `-contrast` — 16 edits across typography, sidebar,
      stepper, tabs, breadcrumbs, the doc-page labels and the squircle demo.
      Failing cases 19 -> 14, thin ones 44 -> 36, and the contrast gate's own
      count 10 -> 7 routes light, 4 -> 3 dark. What is left is three kinds of
      thing, none of them a token swap: WCAG-exempt disabled controls; a
      measurement artefact where `wr-squircle` paints its fill on a `::before`
      that no contrast checker can see; and `wr-badge--secondary`, which led to the
      `-contrast` ramp being re-derived too — differently, because that token
      PICKS rather than blends: `_contrast()` returns whichever of
      `$contrast-dark` / `$contrast-light` beats the fill, so those two values
      are the ceiling. `$contrast-dark` was `#171616`, a near-black, which cost
      between 0.74 and 1.95 across the ramp; pure black put every intent at its
      theoretical maximum (`secondary` 4.52 -> 5.26, `danger` 4.90 -> 5.70,
      `primary` dark 5.37 -> 6.24). One case is irreducible: `primary` in the
      LIGHT theme at 4.89:1, where white already wins and pure white is the
      ceiling — only changing the primary fill moves it.
      **Baselined, both needing a design call rather than a patch:**
      `wr-carousel`'s dots are 8×8 with 14px centres where WCAG 2.5.8 wants 24
      (the `touch-target` mixin does not help — it is gated on
      `pointer: coarse`, and 2.5.8 applies to every pointer), and the token
      gallery labels every shade of a ramp with `{intent}-contrast`, which is
      calibrated for the base shade only.
      **Remaining:** Playwright screenshot diffs across the
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
