# Tests and harnesses

Part of [AGENTS.md](../../AGENTS.md). Read this before changing a spec or a harness.

`pnpm test` runs **vitest** through Angular's `@angular/build:unit-test`
builder — no `vitest.config.ts` and no `@analogjs/*`: the target lives in
`angular.json` (`lib:test`) with `projects/lib/tsconfig.spec.json`, and specs
sit **next to the code they cover** (`math/math.spec.ts`, not a `test/` tree).
`tsconfig.lib.json` excludes `**/*.spec.ts`, so nothing ships to npm.

**Codecov is wired and the number is real** — CI runs `pnpm test:coverage`
(`pnpm test` instrumented, writing `coverage/lib/lcov.info`) and uploads it with
the `CODECOV_TOKEN` secret. `codecov.yml` keeps both statuses
`informational: true`: coverage is a badge and a PR comment, never a gate. Read
the report as a pointer, not a target.

Coverage today is the pure-logic layer (`ngwr/utils`, `ngwr/validators`,
`ngwr/pipes`, the colour maths), the validation-copy contract
(`ngwr/form`), most of the service layer (`ngwr/hotkey`, `ngwr/i18n`,
`ngwr/platform`, `ngwr/storage`, `ngwr/overlay`, `ngwr/density`,
`WrWindowManager`, `ngwr/scroll`) and EVERY component with a
page under `reference/components`, and every entry point has a spec — the
twenty `ngwr/i18n/<locale>` catalogs through one shared table (see i18n
above). (How
many spec files and how many cases is re-counted by `pnpm gen:quality` into
`#core/generated/quality` — read it there. This sentence used to restate both,
and sat at `275 spec files, at least 4467 specs` for long enough to be wrong by
four files and a hundred cases. The case figure is a FLOOR either way, since one
`it.each` site stands for an unknown number of cases.) What is still uncovered
is no longer whole components but what a spec can reach: jsdom has no drawing context, so the canvas
and WebGL components can never assert anything painted. All ten now install a
recording context — a WebGL2 stub for `aurora`, `iridescence` and `splash-cursor`,
a 2D one for the rest — and nine of them an `ErrorHandler` recorder besides, because what
`afterNextRender` throws reaches neither `detectChanges()` nor `whenStable()`, so
a boot that died reads as a pass without one. (`wr-confetti` is the exception and
correctly so: a service, with no deferred boot to lose an error inside.) That
carries the specs in those ten files past the early return, to frame
counts, spark and particle counts, the fuzz ramp, a `var(--wr-…)` colour resolved
against the host, gravity bringing a particle back down, and teardown — while
each keeps the null-context path it started as, one "survives a browser that will
not give it a context" spec apiece. What no stub reaches is painted output
itself. The other hole is mode coverage inside components that are covered — a
spec on `wr-table` says nothing about tree rows unless it exercises them.

**`pnpm test --filter <x>` is a TEST-NAME regex, not a file filter.** It is
vitest's `-t`, so `--filter dialog` silently runs the handful of tests whose
NAMES contain "dialog" and reports green. To run one file, pass its path to the
builder's `include`; to be sure of a change, run the whole suite — it is
seconds. **`pnpm lint`, `pnpm test`, the two builds, `check:api-docs`,
`check:css-vars` and `check:package` are the PR gates** for a PR into `main`
(see Three tiers; a PR into `next` runs none of them), and
a green run still does not mean a component behaves — the suite is broad now but shallow in places (see above).

**Deferred DOM work needs `afterNextRender`, not `queueMicrotask`.** Under
zoneless CD the scheduler runs change detection in a MACROTASK, so a microtask
queued from an event handler runs BEFORE the DOM reflects the signal you just
set. `wr-calendar` moved its roving focus that way and left real focus on the
previous cell while the ring moved on. Note the testing trap that hid it: a
synchronous `fixture.detectChanges()` updates the DOM before the microtask, so
the bug disappears in the test and survives in the app. Reproduce this class of
thing with `await fixture.whenStable()` alone.

**Writing a component spec:** copy `projects/lib/tabs/tabs.spec.ts`, or
`projects/lib/dialog/dialog.spec.ts` / `projects/lib/toast/toast.spec.ts` for a
SERVICE that mounts into an overlay, or `projects/lib/select/select.spec.ts` for
a component with an overlay — that panel
renders into the overlay container, not the fixture, so options are queried off
`document`. The container needs no provider: `WR_OVERLAY_CONTAINER` is
root-provided, so each TestBed's root injector builds its own and removes it on
teardown, and one file's container never reaches the next file's. A tiny
`@Component` host uses the component the way a consumer would, and the
assertions read the RENDERED DOM — roles, ARIA state, and the `.wr-*` classes,
which are public API. A spec that reaches into component internals passes
straight through the kind of change that actually breaks people. `*.spec.ts` has
an eslint override for the inline-template and selector rules, since a host that
exists for one `describe` should not ship a `.html` file.

**Writing a HARNESS** (`ngwr/<name>/testing`): copy
`projects/lib/collapse/testing/` for the layout and the voice, or
`projects/lib/image-cropper/testing/` for a component whose geometry a unit test
cannot reach. The rules below were all earned by shipping every one of them, and
the first one decides every other question:

- **A method that would answer the same thing for a working component and a
  broken one must not exist.** jsdom has no layout (every rect is 0×0), no CSS
  cascade from stylesheets, no canvas context and only partial Web Animations —
  so no measured positions, no computed styles that come from a sheet, no "is it
  animating". Where a reader would reach for one, the class JSDoc says why it is
  absent. Half the value of these files is the refusals.
- What IS readable, and where the assertions live: BEM classes and modifiers
  (public API here), ARIA attributes, text nodes, and inline styles or custom
  properties **the component wrote itself**. Read those off the `style`
  ATTRIBUTE, not through `getCssValue()` — a computed read resolves the
  stylesheet's own default, so it answers plausibly at exactly the moment the
  host binding is what broke.
- **A panel is scoped by the id its trigger publishes**, never by its class: a
  query for `.wr-select-panel` answers with whichever select opened first. The
  single-element and list queries are separate code paths, and the list one
  leaked while the single one was covered.
- **Two questions are not one.** A number field shows a string and holds a
  number; an OTP's assembled code can differ from the bound model; a text
  animation carries an accessible copy AND a pile of `aria-hidden` pieces. A
  spec that reads only the drawn half passes on a component that announces
  `W. e. l. c. o. m. e.`
- **Pointer-driven writes are lies in jsdom.** Drive value controls with the
  keyboard — the accessible path anyway — and assert the landing: with
  `max=100 step=3` the thumb stops at 99, where `setValue(100)` used to resolve
  silently on the wrong number. Where a gesture is the only path, keep the
  method and make its JSDoc name what the SPEC must stub (a rect, an image
  `load`), the way `WrImageCropperHarness` does.
- Throw, with a sentence that says why, instead of returning a plausible
  nothing — and mind vacuous truth: `every` over zero elements is `true`, so
  "the animated text is hidden" would pass on a component that renders no text
  at all.
- Compose rather than re-query: a pager's size changer hands back
  `WrSelectHarness`, a tour's buttons `WrButtonHarness`, a colour picker's tabs
  `WrSegmentedHarness`. Two harnesses for one element is a fork waiting to
  drift — `WrCalendarDayHarness` is exported twice under two names for exactly
  that reason.
