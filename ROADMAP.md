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
      `wr-table` brought 17 specs aimed at what breaks silently: the role a
      hierarchy announces (`treegrid`, not a plain table) and the mode pairs the
      component refuses rather than half-supports. "Grouping wins over tree" is
      a decision — `groupBy` buckets a flat list and a forest has none — and
      flipping it would render a hierarchy as a shuffled flat table with no
      error anywhere.
      **Writing it turned up the same defect a third time, in the sibling panel
      the range-picker fix did not touch.** `wr-date-picker` in `datetime` mode
      showed **00:00** for a value bound to 16:40, so the first stepper click
      committed midnight over it — identical to the range bug, same cause
      (`[ngModel]` on a signal-forms control, whose deferred first write loses
      the race under zoneless CD), and invisible to the existing specs because
      the assertions on the hours were all in `time` mode, which feeds the panel
      directly. That is the useful lesson: covering a component is not covering
      its MODES, and the untested mode was the one on the fragile path.
      With three confirmed bugs from one pattern, the remaining uses went too —
      the table's three row checkboxes and the pagination size select. The
      library now imports **no `FormsModule` in any runtime component**, which
      is what "`ControlValueAccessor` is gone from the library" was always
      supposed to mean. One consequence worth naming: `wr-select` carries an
      `unknown` value by design, and `[ngModel]` had been hiding that behind
      `any` — the pagination handler now narrows it honestly.
      The datetime lesson was then applied backwards, to a component that
      already had specs. `wr-select` had 13 of them and **every one ran in the
      default `single` mode** — `multi`, `search` and `tag`, three of the four
      documented value shapes, had none. 21 specs later they do: an array value
      that stays open between picks, chips that remove their own value,
      `aria-multiselectable`, a trigger that becomes a real text field in search
      mode, case-insensitive narrowing, and free text committing as a tag on
      Enter with the field cleared behind it. Nothing was broken — but that is
      the point of checking rather than assuming, since the same audit on
      `wr-date-picker` found a shipped bug.
      Worth recording for the next filter suite: an unmatched `<wr-option>`
      hides itself with `wr-option--hidden` rather than leaving the DOM, so the
      panel keeps its `aria-activedescendant` targets — and `offsetParent` is
      not a visibility test in jsdom, which lays nothing out and reports null
      for everything.
      The same audit was then run across the other multi-mode components.
      `wr-popover` already exercises both of its shapes (`popover` and
      `tooltip`); `wr-drawer` had no specs at all, so it got 14 — including all
      four `position` values, which is a real mode axis rather than a style
      flag: `bottom` is how the drawer doubles as a bottom sheet, and each side
      lands its own `wr-drawer-overlay--*` class that consumer CSS targets.
      Nothing broken there either, and its dismiss button was already resolving
      its label correctly, so no repeat of the manager-path defect.
      `wr-event-calendar` brought 18, aimed at the two rules its own template
      comment spells out. The structural one: a chip lives INSIDE the
      `role="gridcell"` it starts in and reaches out with a `calc()` width — a
      floating events layer is simpler and would leave `role="row"` owning
      something that is not a cell, which the axe gate rejects. The behavioural
      one: `events` is an input the component NEVER mutates, so a drag or an
      `Alt` + arrow emits `eventChange` and the host applies it — an unhandled
      output is a cancelled drag, and the array must come back IDENTICAL rather
      than merely equal. Both are easy to "improve" into something that looks
      better and is wrong, and neither shows up on screen when broken.
      Three of the first assertions were wrong about the component rather than
      the reverse, and each is worth knowing: `role="rowheader"` is a legitimate
      row child (the time gutter labels its row); a DAY holds more cells than a
      month, because it is a grid of half-hour slots, so "narrower" has to be
      measured in date columns; and `editable` defaults to false, so the move
      path is refused until it is switched on — which meant the
      "never mutates" spec was passing without running the code it described.
      A surviving mutation then caught the missing half: nothing asserted the
      REFUSAL in a read-only calendar. It does now.
      `wr-context-menu` added 17 — the APG menu pattern through an overlay, so
      `role="menu"` owning `menuitem` children, every item out of the tab order
      because the menu roves focus itself, and the submenu contract:
      `aria-haspopup` only on the item that has one, `aria-expanded` tracking
      it, and Enter on a parent OPENING rather than activating — activate it and
      the whole menu closes with the submenu unreachable from the keyboard.
      Two testing notes worth keeping. Closing is deferred twice on purpose — a
      microtask so the consumer's own `(click)` runs first, then 220 ms of exit
      animation the directive holds the pane alive for — so `whenStable()` alone
      never sees the close. And `whenStable()` under fake timers DEADLOCKS: the
      stability check waits on a timer the fake clock has frozen, and the test
      just times out. Flushing microtasks by hand and then advancing the clock
      does the same job without it.
      One assertion was rewritten rather than kept: a disabled item's POINTER
      path is refused by `pointer-events: none`, which a dispatched `.click()`
      bypasses by definition — so testing it would have been testing jsdom. The
      keyboard refusal is in code and is what the spec now checks.
      `wr-mention` closed the batch with 23, and it is the one component whose
      ARIA was worth pinning line by line because every choice looks wrong until
      the reasoning is read — all of which the source already carries in
      comments. The host stays a `textbox` and is deliberately NOT a combobox:
      the field holds prose and a mention is one fragment inside it, `role="combobox"`
      is disallowed on `<textarea>`, and it would drop `aria-multiline` for the
      whole editing session rather than just while the popup is up.
      `aria-autocomplete` and `aria-haspopup` are STATIC, because they describe a
      permanent capability that should be announced on focus.
      The sharpest pair is the two references, and they have opposite rules:
      `aria-controls` is allowed to dangle at a panel id that only exists while
      open — gating it would mean gating `aria-autocomplete` too, and an
      unresolved `controls` is a manual-review note to axe — while
      `aria-activedescendant` naming an absent element is an author ERROR, so it
      has to vanish the moment the panel does. Both directions are now pinned;
      pointing `activedescendant` at the panel id instead fails three specs.
      One expectation of mine was wrong and became a contract: the default
      filter matches a SUBSTRING, not a prefix, so `@al` reaches "Alan" and also
      "TorvALds" — friendlier for names, where people type the part they
      remember. The `filterWith` override is covered alongside it.
      `wr-cascader` added 18. Its value is the whole PATH rather than the node
      — picking Berlin means `['eu', 'de', 'ber']`, and a consumer reading only
      the last segment loses the context that made it meaningful — and a branch
      is navigation rather than a choice, so nothing commits on the way down
      unless `changeOnSelect` says otherwise. Every option is its own tab stop
      here rather than a roving cursor, which is the documented reason virtual
      scrolling is deferred for this component; the spec pins that shape so it
      reads as a decision instead of an oversight.
      One of my own selectors was wrong in an instructive way: the panel is
      `wr-cascader-panel`, its own block, not `wr-cascader__panel` — it lives in
      the overlay rather than inside the host. A `querySelector` that never
      matches makes every "and it closed" assertion pass without looking at
      anything, and two of them were green that way until the two that expected
      the panel to STILL be open failed and gave it away. Worth remembering that
      a negative assertion on a wrong selector is silently vacuous.
      `wr-color-picker`'s pure `color/` folder got 21 — exact assertions and
      round trips, which is what conversion code deserves: every one of these is
      lossy in the middle (hue is undefined for grey, saturation for black), and
      a formula that is merely close shows up as a handle drifting further from
      the swatch on every drag. `#f80` expands by DOUBLING each digit, not
      padding; `parseHex` returns null rather than throwing or falling back to
      black, because its caller is usually a field mid-typing where "not valid
      yet" is the normal state.
      Two things this batch taught about the tests themselves. The scale is
      fractions: `h` is degrees in `[0, 360)` but `s`, `l`, `v` and `a` are all
      in `[0, 1]`, so white is `l = 1` — three assertions written in percentages
      failed and were right to. And a round trip is only as strong as what it
      compares: the hue-circle test checked saturation and value coming back
      intact, which left a shifted sextant boundary invisible, since swapping
      which channel carries the chroma moves the colour while leaving s and v at
      1. A surviving mutation said so; the hue itself is asserted now.
      **The two uncovered value controls followed** (2026-08-10) — `wr-textarea`
      and `wr-knob`, at 879 specs — and the yield came from one method worth
      naming: where two components are near-copies, whatever they DISAGREE about
      is a bug in one of them. `wr-knob`, `wr-rating` and `wr-slider` share a
      `role="slider"` template down to the `tabindex="interactive() ? 0 : -1"`
      expression, and the knob had lost four things its siblings keep. It emitted
      `touch` on pointer-up only, with no blur handler at all, so a keyboard user
      could set a value and the bound field stayed untouched forever — every
      validation message gated on touched simply never appeared. It never set
      `aria-readonly` (rating does) nor carried a `--readonly` modifier, so a
      read-only dial announced nothing and kept `cursor: grab`, reading as broken
      rather than deliberate. Its step grid was anchored at ZERO rather than at
      `min`, so with `min: 5, step: 10` the middle of the arc committed 60 — a
      value the arrows can never reach — and neither path rounded, so three
      presses at `step: 0.1` announced `aria-valuenow="0.30000000000000004"` and
      printed it in the dial. `wr-slider`'s `snap` already solves both halves and
      is now what the knob uses. Last, `radius = 50 - strokeWidth / 2 - 0.5` goes
      negative past 99, and a negative radius is invalid in the SVG path grammar,
      so the dial silently vanishes instead of clipping; floored at 1.
      `wr-textarea`'s was a question of ownership rather than of ARIA: `autosize`
      writes an inline `height` onto the native element, and the effect returned
      early when it was switched off — so the field stayed frozen at the last
      fitted size and `rows` silently stopped meaning anything. It now hands the
      height back, and a fit whose frame outlived its reason (autosize toggled off
      between the effect and the `requestAnimationFrame`) bails instead of writing
      one. Two notes on method. My first fix guarded the release behind an
      `autofitted` flag; a mutation survived, and rather than call the test weak
      I checked — the flag changed no observable behaviour, and the full suite
      plus the SSR prerender of every route were green without it, so the
      defensive field went rather than staying on to be explained. And the recon
      that found the grid and radius defects came from a subagent, which also
      reported the no-provider branch of `useI18nText` treating `''` as a real
      name: that one is unreachable, because `WrI18n` is root-provided and
      `no-provider.spec.ts` already proves `TestBed.inject(WrI18n)` resolves with
      nothing configured. Dead code, not a defect — worth verifying every claim
      before spending a fix on it.
      **`wr-transfer` was the richest single component yet** (2026-08-10) — five
      defects, all in the gap between the staging boxes and what a pane is
      SHOWING. The count under each heading and the header checkbox both read the
      visible-and-enabled staged rows; the moves read the raw box. So staging
      under one filter, refiltering and staging again moved BOTH rows while the
      user saw one ticked — and because staging also outlives an external write
      to `value`, the same value could land on the right twice. Both moves commit
      `state.checked`, so one derivation feeds the count, the checkbox and the
      transfer. `moveLeft` had the mirror bug and its mutation SURVIVED the first
      pass: that one was a weak test, not redundant code, and the missing spec is
      written. Three more: `value` was read with `.map` and no array guard, so the
      null a classic-forms `reset()` writes threw outright — `wr-checkbox-group`
      documents that exact hazard and normalises every read; unchecking filtered
      with `!==` while `WrTransferItem['value']` is documented as SameValueZero,
      so a `NaN`-valued row could never be unstaged (a `Set.delete` now does it,
      as `moveLeft` already did); and select-all was enabled whenever a pane had
      ROWS rather than enabled rows, so with every visible row disabled it drew
      itself checked and staged nothing — a one-way `[checked]` is only written
      back when the expression changes, and it stayed false. Its accessible name
      was the pane heading, byte-identical to the list's own, so it now composes
      `transfer.selectAll` with the title the way the pane's search box already
      does. **A catalog guard came out of that key:** nothing compared `wrEn`
      with `wrRu`, and a key added to one side only is invisible — `useI18nText`
      reads "translation === key" as missing and quietly serves the English
      default, so a Russian app renders English and no gate says a word. Both are
      pinned at identical key sets (166) with no empty values, empty being the
      worse case since it resolves as a real translation and reaches the DOM as a
      nameless control.
      **The scouted batch landed** (2026-08-10) — palette, dropdown, splitter,
      ten more defects at 946 specs, and every one of them had been guessed by a
      read-only subagent and then confirmed by hand before a line was changed.
      `wr-command-palette`'s was the worst of the three: keyboard navigation
      walked the flat SOURCE order while the template rendered the GROUPED order,
      and `bucketize` collects each group as it first appears — so with two
      interleaved groups one ArrowDown moved the highlight two rows and Enter
      fired the command below the one that looked selected. One inversion fixed
      all of it: the flat list is now derived FROM the buckets, so navigation
      order IS render order and the five symptoms share one cause. Three more
      there: its `role="listbox"` owned plain `div` wrappers, which ARIA has no
      rule for (a titled bucket is a labelled `group` now, an untitled one leaves
      the tree with `role="none"`); the reset-on-open effect also read
      `responsive()`, so a bound signal flipping mid-search re-ran the body and
      wiped what had been typed; and the focus trap was destroyed only in the
      CLOSE branch, so a component torn down while open left a live trap holding a
      detached panel.
      `wr-dropdown` clobbered the consumer's own `id` — the trigger is THEIR
      element, and the generated id exists only so the menu can name itself, which
      their value does just as well; it broke `<label for>`, `getElementById` and
      any `aria-labelledby` aimed at that button. Its disabled item was worse than
      it looked: `disabled` guards the KEYBOARD path only, and a real pointer
      click lands on the host element, where a consumer binds `(click)` — so a
      disabled Delete deleted. The fix is `pointer-events: none`, as `wr-btn` and
      `wr-checkbox` already do, which jsdom cannot prove (no stylesheets), so that
      one is a labelled rule guard plus a Chromium measurement: the hit test lands
      on the item before the fix and on its menu ancestor after.
      `wr-splitter` had four, three of them shared with a sibling: a focusable
      `role="separator"` with no accessible name and no way to give one (now
      `dividerLabel` + `splitter.divider`); `position` clamped only inside the
      handlers, so an outside write produced `aria-valuenow="150"` against a
      `valuemax` of 100 and a pane sized `150%`; no focus on `pointerdown`, whose
      `preventDefault` also suppresses the click's default focus, leaving the
      arrows dead after a mouse drag until the divider was found again with Tab;
      and no primary-button guard, so holding the RIGHT button on the divider and
      moving resized the panes. `wr-slider` already focuses its thumb and `drawer`
      already guards `isPrimary`, so the last two went into `wr-knob` as well
      rather than being left in the sibling.
      One trap worth recording, because I walked into it: adding
      `!event.isPrimary` makes the whole pointer path unreachable under jsdom,
      which has no `PointerEvent` at all — a spec driving the drag with a
      `MouseEvent` reads `isPrimary` as `undefined` and the guard rejects it. That
      turned the button test green for the wrong reason until the helper defined
      the property explicitly.
      **`wr-popconfirm` turned out to have been skipped by the overlay-a11y
      sweep** (2026-08-10). It is a confirmation dialog and announced itself as
      nothing at all: no role, no name, no description, so a screen reader met a
      generic container where the question should be. Worse for a keyboard user,
      focus never entered the panel — and the overlay container sits at the end of
      `<body>`, so Tab from the trigger went to the next thing on the PAGE and the
      only way to confirm was effectively unreachable. It now opens as a named
      non-modal `role="dialog"` describing its own message, lands focus on Cancel
      (the safe choice when the action being confirmed is the destructive one),
      and hands focus back to the trigger — but only when focus is still inside
      the panel, so a dismissal by clicking elsewhere leaves the user where they
      went. That last distinction is what a surviving mutation asked for, and it
      was a weak test rather than redundant code.
      **And the two catalog keys it never read**: `popconfirm.confirm` /
      `popconfirm.cancel` have sat in both catalogs, translated, since the
      component shipped, while the labels were hard-coded English input defaults —
      so every popconfirm in a Russian app read "Confirm" / "Cancel" with the
      right strings one file away. One claim of mine was refuted in passing and is
      worth recording: Escape does NOT depend on focus being inside the overlay.
      `overlayRef.keydownEvents()` is fed by CDK's `OverlayKeyboardDispatcher`,
      which keeps a single document listener and routes to the topmost overlay.
      **A label pointing at nothing** (`ngwr/input`, same day): `WrInput` adopts
      the field's `controlId` so `<label for>` reaches it, and correctly lets a
      control's own static `id` win — but the label went on pointing at the
      generated id, so a consumer who gave their input an `id` ended up with a
      `for` referencing an element not in the document, i.e. no label at all. The
      id still travels field → control, because the field renders its label before
      it can see what was projected and SSR needs a render-time binding; the fix
      is a one-shot announcement the other way (`adoptControlId`) that only the
      label's `for` reads. Found by a subagent, and it also caught that my own
      spec's NAME promised the label check while its body asserted only the
      input's id — the vacuous-assertion shape this file keeps warning about, this
      time in my own test.
      **`wr-tour` came next, and its cut-out was painting over its own card**
      (2026-08-10) — five defects, four of them lifecycle. The per-step
      `ConfigurableFocusTrap` was created into a LOCAL and never destroyed, so
      every step left a live `FocusTrapManager` registration and a capture-phase
      document focus listener behind it. The document-level Escape handler did not
      check `defaultPrevented`, so a step shown over a dialog closed both on one
      press. The service is root-provided and owns a CDK overlay, a div appended
      to `document.body`, a document keydown listener and two window listeners,
      with no destroy hook — a tour running at teardown left its cut-out on the
      page. And `isLast` compared `index()` against the RAW step count, while a
      step whose target is missing gets skipped: the final card read "Next" and
      pressing it ended the tour, so the service now looks ahead for a reachable
      step and the popup asks it. The progress line still counts every step the
      tour was given, which is truthful about its length and deliberately left
      alone. **The fifth was a stacking-context mistake** and the most interesting
      to measure. `.wr-tour__spotlight` and CDK's `.cdk-overlay-container` are
      both `position: fixed` children of `<body>` at `z-index: 1000`, so DOM order
      decides — and the service appends a fresh cut-out on every step while the
      container stays put. From the SECOND step on the dimming shadow painted over
      the tour's own card. `.wr-tour-overlay { z-index: 1001 }` reads like the
      guard against exactly that and cannot be: it sits on the pane INSIDE the
      container, whose stacking context scopes it. Fixed by putting the cut-out
      under the container at 999. Measuring it took two attempts, and the first
      was wrong in a way AGENTS.md already warns about: the dimming is a
      `box-shadow`, and shadows are not hit-testable, so `elementFromPoint`
      reported the card on top in both orders and looked like a refutation. Giving
      the same element a solid background over the card — same element, same
      stacking position — answered it: cut-out wins at 1000, card wins at 999. One
      of the six suspicions was refuted by the code's own reasoning rather than by
      a measurement. `readI18nText` freezes a label at construction, which is the
      shape of the `WrDialog` bug above — but the tour popup is rebuilt for every
      step and says so in a comment, so it resolves after the catalog has loaded.
      Worth recording that the helper is used by SEVEN components across 24 call
      sites while the `nullSignal()` shim that would make them reactive is used by
      none: whether that is a decision or drift is a library-wide question, not a
      tour one.
      **The docs stopped teaching the anti-pattern** (2026-08-10). Every demo and
      every copyable snippet bound its ngwr control with `[(ngModel)]` — the
      binding AGENTS.md calls an anti-pattern on these controls, and the one three
      shipped bugs came from — so the first thing a reader copied was the wrong
      shape. 157 bindings across 30 pages now use the control's own two-way model:
      `[(value)]`, or `[(checked)]` for `wr-checkbox` and `wr-switch`. Scope was
      drawn at the element: `ngModel` on a native `<input>` / `<textarea>`
      (including one carrying `wrInput`, `wrMention` or `wrAutosize`) is ordinary
      Angular and stays, and the v9 migration page keeps its `ngModel` because
      documenting that it still works is the page's whole job. Thirteen pages then
      had a dead `FormsModule` import, removed — and a naive substring sweep first
      tried to take `ReactiveFormsModule` from eighteen validator pages with it,
      which is the kind of thing a word boundary is for. **The conversion paid for
      itself in type errors.** `ngModel` types its value as `any`, so it had been
      hiding four real mismatches that `strictTemplates` reported the moment the
      real models were bound: `wr-select` publishes `unknown`, `wr-slider`
      publishes `number | [number, number]` because either thumb count can be
      right, and `wr-segmented` publishes `T | null` for "nothing selected". The
      narrowing now lives in the four page handlers, where the demo already knows
      which shape it wants, rather than being papered over by an accessor. Two
      descriptions that still advertised `[(ngModel)]` as the way in — `wr-tree`'s
      overlay mode and `wr-color-picker` — now match the code beside them.
      **`wr-speed-dial` followed** (2026-08-10), five defects, and one of the
      recon's claims was already handled better than the report thought: the
      collapsed actions are hidden with `visibility`, not `opacity`, with a
      comment in the stylesheet saying that is what takes them out of the tab
      order and the accessibility tree together. What was missing is the rest of
      what `role="menu"` promises. Escape did nothing, and since the actions are
      ordinary buttons in the tab order a keyboard user who opened the dial had to
      tab through every one to leave it; Escape now closes and returns focus to
      the trigger. The trigger advertised `aria-haspopup="menu"` and toggled
      `aria-expanded` but named no `aria-controls`, so the relationship existed
      only visually. The action buttons stayed enabled while the dial was disabled
      — clicks landed on a handler that silently refused, which is a control that
      looks live and does nothing — and a dial disabled WHILE open could never be
      closed again, because the trigger is the only way to close it and a disabled
      trigger cannot be pressed. Last, the iconless fallback glyph was
      `label.charAt(0)`, one UTF-16 code unit, which cuts an astral character in
      half: a 🚀 label rendered as a replacement character. My first test for it
      used ⭐, which lives in the BMP and survives `charAt` — the test passed and
      proved nothing until the emoji was moved outside it. What is NOT fixed, and
      is a design call rather than a patch: the dial declares `role="menu"`
      without APG's arrow-key navigation, and its items are in the tab order
      instead of carrying `tabindex="-1"` under a roving cursor. Implementing that
      or dropping the menu roles for a plain group of buttons are both real
      options; picking one is not a bug fix.
      **`wr-carousel` was the last of the scouted batch** (2026-08-10) and had
      seven, clustered around autoplay — content that moves on its own owes the
      most promises. `setInterval` ran with no platform guard, so the prerender
      started it too: work nobody will see, on a slide index that then gets
      serialized. The pause listeners sat on `.wr-carousel__viewport` while the
      arrows and dots are its SIBLINGS, so a slide could change under a cursor
      that was aiming at an arrow; they are on the host now, which is also where
      `focusin` / `focusout` went — WCAG 2.2.2 asks for a way to stop moving
      content, and hovering is not one for someone who never touches a mouse.
      `active` was a bare `model` that nothing reconciled against the slide count,
      so a filtered list left it pointing past the end and translated the track
      into blank space with no dot lit. `aria-roledescription="carousel"` sat on a
      role-less div, where it is simply dropped — `wr-carousel-slide` had this
      right all along, with `role="group"` beside it. The dot labels were a
      hard-coded English template while the three labels around them routed
      through the catalog, so a localized app got two languages in one pagination
      strip; and the docblock for `active` had drifted one declaration up, which
      is why its row in the published API table read "—". Two notes on proving it.
      The i18n one only bites under a real catalog: without a provider a lookup
      falls back to the same English string, so the first version of that spec
      passed whether the wiring existed or not, exactly as the popconfirm labels
      did. And the hover fix cannot be shown the way a user experiences it —
      `mouseenter` does not bubble, and jsdom will not synthesize the enter on the
      host that a real browser generates when the pointer reaches a child — so the
      spec asserts the listener now lives on the host, which is the fix, and says
      so.
      **`wr-lightbox` closed the scouted batch** (2026-08-10) with five, and its
      overlay work was already careful — focus trap, focus restore, Escape,
      backdrop click — so all five sat in the surface around it. The open image is
      styled `cursor: zoom-out`, which is a promise that clicking it closes the
      viewer, the most common way anyone dismisses a lightbox; nothing listened,
      so the cursor was the only part that worked. Neither `<img>` had an
      `(error)` handler while `--loading` both animates a shimmer AND sets
      `opacity: 0` on the thumbnail, so a broken `src` left an invisible box
      shimmering for ever instead of showing its alt text. `image.open` had been
      sitting in both catalogs, translated and unread, next to a hard-coded
      English literal in the template — the same shape as `popconfirm.confirm` —
      and the viewer's own fallback name had no key at all. `cursor: zoom-in` sat
      on the host unconditionally, so a `disablePreview` thumbnail that opens
      nothing still invited the click. And `preview` was documented as "shown
      until the full image loads", which never happens: the thumbnail is always
      `preview() || src()` and does not swap, so the doc now describes the lighter
      thumbnail source it actually is. Three things this one taught about the
      process. `nullSignal()` — the shim for "`useI18nText` with no input to
      forward" — is not exported from `ngwr/i18n`, which is the real reason
      nothing uses it; the label resolves through `useI18nText(this.alt, …)`
      instead, since a non-empty binding already wins over the catalog. Two of my
      mutations survived and split cleanly: one was my own targeting error (the
      template renders TWO images, and I removed the `(error)` from the branch the
      spec does not exercise, so the spec now checks both), the other a genuinely
      weak test (I had added an `openLabel` input and never asserted it). And the
      linter was right to object to a click handler on an `<img>`: the resolution
      is the repo's existing escape hatch with the reason written out — the
      affordance is REDUNDANT, since the close button, Escape, the backdrop and
      swipe-down all do the same thing and all reach a keyboard, so the image
      stays out of the tab order rather than becoming a second close stop.
      **`ngwr/qr` was invisible** (2026-08-10). A QR code is content — it usually
      encodes a URL — and it is painted into a `<canvas>`, which carries no
      implicit role and no text alternative, so the component offered a screen
      reader nothing at all. It now announces `role="img"` with a name: an
      `ariaLabel` input over `qr.label`, and the docs say to name what the code is
      FOR rather than leaving the generic fallback. The painting is the other
      half, and jsdom cannot see any of it: `getContext('2d')` returns null there,
      so `drawQrCode` bails at its first line and every assertion about pixels
      would be a false signature. The geometry is covered against a RECORDING
      context instead — a stub implementing only the two methods the generator
      calls, which is what makes the coverage honest: the encoder is vendored, but
      the bitmap size (`code.size * 10 + padding * 2`), the CSS box coming from
      `size` rather than from the bitmap, the fill order, the quiet zone and the
      error-level map are all this repo's, and each is a call the stub can count.
      Higher redundancy needing a bigger code is the one observable proof the
      `level` input reaches the encoder at all rather than being ignored. Two
      things left recorded rather than changed. With an empty `value` the bitmap
      is never sized, so a blank code keeps the canvas default of 300×150
      stretched by CSS into a square — cosmetic, and only on a value nobody
      renders on purpose. And `overlayIcon` insets its image by a hard-coded 10px
      on each side while everything around it scales with the bitmap ratio, so a
      small `iconSize` under a large `size` inverts the destination rectangle.
      **`wr-gauge` repeated its own sibling's bug** (2026-08-10). It shares the
      arc maths with `wr-knob` down to `radius = 50 - strokeWidth / 2 - 0.5`, and
      the knob was floored earlier this cycle for going negative past 99 — a
      negative radius is invalid in the SVG path grammar, so the browser drops the
      arc and the dial vanishes. The gauge still had the unfloored version. Three
      more: only the DRAWN ratio was clamped, so an over-range value painted a
      full bar while `aria-valuenow` announced the raw number against
      `aria-valuemax` — an invalid state for `role="meter"` — and the printed text
      disagreed with the bar too; `value` was the only numeric input here with no
      `coerceNumberProperty`, so a NaN reached the path's `d` as the literal text
      `NaN`; and neither `<path>` carried a BEM class, while the knob names its
      equivalents `.wr-knob__track` / `.wr-knob__value`, which left the gauge's
      arcs unstylable through the public class API. Recorded rather than fixed,
      because it is a visual trade rather than a defect with one answer: `viewBox`
      is the constant `0 0 100 56` while `strokeWidth` is an input, and the arc's
      round cap is centred on y = 50 with radius `strokeWidth / 2`, so anything
      past 12 puts part of the cap outside the viewport, where SVG clips it.
      Growing the box makes the gauge taller as the stroke fattens; capping the
      stroke silently ignores the input; moving the arc up changes every existing
      rendering. Two attempts to MEASURE the clipping both failed instructively
      and are worth remembering: `getBoundingClientRect()` on an SVG path reports
      the geometry box, not the ink, and Chromium accepts `getBBox({ stroke: true
      })` while ignoring the option — so both reported the same number whatever
      the stroke. The arithmetic settles it without a browser.
      **`wr-compare` had the splitter's trio, again** (2026-08-11), which is now
      three components deep: `position` clamped only inside the handlers, so an
      external write reached the DOM as `aria-valuenow="150"` against a `valuemax`
      of 100; no primary-button / primary-pointer guard, so the right button moved
      the divider; and no focus on `pointerdown`, whose `preventDefault` also
      suppresses the click's default focus, leaving the arrows dead after a mouse
      drag. Its name was a hard-coded English `aria-label` in the template, the
      fifth instance of that shape. And the pointer maths divided by
      `getBoundingClientRect().width` with no zero guard: an unmeasured host puts
      `Infinity` — or, at `clientX: 0`, `NaN` — straight into `aria-valuenow`. One
      interaction between two of those fixes is worth recording, because it made
      two mutations survive. Once the zero guard is in place, an unmeasured host
      moves nothing whatever the button was, so the POSITION can no longer tell a
      refused press from a permitted one; the guard test had to read
      `preventDefault` and focus instead. A fix can mask the observability of
      another fix, and a mutation is what says so. Left as a design call:
      `role="slider"` sits on the wrapper that CONTAINS both projected layers,
      while the visible divider and handle are `aria-hidden`. Moving the role onto
      the divider is the APG shape and would change which element takes focus — a
      visible change to a shipped component, not a bug fix.
      **`wr-donut-chart` (2026-08-11)** — four, and the sharpest was arithmetic
      rather than ARIA. `Math.max(0, NaN)` is NaN, and the running cumulative
      carries it forward, so one non-finite datum wrote the literal text `NaN`
      into its own arc's `d` AND every arc after it; worse, the same NaN reaching
      `sum` collapsed `total` through its `sum > 0 ? sum : 1` fallback to 1,
      silently rescaling every share that did survive. A `weight()` helper now
      reads a non-finite or negative datum as nothing, in both places. The ring is
      `aria-hidden` and the legend is optional, so with `showLegend: false` the
      chart offered a screen reader nothing at all — it is `role="img"` with an
      i18n-backed name now. The legend rendered an empty `<ul>` for empty
      `segments`, which is still announced as a list of nothing. And `slices()`
      carried a `percent` field the template never read, gone with it. The share
      was also where a mutation survived: reverting the guard in `total` alone
      changes every arc's angle while leaving the paths free of `NaN`, and the
      spec had only been asserting the absence of `NaN`. It now pins the good
      segments' path against the SAME data with the bad datum removed, which is
      the only assertion that notices a rescale.
      **`wr-sparkline` (2026-08-11)** — four, and the first was an inconsistency
      with itself. A series with no spread divided by the `|| 1` fallback and
      landed every point on `pad + h`, the bottom edge, so a steady series at 500
      read as rock bottom; a series of ONE datum was already centred. Flat now
      means the middle, which is what the single-datum branch had been saying all
      along. A non-finite datum survived the scale — every `min`/`max` comparison
      against a NaN is false — and `toFixed(2)` wrote the literal text `NaN` into
      the path `d`; such data is dropped now rather than scaled. The svg was
      neither hidden from assistive tech nor named, which is the one option that
      helps nobody: a sparkline usually sits beside the number it summarises,
      where announcing it again is noise, but it can also be the only thing
      showing a trend — so it is `aria-hidden` by default and becomes a named
      `role="img"` the moment a consumer says what it shows. And its `strokeWidth`
      was documented as viewBox units while `vector-effect="non-scaling-stroke"`
      makes it CSS pixels.
      **`wr-virtual-scroll` had a crash sitting behind one input** (2026-08-11).
      CDK requires `maxBufferPx >= minBufferPx` and throws `CDK virtual scroll:
      maxBufferPx must be greater than or equal to minBufferPx` outright otherwise
      — and the two inputs were resolved INDEPENDENTLY, each falling back to its
      own multiple of `itemSize`. So setting only `maxBufferPx`, which is the
      obvious thing to do when you want a tighter buffer, left the derived minimum
      of `itemSize * 4` above it and the viewport threw on construction. Setting
      only `minBufferPx` above `itemSize * 8` did the same from the other side.
      They resolve as a pair now: a given minimum pushes the maximum up, a given
      maximum pulls the minimum down, and both given are simply sorted. Its spec
      is deliberately the smallest of this batch, and the reason is worth writing
      down: this component is a wrapper around a MEASURED CDK viewport, and jsdom
      measures it at zero, so it renders an empty window. A row count would pin
      the environment, not the component — the critic flagged exactly that shape
      in the plan it was handed — so the template context is left unchecked and
      said to be, while the buffers, the height coercion and the empty-list path
      are covered. Left recorded: a virtualized list renders a handful of N rows
      with no container role and no `aria-setsize`, so a screen reader is told
      nothing about the total. The row template is the consumer's, which is what
      makes this a design question rather than a patch.
      **`wr-image-cropper` closed the batch** (2026-08-11) with two fixes and the
      batch's largest recorded gap. The crop is measured against the image that
      WAS showing, and `cropRect` is a public signal, so leaving the geometry in
      place across a `src` change had it reporting a rect scaled to the PREVIOUS
      image for the whole gap between the new source and its load event — long
      enough for a consumer to read it and crop the wrong thing. And
      `onPointerDown` accepted any button and any pointer, the fourth component in
      this cycle with that exact hole after splitter, knob and compare. Testing it
      needed one deliberate stub and it is worth explaining. Everything else here
      is measured, and jsdom measures nothing — `getBoundingClientRect()` is zeros
      and `naturalWidth` is 0 — so a real load leaves `display` at 0 and the crop
      UI never renders at all. Giving the `<img>` the two numbers `onImageLoad`
      actually reads is the smallest stub that makes the crop maths observable,
      and it buys the thing worth pinning: `cropRect` converts display pixels to
      SOURCE pixels, which is the value a consumer acts on. A mutation survived
      and is redundant-for-behaviour rather than a weak test: `display` gates
      everything downstream, so clearing `cropDisplay` and `natural` alongside it
      changes nothing a test can see. They are reset anyway, for coherence, and
      the reason is written into the method — anything that later learns to set
      `display` from elsewhere (a resize observer being the obvious candidate for
      this component) would otherwise resurrect a crop belonging to the previous
      image. **Its biggest problem is left open on purpose:** the crop window and
      its eight handles are pointer-only — not focusable, no role, no name — so
      the entire interaction is unavailable from a keyboard, and there is no APG
      pattern for an image cropper to copy. Choosing the keyboard model (arrows
      move, shift resizes, which handle is selected and how) is design, not a bug
      fix, and the same goes for a missing `(error)` path on the image, which
      today leaves a blank frame with no feedback.
      **`ngwr/date-adapter` was the highest-consequence thing left uncovered**
      (2026-08-11) — it is what the calendar grid, both pickers and the range
      panel compute with, so a wrong answer here is a wrong day everywhere at
      once. Four defects, and two of them turned nonsense into confident results.
      `parse` never range-checked anything. `new Date(2025, 12, 45)` does not fail
      — it rolls forward into 2026 — and `isValid` is happy with what comes back,
      so a text field turned `2025-13-01`, `2025-02-30` and `12:60` into plausible
      dates. The clock parts are checked directly now, and the month and day by
      comparing what the calendar returned, which catches every rollover including
      a month of 12 or -1. `parse` also had no case for `MMM` / `MMMM`: they fell
      through to a greedy `(.+)` the switch never read, so `11 Aug 2025` parsed as
      **11 January** and said nothing. Month names are matched against the
      locale's own list now, and an unknown name is a rejection rather than
      January. The formatter mangled literal text, which is how the previous
      defect surfaced. The one-letter tokens match letters inside words, so `'yyyy
      [year]'` came out as `2025 [yeamr]` — the `a` in "year" read as a meridiem.
      Single-quoted runs are emitted verbatim now, the way `DatePipe` and LDML do
      it, with `''` for a real quote; unquoted letters are still tokens, and that
      trade-off is pinned by a test so it reads as a decision. Last, `addDays`
      added 86 400 000 ms. Where daylight saving applies a day can be 23 or 25
      hours, so that drifts the wall clock and — across an autumn change — lands
      back on the same calendar date, which makes a month grid repeat a day and
      lose one. It moves the calendar day now. This is the one fix in the batch NO
      test here can hold: the runner's timezone is `Asia/Almaty`, which has no
      daylight saving, so millisecond and calendar arithmetic agree on every date
      — the reason is written into the method and into the spec's docblock
      instead, since a comment is the only place knowledge like that survives. Two
      mutations survived and both were redundant code rather than weak tests: an
      explicit month-range check the rollover comparison already covered, and a
      month-name alternation in the parse regex whose answer actually comes from
      the switch case. Both removed.
      **`ngwr/cookie` had exactly one defect, and it was the silent kind**
      (2026-08-11). `SameSite=None` REQUIRES `Secure` — every modern browser drops
      the cookie outright without it — so `set(k, v, { sameSite: 'None' })` wrote
      a cookie that never existed and reported nothing. A cross-site cookie is
      what the caller asked for, so `Secure` now comes with it. Everything else
      about the service held up under test, which is worth recording too: the name
      and value are both encoded, so a `;` or a `=` cannot break the jar; an empty
      value is told apart from a missing one; a name is not confused with one that
      merely starts the same way; a `Date` serialises as an HTTP-date and a number
      as `Max-Age`, floored, never negative; and reads and writes are no-ops
      rather than throws when `document.cookie` is unavailable. jsdom implements
      `document.cookie` for real, which makes this one of the few browser APIs
      testable here without a stub — though the ATTRIBUTES are read back off a
      recording document, since jsdom does not enforce the rules a browser applies
      to them.
      **`wr-line-chart` completed the chart family** (2026-08-11) and repeated two
      of its siblings' faults while avoiding a third. `Math.min`/`Math.max` are
      computed over the POOLED data of every series, so a single non-finite datum
      made both NaN and every coordinate in EVERY series came out as `NaN` — the
      whole chart vanished rather than the one bad point. Non-finite points are
      dropped now, and the spec pins the harder half: the good series must draw
      identically with the bad datum present and removed, which is what catches a
      silent rescale rather than just the absence of `NaN`. Its `<svg>` was
      neither hidden from assistive tech nor named, and here that matters more
      than in the donut — the legend carries the series NAMES only, so the numbers
      are nowhere in text; the plot is a named `role="img"` now. It had already
      got the empty-legend guard right, which is why that one is absent from this
      list. And, like the gauge before it, none of its SVG parts carried a class:
      the gridlines, the ticks, the series paths, the dots and the crosshair are
      all `.wr-line-chart__*` now, which is the public styling API a consumer is
      expected to reach for.
      **`wr-calendar-heatmap` (2026-08-11)** — two, both about who can read it.
      Its weekday and month labels were hard-coded English arrays, in a library
      where `WR_DATE_LOCALE` is root-provided and needs no setup at all: a Russian
      app got "Mon / Wed / Fri" and "Aug" in the middle of its own UI. They come
      from `Intl.DateTimeFormat` on that locale now, with the deliberate blanks on
      four of the seven rows preserved — seven labels do not fit, and a test pins
      that so it reads as a choice. And the grid was several hundred bare
      `<span>`s carrying a `title`, which a screen reader on a role-less element
      does not read, with no name on the container either: it is a named
      `role="img"` now with the cells taken out of the tree, which is the same
      answer the gauge, the donut and the line chart arrived at.
      **`wr-counter` and `wr-progress` (2026-08-11)** — one clean, one not, and
      both now pinned. The counter is the component whose entire purpose is a
      900ms animation, and it was the one component in the library that did not
      honour `prefers-reduced-motion`: `wr-scroll` already falls back to instant
      through `WrPlatform.prefersReducedMotion`, so the convention existed and
      this was simply outside it. It jumps straight to the value now, the same
      branch the server already took. Its `value` was also the only numeric input
      here without coercion, and `Intl.NumberFormat().format(NaN)` renders the
      literal text `NaN` — which is what a reader saw. `wr-progress` had nothing
      wrong with it, and its spec is worth having for exactly that reason: the
      bar's width and `aria-valuenow` are the same clamped number, and a change
      that clamps one without the other shows a full bar announcing 300. Three
      mutations confirm the spec would catch it.
      Two notes on testing an animation, the second learned the hard way. The
      odometer's visible markup carries no readable text at all — ten digits per
      column, one picked by a transform — so `.wr-counter__sr-only` is what
      assistive tech and the prerendered HTML actually get, and that is what the
      spec reads. And the tween is driven with FAKE timers, faking `performance`
      and `requestAnimationFrame` together: a first version slept 320ms of real
      time and caught the tween half way at 949 of 1234, and a second polled until
      the text stopped changing — which cannot tell "finished" from "not started
      yet", so it passed here and failed on CI with the counter still on 0.
      Wall-clock waiting produced two different wrong answers in one spec; the
      clock belongs to the test.
      **The KPI and meter family (2026-08-11)** — `wr-bar-chart`,
      `wr-meter-group`, `wr-statistic` and `wr-statistic-countdown`, and the same
      NaN story as the line chart turned up in the first two. A scale derived with
      `Math.max(...values)` or a `reduce` over the values is `NaN` the moment ONE
      datum is, so both fell back to their `1` divisor and asked every HEALTHY bar
      for a height of `value * 100`% — one bad number did not lose its own bar, it
      destroyed the chart around it, and printed the literal text `NaN` while it
      was at it. Both now read a non-finite value as zero, and the meter's legend
      keeps a NEGATIVE value visible (it is data the caller gave us) while giving
      it no width.
      The meter also announced a value outside the range it announced it against:
      segments summing past an explicit `max` put `aria-valuenow` above
      `aria-valuemax`, which is not a number a screen reader can turn into a
      percentage. It is capped at the total now. And the bar chart had the
      decoupling problem in its purest form — the values live in one row and the
      labels in another, so a reader got three numbers and then three labels with
      nothing joining them, and with `showValues` off the numbers were not in the
      accessible tree at all. Each column is a named `role="img"` carrying "Mon:
      10", with the visible label row hidden as the decoration it now is.
      `wr-statistic` rendered an empty-string value verbatim — a labelled card
      with nothing under it — while its own numeric path already treated `''` as
      "no value"; that internal disagreement is what made it a bug rather than a
      preference. The countdown had two: an unparsable `target` reached the screen
      as `NaN:NaN:NaN`, and the naive fix would have been worse than the bug,
      because clamping only the TEXT would have left `tick` comparing zero to zero
      and firing `countdownEnd` for a target that was never reached. Its `tickMs`
      was also the one numeric input in the entry point with no coercion, so `0` —
      or anything unparsable, through NaN — asked `setInterval` to run as fast as
      the browser allowed. Floored at one frame.
      **`wr-anchor` and `wr-back-top` (2026-08-11)** — and one of the two findings
      here is about the GATE, not the component. `wr-back-top` marked itself
      `aria-hidden="true"` while hidden, which does nothing whatsoever to the tab
      order: a keyboard user tabbed into a 44px button they could not see and a
      screen reader could not name. `pnpm check:a11y` cannot see this — axe in
      JSDOM has no layout, so nothing measures as focusable and
      `aria-hidden-focus` passes vacuously. Confirmed instead in a real Chromium
      through Playwright, where `focus()` landed on the button and axe 4.13
      reported the rule as SERIOUS. The fix is `inert`, chosen by testing all
      three variants in that browser: `inert` alone and `inert` + `aria-hidden`
      both satisfy axe and both actually refuse focus, while `aria-hidden` alone
      does neither.
      The same probe found the SHOWCASE doing it too — every collapsed sidebar
      group, on every one of the 192 pages, kept its links tabbable. Same fix.
      Worth writing down as a rule rather than two fixes: a hidden-but-present
      container needs `inert`, and the PR gate will never tell you otherwise.
      `wr-back-top` had a second, smaller bug in plain sight — its `<ng-content
      />` sat NEXT TO the built-in arrow instead of wrapping it, so the documented
      custom-icon example rendered two glyphs in one circle. `<ng-content>` with
      the arrow as fallback content is the whole fix.
      `wr-anchor` carried `aria-label="Table of contents"` as a static host
      attribute — hard-coded English in a landmark, unoverridable and
      untranslatable, in a library whose catalog already had a key for everything
      else. It routes through `anchor.label` now. Its scroll spy also ran its
      first pass in the CONSTRUCTOR, before the headings it looks up by id exist
      (they are further down the same page, so they render after the list):
      `getElementById` returned null for every one of them and the page sat with
      nothing highlighted until the reader scrolled. Moved to `afterNextRender` —
      the same class of mistake as the calendar's `queueMicrotask`, and the spec
      reproduces it by putting the targets after the anchor in the host template,
      which is simply where they live in real markup.
      **`wr-empty`, `wr-spinner`, `wr-burger`, `wr-avatar` (2026-08-11)** — four
      small components, four real bugs, and every one of them had its answer
      already written somewhere else in the repo. `wr-empty` took an `icon` input
      TYPED as a `WrIconName` and then ignored the name entirely: the template
      drew a folder whatever you passed, so the library's own documented example,
      `icon="search"`, rendered a folder. `<wr-alert>` had already solved this
      exact problem with the right split — `icon` as a boolean toggle for the
      built-in glyph, `iconName` delegating to `<wr-icon>` — so `wr-empty` now
      matches it, and nothing that compiled before behaves differently
      (`coerceBooleanProperty` reads any name as truthy, which is what "show the
      folder" already meant).
      That fix came with a second one visible only in a real browser: the two
      branches of the same slot rendered at DIFFERENT sizes, 15px for the built-in
      glyph against 18px for a delegated `<wr-icon>`, because the first is sized
      by `.wr-icon__svg` at 1em and the second by `--wr-icon-size`. Alert's
      stylesheet documents that trap in a comment, including the `color: inherit`
      specificity fight; empty now carries the same two rules and both branches
      measure 15px in the identical muted colour.
      `wr-spinner` carried `aria-label="Loading"` as a hard-coded host attribute
      while `spinner.label` sat translated in both shipped catalogs, unused — the
      clearest form this recurring bug takes. `wr-burger` had the same string as
      an input DEFAULT, overridable but never localised. And `wr-avatar` showed a
      spinner until the image's `load` fired, with no `error` handler at all: a
      broken URL spun forever, on top of the very initials that are projected for
      that case. It falls back to them now, and a new URL after a failure is a new
      attempt rather than a permanent fallback.
      **`wr-color-picker` (2026-08-11)** — the pure colour maths already had a
      spec; the COMPONENT did not, and the biggest thing it was hiding is a
      `format` input that nothing read. It was declared, documented down to the
      exact strings each format produces, and forwarded by
      `[wrColorPickerTrigger]` through `setInput` — while every emit went through
      `toHex`, so `format="rgba"` silently produced hex. It is implemented now
      (`formatColor`), and with it the other half nobody would have noticed until
      a form patch: the picker used to read incoming values with `parseHex` alone,
      so the moment it emitted `rgba(…)` any external write of its own output
      parsed as null and painted BLACK. `parseColor` reads all three formats, plus
      the space-separated CSS spellings and `/ alpha`, and clamps out-of-range
      channels the way CSS does.
      Three smaller ones in the same pass. The drag had no button or pointer guard
      — the recurring family in this codebase, now fixed in the fourth component —
      and no `pointercancel` handler, which matters more than it sounds:
      `pointercancel` is never followed by a `pointerup`, so the move listener
      outlived the gesture and the surface kept repainting under a pointer that
      was only hovering. And clicking a 6-digit preset swatch snapped a
      translucent colour back to fully opaque, because `parseHex` reports "no
      alpha given" as `a: 1` and the method's own comment claimed the opposite of
      what the code did. The trigger, meanwhile, carried neither `aria-haspopup`
      nor `aria-expanded`, both of which `<wr-popover>`'s trigger has had all
      along.
      Two mutation survivors were worth more than the fixes. One was a test that
      proved nothing: re-feeding the picker its own last emit is skipped BY DESIGN
      (`lastEmitted`), so a round-trip assertion written that way passes with the
      parser removed — it has to be a value the picker never wrote. The other was
      a cancelled drag moved to hue 360, which is hue 0, so the assertion compared
      red to red. The third survivor was left alive on purpose and written down:
      normalising a negative hue in `parseColor` is unobservable, because `% 360`
      plus `hueToChannel`'s single wrap already absorb it — kept anyway, since
      leaning on that second detail from outside is how a later change breaks
      quietly.
      Recorded, not fixed: the picker has no keyboard path to the three surfaces.
      The SV square, the hue bar and the alpha bar are plain divs with pointer
      handlers, so the only keyboard route to a colour is the RGB / HSL number
      fields. The APG answer is `role="slider"` with arrow keys on each surface,
      which `wr-knob` already demonstrates in this repo — a feature, not a defect
      fix, so it belongs in a change the maintainer chose rather than in a test
      PR.
      **`wr-sidebar` and `wr-pull-to-refresh` (2026-08-11)** — the sidebar's
      headline feature did not work at all. "Active route auto-expands its
      containing group" matched by building `/${child.url.join('/')}`, while the
      documented entry shape carries the leading slash on the first segment (`url:
      ['/settings', 'profile']`) — so the path came out as `//settings/profile`,
      which no URL equals, and the group never opened for anyone following the
      example. The comparison was also a bare `startsWith`, so a group owning
      `/tab` claimed `/tabs` and, since the first match wins, the group that
      actually owned the route stayed shut. Both fixed, and the second one is
      where the first mutation run earned its keep: my test had the prefix
      backwards (`/table` against `/tabs`, which never collided) and passed with
      the guard removed.
      Three more in the same component. `defaultOpen` was re-seeded on every
      `entries` emission, so any later change to the array — a badge count, a
      filtered list — re-opened a group the reader had deliberately collapsed; it
      seeds once per group now, the same shape as the `lastAutoUrl` guard that
      already existed for the URL case. The group-body ids were built from the
      title alone, which collides between two sidebars on one page and produces
      `wr-sidebar-group-data-&-charts` for a title with punctuation in it — an id
      no selector can address, sitting in `aria-controls`. And the host carried
      `role="navigation"` with a `<nav>` immediately inside it: two nested
      landmarks over the same list, neither named. One landmark now, named through
      `sidebar.label`.
      `wr-pull-to-refresh` had the `pointercancel` bug in its touch spelling, and
      worse: `touchcancel` was wired straight to the release handler, so an
      interruption — an incoming call, a notification, a palm on the bezel —
      RELOADED the list on the reader's behalf at whatever pull they had reached.
      A cancelled gesture is an abandoned one. Its `touchstart` also re-read
      `touches[0]` when a second finger arrived, taking the first finger's CURRENT
      position as a new origin and collapsing the pull in progress. The rest of
      the component is unusually well reasoned — the comments carry the arguments
      for deriving the resting height from `refreshing` rather than latching an
      edge — and the spec pins that reasoning rather than re-litigating it.
      **The small display components (2026-08-11)** — `wr-badge`, `wr-card`,
      `wr-divider`, `wr-skeleton`, `wr-result`, `wr-descriptions`, `wr-timeline`,
      `wr-toolbar`, `wr-page-header`, `wr-layout`. Ten components, one bug, and
      the spec is the point rather than the fix: these are
      `ViewEncapsulation.None` components whose whole output is a class list and a
      handful of roles, both of which consumers style and script against, and
      neither of which anything was watching. The one bug is in `wr-layout-sider`,
      whose `collapsedChanged` output is documented as firing "whenever
      `collapsed` changes" and fired only from the imperative `toggle()` — so the
      `[(collapsed)]` binding the docs lead with was silent. It emits from an
      effect now, skipping the first read so the initial value is not reported as
      a change, with the manual emit removed so a toggle produces exactly one
      event.
      Two things worth knowing for the next spec of this shape. Asserting
      `className` as a STRING is wrong: a `[class]` binding is applied class by
      class, so the DOM order is the diff order rather than the order the
      component composed them in, and three of these specs failed on a reordering
      that changes nothing a stylesheet can see. Compare the sorted class SET. And
      the projection wrappers that always render (`__extra`, `__actions`,
      `__breadcrumbs`, the toolbar's three zones) are collapsed by `:empty` in the
      stylesheets rather than by `@if` — checked before assuming phantom spacing,
      and it is handled everywhere it needs to be.
      One verified negative, from a sweep rather than a report: every animation
      component in the library honours `prefers-reduced-motion` — the JS-driven
      ones through `WrPlatform.prefersReducedMotion()`, the CSS-driven ones
      through a media query in their own stylesheet. The only one with no handling
      at all is `wr-spotlight-card`, where a gradient tracks the cursor and no
      content moves, so there is nothing to reduce. (A first pass of this sweep
      reported eight components with no handling; the glob it used silently
      dropped every component without an HTML file, which is most of them. The
      number was wrong before it was checked.)
      Recorded, not fixed: `<wr-divider>OR</wr-divider>` does not read its label.
      `role="separator"` is Children Presentational per ARIA, so the projected
      text is not exposed at all — a labelled divider in a login form is a
      boundary with no word attached. The fix is either an `ariaLabel` input the
      consumer has to repeat, or reading the projected text after render to name
      the separator with it; both are decisions about public semantics rather than
      defects to patch quietly.
      **The last four component pages (2026-08-11)** — `action-sheet`,
      `drag-drop`, `keyboard`, `squircle`. Every page under `reference/components`
      now has a spec behind it. One fix: the action sheet wrote the literal string
      `Actions` into its screen-reader-only dialog name, which is the fifth
      instance of this exact bug found tonight, in a component whose every other
      string comes from the caller.
      The squircle's spec is the interesting one. Its path maths is a port of
      `figma-squircle`, so asserting control points would only restate the
      algorithm — the spec tests PROPERTIES instead: the path closes, every
      coordinate is finite, radius 0 is exactly a rectangle, and a radius past the
      corner budget draws the same shape as the budget itself. Three of the first
      assertions were wrong about the code rather than the other way round (the
      commands are RELATIVE and lower-case, so an uppercase `A`/`C` search finds
      nothing and a raw coordinate scan means nothing), which is the argument for
      reading an algorithm before asserting against it.
      `wr-sortable-list` is a thin CDK wrapper, and a real drag needs layout that
      jsdom does not have — so the spec emits the CDK's own `dropped` output
      through the directive instance the template binds to. That tests the wiring
      and the reorder without pretending to test the gesture, and it caught
      nothing, which is the honest result for forty lines of well-scoped
      delegation.
      **The animations cluster, first two (2026-08-11)** — `wr-typewriter` and
      `wr-decrypt-text`, and the bug they share is one the rest of the library
      gets right. Text is walked by CODE POINT everywhere in this codebase —
      `blur-text`, `split-text`, `circular-text`, `speed-dial`, and
      `rotating-text`, which goes as far as `Intl.Segmenter` with a fallback. Two
      places did not. The typewriter reversed with `split('').reverse()`, which
      reverses UTF-16 units: an emoji came out as two lone surrogates, so
      `reverseMode` on any text with one typed replacement glyphs.
      `wr-decrypt-text` had the same mistake three times over in five lines, and
      the third was the interesting one. Its scramble pool was built with
      `split('')` (halves of a surrogate pair as separate glyphs to pick from —
      from the text itself AND from a custom `characters` alphabet), and a
      revealed character was read back as `txt[i]` while `i` came from
      `[...txt].map((ch, i) => …)`. Those are two different index spaces: past the
      first astral character, every revealed position showed the WRONG glyph. The
      fix for that one is to return `ch`, which the map already has. The same
      confusion ran through six `txt.length` uses that size the reveal, so a
      sequential pass over text with an emoji in it spent extra ticks on indices
      with no character behind them.
      Three mutation survivors, all weak tests rather than redundant code, and
      each one instructive. A stubbed `Math.random()` fixed at 0 always picks
      pool[0], so it can never see a bad pool entry — the test sweeps random
      across the pool now. A surrogate-pair test that only exercises
      `useOriginalCharsOnly` says nothing about the custom-alphabet branch. And an
      off-by-one in a length is invisible in the rendered text (the extra index
      simply has no character); what shows it is WHEN the interval stops, so that
      is what the spec asserts.
      **`wr-rotating-text` and `wr-marquee` (2026-08-11)** — the marquee named its
      region `'Marquee'` and any unlabelled link `'link'`, both hard-coded
      English, both now through the catalog. That is the SIXTH component tonight
      with a built-in English string next to a catalog that covers everything
      else, which is enough of a pattern to name: the rule in AGENTS.md is
      followed almost everywhere, and where it is not, it is always a fallback —
      the string nobody sees while writing the component, because it only appears
      when an input is left unset.
      `wr-rotating-text` needed no fix and has a spec anyway, for a reason worth
      recording: its whole animated path is unreachable in jsdom, which implements
      no Web Animations API, so `el.animate` throws before any assertion runs.
      Every test in that file therefore runs under `prefers-reduced-motion`, which
      is not a workaround — it is a path real users take, it makes each swap
      synchronous, and it covers the state machine (next / previous / jumpTo /
      reset, the loop boundaries, the auto timer, the grapheme split) that the
      animation only decorates.
      **The CSS-driven text effects (2026-08-11)** — `wr-gradient-text`,
      `wr-circular-text`, `wr-star-border`, `wr-shiny-text`, `wr-glitch-text`,
      `wr-spotlight-card`. Six components, no bugs, and specs anyway: each one's
      entire output is a set of `--wr-*` custom properties and modifier classes
      that a stylesheet reads, which is public API by the same rule as every other
      BEM class here and was going unwatched. Two are worth singling out. The
      glitch clones read `data-text` off the host while the visible text comes
      from content — renaming either half breaks the effect and nothing else,
      which is exactly the kind of silent break a spec is for. And
      `wr-circular-text` places each character at `360/n` degrees and pushes it
      out by the orbit radius; the spec asserts the four transforms exactly,
      because the alternative reading of that maths (translate along a diagonal)
      also looks plausible and is wrong.
      **`wr-split-text` and `wr-blur-text` (2026-08-11)** — both split their text
      into one span per character or word, and neither gave a screen reader
      anything to read but that list of fragments. The library already has the
      answer twice over: `wr-rotating-text` and `wr-decrypt-text` both carry the
      real string in a screen-reader-only span with the animated pieces
      `aria-hidden`. Two of four doing it is what makes this a defect rather than
      a preference; all four do it now.
      One process failure worth writing down, because it is mine and it reached
      main. The `wr-circular-text` spec stubbed `Element.animate` — which jsdom
      does not implement, so it is an assignment, not a spy, and
      `vi.restoreAllMocks()` does not undo it. The patch leaked into whichever
      file vitest happened to run next, which made the suite pass locally and fail
      on CI purely on file order, and the failure surfaced in an unrelated spec
      (`media.spec.ts`, complaining about `matchMedia` during prerender). The fix
      is to capture the property descriptor and restore it in `afterEach`, plus
      `fixture?.destroy()` so a failed mount reports its own error instead of a
      TypeError in teardown. Three consecutive full-suite runs to confirm, since
      one green run proves nothing about an order-dependent leak.
      And the merge that let it through: the PR was merged in the same command
      that printed its checks, so a `fail` line scrolled past into a merge that
      did not read it. Main went green again on the retry — the flake is
      order-dependent — but the sequence was wrong regardless. Read the checks,
      THEN merge.
      **`wr-tilt-card` (2026-08-11)** — no defect, and a spec that is exact
      anyway: the tilt is a `transform` written straight onto the host, so with a
      stubbed 200×100 box every pointer position has one right answer. Worth
      pinning because the two rotation axes are easy to swap and the mistake looks
      fine in isolation — a card that tilts TOWARD the cursor instead of away from
      it is still a card that tilts. The glare overlay is checked for its
      `aria-hidden` and for going away with the directive, since it is a DOM node
      the directive appends by hand rather than a template element Angular cleans
      up.
      **The flaky CI, properly diagnosed (2026-08-11)** — two red runs tonight,
      both reporting `matchMedia must not be called during prerender` from
      `WrPlatform.mediaSignal`, in files that never mention matchMedia. That
      string is defined in exactly two places, both of them specs, and
      `media.spec.ts` installed it with `vi.stubGlobal` and never took it back:
      vitest only auto-restores globals when `unstubGlobals` is set, which this
      suite does not set. So a throwing `matchMedia` outlived that file and killed
      whichever file the worker picked up next — and since `WrPlatform` reads two
      media queries in its FIELD INITIALIZERS, that is any spec mounting a
      component that injects it. Tonight's additions made that most of them.
      `platform.spec.ts` next door has called `vi.unstubAllGlobals()` in its
      teardown all along, so the convention existed and one file sat outside it;
      `media.spec.ts` does the same now. Reproducing it locally needs two files in
      one worker, which the runner only does under load — the evidence is the
      stack, the string's two definitions, and the sibling that already got it
      right.
      **`wr-border-glow` and the window outputs (2026-08-11)** — the glow tracks
      the cursor with two numbers, an angle measured from the top clockwise and a
      proximity that is 0 at the centre and 1 at the perimeter, both written onto
      the host for the stylesheet. Exact maths, now pinned, including the case
      that reads wrong at a glance: at a diagonal the proximity follows whichever
      axis runs out FIRST, not the average of the two, so a cursor near a long
      edge is fully lit rather than half lit.
      `<wr-window>`'s three outputs — `closed`, `moved`, `resized` — had no
      documentation at all, so the API table rendered an em dash for each. They
      are documented now, and the interesting half is what `moved` does NOT do: it
      fires while the header is dragged and stays silent for `moveTo()` /
      `center()` / the opening cascade. That is defensible — the caller already
      knows where it put the window, and echoing it back double-counts for
      anything persisting the position — but it was defensible and undocumented,
      which is the same as undefined.
      Two things checked and found already correct, worth recording so they are
      not re-checked: every canvas component null-guards its `getContext` call,
      and `wr-border-glow` / `wr-splash-cursor` clean up through `effect(onCleanup
      => …)` rather than `DestroyRef` — which a grep for `onDestroy` reports as a
      leak and which is not one.
      **`WrScroll` (2026-08-11)** — the last service without a spec, and the one
      two other components delegate to (`wr-anchor` and `wr-back-top` both call it
      rather than touching `window.scrollTo`). jsdom cannot scroll, which is
      exactly the right shape for this: what the service decides is the ARGUMENTS,
      and those are what a caller depends on. Four mutations confirm the
      arithmetic is load-bearing — the page's own `scrollY` added back to a
      viewport-relative rect, the container's `scrollTop` and offset for a
      scrollable box, the reduced-motion fallback to `auto`, and the `try`/`catch`
      around `querySelector` that keeps a URL fragment like `#not a selector` from
      throwing.
      **`WrConfetti` and `wr-click-spark` (2026-08-11)** — the confetti service is
      public API and had no spec; it does now, and the case worth having is the
      one jsdom provides for free: `getContext('2d')` returning null is a real
      browser state, and the service has to put its canvas up, find no context,
      and stop without throwing or leaving a frame loop spinning. It does.
      `wr-click-spark`'s canvas was the inconsistency — the confetti canvas is
      `aria-hidden`, this one was not, and both are decoration painted over
      someone else's content. One attribute.
      **Tree rows in `wr-table` (2026-08-11)** — the first bite of the second
      axis. The table's spec already pinned that a forest announces `treegrid` and
      that tree + `groupBy` is refused rather than half-supported; what it did not
      touch was EXPANDING, which is the feature itself. Now covered: `aria-level`
      / `aria-posinset` on each row (which is what a treegrid announces instead of
      the visual indent), `aria-expanded` absent on a leaf rather than `false`
      (which promises a subtree that does not exist), opening one level at a time
      rather than the whole subtree, and collapsing a root taking its descendants
      with it however deep they were.
      **Remaining:** every component page and every service now has a spec behind
      it. What is left is five of the animation components — `aurora`,
      `falling-text`, `fuzzy-text`, `splash-cursor`, `waves`, all canvas or WebGL,
      where jsdom has no context to draw into and a spec could only assert that
      they do not throw — and mode coverage inside components that are already
      covered: a spec on `wr-table` says nothing about tree rows unless it
      exercises them. That second axis is now the real remaining work.
      One gap closed and one dismissed since the last note: the palette now
      scrolls its active option into view (`scrollIntoView({ block: 'nearest' })`,
      keyboard only — doing it on hover would fight the pointer), and its
      `queueMicrotask` focus is NOT the trap AGENTS.md warns about: that warning
      is about a microtask queued from an EVENT HANDLER, where change detection is
      still a pending macrotask, while this one is queued from an effect already
      running inside change detection. Pinned by a spec rather than refactored on
      suspicion.
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
      **A layout defect reached an app before any gate saw it** (2026-08-10),
      which is the clearest argument yet for the half of this item still open.
      `WrDialog` mounts the consumer's component BETWEEN `.wr-dialog-panel` and
      the dialog's parts, so that host was the panel's only flex item — and with
      `overflow: visible` its automatic minimum size is its content height, so it
      refused to shrink. The panel clipped it at `max-height` and
      `[wrDialogContent]` never became a scroll area: on an 883px viewport the
      host measured 1098 and the footer's buttons sat at 1102, unreachable, with
      no scrollbar anywhere. Nothing in the library could be blamed from the
      outside and nothing in an app could fix it — the host is inserted by the
      service, so the consumer has no element to style between panel and content.
      Fixed by making that host a shrinkable flex column
      (`> *:not(.wr-dialog__close)`), verified in Chromium across tall content, a
      dialog shorter than the screen, no title / no footer, the narrow-viewport
      sheet, a consumer's own `:host` box, and a dialog over a dialog.
      Both halves of the rule are load-bearing and measured to be: `min-height: 0`
      alone leaves the footer 861px past the fold. The gate lesson is the sharp
      part — a vitest + jsdom spec shaped like "the content scrolls" passes
      identically before and after, because jsdom lays nothing out at all
      (`getBoundingClientRect()` is zeros, `scrollHeight === clientHeight`), so it
      would have been a false signature on a repair. `dialog-scroll.spec.ts`
      therefore guards the RULE and says so in its own docblock; only a browser
      run can guard the behaviour.
      **The defect class is closed, so nobody needs to sweep it again**
      (verified after v10.2.1): exactly three services take a consumer's
      `ComponentType` and so interpose a host — dialog, drawer, window, and
      `ComponentType<` appears nowhere else in the library. `WrDrawerManager`
      already carried the identical rule with the identical `:not(…__close)`
      exemption (`drawer/styles/_index.scss`), which makes the dialog the
      omission rather than the fix a novelty. `WrWindowManager` is immune by
      shape rather than by patch: `.wr-window__body` IS the scroller and the
      interposed host lands INSIDE it, so nothing has to shrink — in the dialog
      the scroll area sat BELOW the host, which is what forced the host to pass a
      bounded height down. Worth keeping that distinction: the trap needs the
      host to be an ANCESTOR of the scroller, not merely present.
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
