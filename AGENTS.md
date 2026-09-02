# AGENTS.md

Guidance for AI coding agents working in **ngwr** — an Angular UI library
(standalone, signals-first, zoneless, fully tree-shakable). For what the
library _is_ and how to consume it, read [README.md](README.md); for direction
and priorities, read [ROADMAP.md](ROADMAP.md). This file is about how to _work
in the repo_.

## Workspace layout

A pnpm + Angular CLI monorepo with two projects:

- **`projects/lib/`** — the published package (`ngwr`). Almost every subfolder is
  a **tree-shakable secondary entry point** consumed as `ngwr/<name>` — **202**
  of them (`ngwr/button`, `ngwr/select`, `ngwr/overlay`, …). Counted by
  `ng-package.json`, not by directory: `styles/` and `schematics/` are not entry
  points, and seventy-four are nested — `ngwr/i18n/{en,ru}`,
  `ngwr/icon/adapters/{lucide,feather}` and the CDK test harnesses, which now cover
  **seventy** entry points: the form controls (`button`, `input`, `textarea`,
  `checkbox`, `switch`, `radio`, `select`, `input-number`, `input-otp`, `slider`,
  `rating`, `file-upload`, `color-picker`, `knob`, `form`, `segmented`), the overlays
  (`date-picker`, `dropdown`, `popover`, `dialog`, `drawer`, `action-sheet`,
  `toast`, `context-menu`, `popconfirm`, `command-palette`, `cascader`, `mention`),
  the data views (`table`, `tree`), the navigation / disclosure set (`tabs`,
  `stepper`, `carousel`, `pagination`, `collapse`, `transfer`), `splitter`, `speed-dial`,
  `lightbox`, `tour`, `calendar`, `event-calendar`, `window`, `image-cropper`, **every
  chart** and **eighteen of the twenty-one animations** — each at
  `ngwr/<name>/testing`, 104 harness classes in total; `WrCalendarDayHarness` is the
  one exported twice, since a date-picker's popup IS a calendar and
  `ngwr/date-picker/testing` keeps the name it shipped as.
  **Four entry points are deliberately without one, and the reason is the same each
  time**: `aurora`, `click-spark` and `confetti` draw into a canvas whose context is
  `null` under jsdom, and `virtual-scroll` is a thin wrapper over
  `cdk-virtual-scroll-viewport` whose whole observable behaviour is the window it
  measures — so every honest method would answer identically for a working component
  and a broken one. Do not "finish the set" by adding them.
  Built with **ng-packagr**. TS path mapping: `ngwr/*` → `./projects/lib/*`.
- **`projects/showcase/`** — the docs site (**ngwr.dev**): live demos + API
  docs, and where components are dogfooded. Docs are organised into five
  top-level clusters — **start / guides / reference / icons / animations**: API
  pages under `app/reference/<cluster>/<name>/` (components, directives, pipes,
  services, utils, validators, interfaces), task guides under `app/guides/`,
  getting-started under `app/start/`, the icon-set browsers under `app/icons/`
  and the animation / visual-effect components under `app/animations/`. Shared
  doc scaffolding (the `<ngwr-doc-*>` components, services, shiki highlighting)
  is in `app/_core/` (alias `#core/*`).
- **`projects/lib/theme/`** — the styling foundation: design tokens (CSS custom
  properties, `--wr-*`) and SCSS mixins under `theme/styles/`. Not a component.
- **`scripts/`** — build/release tooling (schematics, MCP server, icon-set
  generation, dist-asset copy, release prep), run via `tsx`.

### Anatomy of an entry point — e.g. `projects/lib/alert/`

| File                 | Role                                                        |
| -------------------- | ----------------------------------------------------------- |
| `alert.ts`           | the `@Component` / `@Directive` (`ViewEncapsulation.None`)  |
| `alert.html`         | template (components only)                                  |
| `styles/_index.scss` | consumable styles — imported by apps as `@use 'ngwr/alert'` |
| `interfaces/`        | public types                                                |
| `public-api.ts`      | the entry point's exports — **ng-packagr's `entryFile`**    |
| `index.ts`           | barrel (`export * from './public-api'`)                     |
| `ng-package.json`    | ng-packagr secondary-entry config                           |

`@use 'ngwr/<name>'` resolves through the `sass` condition in
`projects/lib/package.json`'s `exports` map. Public types live in each entry
point's `interfaces/` folder (an `index.ts` barrel re-exported through
`public-api.ts`); cross-cutting types live in `ngwr/utils/interfaces`
(e.g. `Maybe`, `SafeAny`).

## Cross-cutting systems

These live in their own entry points — an agent won't find them by mirroring
one component folder. Reach for them instead of hand-rolling:

- **Overlays** (`ngwr/overlay`) — `provideWrOverlay()` gives an isolated CDK
  overlay container (never collides with Material / NG-ZORRO). Mobile sheets via
  `provideWrResponsiveOverlays()` + a per-component `responsive` input.
- **Icons** (`ngwr/icon`) — `WrIcon` (`<wr-icon name="…">`) +
  `provideWrIcons(lucideIcons({…}))`; adapters under `ngwr/icon/adapters/*` —
  **lucide and feather only** (the two sets that don't ship plain SVG files).
  Every other set (tabler, phosphor, heroicons, iconoir, radix, bootstrap) is
  registered with `svgIcon()` from its raw SVG; the `/icons/<set>` showcase
  catalogs are generated by `scripts/build-icon-sets.mjs` into a gitignored
  folder.
- **i18n** (`ngwr/i18n`) — the `wrT` pipe + `[wrT]` directive, `WrI18n` service,
  `provideWrI18n()` + `provideWrI18nStaticLoader()`; ngwr's own catalogs at
  `ngwr/i18n/{ru,en}`.
- **Component defaults** (`ngwr/config`) — `provideWrConfig({ button: { size: 'sm' } })`
  sets what a component falls back to when a template says nothing. A bound value
  always WINS (config is a default, never an override — the NG-ZORRO
  `NzConfigService` lesson), and a bound `false` beats a configured `true`, so
  nothing has to be re-stated to escape it. Components read theirs with
  `useConfigValue(this.size, c => c.button?.size, 'md')`, the same shape as
  `useI18nText`. Adding a key means widening `WrConfig` AND resolving it at the
  component — an input whose default moved to `null` and is still read raw renders
  nothing.
- **Density** (`ngwr/density`) — `provideWrDensity()`, the `[wrDensity]`
  directive, `WrDensity` service; values sm / md / lg / touch
  drive the `--wr-density-*` multipliers.
- **Breakpoints** (`ngwr/media` + SCSS) — `WrMedia.matches('md')` returns a
  `Signal<boolean>`; SCSS mixin API via `@use 'ngwr/breakpoints'`.
- **Theme** (`ngwr/theme`) — `provideWrTheme()` sets the `--wr-*` token layer
  (see Styling). Global CSS: `@use 'ngwr'` (umbrella) or `@use 'ngwr/<name>'`.
  **`wrThemeTokens()` is the palette recipe in TypeScript** — the same arithmetic
  as `_colors.scss`, for a theme chosen at RUNTIME (a builder, a tenant colour, a
  registry preset). It emits **seven tokens per intent, not twelve**: the tint and
  ink layer is written in terms of `var()`, so redefining the base and its `-rgb`
  re-resolves `-soft`, `-soft-border`, `-soft-contrast`, `-active` and `-ink` on
  its own, and emitting those would freeze values the stylesheet is meant to keep
  deriving. `-contrast` IS re-derived, because it PICKS black or white and a
  re-tuned intent otherwise keeps the label of the colour it replaced. Only the
  LIGHT recipe — `_dark.scss` is hand-tuned (`color.scale(…, 70%)` where light
  uses `color.adjust(…, 5%)`), so a dark seed gives a consistent dark palette, not
  the shipped one. `pnpm check:theme` reads the BUILT stylesheet and compares all
  63 shipped tokens; it caught a missing second modulo in `hslToRgb` on its first
  run (`((h % 360) + 360) / 60` reads as normalisation and sends 222° to sector
  9.7 instead of 3.7, so only greys survived). The three `registry/items/theme-*`
  presets are GENERATED from a seed table by `pnpm gen:theme-presets` and
  re-derived by `check:registry`; `/guides/tokens/builder` exports both a CSS
  block and a ready preset. **What this does not cover:** `-ink` shares are
  calibrated against the SHIPPED bases, so a far-off seed inherits shares that no
  longer guarantee 5:1, and `check:theme` will not notice — it compares the nine
  shipped intents, not an arbitrary seed.
- **Date adapters** (`ngwr/date`, plus `ngwr/date/adapters/{fns,luxon}`) —
  `provideWrDateAdapter(...)` powers calendar + every date-picker mode. The three
  were `ngwr/date-adapter{,-fns,-luxon}` until v12: flat and hyphenated while
  `ngwr/icon` already nested its implementations, so the catalog spelled one idea
  two ways. `migration-v12` rewrites the import paths and every symbol keeps its
  name. The rename surfaced a latent defect worth knowing about —
  `scripts/lib/build-symbol-map.ts` scanned only the TOP level, so
  `ng g ngwr:use lucideIcons` had always answered "unknown symbol" and the date
  adapters were reachable only by the accident of being flat. It recurses now and
  skips `<name>/testing`: a harness is public but never belongs in `imports: []`.
- **Shared code — don't reinvent these.** `ngwr/utils` (`coercion` incl.
  `numAttr` for input transforms; plus `dom`, `guards`, `id`, `keyboard`,
  `css-size`, `fn`, `math`, `log`), `ngwr/pipes` (`wrDate`, `wrBytes`,
  `wrTruncate`, `wrNumber`, `wrMark`, `wrPlural`, `wrRange`), and
  `ngwr/validators` (`WrValidators`).
- **Scheduling** (`ngwr/event-calendar`) — `wr-event-calendar` is month / week /
  day in one component. `events` is an input it never mutates: a drag emits
  `eventChange` and the host applies it, so an unhandled output is a cancelled
  drag. Every chip lives inside the `role="gridcell"` where it starts and reaches
  out with a `calc()` width or a percentage height — a floating events layer
  would leave `role="row"` owning something other than cells, which the axe gate
  rejects. Don't hand-roll a scheduler grid.
- **`wr-table` is the data workhorse** — column pin / resize / drag-reorder, row
  selection, expandable rows, summary rows, CSV export, grouping, **tree rows**
  (`childrenKey` makes `items` the roots and the table announces a `treegrid`)
  and a virtualized body are all opt-in inputs on the one component. Three pairs
  are refused rather than half-supported: tree + `groupBy`, tree +
  `[wrTableExpand]`, tree + `virtualScroll`. Excel (`.xlsx`)
  export is deliberately NOT shipped (would need a third-party dep). Don't
  hand-roll selection checkboxes or a CSV writer.
- **Virtual scrolling** — `wr-table`, `wr-tree` and `wr-select` (search mode)
  use hand-rolled spacer-row windowing and switch to `aria-activedescendant`
  while virtual. `ngwr/virtual-scroll` is a _separate_ public component wrapping
  `cdk-virtual-scroll-viewport`; the three above deliberately don't use it (the
  CDK viewport can't host `<tr>` / role-owned list children). Cascader is
  deferred (no container-owned arrow-nav model); mention is excluded (capped at
  `maxResults` ≈ 8).
- **Markdown** (`ngwr/markdown`) — `<wr-markdown [value]="…">` renders markdown as
  DOM, never as HTML. **Raw HTML in the source is escaped**, and that is a
  deliberate limit rather than an unfinished feature: the input is untrusted by
  construction, and one `<img onerror>` is the whole cost of being wrong.
  `[streaming]` makes a partial document render like a whole one (its spec pins
  the property that makes it safe to leave on — a finished stream parses
  identically with the flag and without it). `provideWrMarkdownHighlighter()`
  takes a function returning coloured SPANS (`{ text, color }` per line), not
  markup: highlighted HTML would need `bypassSecurityTrustHtml` and put the
  `[innerHTML]` hole back in the one component whose entire input is untrusted.
  Hand-rolled parser, so no new runtime dependency.
- **Mobile primitives** (`ngwr/platform`, …) — `WrHaptics`, `ngwr/action-sheet`,
  `ngwr/pull-to-refresh`, and `WrVisualViewport` (publishes
  `--wr-keyboard-inset`, installed by `provideWrOverlay()`).

**Forms.** Value components are **Signal Forms-native** — nineteen public
controls implement `FormValueControl` or `FormCheckboxControl`, so
`[formField]="form.x"` binds straight to the component's `value` / `checked`
model. A count and not "each", deliberately: `[wrColorPickerTrigger]` is public,
carries its own `value` model and implements neither, because it is a trigger
that drives a `wr-color-picker` which does. Re-derive with
`grep -rn "implements .*Form\(Value\|Checkbox\)Control" projects/lib --include='*.ts' | grep -v spec`
and subtract the internal `date-picker/internal/time-panel.ts`. `ControlValueAccessor` is
**gone from the library** — never add one. Classic `[(ngModel)]` and reactive
forms still work: Angular 22 synthesises the accessor for a signal-forms
control. Standalone use is the two-way model, e.g. `[(value)]` / `[(checked)]`.
New value controls: implement `FormValueControl`, expose `value` as a `model()`,
plus a `touch` output and a `disabled` input. Validation copy is centralized:
`<wr-form-field>` resolves a message per error key through
`provideWrFormErrors()` → the `ngwr/i18n` `validation.*` catalog → a built-in
fallback, so a field needs no `<wr-form-error>` markup unless it wants
field-specific wording.

**Responsive / touch.** Adaptive components take a `responsive` opt-in modifier
(container-query reflow). Touch ergonomics use the `touch-target` SCSS mixin
(≥44px hit area gated `@media (pointer: coarse)`); the `touch` density preset
enlarges the controls that read the multipliers — **nine stylesheets**, not every
control: `button`, `input`, `textarea`, `select`, `list`, `table`, `badge/_tag`,
plus `cascader` and `tree`, which only joined when a sweep found their triggers
frozen at the `md` height in every tier. A component with fixed geometry does not
move, and `--wr-density-gap` / `--wr-density-text` are published for consumers
with **no `var()` reader anywhere in the library**.

## Commands

| Task              | Command                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| Install           | `pnpm install`                                                                                      |
| Dev server (docs) | `pnpm dev` (`ng serve` → showcase, opens browser)                                                   |
| Build the library | `pnpm build:lib`                                                                                    |
| Build the docs    | `pnpm build:showcase`                                                                               |
| Lint everything   | `pnpm lint`                                                                                         |
| a11y sweep        | `pnpm check:a11y` (axe over `dist/showcase` — run `build:showcase` first)                           |
| Contrast sweep    | `pnpm check:contrast` (axe in a real Chromium, both themes — **nightly**, not a PR gate)            |
| State a11y        | `pnpm check:state-a11y` (the FULL axe set INSIDE hovers / overlays — **nightly**)                   |
| RTL source gate   | `pnpm check:rtl` (physical direction-dependent CSS with no `rtl-ok:` reason — a `pnpm lint` stage)  |
| Registry gate     | `pnpm check:registry` (the open item format under `registry/` — also a `pnpm lint` stage)           |
| Dead-token gate   | `pnpm check:tokens` (a `--wr-*` nothing paints with, unless it says `unused-ok:` — a `pnpm lint` stage) |
| Theme parity      | `pnpm check:theme` (`wrThemeTokens()` vs the compiled `_colors.scss` — a CI step after `build:showcase`) |
| RTL layout sweep  | `pnpm check:rtl-layout` (Chromium, LTR vs RTL overflow per route — **nightly**, not a PR gate)      |
| API-docs drift    | `pnpm check:api-docs` (docs tables vs the library JSDoc); `pnpm gen:api-docs` rewrites the data      |
| llms-full.txt     | `pnpm check:llms` (entry-point coverage floors for the generated AI asset)                           |
| Selector map      | `pnpm gen:selectors` (every `@Component` / `@Directive` selector → symbol + subpath, for the sandbox) |
| Quality numbers   | `pnpm gen:quality` (entry points, harnesses, specs, gates — what `/start/quality` binds to)          |
| Unit tests        | `pnpm test` (`ng test lib` — vitest via `@angular/build:unit-test`); `pnpm test:watch` |

`pnpm test` runs **vitest** through Angular's `@angular/build:unit-test`
builder — no `vitest.config.ts` and no `@analogjs/*`: the target lives in
`angular.json` (`lib:test`) with `projects/lib/tsconfig.spec.json`, and specs
sit **next to the code they cover** (`math/math.spec.ts`, not a `test/` tree).
`tsconfig.lib.json` excludes `**/*.spec.ts`, so nothing ships to npm.

Coverage today is the pure-logic layer (`ngwr/utils`, `ngwr/validators`,
`ngwr/pipes`, the colour and squircle maths), the validation-copy contract
(`ngwr/form`), most of the service layer (`ngwr/hotkey`, `ngwr/i18n`,
`ngwr/media`, `ngwr/platform`, `ngwr/storage`, `ngwr/overlay`, `ngwr/density`,
`WrWindowManager`, `ngwr/scroll`) and EVERY component with a
page under `reference/components` — 227 spec files, ~3750 specs, and **every entry
point now has one**. What is still uncovered is no longer whole
components but what a spec can reach: jsdom has no drawing context, so the canvas
and WebGL components can never assert anything painted. All six now install a
recording context — a WebGL2 stub for `aurora` and `splash-cursor`, a 2D one for
the rest — and five of them an `ErrorHandler` recorder besides, because what
`afterNextRender` throws reaches neither `detectChanges()` nor `whenStable()`, so
a boot that died reads as a pass without one. (`wr-confetti` is the exception and
correctly so: a service, with no deferred boot to lose an error inside.) That
carries the 61 specs across those six files past the early return, to frame
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
`check:llms` and `check:a11y` are the gates**, and a green run still does not mean
a component behaves — the suite is broad now but shallow in places (see above).

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
`document` and the spec provides `provideWrOverlay()` to keep its container out
of the next file's. A tiny
`@Component` host uses the component the way a consumer would, and the
assertions read the RENDERED DOM — roles, ARIA state, and the `.wr-*` classes,
which are public API. A spec that reaches into component internals passes
straight through the kind of change that actually breaks people. `*.spec.ts` has
an eslint override for the inline-template and selector rules, since a host that
exists for one `describe` should not ship a `.html` file.

**Writing a HARNESS** (`ngwr/<name>/testing`): copy
`projects/lib/collapse/testing/` for the layout and the voice, or
`projects/lib/image-cropper/testing/` for a component whose geometry a unit test
cannot reach. The rules below were all earned by shipping seventy of them, and
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

Requirements: Node `^24.16.0 || >=26` (`.nvmrc` pins 24), pnpm `^11.10`
(`engine-strict=true` in `.npmrc` — an older pnpm is refused outright, and
`packageManager` pins 11.10.0), TypeScript `~6.0`, Angular `22.x`.

### Linting — read before trusting a green run

`pnpm lint` is **multi-stage**: `ng lint` (lib, then showcase) `&&`
`eslint scripts` `&&` `stylelint` `&&` `check:colors`
(`scripts/check-color-parity.ts`) `&&` `check:rtl` (`scripts/check-rtl.ts` — a
physical, direction-dependent CSS property with no `rtl-ok:` reason within three
lines above it) `&&` `check:registry` (`scripts/check-registry.ts` — the items
under `registry/`, their `entryPoints` against the real catalog, and
`schema.json` against the validator that enforces it) `&&` `check:tokens`
(`scripts/check-tokens.ts` — a token declared in `theme/styles/` that nothing in
`projects/lib` or the showcase's own stylesheets writes `var()` for) — and the last stages are
the ones that most often turn a green-looking run red. The first stage prints
`All files pass linting.` even when a _later_ stage fails — so **verify by exit
code, never by grepping the output**:

```sh
pnpm lint; echo $?     # 0 = actually green
```

Autofix most issues (prettier wrapping long template lines, etc.) with
`pnpm exec ng lint <lib|showcase> --fix`.

**`check:api-docs` compares three columns and re-derives the generated file, and
its blind spots are worth knowing before you re-derive them.** It reads every
page documenting an API — hand-written `DocApiRow` arrays and pages consuming
`API.Wr*` alike — and holds each to the library: names, `default`, and since v12
`type` as well. The type column was compared nowhere before that, on any page, so
a docs table could say `number` for a `string` and every gate stayed green; that
is closed for the 107 pages mapped to an entry point and for all 933 rows of
`_core/generated/api.ts`, which the run now re-serialises in memory and compares
against the committed file. A page expanding a named alias (`'sm' | 'md' | 'lg'`
for `WrKbdSize`) is accepted, and editing the alias in `projects/lib` indicts
every page that spelled the old union out. Outputs print the PAYLOAD, bare —
`void`, `Blob`, `{ text: string; index: number }` — never a wrapper;
`EventEmitter` is wrong for all 74 of them, since `output<T>()` returns
`OutputEmitterRef<T>` and the library has not used an `@Output()` since v7.

Four things it cannot see, all measured rather than assumed. **A member the
extractor never read is invisible from birth** — `unreadMembers()` re-reads the
library under a wider rule and names anything `MEMBER_RE` missed, so a member
that STOPS being read is caught (and the run then says *not* to regenerate,
because baking the loss in is the failure mode), but a class whose
`public-api.ts` uses `export *` is filtered out of both reads and cannot be
witnessed at all. **The 66 pages documenting something else** — guides, utils,
validators, interfaces — carry 92 rows nothing compares; a wrong type there is
silent. **The comparison never opens a template**, so a row is "documented" even
when no `<ngwr-doc-api>` renders it, and 47 generated rows ship `description: "—"`
because the member carries no JSDoc. And **a hand-written row for a REQUIRED
input is exempt from the existence half**, since `DocApiRow` tells authors to
omit `default:` for those and that is the field the check keys on — 17 rows on
15 pages, so deleting a required input leaves its docs row standing. Union
ORDER and a different alias with identical arms are admitted deliberately: both
are value-set identities, and no binding changes.

**CI gates on `pnpm lint` + `pnpm test` + `pnpm check:api-docs` +
`pnpm check:llms` + `pnpm build:lib` +
`pnpm build:showcase` + `pnpm check:theme` + `pnpm check:a11y`** — all eight must
be green (a silently
failed lint stage once slipped past and blocked a publish). The last two need the
prerendered site, which is why they sit after `build:showcase` rather than in the
lint chain. The publish job re-runs `pnpm lint` + `pnpm build:lib` before
shipping. Conventional-commit subjects are checked locally (commitlint
`commit-msg` hook) and PR titles on CI.

## Conventions

**Build on ngwr first (dogfood).** Whenever there's any chance an ngwr primitive
already covers the need, use it — an existing component (check the catalog
before hand-rolling), `ngwr/utils`, `ngwr/pipes`, `ngwr/validators`, theme
tokens — rather than hand-rolling raw markup/logic or pulling an external
library where an internal tool exists. The catalog is large (202 entry points):
check before writing a bare `<input type="file">`, a date / number / truncate
helper, a coercion, an id generator, and so on. New external runtime
dependencies need a strong justification — the only runtime dependency today is
`tslib`.

**Framework.** Angular 22, **standalone**, **signals-first**, **zoneless**
(`provideZonelessChangeDetection`). Don't write `standalone: true` (the Angular
22 default — 0 occurrences in the lib) or `ChangeDetectionStrategy.OnPush`
(zoneless CD is signal-driven; only 2 legacy files in `window/` set it).
Use `input()` / `model()` / `output()` / `signal()` / `computed()` / `effect()`
/ `afterNextRender()` / `viewChild()` / `inject()` — not decorators,
constructor DI, or RxJS where a signal is clearer.

**Public API is wider than TS.** Lib components are `ViewEncapsulation.None`,
and their **BEM `.wr-*` classes are part of the public API** — consumers style
against them, so don't rename or restructure them casually. The `--wr-*` CSS
custom properties are public too.

**Styling.** Component styles live in `styles/_index.scss`, themed through
**CSS custom properties** (`--wr-*`), not encapsulation. The token layer (set
by `provideWrTheme()`): intent colors
`--wr-color-{primary,secondary,success,warning,danger,info,light,medium,dark}`,
each with `-contrast / -light / -lighter / -dark / -darker / -rgb`, plus the
soft set (`-soft / -soft-border / -soft-contrast / -active`), `-ink` and semantic
role aliases (`--wr-color-{surface,on-surface,on-surface-muted,outline}`); plus
`--wr-border-radius-{sm,base,lg,pill}`, `--wr-text-*`, `--wr-font-weight-*`,
`--wr-duration-*`, `--wr-ease-*`. Pull mixins and tokens from `ngwr/theme`.
The TS `WR_COLORS` list and the SCSS `$base-colors` map must stay in sync —
`scripts/check-color-parity.ts` (in `pnpm lint`) fails the build if they drift.

**A token nobody paints with is not a token, and `check:tokens` is a "say why"
gate rather than a "don't" gate.** `--wr-*` properties are public API, so a token
the library never reads can still be right to ship — the eleven
`--wr-color-gray-*` steps are a FIXED ramp precisely so a component cannot use
them, since a component has to work in both themes. What is not acceptable is
that nobody decided, and that is what the layer had drifted into: on its first
run the check found **37 declarations with no consumer**, including
`--wr-color-border-subtle` / `-border-strong` sitting beside twenty-two files
hand-rolling `rgba(var(--wr-color-outline-rgb), α)` at eight alphas, four of
which compute to exactly those tokens. Mark an intentional one with
`// unused-ok: <reason>`; the marker covers a contiguous run of declarations up
to the next blank line, because a family is one decision — so a marker's sentence
has to name WHICH of the run it excuses, or it states something false about the
neighbours it happens to cover. **Interpolation is the trap, in both
directions.** A component stylesheet writes `var(--wr-color-#{$name}-dark)`, so a
matcher built on `[\w-]+` reports the whole shade set as dead; and a loop that
writes nine references still matches no concretely-named declaration, which is
how the dark theme's hand-tuned `--wr-color-dark-dark` — the background
`.wr-btn--dark:hover` paints — came to carry a marker saying nothing paints with
it. The check now resolves an `@each` to the list it actually iterates and
expands the reference against it, scoped by brace depth, so a loop over three
intents cannot vouch for the other six. Two more things do NOT count as painting
with a token: the showcase's templates (a swatch with an inline `style`, a
`var()` inside a printed SCSS snippet — counting those called three dead families
alive) and a `var()` inside a CODE COMMENT, which is the same category and was
the only thing keeping `--wr-color-outline-rgb` green. Only `projects/lib` and
the showcase's own `.scss` count, comments stripped.

**A `::before` background is invisible to every contrast checker.** `wr-squircle`
paints its content fill on a pseudo-element, so axe walks past it to the host's
`background-color` — which for the bordered variant is the BORDER colour — and
reports the intent measured against itself. Any component that paints through a
pseudo-element, a gradient, or an SVG is unmeasurable this way; check those by
hand rather than believing the number.

**`-contrast` picks, it does not blend.** `_contrast()` returns whichever of
`$contrast-dark` / `$contrast-light` scores higher against the fill, so those two
values ARE the ceiling for every intent — there is no share to tune, and a
"softer" black spends contrast that nothing else can recover. Both are the
extremes (`#000` / `#fff`), which puts every intent at its theoretical maximum.
Because it picks, the label an intent gets is decided by the FILL: the two
candidates are equal at √21 ≈ 4.58, so anything lighter than that takes a black
label no matter what anyone prefers. That is the whole reason v11 deepened five
intents — `secondary`, `success`, `danger`, `info`, `medium` — just past the flip
(light theme: white 4.60–4.64, black 4.52–4.56, an 8–20% shift in tone); at the
old tones white measured 3.10–3.99, below AA, so a muddy black label won on
merit. `warning` (black at 12.28:1) and `light` (14.14:1) are deliberately NOT in
that set and cannot be — white needs `#906900` on warning, which is brown, not a
warning colour. Every intent clears AA; the tightest are now `secondary` and
`info` at 4.61:1, where white already wins and pure white is the ceiling, so the
only lever left is the fill itself.

**In the DARK theme those two roles cannot both be satisfied, and the arithmetic
says so.** A patch after v11 deepened the dark `primary` from `#5b85ff` to
`#3567ff` so its label would stop being black while the light theme's was white.
White wins below L ≈ 0.179; clearing 4.5:1 as text on the dark canvas needs
L ≥ 0.201 on the library's own `--wr-color-surface` (`#0b1120`) and L ≥ 0.214 on the
showcase's slightly lighter page (`#0e162d`, which is the pair axe reports). The two
ranges do not overlap on either — **no colour takes a
white label AND works as body text on a dark page**, for any intent, at any hue.
So a dark theme whose filled buttons carry white labels MUST route the
intent-as-text role through `-ink` (which lightens in dark), and the bare token
went from 5.33:1 to 3.87:1 in that role. That is why the showcase's twenty
`color: var(--wr-color-primary)` declarations became `-ink`: not a workaround, the
only consistent reading of the two tokens.

**Text takes `-ink`; a GRAPHIC keeps the bare intent.** The library had 29
declarations painting a bare `--wr-color-primary` through a text property, and the
split is 11 text / 18 graphic — decided by reading each template, never by the
class name. **A property-name grep does not find them all.** `wr-calendar` paints
today's day number through its own theming hook — `--wr-calendar-accent`, which
defaults to `var(--wr-color-primary)` — so no search for the token's name reaches
it. It measured 4.06:1 in dark and now has an `--wr-calendar-accent-ink` companion
beside the existing `-rgb` and `-contrast` ones, so overriding the hook carries the
text role with it. Sweeping every component-local alias that resolves to a bare
intent turned up exactly one other, `--wr-alert-close`, and it is a non-issue: an
`<svg>`, and every variant already overrides the default with `-ink`. Two more
shapes a grep also misses and neither is actionable — `wr-shiny-text` uses
`rgba(var(--wr-color-primary-rgb), 0.9)` as a gradient stop under
`background-clip: text`, where there is no `-ink-rgb` to swap in, and the chart
components take `input<string>('var(--wr-color-primary)')` as a consumer-facing
default that specs pin. `.wr-date-picker__trigger`, `.wr-table-sort--asc`,
`.wr-input-number__step` and all five `.wr-sidebar__icon` rules contain nothing but
an `<svg>`, and WCAG holds a graphic to 3:1, which `#3567ff` clears on the dark
canvas at 3.87. Deepening those would restyle the light theme for no accessibility
gain. The eleven that DID move — `wr-option--selected`, `wr-tree__row--selected`,
`wr-tree__chip`, `wr-cascader__opt--active`, the command-palette and context-menu
items, `wr-segmented__option:hover`, `wr-action-sheet__action`,
`wr-anchor__link--active`, `wr-table-filter__reset` ("Reset", a real text button)
and `wr-falling-text__word--hl` — all carry text, and six of them sit directly on
`--wr-color-primary-soft`, the tint `-ink` is calibrated against. Five were failing
in the LIGHT theme too, at 4.17–4.19:1, long before the dark base moved.

**The `-ink` ramp is calibrated, not eyeballed.** Each intent's share in
`$ink-mix` (`theme/styles/_colors.scss`) was derived as the most saturated value
that still reaches **5.0:1 against that intent's own `-soft` tint**, in both
themes — the soft tint being the darker of the two backgrounds `-ink` is
documented for, and so the binding one. The 5.0 target is deliberate headroom
over AA's 4.5: the first pass aimed at 4.5 exactly and left every intent between
4.59 and 4.83, so a slightly different background pushed it under
(`wr-typography--code` measured 4.24, `wr-tag--primary` 4.42). **v11 moved five of
the bases without re-deriving the shares**, which cuts both ways: a deeper base
darkens the ink, which raises contrast on a light tint and lowers it on a dark
one, so the light theme sits at 5.03–6.56 while dark slipped. `primary` has since
been re-derived from 86% to **78%** — the dark base deepening dropped it to
4.48:1 on the sidebar's own tint, a real AA failure axe caught, and 78% is the
most saturated share that reaches 5.0 there (5.04). Lowering a share only helps
the light theme, where less intent means more `--wr-color-dark`. `secondary-ink`
in DARK is still at 4.78 — clear of AA, under the documented target, and the next
share to re-derive if you touch this. **Derive against the pair axe resolved on
the page, not against a hand-rolled composite:** compositing the `-soft` tint over
the canvas by hand reproduces the ink colour exactly and the BACKGROUND not at all
(4.14 computed where axe measured 4.48, and it misses the recorded
`secondary-ink` 4.78 by the same kind of margin). The ratio formula itself is
sound — it reproduces axe to the second decimal on a pair axe has already
resolved. So take the foreground/background pair out of the `check:contrast`
report and solve on that. Those figures are arithmetic on token values, not
painted measurements; `pnpm check:contrast` is the authority. If you change a
share, re-derive it — do not nudge it until one page looks right.

**Two directions, two tokens — do not mix them up.** `-contrast` is the label ON
a filled intent; `-ink` is the intent used AS text on `--wr-color-surface` or on
its own `-soft` tint. In the dark theme the bare token is now unusable as text for
`primary` too (3.87:1 on the page background) — see the impossibility above; the
showcase learned this the hard way across 193 routes. The v11 deepening changed
the first half of that story and
not the second: a bare `--wr-color-<intent>` as text now clears AA on the plain
light surface for every intent but `warning` (1.71:1) and `light` (1.48:1) — but
on its own `-soft` tint, which is where outlined / ghost / tinted variants
actually paint it, it still fails everywhere (1.60–4.17 in light, 3.65–4.84 in
dark). That tint is what `-ink` is calibrated against, so those variants take
`-ink` regardless of how the bare intent scores on white. `-ink` and
`-soft-contrast` are `color-mix`es toward `--wr-color-dark`, which itself flips
per theme, so one declaration darkens in light and lightens in dark. For muted
prose the role alias `--wr-color-on-surface-muted` is the answer — NOT the
`medium` intent, which is a fill colour: it reaches 4.63:1 on pure white but only
4.01:1 on the lightest surface the library paints (`#ebeff4`), where the muted
role still holds 4.63:1.

**SSR-safe.** Components must render under SSR / hydration: zoneless,
signals-only, and **no constructor-time DOM access** (guard with
`afterNextRender` / `isPlatformBrowser`). The showcase prerenders every route
under `outputMode: 'static'`, and `build:showcase` **fails on prerender
errors** — so SSR breakage shows up as a red build, not a silent degrade.
(A4 shipped; incremental hydration is the remaining stretch.)

**Commits.** **Lowercase conventional**, single-line **subject only** — no body,
no bullet recap, no `-m "$(cat <<EOF…)"` heredocs — aim for **≤80 chars**, lean
shorter — house style; commitlint hard-caps the header at 100 and enforces the
lowercase subject. **No AI / assistant attribution** anywhere (commits,
code, files): no `Co-Authored-By`, no "Generated with…". e.g.
`feat(select): responsive bottom-sheet on mobile`.

**Git flow.** **Never push to `main`.** Branch _before_ you start work (not
after committing) → short commit → **push the feature branch** → open a PR; the
maintainer squash-merges. After a merge, resync local main:
`git fetch --prune origin && git merge --ff-only origin/main`.

**No assistant artifacts in the repo.** `.claude/` is gitignored; keep AI
tooling files and AI mentions out of committed content. (`AGENTS.md` plus the
`CLAUDE.md` / `GEMINI.md` pointers are the sanctioned exception — they're the
cross-tool instruction standard, one source of truth in `AGENTS.md`.)

**Scope discipline.** Do exactly what's asked — don't restructure, standardize
CI, bump versions, or touch adjacent areas unprompted. If a broader change
looks worthwhile, propose it in one line and wait for a yes. Prefer the
smallest diff that satisfies the request. Concretely:
`.github/workflows/publish.yml` sets `package-manager-cache: false`
**deliberately** — the job holds an OIDC token (npm Trusted Publisher,
`--provenance`), and a poisoned cache would hand it to attacker-controlled
code. Don't re-add the cache.

**v12 carries two BREAKING changes, and they are the reason it is a major.**

**One — the date entry points moved.** `ngwr/date-adapter` → `ngwr/date`,
`ngwr/date-adapter-fns` → `ngwr/date/adapters/fns`, `ngwr/date-adapter-luxon` →
`ngwr/date/adapters/luxon`, so the catalog nests implementations under their
feature the way `ngwr/icon/adapters/*` always did. Import paths only — every
symbol keeps its name, and these entry points ship no styles, so no `@use` path
moves with them. `migration-v12` rewrites all of it, which is what makes this a
codemod rather than a release note: a path is exactly what a codemod can move
without reading the code around it.

**Two — `readI18nText()` returns `Signal<string>`.** Exported from `ngwr/i18n`,
it returned `string`, so every call site needs a `()`. A fix rather than a
refactor: `WrI18n` writes every loader-backed catalog from
`firstValueFrom(...).then(...)`, which lands a microtask AFTER the first
change-detection pass, so the old one-shot read froze the ENGLISH fallback for
the life of the app — a `<wr-date-picker>` announced "Открыть календарь" on the
field and "Open calendar" on the button beside it, off the same key. A sync read
cannot be correct against an async catalog, so the type had to move. Deliberately
NOT codemodded: adding `()` means knowing which identifiers hold the result, and
a wrong guess is a silent behaviour change — whereas the type error names every
site. `useI18nText`, the `wrT` pipe and the `[wrT]` directive are untouched.

Both are on the user-facing migration guide at `/start/migration`; the
`ng update ngwr@12` section there is what a consumer actually follows.

**Versioning.** **v12 is the current major line.** `projects/lib/package.json`
and the `NGWR_VERSION` constant are written by `release:prepare`, so read the
version from there rather than from this file. v10's three breaking changes were
all CSS/token-level — WCAG contrast on `--wr-color-*-contrast`, table header
casing, tooltip theming — so there is deliberately **no `migration-v10`**: an
empty codemod would tell consumers their visual regressions were handled when
they were not. v11's breaking change was the same shape (five intents deepened so
their labels can be white — see Styling), so `schematics/migrations/` skipped v10
and v11 on purpose. It resumes at **v12**, and the difference is the whole rule:
v10 and v11 changed painted colour, which no codemod can repair, while v12 moves
three import paths, which is exactly what one can. v12 also carries the largest defect sweep the
library has had: 257 confirmed and fixed across six passes — five reading code
(SSR, teardown, zoneless, cross-component consistency, hard-coded strings,
untrusted input, harnesses, config, package surface, edge inputs, performance,
APG and WCAG criterion by criterion) and one measuring PIXELS in a real browser,
which found 58 on its own and is the lens the other five could not apply. Don't bump
the version by hand — releases are cut from Actions ("Release PR" → `bump`),
which runs `release:prepare` / `release:body` and opens a `chore(release)` PR.

**Dependencies.** Check with `pnpm outdated` (one shot — don't query packages
one by one). Angular **tooling** (`@angular/cli`, `@angular/build`,
`@angular-devkit/*`, `@schematics/angular`) patches independently of the
**framework** (`@angular/core` et al.) — bump only the train that moved.
Dependabot (grouped, checked daily) handles the PRs — one per group, and `groups` does NOT cross ecosystems, so the npm groups say nothing about GitHub Actions bumps (those have their own group, minor/patch only; a major action bump still arrives alone so it cannot be merged unread). **TypeScript is pinned on purpose** at
`~6.0.3` — Angular 22's peer range is `typescript >=6.0 <6.1`, and TypeScript 7
is out. `.github/dependabot.yml` now carries an `ignore` for it, and one for
`@types/node` `>=26` (`.nvmrc` pins Node 24, so newer types describe APIs the
runtime does not have — which type-checks clean instead of failing). If either
appears in a PR anyway, it came from somewhere other than the bot; don't take
it.

**Docs prose.** In changelogs / docs, write "from X to Y" — not "X → Y" (no
arrow) — for version and before/after descriptions.

## Building components

The catalog is large (202 entry points) and **deliberately consolidated** —
many "components" are modes or inputs on one host (e.g. `wr-select` covers
single / multi / search / tag; `wr-date-picker` covers date / time / datetime;
`wr-popover` has a `tooltip` mode; `wr-drawer` doubles as a bottom-sheet).
**Before adding a new component, check whether an existing one should grow a
mode or input instead.** Orient with the grouped catalog in [README.md](README.md)
(Form / Buttons / Data / Feedback / Display / Layout / Navigation / Overlays /
Charts, plus a separate Animations section) or `ls projects/lib`.

**Skeleton.** Mirror the nearest existing entry point (`projects/lib/alert/` is
the cleanest match) — copy its `@Component` shape (`ViewEncapsulation.None`,
`host` bindings, signal `input()` / `model()` / `output()`; no `standalone` or
`changeDetection` property), plus `styles/_index.scss`, `public-api.ts`,
`index.ts`, and `ng-package.json`. The catalog is consistent — match the local
idiom rather than inventing one.

**Naming.** Selector prefix `wr-` (mind the abbreviations — the button is
`wr-btn`, not `wr-button`). Classes are BEM: `.wr-<block>__<element>--<modifier>`.
Because components are `ViewEncapsulation.None`, those classes are **public API** —
choose them deliberately and don't rename them on a whim.

**Strings & i18n.** Never hard-code user-facing text. Expose overridable `*Label`
inputs and route built-in strings (including ARIA labels) through the `ngwr/i18n`
catalog (`wrT`) so consuming apps can localize.

**Two a11y gates, and they see different things.** `pnpm check:a11y` runs axe in
JSDOM over the prerendered HTML: no stylesheets, no layout, so it turns
`color-contrast` and `target-size` OFF and answers the structural half — names,
roles, ARIA validity, references. `pnpm check:contrast` (`scripts/check-contrast.ts`)
answers exactly those two, in a real Chromium with real CSS, in BOTH themes,
against `scripts/contrast-baseline.json`. It reports axe's own measured ratio
rather than re-deriving one — a `color-mix` result computes to
`color(srgb 0.19 0.41 0.77)`, whose components are 0–1, and hand-rolled maths
that assumes 0–255 silently produces nonsense. It emulates
`prefers-reduced-motion`, without which an animation caught mid-flight
(`opacity: 0`, `blur(10px)`) reports a failure that describes one frame, and it
**pins the clock to the same instant `check:state-a11y` uses** — it did not
until 2026-08-19, and because the event-calendar demo builds its events from
`new Date()`, its route count slid between 1 and 2 on its own. A count that
moves by itself is worse than a failure: the allowance can only be set to the
loosest day, and every other day it hides a real regression in the slack.
`--filter=<substring>` narrows it to a route while you iterate; the full sweep
is minutes.

It runs **nightly** (`.github/workflows/nightly.yml`), not on every PR: a
browser and 392 page loads (196 canonical routes, both themes) took the PR job
from ~5 minutes to nearly 17, and what it catches is drift in painted colour
rather than the kind of break a
single PR needs told about mid-review. So a green PR says nothing about
contrast — run it locally when you touch a token, a tint, or anything that
paints text on an intent.

**`check:contrast` gates on ROUTE COUNTS per rule, not on nodes**, so a brand-new
violation on a route already in `contrast-baseline.json` passes silently. That is
not hypothetical: the dark `primary` deepening broke `wr-calendar__day--today`
(4.06:1), the calendar route was already baselined for its
`--out-of-month` days, the route count did not move, and the sweep printed
`✓ No new contrast or target-size violations`. It was found by probing the element
directly. **When you change a token, measure the elements you changed** — a green
sweep only means no NEW route started failing.

**Neither of those two can see a hover, a focus ring, or anything inside an
overlay** — which is precisely where the library paints an intent as text. Both
walk PRERENDERED HTML or a page at rest, so `.wr-option--selected` (inside a panel
that does not exist until you click), `.wr-segmented__option:hover` and
`.wr-context-menu-item` are invisible to them. Seven failures were found there by
hand, every one of them long-standing and every one under a green run. And the blind spot is not only colour: since `check:a11y` reads prerendered HTML,
the STRUCTURAL rules have never run inside an overlay either —
`nested-interactive` never saw the window taskbar's close button, a
`role="button"` span with `tabindex="0"` inside the tab's own `<button>`, because
a tab exists only while a window is minimized. That one was found by reading a
template.

**`pnpm check:state-a11y`** (`scripts/check-state-a11y.ts`) is the answer to
both: the third a11y gate, nightly, driving a curated table of states from
`scripts/lib/state-a11y/states.ts` and running the FULL axe rule set inside each
(only `color-contrast-enhanced` is off — it is AAA).

Four rules if you touch it, and each one is a bug it already had:

- **A state that did not paint FAILS the run.** A clean axe run over an element
  that never rendered is indistinguishable from a pass, and that is how an audit
  reports green on nothing. Every entry names a `target` asserted visible with a
  real box first. One selector found that way that can never match:
  `.wr-falling-text__word--hl`, which needs a `[highlightWords]` binding no
  showcase demo passes. `.wr-context-menu-item:focus-visible` used to be the
  other, and the reason recorded here — "the menu focuses its own host" — was
  never true: nothing focused anything, which was itself the defect. The menu now
  moves focus to its first enabled row on open and roves with the arrows, so the
  selector paints and the state table can cover it directly instead of reaching
  through the `:hover` twin.
- **Wait for the state to STOP MOVING, and never against `transform: none`.**
  `reducedMotion` does not stop an overlay's enter animation, and mid-flight the
  dialog reports its own title at 3.68:1 — a half-faded panel over a half-faded
  backdrop. The check is five identical samples of every ANCESTOR's opacity and
  transform (the pane animates, not the panel) plus a count of running
  colour-affecting animations. Every CDK pane carries a permanent positioning
  translate, so "settled means no transform" can never be satisfied; and a toast's
  progress bar runs for its whole dismiss timeout, so animations that cannot
  change a colour do not count.
- **Sample the wait from NODE, one short evaluate at a time.** A three-second loop
  inside the page runs its timers and still sees the same six transitions running
  the whole way — a headless renderer nothing is asking for a frame does not
  advance them.
- **Never let a `catch` return "settled".** One did, and it hid
  `__name is not defined` — esbuild's keep-names transform, thrown by every
  `page.evaluate` holding a NAMED inner function — through four rounds of
  debugging. Inline the helpers.
- **Pin the CLOCK as well as the machine.** The context freezes `Date` with
  `clock.setFixedTime`, because a state that renders differently tomorrow cannot
  have a baseline: the event-calendar demo builds its events from `new Date()`,
  so its chips carry new `aria-label`s and new modifier classes every day, and
  the nightly went red twice on the same 20px design call wearing different
  node names. The date-picker and calendar demos drift the same way.
- **Pin anything the page sniffs about the machine.** The context sets a fixed
  macOS `userAgent` (real Chromium version, fixed platform token), because
  `wr-window` picks a chrome per OS — the Linux one is close-only unless
  `showMinimize` asks otherwise — and `WrHotkey` resolves `mod` to ⌘ or Ctrl,
  which changes the width of the command palette's shortcut chip. Without it the
  sweep paints one page on a laptop and another on ubuntu-latest, and a baseline
  cannot be true of both: the first nightly run died on a click for a button the
  Linux chrome deliberately does not have. Per-OS variation is covered by states
  that pin `os` on the component instead.
- **`viewport: 'mobile'` is how a bottom sheet gets measured**, and it gets its
  own browser context rather than a resize: `wrPresentAsSheet` reads
  `window.innerWidth` when the overlay OPENS, so resizing afterwards leaves a
  floating panel on a phone-sized page.
- **A scope resolves as the target's ANCESTOR.** A docs page renders the same
  component several times, so `.first()` picks the wrong instance: one state
  clicked a checkbox in the third table and measured the first. The resolved
  element is marked with a `data-` attribute and axe runs on that.
- **Assert the RULES ran, not just the state.** `target-size` is in
  `axe.getRules()` and is NOT in a default `axe.run()` — the WCAG 2.2 rules are
  opt-in — so widening this gate from `runOnly` to the full set silently dropped
  it and printed "no longer fails, drop it from the baseline" about findings
  still on the page. `ALWAYS_ON` re-enables it; `REQUIRED_RULES` is the part that
  matters, checking each one appears in the result afterwards.

Two more things about it. The baseline is keyed by NODE with `:nth-child()`
stripped, so a new violation inside an already-failing state cannot hide and the
calendar entries do not expire when the month changes. And a full run prints
coverage — state-dependent classes in the BUILT stylesheet versus classes it
actually painted, **71 of 95** across 78 states — because a curated table that
stopped growing looks exactly like one that covers the catalog. Two things when
you extend it: pass **`--probe`**, which reports every unreachable state instead
of stopping at the first, and put every selector through **`demo()`** — the
showcase is built out of the library, so the first `.wr-dropdown-trigger` on every
page is the header's own version switcher.

`check:rtl-layout` is the other nightly job, and it is nightly for the same
reason. It renders every route in a real Chromium under both directions and fails
only where a page overflows sideways in RTL and not in LTR — differential, so
there is no baseline of pixel positions to rot, and it catches what neither
`check:rtl` (source only) nor `check:a11y` (JSDOM, no stylesheets) can see. Its
one shipped catch was the slider thumb centring itself with a physical
`translate(-50%)` against an inset that had become logical.

**`--wr-color-outline` fails WCAG 1.4.11 on control borders, and that is a
DECIDED trade — do not re-report it.** Measured: `#cbd5e1` on white is **1.48:1**
and `#262f44` on `#0b1120` is **1.41:1**, against the 3:1 the criterion asks of
anything that identifies a control. The token carries 103 declarations across 55
entry points, and only **15** are control boundaries where 1.4.11 applies
(`input`, `input-group`, `textarea`, `select`, `checkbox`, `radio`, the switch
track, the slider rail, `button`, `cascader`, the tree trigger, `input-otp`,
`color-picker`, `time-picker`, `rating`); the other 88 are cards, dividers,
table rules and panel edges, which the criterion does not reach.

Two fixes were costed and both were rejected on how they look: darkening the one
token to `#7e97b5` / `#4d608a` repaints all 103, and splitting out a
`--wr-color-control-border` at 3:1 leaves control edges visibly darker than every
line beside them. The maintainer chose to keep the current hairline.

Worth knowing if it is ever reopened: `#7e97b5` clears 3:1 on white but only
reaches 2.60:1 on `#ebeff4`, the lightest surface the library paints, so the
honest light value is `#718cad` (3.00 on that tint, 3.47 on white). **No gate
reports this** — axe ships no non-text-contrast rule, so `check:contrast` runs
`color-contrast` and `target-size` and neither sees a border. Five sweeps
rediscovered it from first principles; this paragraph exists so a sixth does not.

**The focus ring is `--wr-focus-ring-*`, and no gate can prove it.** The shared
`theme.focus-ring` mixin emits an OUTLINE plus a halo, both read from tokens
(`-color` / `-width` / `-offset` / `-halo` in `_variables.scss`). It used to be
`outline: none` plus a 25% halo, which measures **1.41:1 in light and 1.31:1 in
dark** — WCAG 1.4.11 asks 3:1 of a focus indicator, so the forty-one selectors
whose whole focus style is that mixin had nothing on screen that met it. The
solid token is 4.89:1 / 4.07:1, measured in the browser and not only derived.
Three things follow. **axe has no focus-appearance rule** — `check:contrast` runs
`color-contrast` and `target-size` and nothing else, so this number lives in the
file comment the way the `-ink` shares do, and a change to it has to be measured
by hand. **An outline is the only form that survives `forced-colors`**, which
drops every `box-shadow`; that is why the halo must never be the sole channel
again. And **a component may inset the ring but must not cancel it**: `list` and
`window` override `outline-offset: -2px` after the include for a row inside a
clipping container, which is correct, while `dropdown` used to write
`outline: none` in a rule that beat the shared one on source order — the mixin
lists `.wr-dropdown-item:focus-visible` explicitly, so the two contradicted each
other and the component won.

**Accessibility.** Interactive components follow the WAI-ARIA APG patterns —
correct roles/states, keyboard navigation, and focus management; overlays use the
CDK a11y primitives (focus trap) plus live-region announcements. `pnpm
check:a11y` runs axe over the prerendered showcase and **fails on any serious or
critical violation** — the baseline is empty, so a new one is a red build. A
control with no projected text needs an `ariaLabel` input routed through the
i18n catalog; an `aria-label` on a component's host element does not reach the
native control inside it.

**Showcase page = the docs.** Every component ships a docs page — under
`projects/showcase/app/reference/components/<name>/` for the main catalog (84
dirs), or under `projects/showcase/app/animations/<name>/` for animation /
visual-effect components (a separate top-level cluster with its own routing +
sidebar). Wire it into the matching `*.routing.ts` and the `routes` map in
`app/routing.ts`, and author it with the doc-page components from
`#core/components`: `<ngwr-doc-page>`,
`<ngwr-doc-section>`, `<ngwr-doc-code>` (code blocks), `<ngwr-doc-snippet>` (live
demo), and `<ngwr-doc-api>` (API table). A component isn't done without it.

**Distribution surfaces.** Three pages under `/start` exist for people who have
not adopted the library yet, and they are held to a different standard than the
rest of the docs: everything on them has to be checkable, because they are what a
launch points at. `/start/comparison` argues the wedge (Signal Forms-native value
controls, no `ControlValueAccessor` anywhere) and names, by competitor, when to
choose something else; `/start/quality` is the gating story; `/start/playground`
is the trial surface. **Numbers on those pages bind to
`#core/generated/quality`, written by `pnpm gen:quality` from the repository** —
typing one as a literal is how the page starts lying, and the comparison page is
where a stale figure does the most damage. Two rules learned the hard way here:
a claim about ngwr's own history must survive `git` (an early draft said
"zoneless from the first commit", and v5.0.3 has sixteen `@NgModule`s, v6 one,
with the zoneless bootstrap arriving in v6.1.0 and the last module deleted in
v7); and a claim about a competitor must be reducible to something observable,
which in practice means the npm `license` field or a linked issue, never a
summary of someone's licensing terms.

**The StackBlitz sandbox works, and the two things that broke it are worth
knowing.** `projects/showcase/app/_core/sandbox/` turns any docs snippet into a
complete Angular 22 workspace — three tiers (the snippet already is a component
/ it is a template fragment whose `imports` resolve against `pnpm
gen:selectors`' map / neither, so render the source and say why) — and hands it
to StackBlitz by a plain form POST with no SDK dependency. It has been watched
booting end to end: install, `ng serve`, bundle complete in ~26 s, demo painted.
Cold path is about two and a half minutes.

It failed twice first, and both causes were in the workspace this repo emits,
not in the container. **One: no `development` configuration**, so `ng serve` ran
the OPTIMIZED build every start — the dev server prints "Prebundling has been
configured but will not be used because scripts optimization is enabled" — and
that path dies in rolldown on rxjs's circular ESM
(`rxjs/dist/esm/internal/scheduled/scheduled.js`). **Two: `@use 'ngwr';`**,
which compiles all ~120 component stylesheets for a two-element demo and hit an
out-of-memory error; narrowed to the entry points the snippet renders, the CSS
goes from 287 kB to 44 kB. Both fixes are the right thing for a generated
project anyway, which is the tell that they were defects rather than
workarounds. `STYLE_ENTRY_POINTS` in the generated selector map is what makes
the narrowing safe: `@use` on an entry point with no `styles/_index.scss`
(`ngwr/date`, `ngwr/utils`) is a build error, not a no-op.

Two more traps it caught, worth keeping in mind for anything that generates a
bootstrap: a provider whose absence is a `NullInjectorError`
(`provideWrDateAdapter`, and `Router`, which `projects/lib/sidebar/sidebar.ts`
injects non-optionally) cannot be inferred from markup, so all of them are
emitted unconditionally and only `provideWrIcons` is gated, because it is the
only one that costs an npm package; and `provideRouter([])` alone throws
`NG04002` on bootstrap, so it carries `withDisabledInitialNavigation()`.
**One observation is not a guarantee** — if you change what the generator emits,
watch one boot again rather than assuming.

**AI assets.** `llms-full.txt` AND the agent skill (`skills/ngwr/SKILL.md` plus
`references/{catalog,setup}.md`) regenerate from library source on every build,
both from the one `collect()` pass in `scripts/gen-ai-assets.ts` — so the catalog
cannot say two different things in two files. The skill ships inside the npm
tarball (copied by `copy-dist-assets.ts`) and is served at `/skills/ngwr/SKILL.md`;
its provider table is imported from `projects/lib/mcp/providers.ts`, which the MCP
server's `get_ngwr_setup` reads too. `check:llms` gates the skill as OUTPUT — no
frontmatter, or a catalog table with only a header, fails the build. Both are
gitignored and hand-editing either is pointless; `sitemap.xml` and the per-page **markdown twins**
regenerate from the prerendered route list after `build:showcase`
(`scripts/gen-sitemap.ts`, `scripts/gen-md-docs.ts`) — so a new entry point or
route is picked up automatically. The twins are what `/reference/components/select.md`
serves: the same page as markdown, converted from the prerendered HTML rather
than from `app/` so it cannot drift, with the live demos dropped and their
source blocks kept. Each page advertises its own via
`<link rel="alternate" type="text/markdown">` (`MetaService.setMarkdownAlternate()`),
and `ngwr-doc-code` reflects `data-language` purely so the export can fence a
block correctly — a bound `[language]` does not reach the DOM on its own. `llms-full.txt` is **gitignored** — it exists
in the working tree (~51 KB) but is untracked and rewritten on every build.
Never hand-edit it; edit `scripts/gen-ai-assets.ts`. Only the curated
[`llms.txt`](llms.txt) and this file are hand-maintained: update them when the
doc structure or the headline components change. (A rename once silently
emptied the sitemap because its generator hard-coded the old `app/components`
path — the rewrite derives from the prerender output and floor-checks the count
so that can't recur.)

## MCP server

`projects/lib/mcp/` is NOT an Angular entry point — it is a Node CLI shipped in
the same tarball, built by `scripts/build-mcp.ts` into `dist/lib/mcp/` and exposed
as the `ngwr-mcp` bin. It mirrors how `schematics/` is built: its own
`tsconfig.json` (extending the root, so the repo's strictness applies), `tsc -p`,
and a step in the `build:lib` chain.

Four tools over stdio JSON-RPC — `search_ngwr`, `get_ngwr_component`,
`get_ngwr_api`, `get_ngwr_setup`. **It adds no second copy of the catalog**: it
reads `llms-full.txt`, `schematics/use/symbol-map.json` and `types/*.d.ts` out of
its own installed package, which is the only reason it can never drift. Two rules
if you touch it: nothing may write to stdout except protocol JSON (a stray
`console.log` corrupts the stream and the client drops the connection), and every
branch must end in exactly one reply per request and none for a notification — a
client that never receives a response for an id does not fail, it waits.

## Schematics

The lib ships an `ng` schematics suite — source in `projects/lib/schematics/`
(`collection.json` + a dir per generator), built by `scripts/build-schematics.ts`
(which also generates `use/symbol-map.json` from a public-api scan):

- `ng add ngwr` — prompts for styles / dateAdapter / density / theme, installs
  peers, prints a tailored bootstrap snippet.
- `ng g ngwr:use WrFoo --path path/to/cmp.ts` — adds the import + splices it into
  the component's `@Component` imports. Only `symbol` is positional; `path` is a
  named option, so passing it bare fails with `Unknown argument`.
- `ng g ngwr:provider <name>` — splices a provider into bootstrap.
- `ng g ngwr:icon-set` / `ngwr:component-style` / `ngwr:page` — icon barrel /
  per-component `@use` / starter pages.
- `ng update ngwr@N` — migrations, one dir per major under
  `schematics/migrations/` (v7 tag rewrites, v8 density/pagination renames,
  **v9 `<wr-checkbox>` `value` → `checkboxValue`**, **v12
  `ngwr/date-adapter*` → `ngwr/date/adapters/*`**), registered in
  `schematics/migrations.json`.

## Gotchas

- **`<wr-checkbox>` group identity is `checkboxValue`, not `value`.**
  `FormCheckboxControl` reserves `value` for the form value, so the boolean
  state is the `checked` model and group membership is `checkboxValue`. A
  leftover static `value="x"` lands on the host as a plain DOM attribute — no
  template error, and every checkbox in the group keeps the default identity
  `null`, so they all toggle together. `ng update ngwr@9` (migration-v9)
  rewrites it.
- **`<ng-content />` in `@if` / `@else` branches.** A default (no-`select`)
  `<ng-content />` placed in multiple conditional branches projects into only
  ONE slot (the last in static order) — the others render empty. Use a single
  `<ng-content />` and swap the wrapper via computed attributes instead. (Cost
  someone a broken `wr-breadcrumbs-item`.)
- **Container queries can't style their own container.** `@container` only
  styles _descendants_ — put the container-establishing rule (e.g. `flex-wrap`)
  on the `--responsive` modifier itself, and reflow children inside
  `@container`.
- **`container-type: inline-size` collapses width** in shrink-to-fit
  (flex / grid) parents → the element drops to 0 width. Add `width: 100%` under
  the modifier.

## Contracts that look like bugs

Seventeen behaviours that read as defects until you know why they are that way.
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
  unless you ask for one, and inline selection is `[(selected)]` while
  `[(value)]` is meaningful in `overlay` mode only.
- `wr-alert` does not use one live region: danger interrupts
  (`role="alert"` / assertive), warning is assertive without interrupting,
  the rest wait their turn — and all of it goes away on dismiss.
- `<wr-window>`'s `moved` fires while the header is dragged and stays silent
  for `moveTo()` / `center()` / the opening cascade: the caller already knows
  where it put the window. Defensible and now documented, which it was not.
- `wr-tour` skips a step whose target is missing (a tour has to survive a
  feature behind a flag) while the progress line still counts every step it
  was given.
- `wr-pagination` does NOT pull the page DOWN into range while `total` is at or
  below 0, and emits nothing for it — there is no `loading` input, so 0 is
  ambiguous with "still in flight", which is where a server-paged host sits
  between the click and the response. Clamping there pulled every page back to 1
  and emitted a `currentPageChange` the host could not tell from a click. The
  LOWER bound stays unconditional, and that one does write back.
- The date adapter emits single-quoted runs verbatim and treats unquoted
  letters as tokens, the way `DatePipe` and LDML do. `addDays` moves the
  CALENDAR day, not 86 400 000 ms — across a DST change the arithmetic
  version repeats a day and loses one. No test here can hold that: the runner
  inherits the machine's zone, which is `Asia/Almaty` and has no DST, so the
  reason lives in the method and the spec's docblock.
- `wr-calendar-heatmap` leaves four of its seven weekday rows blank on
  purpose — seven labels do not fit.
- Every animation component honours `prefers-reduced-motion`; the one with no
  handling is `wr-spotlight-card`, where a gradient tracks the cursor and no
  content moves. (A first sweep reported eight, on a glob that dropped every
  component without an HTML file. The number was wrong before it was checked.)
- The `if (!i18n)` branch in `useI18nText` is dead code, not a defect: `WrI18n`
  is root-provided, and `no-provider.spec.ts` proves it resolves with nothing
  configured. That optional-inject-that-always-constructs is also what once
  made i18n mandatory in practice — `WR_I18N_LOADER` now defaults to a loader
  serving an empty catalog, so every lookup misses and components fall through
  to their English defaults.
- Escape does NOT depend on focus being inside an overlay:
  `overlayRef.keydownEvents()` is fed by CDK's `OverlayKeyboardDispatcher`,
  which keeps one document listener and routes to the topmost overlay.
- Both shipped catalogs are pinned at **identical key sets** with no
  empty values — empty is the worse case, since it resolves as a real
  translation and reaches the DOM as a nameless control. Nothing had compared
  `wrEn` with `wrRu` before: `useI18nText` reads "translation === key" as
  missing and quietly serves the English default, so a Russian app rendered
  English and no gate said a word. **Parity is not enough**, and a third spec
  covers the rest: it walks `projects/lib`, collects every key passed to
  `useI18nText` / `readI18nText` / `useI18nFormatter`, and requires each to
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

## Verifying changes

`pnpm lint` + `pnpm test` + `pnpm build:lib` + `pnpm build:showcase` are the
real gates — Angular `strictTemplates` type-checks templates, so most wiring
errors surface at build, and `pnpm test` covers the pure-logic layer. `build:showcase` also prerenders every route in Node and **fails on
prerender errors** (`scripts/build-showcase.ts` greps the worker log, because
the Angular builder itself exits 0 on them), so it doubles as the SSR smoke
test. For runtime behavior, run `pnpm dev` and exercise it.

Caveat for headless / backgrounded browser tabs: timers are throttled and WAAPI
animations pause, so screenshots can come back blank and wall-clock-dependent
checks flake. A hidden pane goes further — `innerWidth`/`innerHeight` read 0,
which silently poisons every `getBoundingClientRect` comparison and makes
`document.elementFromPoint` return `null` for everything. Check `innerWidth`
before trusting a layout measurement, and stub `elementFromPoint` when what you
are testing is hit-test logic rather than the compositor. Verify gesture / animation _logic_ by calling component methods
directly (e.g. via `ng.getComponent(el)` / `ng.getDirectives(el)` in dev mode)
rather than relying on timing. Touch _feel_ ultimately needs a real device.

## Where to look first

- **What exists / how to consume it** → [README.md](README.md) (full catalog,
  install, quick start).
- **Direction and priorities** → [ROADMAP.md](ROADMAP.md).
- **A working example of any pattern** → the nearest existing entry point in
  `projects/lib/` and its showcase page. The catalog is large and consistent;
  copy the local idiom.
