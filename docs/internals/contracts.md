# Contracts that look like bugs

Part of [AGENTS.md](../../AGENTS.md). Read this before changing behaviour that looks like a bug, before fixing it.

## Contracts that look like bugs

Nineteen behaviours that read as defects until you know why they are that way.
Each was questioned at least once, each has a spec pinning it, and each would
be "fixed" by someone reading only the symptom. This list used to live in
ROADMAP.md; it moved here when that file was cut back to remaining work,
because it is guidance rather than a plan.

- `wr-list`'s interactive row keeps `role="listitem"`: inside a
  `<ul role="list">` a `button` or `option` child role breaks the structure
  the container promises. Project a real button into `[wrListItemTrailing]`
  when the action itself must be announced.
- `wr-stepper`'s `linear` REFUSES rather than greys — the disabled header is
  the hint, `onHeaderClick` is the rule. (A real `.click()` on a
  `<button disabled>` is swallowed by the DOM, so dispatch the event
  directly or the gate "holds" for the wrong reason.)
- An edit to one end of a range is never reordered while the user is still on
  it; ordering settles when the interaction ends.
- `wr-input-number`: an emptied field is `null`, not `0`, and unparseable text
  LEAVES the committed number alone — the same rule `wr-date-picker` follows
  for a partial date.
- `wr-mention`'s host stays a `textbox`, deliberately not a combobox (the
  field holds prose, `role="combobox"` is disallowed on `<textarea>`, and it
  would drop `aria-multiline` for the whole session). `aria-autocomplete` and
  `aria-haspopup` are STATIC because they describe a permanent capability.
  `aria-controls` may dangle at a panel id that only exists while open;
  `aria-activedescendant` naming an absent element is an author ERROR and must
  vanish with the panel. Its filter matches a SUBSTRING, not a prefix.
- `wr-cascader`'s value is the whole PATH, and a branch is navigation rather
  than a choice — nothing commits on the way down unless `changeOnSelect`
  says so.
- `wr-tree`: `openOn` defaults to `inline`, so there is no combobox trigger
  unless you ask for one, and `[(selected)]` is the inline-native API — it
  always carries an ARRAY, where `value` follows `selectionMode`. `value`
  itself works in both modes as of v14.0.1: it used to be written only under
  `openOn="overlay"`, while the inbound half of the same bridge was never
  gated, so an inline `<wr-tree [formField]>` accepted a programmatic write,
  announced `aria-selected` on the row the user clicked, and left the control
  at its initial value for the life of the form. A binding that carries one
  direction is worse than one that is refused, because nothing looks wrong.
- `wr-alert` does not use one live region: danger interrupts
  (`role="alert"` / assertive), warning is assertive without interrupting,
  the rest wait their turn — and all of it goes away on dismiss.
- `WrWindowRef.moved` fires ONCE when a drag or a keyboard move ends, with the
  final position, and when a drag snaps the window; a press that moved nothing
  emits nothing, and `moveTo()` / `center()` / the opening cascade stay silent:
  the caller already knows where it put the window. `resized` is the same shape.
  The pair lived on the internal `<wr-window>` until 15.1.0 moved them to the
  ref. This entry used to say "while the header is dragged, once per pointer
  move", and so did the output's own JSDoc — both wrong since the emit has
  always sat in the drag's cleanup. A consumer persisting the position wants
  the landing rather than the path, which is what it does.
- `wr-tour` skips a step whose target is missing (a tour has to survive a
  feature behind a flag) while the progress line still counts every step it
  was given.
- `wr-pagination` does NOT pull the page DOWN into range while `total` is at or
  below 0, and emits nothing for it — there is no `loading` input, so 0 is
  ambiguous with "still in flight", which is where a server-paged host sits
  between the click and the response. Clamping there pulled every page back to 1
  and emitted a `pageChange` the host could not tell from a click. The
  LOWER bound stays unconditional, and that one does write back.
- The date adapter emits single-quoted runs verbatim and treats unquoted
  letters as tokens, the way `DatePipe` and LDML do. `addDays` moves the
  CALENDAR day, not 86 400 000 ms — across a DST change the arithmetic
  version repeats a day and loses one. No test here can hold that: the runner
  inherits the machine's zone, which is `Asia/Almaty` and has no DST, so the
  reason lives in the method and the spec's docblock.
- **A named format REFUSES input it cannot read, and returning nothing is the
  fix rather than the defect** (v14). `shortDate` / `time` and friends used to
  parse through `new Date()`, which understands only Anglo-American forms — a
  German field printing `15.3.2026` read its own output back as 1 January 2001,
  because `new Date('1')` is that date and the first keystroke committed it.
  Parsing is now built from the same `Intl` formatter that PRINTED the string,
  so it round-trips; where it cannot read the input it returns `null` and leaves
  the committed value alone, which is the rule `wr-input-number` and
  `wr-date-picker` already followed for a partial entry. A host that relied on
  `new Date()`'s leniency passes an explicit token `[format]`. Pinned by
  `date/wr-native-date-adapter.spec.ts` ("refuses a string in another locale
  rather than guessing at it").
- `wr-calendar-heatmap` leaves four of its seven weekday rows blank on
  purpose — seven labels do not fit.
- A component that animates on its own honours `prefers-reduced-motion`
  itself when its motion is the feature (`wr-count-up`, the carousel's
  autoplay), and **that does not generalise to chrome**: ten always-on chrome
  components, four of them animating infinitely, including the spinner and the
  skeleton that paint on every page, are covered by `theme/styles/_motion.scss`, one shared
  `@media (prefers-reduced-motion: reduce)` block, and NOT by per-component
  rules: the theme layer is loaded before every component stylesheet, so each
  declaration there is `!important` out of necessity rather than habit. What
  reduced motion means is decided per animation — an enter animation is
  removed (every one of them ends on the element's resting
  state, so nothing is left mid-flight), a decorative infinite shimmer is
  removed, a SPINNER is slowed rather than stopped (a frozen spinner reads as
  hung, not as calm), and the toast's progress bar is deliberately left running,
  because it is a countdown and a bar frozen full states something untrue.
- The `if (!i18n)` branch in `useI18nText` is dead code, not a defect: `WrI18n`
  is root-provided, and `no-provider.spec.ts` proves it resolves with nothing
  configured. That optional-inject-that-always-constructs is also what once
  made i18n mandatory in practice — `WR_I18N_LOADER` now defaults to a loader
  serving an empty catalog, so every lookup misses and components fall through
  to their English defaults.
- Escape does NOT depend on focus being inside an overlay:
  `overlayRef.keydownEvents()` is fed by CDK's `OverlayKeyboardDispatcher`,
  which keeps one document listener and routes to the topmost overlay.
- Every shipped catalog is pinned to **the English key set** with no
  empty values (`expectCatalogContract`, above) — empty is the worse case, since it resolves as a real
  translation and reaches the DOM as a nameless control. Nothing had compared
  `wrEn` with `wrRu` before: `useI18nText` reads "translation === key" as
  missing and quietly serves the English default, so a Russian app rendered
  English and no gate said a word. **Parity is not enough**, and a third spec
  covers the rest: it walks `projects/lib`, collects every key passed to
  `useI18nText` / `wrReadI18nText` / `useI18nFormatter`, and requires each to
  exist in the catalog — because two files can agree perfectly about a key
  NEITHER of them has, which is how `imageCropper.window` and `.keyHelp` reached
  `main` read by the component and present in neither, under 3881 green specs.
  Its own first version then repeated the lesson: the optional-argument group
  was `[^,()]+`, which cannot cross a parenthesis, so every
  `useI18nText(signal(null), 'key', …)` matched nothing and `useI18nFormatter`
  was not in the alternation at all — twenty keys invisible to the gate written
  to see them, under a `> 50` floor that 150 clears. It now takes each call's
  argument list by matching parentheses and asserts EVERY call yielded a key, so
  a call shape it cannot read fails the suite instead of quietly shrinking the
  set it checks.
- A `<wr-toast-outlet>` DROPS the oldest toast past `maxStack`, where the
  global stack queues the newest and drops nothing. An outlet is for a stream
  (alarms at thousands a minute): a queue there only grows, and the toast it
  finally shows is minutes stale. Dropping keeps a channel at `maxStack`
  entries and timers whatever has passed through (`toast-channel.ts`). The one
  time it does not drop is while the stack is held, by the pointer or by focus:
  the toast under the pointer must not vanish, so arrivals wait in a queue
  capped at `maxStack` (its oldest dropped) and enter on release, in arrival
  order, the stack still capped. A toast
  sent to a name with no outlet in the page is kept, capped the same way, and
  its countdown starts when the outlet mounts; `dismissAll()` with no name is
  the global stack only, because the global "Close all" button calls it.
