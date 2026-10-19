# Migration guide

Most majors ship an `ng update` codemod that rewrites your templates,
TypeScript and stylesheets in place. Commit first, run the migration, then
review with `git diff` — a handful of edge cases always need a manual
touch-up. Not every major has one that rewrites: v10's and v11's breaking
changes are purely visual and carry no codemod, as the v10 section below
explains, v13's migration only reports, and v15 ships none — its section lists
every change to make by hand.

```bash
# One command, from whatever major you are on. It installs the latest release,
# then runs every migration newer than the version you had installed, in order.
ng update ngwr
```

**Do not step through the majors.** From 8.x that one command runs every migration from v9 on; from
6.x, every one from v7 on. v10, v11 and v15 ship none, so there is nothing to skip. Sections are
newest-first, and where a major has a codemod its section names it as a step that command runs —
read every section between your version and the latest, because the codemods also REPORT what they
cannot rewrite.

**Never target a 7.x, 8.x or 9.x release** — not with `ng update ngwr@7`, `@8` or `@9`, not with
`ng add`, not with any `ng g ngwr:*`. Every release from 7.0.0 to 9.1.0 ships CommonJS schematics
under a `package.json` that declares `"type": "module"`, so Node loads them as ES modules and the
command dies with `exports is not defined in ES module scope`. 10.0.0 fixed the packaging. The one
command above never loads those files: the migrations it runs, v7, v8 and v9 included, are the ones
shipped inside the release it installs.

The "migrate each major version individually" refusal the Angular CLI prints is for Angular's own
packages — it matches `@angular/*` and `@nguniversal/*` and nothing else — and does not apply to
ngwr.

### If an `ng update ngwr@9` already failed with that error

It had already moved `package.json` and your lockfile to 9.x when the migration step crashed, and
nothing moved them back: the CLI restores `package.json` only when the install itself fails. A later
`ng update ngwr` therefore starts from 9.x and **silently skips the v9 migration** — the
`<wr-checkbox>` rename below, whose leftovers raise no error either. Do not count on reverting the
bump: committing it, which is how most people get past `Repository is not clean`, makes it stick.
Run the skipped step by name instead. It works however `package.json` was left:

```bash
ng update ngwr                                      # skip if the latest is already installed
# Commit that result first: ng update refuses a migration on a dirty tree too.
ng update ngwr --migrate-only --name=migration-v9   # the step the range skipped
```

`--name` runs the migration shipped inside the release you installed, never the 9.x copy that crashed, and
checks no version, so no range can leave it out. It rewrites only `<wr-checkbox>` bindings, which
none of v12, v13 or v14 touches, so running it after them is safe.

A failed `ng update ngwr@7` or `@8` leaves the same hole for that major, and for each later one you
also tried: run each skipped migration the same way, oldest first (`migration-v7`, `migration-v8`).

### If `ng update ngwr` hung on 14.5.0 or earlier

Up to 14.5.0 the v14 migration could hang on an ordinary template, and the only way out was to
kill the command. By then the install had moved `package.json` to 14.x and any earlier migration
in that run had already written its changes, so the project looks upgraded. It is not: **the v14
renames were never applied**, and a later `ng update ngwr` starts from 14.x and skips them. Leftover
`closeable`, `totalItems`, `currentPage` or `wrSize` bindings compile without an error. 14.5.1 fixed
the hang; run the step it skipped by name:

```bash
ng update ngwr                                       # skip if the latest is already installed
# Commit that result first: ng update refuses a migration on a dirty tree too.
ng update ngwr --migrate-only --name=migration-v14   # the step the hang skipped
```

It rewrites the six v14 renames and prints the v14 report again. Running it on templates that are
already migrated changes nothing.

**The full guide lives at [ngwr.dev/start/migration](https://ngwr.dev/start/migration)**, with a
runnable diff per change. This file carries the same breaks in short form, newest first, so the
history is readable without leaving the repository.

---

## v14 to v15

**v15 ships no codemod.** `ng update ngwr` installs it and runs nothing for this step, so every
change below is yours to make. Most of them fail silently — a selector that stops matching, a
`var()` at a token nothing declares — so search for each one rather than waiting for the build.

### Dark mode follows `color-scheme`

The theme switches by the CSS standard now: `:root` declares `color-scheme: light dark`, and every
token that differs between the schemes is one `light-dark(<light>, <dark>)` value. So **the default
follows the OS**, with no JavaScript. A page that is not ready for dark writes
`:root { color-scheme: light; }` in its own stylesheet.

- **`[data-theme]` is gone.** Nothing writes the attribute and no rule reads it, so a
  `[data-theme='dark']` selector of your own matches nothing. Force a scheme with
  `WrTheme.set('light' | 'dark')` — `'auto'` hands it back to the OS — or write `color-scheme`
  yourself: on `<html>` for the page, on any element for its subtree. `WrTheme` in `'auto'` leaves
  a `color-scheme` you wrote on `<html>` alone; `set('light')` or `set('dark')` writes over it.
- **`theme.dark`, `dark-selector()` and `$theme-attribute` are removed**, with no replacement
  helper. Write the dark value in the declaration itself: `color: light-dark(#0f172a, #e6ebf3)`.
  `light-dark()` takes colours only.
- **Every `-rgb` token is removed**, theme and component alike. Replace
  `rgba(var(--wr-color-primary-rgb), 0.12)` with
  `color-mix(in srgb, var(--wr-color-primary) 12%, transparent)`. `--wr-color-backdrop-rgb` becomes
  the colour `--wr-color-backdrop`, `--wr-calendar-accent-rgb` goes in favour of
  `--wr-calendar-accent`, and `--wr-color-picker-rgb` is now `--wr-color-picker-color`, holding a
  whole colour. A leftover read drops its whole declaration, with no error.
- **Three animation components changed a hook or a blend.** `--wr-star-border-stop` is removed:
  the ray's fade is fixed, at 10% then 16% in light and 10% in dark, so override the gradient on
  `.wr-star-border__ray` instead. `<wr-border-glow>`'s `--wr-border-glow-halo-blend`,
  `--wr-border-glow-fill-blend` and `--wr-border-glow-fill-scale` now default to `normal`,
  `normal` and `0.25` in both schemes; set them to `plus-lighter`, `soft-light` and `1` on a dark
  page to restore the old additive look. `[wrTilt]`'s glare blends `normal` in both schemes too,
  where light used `multiply` and dark `overlay`, so a `--wr-tilt-glare-color` of your own now
  paints at face value.
- **`provideWrTheme()` is removed.** `WrTheme` is root-provided, so delete the call. To change the
  storage key or the default mode, provide `WR_THEME_CONFIG` yourself; its `attribute` field is
  gone, and so is `wrThemePrePaintScript()`'s `attribute` option. **The service is now created on
  first `inject()`**, not at boot, and that is when it applies a stored choice or a non-`auto`
  `defaultMode` — so an app whose first screen injects nothing paints the OS scheme. Inject it once
  at boot (in the root component, or `provideEnvironmentInitializer(() => inject(WrTheme))`), or
  ship `wrThemePrePaintScript()` with the same options. The script writes `color-scheme` on
  `<html>` for a stored `light` or `dark` choice, or for a non-`auto` `defaultMode` passed to it,
  and nothing for `auto`.
- **`wrThemeTokens()`, `wrIntentTokens()` and `wrContrastFor()` are removed**, and runtime
  rebranding with them. Rebrand at compile time: `@use 'ngwr/theme' with ($base-colors: (…))`
  moves the light side, and `@include theme.rebrand($colors, $dark)` moves both, its second map
  being the dark seeds.
- **Code that reads a token in TypeScript gets the raw text.** `getPropertyValue('--wr-color-…')`
  returns `light-dark(…)` unresolved; read an element's computed `color` instead, and always do so
  before handing a colour to a canvas, which cannot draw `light-dark()`. `resolveCssColor()` from
  `ngwr/utils` is that read: it takes an element, any colour expression and a fallback.
- **The browser floor is Chrome 123, Firefox 120 and Safari 17.5**, the first releases with
  `light-dark()`. Below them themed colours are lost outright rather than degraded.

### The palette is five intents

`secondary`, `light`, `medium` and `dark` are gone. What replaced the last three is a six-step
neutral gray ramp read through role aliases that name the job — `--wr-color-surface`,
`-on-surface`, `-on-surface-muted`, `-hover`, `-fill`, `-fill-subtle`, `-fill-strong`,
`-placeholder`, and the border family `--wr-border-subtle`, `-base`, `-strong`. Rename these:

| v14                                             | v15                           |
| ----------------------------------------------- | ----------------------------- |
| `--wr-color-light`, `--wr-color-outline`        | `--wr-border-base`            |
| `--wr-color-border`, `--wr-color-border-strong` | `--wr-border-strong`          |
| `--wr-color-border-subtle`                      | `--wr-border-subtle`          |
| `--wr-color-dark`                               | `--wr-color-on-surface`       |
| `--wr-color-medium`, `--wr-color-muted-text`    | `--wr-color-on-surface-muted` |

Their `-rgb` companions have no successor (see `color-mix` above), and neither do the shades and
tints of a removed intent. A `color` naming a removed intent is a compile error under
`strictTemplates` and renders neutral without it; which intent it should become, if any, is your
call — `<wr-btn color="dark">` and `<wr-btn>` are different buttons. A `.wr-*--secondary` (or
`--light`, `--medium`, `--dark`) selector stops matching, and a `$base-colors` map still carrying
one of the four keys stops the Sass build.

Two values named after a removed intent moved to the name of what they paint, BEM class included:
`[wrTypography]`'s `tone="dark"` is `tone="base"` and `tone="medium"` is `tone="muted"`
(`.wr-typography--tone-base`, `--tone-muted`), and `<wr-timeline-item color="medium">` is
`color="neutral"` (`.wr-timeline-item--neutral`).

### Charts and bits moved, and the Sass umbrella is gone

- **The seven charts and the 21 animation components moved under two folders.** Each import
  path changes from `ngwr/<name>` to `ngwr/charts/<name>` (bar-chart, calendar-heatmap,
  donut-chart, gauge, line-chart, meter-group, sparkline) or `ngwr/bits/<name>` (aurora,
  blur-text, border-glow, circular-text, click-spark, confetti, decrypt-text, falling-text,
  fuzzy-text, glitch-text, gradient-text, marquee, rotating-text, shiny-text, splash-cursor,
  split-text, spotlight-card, star-border, tilt-card, typewriter, waves). The `@use` path and
  the `/testing` harness path move the same way, and every symbol keeps its name.
- **`@use 'ngwr'` no longer resolves.** Write `@use 'ngwr/theme'` first, then one `@use` per
  entry point you render, for example `@use 'ngwr/button';`. The page for each component shows
  its own two lines under Installation.

### The sortable list

It moved to an entry point of its own: `ngwr/drag-drop` is `ngwr/sortable-list`, in imports and
in the `@use`, every symbol keeping its name. It no longer owns its loop — write your own and
project one `<wr-sortable-item>` per row; `trackBy` went with the loop.

### The icon adapters are gone

`ngwr/icon/adapters/lucide` and `ngwr/icon/adapters/feather` are removed. `lucideIcons()`,
`lucide()` and the `LucideIconNode` type moved into `ngwr/icon` under the same names, so for
Lucide the import path is the whole change. Feather has no helper any more: register its own SVG
files with `svgIcon()`, the way every other set is registered.

```diff
- import { lucideIcons } from 'ngwr/icon/adapters/lucide';
+ import { lucideIcons } from 'ngwr/icon';

- import featherSource from 'feather-icons/dist/icons.json';
- import { featherIcons } from 'ngwr/icon/adapters/feather';
- provideWrIcons(featherIcons({ plus: featherSource.plus }));
+ import plusSvg from 'feather-icons/dist/icons/plus.svg?raw';
+ import { svgIcon } from 'ngwr/icon';
+ provideWrIcons([svgIcon('plus', plusSvg)]);
```

In an Angular CLI app `?raw` needs `"loader": { ".svg": "text" }` in the build options and a
`declare module '*.svg?raw' { const svg: string; export default svg; }`. Or skip the build
option: import the file as
`import plusSvg from 'feather-icons/dist/icons/plus.svg' with { loader: 'text' };` and declare
`'*.svg'` instead.

A Feather glyph no longer carries `wr-icon__svg`: its files bring their own
`feather feather-<name>` classes. Inside `<wr-icon>` it renders the same, so only a stylesheet of
yours that reached the glyph through that class needs `.wr-icon svg` instead.

### Removed outright

`ngwr/squircle`, which v14 deprecated: use `shape="squircle"` on `<wr-btn>` / `<wr-avatar>` /
`<wr-badge>`, or the `smooth-br` mixin from `@use 'ngwr/theme'`. They are not equivalent — the
native `corner-shape` falls back to a plain rounded corner where a browser has not shipped it, and
takes no radius or border inputs. `<wr-action-sheet>`, with its test harness: ngwr is not a mobile
library, and the sheet was a preset over `<wr-drawer position="bottom" rounded>`, which is what to
write instead. And `<wr-drawer showHandle>`, the grab handle and the swipe-to-dismiss it gated, for
the same reason — the drawer still closes on the backdrop, on Escape and through its own dismiss
button, so deleting the attribute is usually the whole migration.

A leftover import or `@use` fails the build and a bound `[showHandle]` is a compile error, but a
bare `wrSquircle` attribute, a `<wr-action-sheet>` without `strictTemplates` and a
`.wr-drawer__handle` selector are all silent.

### ngwr ships no validation copy

`provideWrFormErrors()`, `WR_FORM_ERRORS`, `WR_FORM_ERROR_FALLBACKS` and the
`WrFormErrorContext`, `WrFormErrorMessage` and `WrFormErrorMessages` types are removed, and
ngwr's catalogs no longer carry a `validation` namespace. For an error no
`<wr-form-error key>` claims, `<wr-form-field>` shows, in order:

1. the validator's own message — `required(path.email, { message: 'Enter your email.' })`, or a
   `message` string on a custom validator's error object;
2. `validation.<key>` from **your** i18n catalog, with the error payload as params
   (`'Minimum length is {{requiredLength}}.'`);
3. nothing. Dev mode logs one warning per field and key naming the three ways to supply copy:
   `{ message }` on the validator, `validation.<key>` in your catalog, or
   `<wr-form-error key="…">`.

A projected `<wr-form-error key>` still claims its key on that field. A field that leaned on
ngwr's sentences is still marked invalid and shows no message, and a production build says
nothing — so search for every `<wr-form-field>` without a `<wr-form-error>` and give each of its
errors a source. A `provideWrFormErrors()` map becomes a `validation` namespace in each locale
your loader serves; a function message becomes a template over the payload, and one that read the
field's `label` moves onto that field's validator as `{ message }`.

The date picker's refusals have no English default either: `<wr-date-picker>` and
`<wr-date-range-picker>` word a refused entry from `validation.dateFormat`, `minDate`, `maxDate`
and `dateFilter` in your catalog, with the example date as the `example` param. Without those keys
a refusal still shows as a danger border and `aria-invalid`, with no sentence.

### No app-wide component defaults

`ngwr/config` is removed, with `provideWrConfig()`, `WR_CONFIG`, `useConfigValue()` and the
`WrConfig` types. A component's default is the one written on its input, and nothing app-wide
changes it: bind the input wherever you want another value, or wrap the component in one of your
own.

```diff
- import { provideWrConfig } from 'ngwr/config';
- provideWrConfig({ button: { size: 'sm' }, select: { rounded: true }, editor: { format: 'markdown' } }),
+ <wr-btn size="sm">Save</wr-btn>
+ <wr-select rounded>…</wr-select>
+ <wr-editor format="markdown" [(value)]="notes" />
```

The import fails the build. Deleting the call is what is silent: every control it reached goes
back to its own default — `md`, the standard radius, HTML for `<wr-editor>`, no copy button or link
target on `<wr-markdown>` — so bind each key the call set before you remove it.

### No breakpoint service

`ngwr/media` is removed, with `WrMedia`, `provideWrMedia()`, `WR_BREAKPOINTS`,
`DEFAULT_WR_BREAKPOINTS` and the `WrBreakpoint` / `WrBreakpointMap` types. For a breakpoint
signal, use the CDK's `BreakpointObserver` from `@angular/cdk/layout`, a peer ngwr already
requires. The SCSS mixins in `@use 'ngwr/breakpoints'` are unchanged.

```diff
- import { WrMedia } from 'ngwr/media';
- protected readonly isMd = inject(WrMedia).matches('md');
+ import { BreakpointObserver } from '@angular/cdk/layout';
+ import { toSignal } from '@angular/core/rxjs-interop';
+ import { map } from 'rxjs';
+ protected readonly isMd = toSignal(inject(BreakpointObserver).observe('(min-width: 768px)').pipe(map(s => s.matches)), { initialValue: false });
```

A named key has to become its width: `md` is `(min-width: 768px)`, and the rest of the map is the
`$breakpoints` list in `ngwr/breakpoints`. A query string `matches()` accepted passes to
`observe()` unchanged. Both answer `false` on the server, so a template that branched on one
prerenders the same arm it did. `current()` has no equivalent: observe the widths you branch on
and pick the largest that matches.

### No responsive bottom sheets

`provideWrResponsiveOverlays()`, `WR_RESPONSIVE_OVERLAYS`, `wrPresentAsSheet` and the
`WrResponsiveOverlaysConfig` type are removed from `ngwr/overlay`, and so is its stylesheet, which
held only the sheet. The `responsive` input on `<wr-select>`, `[wrDropdown]`, `[wrPopover]` and
`<wr-command-palette>` goes with them, as do the `responsive` option of `WrDialog.open()`,
`WrPopoverHarness.isSheet()` and `WrCommandPaletteHarness.isPresentedAsSheet()`
(`WrDrawerHarness.isSheet()` stays). Overlays always float now: on a phone a select, dropdown or
popover stays anchored to its trigger, and a dialog or command palette stays a centred modal. An
app that wants a sheet there opens a `<wr-drawer position="bottom">` itself.

```diff
- import { provideWrOverlay, provideWrResponsiveOverlays } from 'ngwr/overlay';
- provideWrResponsiveOverlays({ breakpoint: 768 }),
+ import { provideWrOverlay } from 'ngwr/overlay';
- @use 'ngwr/overlay';
- <wr-select responsive [(value)]="size">…</wr-select>
+ <wr-select [(value)]="size">…</wr-select>
- this.dialog.open(EditProfile, { responsive: true });
+ this.dialog.open(EditProfile);
+ <wr-drawer position="bottom" rounded [(open)]="filtersOpen">…</wr-drawer>
```

The import, the `@use` and the harness calls fail the build, and so do a bound `[responsive]` and
an inline `{ responsive: true }`. A bare `responsive` attribute is inert, and a rule on
`.wr-overlay-sheet`, `.wr-overlay-backdrop` or `.wr-command-palette--sheet` matches nothing, so
search for both.

### No date-fns or Luxon adapter

`ngwr/date/adapters/fns` and `ngwr/date/adapters/luxon` are removed, with `WrDateFnsAdapter`,
`provideWrDateFnsAdapter()`, `WR_DATE_FNS_LOCALE`, `WrLuxonAdapter` and `provideWrLuxonAdapter()`,
and `date-fns` and `luxon` are no longer optional peers. `ngwr/date` is unchanged:
`provideWrDateAdapter()` without an `adapter` gives the native one, over `Date` and `Intl`. To stay
on another date library, extend `WrDateAdapter<Date>` (the components hold and compare native `Date`
values), do the arithmetic, formatting and parsing through that library, and pass the class as
`adapter`.

```diff
- import { provideWrDateFnsAdapter } from 'ngwr/date/adapters/fns';
- provideWrDateFnsAdapter({ dateFnsLocale: ru }),
- import { provideWrLuxonAdapter } from 'ngwr/date/adapters/luxon';
- provideWrLuxonAdapter({ locale: 'ru' }),
+ import { provideWrDateAdapter } from 'ngwr/date';
+ provideWrDateAdapter({ locale: 'ru' }),
+ provideWrDateAdapter({ adapter: AppDateAdapter }), // class AppDateAdapter extends WrDateAdapter<Date>
```

An adapter of your own implements what `WrDateAdapter` declares abstract: `today`, `clone`,
`createDate`, `isValid`, the getters from `getYear` to `getSeconds`, `addYears`, `addMonths`,
`addDays`, `setTime`, `isSameDay`, `isSameMonth`, `compareDate`, `format`, `parse`,
`getFirstDayOfWeek`, `getDayOfWeekNames` and `getMonthNames`. Months are 0-based, as on `Date`,
and `parse` has to read back whatever `format` printed for the same key; returning `null` refuses
the input and leaves the committed value alone.

The imports fail the build. A token format written for date-fns does not: that adapter handed a
`[format]` pattern to date-fns untouched, while the native one reads
`yyyy yy MMMM MMM MM M dd d HH H hh h mm ss a` and prints anything else verbatim, so `EEEE` or
`PPP` reach the field as letters, and `do` as `15o`. A named format (`shortDate`, `time`, …) prints
through `Intl` now, so its exact string can change as well. The Luxon adapter translated the native
tokens but handed every other letter to Luxon, so a Luxon-only token (`EEEE`, `ccc`, `DDD`) now
prints verbatim too, and `MMMM` beside a day token is declined where Luxon printed the standalone
form.

---

## v13 to v14

The largest release so far. Six renames, all rewritten by the v14 migration — `wr-alert`'s
`closeable` to `closable`, `wr-table`'s `totalItems` to `total`, `wr-pagination`'s `currentPage`
to `page` (and `currentPageChange` to `pageChange`), `isDisabledWhenLoading` to
`disabledWhenLoading`, `wr-window`'s `chromeSize` from `compact`/`normal` to `sm`/`md`, and
`[wrInput]`'s `wrSize` to plain `size`. That last one was announced by v13's release notes and
never made; it lands here.

**Three changes fail silently, and they are the reason to read rather than skim.** `wr-loading-bar`
no longer follows the router by itself — add `provideWrLoadingBarRouter()` from
`ngwr/loading-bar/router`, or the bar simply never moves. A translated `pagination.of` stops being
read, because the range is one `pagination.range` template now, so a catalog keeping the old key
reverts that line to English. And a named date format (`shortDate`, `time`, …) now refuses input it
cannot parse instead of committing whatever `new Date()` made of it — a German field printing
`15.3.2026` used to read its own output back as 1 January 2001.

`<wr-pagination ofLabel>` is gone with the catalog key — the whole range is one template, rather
than a word translated in the middle of an order many languages do not use. Router tabs need
`wrTabsRouting` on the strip and `WrTabsRouting` in `imports`; that one throws, so the build finds
it. Locale for dates and catalogs now resolves from Angular's `LOCALE_ID` rather
than the browser. The codemod reports every one of these by file.

---

## v12 to v13

`[id]` on `wr-checkbox`, `wr-radio` and `wr-switch` no longer lands on the host element, so
`document.getElementById` returns the inner `<input>` — the association the input always
documented. A CSS or E2E selector written as `wr-checkbox#agree` stops matching; `#agree` alone
still works. The v13 migration, a step of `ng update ngwr`, lists every file holding such a
selector and rewrites none of them: which of the two elements a selector meant is not derivable
from the source.

---

## v11 to v12

Two breaking changes needing opposite treatment. The three date entry points moved —
`ngwr/date-adapter` to `ngwr/date`, and the two adapters under `ngwr/date/adapters/*` (v15 later
removed both) — which is pure import paths, so the v12 migration, a step of `ng update ngwr`, rewrites all of it. And `readI18nText()` returns
`Signal<string>` instead of `string`, so every call site needs a `()`. That one is deliberately not
codemodded: adding parentheses means knowing which identifiers hold the result, and a wrong guess
is a silent behaviour change, whereas the type error names every site for you.

---

## v10 to v11

Five intents deepened so their labels can be white — `secondary`, `success`, `danger`, `info` and
`medium`. Painted colour, like v10, so there is no codemod for the same reason: an empty one would
tell you your regressions were handled when they were not. Check the pages, not the logs.

---

## v9 to v10

Three breaking changes, all of them visual defaults. **There is no v10
migration**, so `ng update ngwr` runs nothing for this step — and that is deliberate: nothing here can be rewritten
mechanically, and an empty codemod would tell you your regressions were handled
when they were not. Nothing errors at build time either, so the way to check
this upgrade is to look at the pages, not the logs.

### `--wr-color-*-contrast` picks foreground by WCAG ratio

Five of the nine intents flip from white to dark text: `secondary`, `success`,
`danger`, `info` and `medium`. All five failed WCAG AA before; all nine pass
now, in both themes. If a design system depended on the old pairing, override
`$contrast-dark` / `$contrast-light` or the base colours.

### Table headers no longer force uppercase

`--wr-table-head-transform` defaulted to `uppercase`, which rewrote every column
title's casing; it now defaults to `none`, and the tracking moves with it. Your
headers will render exactly as you wrote them — check for titles like
`created at` that the transform used to mask. To keep the old look:

```scss
.wr-table {
  --wr-table-head-transform: uppercase;
  --wr-table-head-letter-spacing: 0.04em;
}
```

### Tooltips follow the theme instead of inverting

A tooltip used to be a light chip on a dark canvas and vice versa. It now uses
`--wr-color-surface` / `--wr-color-on-surface` with the standard outline. To
restore the inverted look:

```scss
.wr-tooltip {
  --wr-tooltip-bg: var(--wr-color-on-surface);
  --wr-tooltip-color: var(--wr-color-dark-contrast);
  --wr-tooltip-border: transparent;
}
```

---

## v8 to v9

Three breaking changes. One is auto-fixed; the other two need a manual
pass, and both fail **silently** — no template error, no build error, the
behaviour just changes.

### `<wr-checkbox>` — `value` → `checkboxValue`

`WrCheckbox` is now a Signal Forms-native `FormCheckboxControl`, and that
contract reserves `value` for the form value. So the checkbox's own state
is the boolean `checked` model, and group membership moved to a separate
input:

| v8                      | v9                                      |
| ----------------------- | --------------------------------------- |
| `value="autosave"`      | `checkboxValue="autosave"`              |
| `[value]` / `[(value)]` | `[checkboxValue]` / `[(checkboxValue)]` |
| the checked state       | the `checked` model (`[(checked)]`)     |

```diff
  <wr-checkbox-group [formField]="form.features">
-   <wr-checkbox value="autosave">Autosave</wr-checkbox>
-   <wr-checkbox value="notifications">Notifications</wr-checkbox>
+   <wr-checkbox checkboxValue="autosave">Autosave</wr-checkbox>
+   <wr-checkbox checkboxValue="notifications">Notifications</wr-checkbox>
  </wr-checkbox-group>
```

**This one fails silently.** A leftover `value="autosave"` raises no
template error — it lands on the host as a plain DOM attribute, so every
checkbox in the group keeps the default identity (`null`) and they all
toggle together. The v9 migration, a step of `ng update ngwr`, rewrites `value=`, `[value]=` and
`[(value)]=` scoped to the `<wr-checkbox` open tag, in both `.html` files
and inline `.ts` templates.

### Lucide icon names are registered verbatim

`lucideIcons()` used to kebab-case its keys; it now registers them exactly
as written, matching the singular `lucide()` helper and every other
adapter. Quote multi-word keys:

```diff
- provideWrIcons(lucideIcons({ chevronDown: ChevronDown }))
+ provideWrIcons(lucideIcons({ 'chevron-down': ChevronDown }))
```

**No codemod** — the key is yours to name, and we can't know which spelling
your templates use. Also silent: `<wr-icon name="chevron-down">` simply
stops rendering.

### `info` added to `WR_COLORS` / `WrColor`

The palette always had an `info` role; the type now matches it. Ordinary
usage is unaffected — only exhaustive `switch`es over `WrColor` and
`Record<WrColor, …>` maps need the new key. No codemod.

---

## v7 to v8

Three breaking changes. The v8 migration, a step of `ng update ngwr`, auto-fixes density and
pagination, and warns — with file paths — about the two removed
components, which have no automatic replacement.

### Density values renamed

| v7              | v8                         |
| --------------- | -------------------------- |
| `'compact'`     | `'sm'`                     |
| `'default'`     | `'md'` — still the default |
| `'comfortable'` | `'lg'`                     |
| `'touch'`       | unchanged                  |

Affects `provideWrDensity({ defaultDensity })`, the `wrDensity` directive
and the `[data-wr-density]` selector:

```diff
- provideWrDensity({ defaultDensity: 'comfortable' })
+ provideWrDensity({ defaultDensity: 'lg' })

- <aside wrDensity="compact">…</aside>
+ <aside wrDensity="sm">…</aside>

- [data-wr-density='comfortable'] { … }
+ [data-wr-density='lg'] { … }
```

### Pagination sizes trimmed

`WrPaginationSize` drops `xs` and `xl` — it is now `'sm' | 'md' | 'lg'`.
The codemod rewrites `size="xs"` to `"sm"` and `size="xl"` to `"lg"`, scoped
to `<wr-pagination>` so a `size` on any other element is untouched.

### Removed components

`WrReveal` (the `wrReveal` directive in `ngwr/directives`) and
`WrScrambleText` (`ngwr/scramble-text`) were removed — both were
unreliable. There is no drop-in replacement; the codemod lists every file
that uses them so you can swap them out by hand.

```diff
- <div wrReveal [threshold]="0.5">…</div>
+ <div>…</div>

- <wr-scramble-text>Hover me</wr-scramble-text>
+ <wr-decrypt-text text="Hover me" />
```

---

## v6 to v7

v7 aligned the library with the current
[Angular style guide](https://angular.dev/style-guide) and
[Google TypeScript style guide](https://google.github.io/styleguide/tsguide.html).
The visible change is the **drop of class- and file-name suffixes**
(`*Component`, `*Directive`, `*Pipe`, `*Service`); alongside it, a batch of
single-purpose entry points was folded into shared components.

The v7 migration, the first step `ng update ngwr` runs from 6.x, handles the class renames, the entry-point rewrites and
the SCSS `@use` paths — ≥ 95 % of the work.

### Class names

| v6                                                                           | v7              |
| ---------------------------------------------------------------------------- | --------------- |
| `WrButtonComponent`                                                          | `WrButton`      |
| `WrButtonGroupComponent`                                                     | `WrButtonGroup` |
| `WrCheckboxComponent`                                                        | `WrCheckbox`    |
| `WrToastService`                                                             | `WrToast`       |
| `WrThemeService`                                                             | `WrTheme`       |
| `WrTypographyDirective`                                                      | `WrTypography`  |
| `WrBytesPipe`                                                                | `WrBytes`       |
| _… every other component / directive / pipe / service follows the same rule_ |                 |

### File names

| v6                      | v7            |
| ----------------------- | ------------- |
| `button.component.ts`   | `button.ts`   |
| `button.component.html` | `button.html` |
| `button.component.scss` | `button.scss` |
| `toast.service.ts`      | `toast.ts`    |
| `tooltip.directive.ts`  | `tooltip.ts`  |

Tests stay on `.spec.ts`.

### Selectors

Mostly unchanged — `<wr-btn>`, `[wrSquircle]`, `[wrTypography]` and
`wrBytes` (pipe) all behave exactly as in v6. The exception is the
tooltip: `ngwr/tooltip` and its `[wrTooltip]` directive were folded into
`ngwr/popover`, which covers the same job in `mode="tooltip"`.

```diff
- <button wr-btn wrTooltip="Save changes">Save</button>
+ <button wr-btn [wrPopover]="'Save changes'" mode="tooltip">Save</button>
```

The other consolidations follow the same shape, and the codemod rewrites
all of them: `wr-autocomplete` / `wr-chips-input` → `wr-select` (with
`mode`), `wr-time-picker` / `wr-date-time-picker` → `wr-date-picker`,
`wr-tree-select` → `wr-tree openOn="overlay"`, `wr-bottom-sheet` →
`wr-drawer position="bottom"`, `ngwr/count-up` / `ngwr/count-up-text` →
`ngwr/counter` (the `<wr-count-up>` tag is unchanged), `ngwr/tag` →
`ngwr/badge`, `ngwr/form-field` → `ngwr/form`, `wr-image` →
`wr-lightbox`, and `wr-animated-text` → `wr-typewriter` /
`wr-decrypt-text` / `wr-split-text` (per mode).

### Collision map

A handful of packages had two classes that would collapse to the same
bare name. The consumer-facing class keeps the bare name; the other gets
a descriptive label:

| v6                       | v7                   | Reason                                     |
| ------------------------ | -------------------- | ------------------------------------------ |
| `WrPopconfirmComponent`  | `WrPopconfirmPanel`  | `WrPopconfirmDirective` → `WrPopconfirm`   |
| `WrToastComponent`       | `WrToastItem`        | `WrToastService` → `WrToast`               |
| `WrContextMenuComponent` | `WrContextMenuPanel` | `WrContextMenuDirective` → `WrContextMenu` |
| `WrSquircleComponent`    | `WrSquircleHost`     | `WrSquircleDirective` → `WrSquircle`       |
| `WrMetaDirective`        | `WrMetaBinding`      | `WrMetaService` → `WrMeta`                 |
| `WrHotkeyDirective`      | `WrHotkeyBinding`    | `WrHotkeyService` → `WrHotkey`             |

### Type renames

These were data types that collided with a class once the suffix dropped:

| v6 type       | v7 type            | Class that took the old name |
| ------------- | ------------------ | ---------------------------- |
| `WrIcon`      | `WrIconDef`        | `WrIcon` (component)         |
| `WrTableSort` | `WrTableSortState` | `WrTableSort` (directive)    |

Usage sites in your code (`provideWrIcons([{ … } satisfies WrIconDef])`,
`signal<readonly WrTableSortState[]>([])`) are automatically rewritten by
the codemod.

### Manual review checklist

After `ng update ngwr` has run the v7 migration, sanity-check:

- [ ] **Imports compile**: `tsc --noEmit` (or `ng build`) has no `cannot
find name 'WrXxxComponent'` errors.
- [ ] **Re-export aliases**: if you re-export a v6 class under its old
      name (`export { WrButtonComponent as MyButton }`), update to the
      v7 class.
- [ ] **String references**: code that builds class lookup strings (rare)
      isn't touched by the codemod — search for the literal string
      `"WrButtonComponent"` etc.
- [ ] **`exportAs` references**: template refs like `#menu="wrDropdownMenu"`
      still work, but anything pointing at a consolidated entry point (the
      tooltip, autocomplete, chips-input, …) needs the replacement's name.

### Why we made the change

The previous Angular style guide explicitly recommended the suffixes;
the current one ([angular.dev/style-guide](https://angular.dev/style-guide))
drops them. Angular Material already shipped this pattern (`MatButton`,
not `MatButtonComponent`). v7 brought ngwr in line with the framework's
canonical style.

If you have v6 code that you can't immediately migrate, pin to
`ngwr@^6.1.1` — it stays installable.
