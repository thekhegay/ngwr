# Setting up ngwr

## Install

```bash
ng add ngwr
```

Prompts for styles, date adapter and density, installs the peers, and prints a
bootstrap snippet tailored to the answers.

## Bootstrap

```ts
import { provideWrOverlay } from 'ngwr/overlay';
import { lucideIcons, provideWrIcons } from 'ngwr/icon';
import { Check, ChevronDown } from 'lucide';

bootstrapApplication(App, {
  providers: [
    provideZonelessChangeDetection(),
    provideWrOverlay(),
    provideWrIcons(lucideIcons({ check: Check, 'chevron-down': ChevronDown })),
  ],
});
```

`provideWrOverlay()` gives ngwr its OWN CDK overlay container, which is what
keeps it from colliding with Material or NG-ZORRO in the same app. It also
installs `WrVisualViewport`, which publishes `--wr-keyboard-inset`.

## Styles

```scss
@use 'ngwr/theme';    // the token layer — first, and the only configurable load
@use 'ngwr/button';   // then one line per component you render
```

There is no `@use 'ngwr'` umbrella: compiling every component stylesheet for a
page that renders a handful was measured at 287 kB against 44 kB. Only a
module's FIRST load can be configured, so the theme line goes above the
components or `@use 'ngwr/theme' with ($base-colors: …)` fails the build.

Resolved through the `sass` condition in the package's `exports` map. Entry
points that ship no stylesheet (the `/testing` harnesses, `ngwr/utils`) have no
`@use` target — importing one fails the build.

## Light and dark

The theme follows `color-scheme`, with no provider and no script: `:root`
declares `color-scheme: light dark`, so a page follows the OS, and every token
that differs between the two is one `light-dark(<light>, <dark>)` value.
`color-scheme: dark` on any element switches that subtree.
`inject(WrTheme).set('dark')` from `ngwr/theme` switches the whole page and
remembers the choice; `'light'` forces the other side and `'auto'` hands it
back to the OS. The service applies a remembered choice, or a non-`auto`
`defaultMode` from `WR_THEME_CONFIG`, when it is first injected. Inject it
once at boot, in the root component, or ship `wrThemePrePaintScript()` in
`<head>` with the same values; otherwise a page whose first screen never
injects it paints the OS scheme. Write your own dark values with `light-dark()` as well —
there is no theme attribute to key a selector on.

## Providers with no default

### `provideWrOverlay() // from 'ngwr/overlay'`

Gives ngwr overlays their own container, so they never collide with other CDK overlays. Needed by `WrDialog`, `WrDrawer`, `WrToast`, `WrPopover`, `WrPopconfirm`, `WrContextMenu`, `WrSelect`, `WrDropdown`, `WrCommandPalette`, `WrCascader`, `WrMention`, `WrDatePicker`, `WrTour`, `WrLightbox`, `WrEditor`.

### `provideWrIcons(lucideIcons({ … })) // from 'ngwr/icon'`

Icons resolve by name from a registry you populate. Needed by `WrIcon`.

### `provideWrDateFnsAdapter() // from 'ngwr/date/adapters/fns'`

Every date mode goes through an adapter; there is no built-in default. Needed by `WrDatePicker`, `WrCalendar`, `WrEventCalendar`.

### `provideWrLoadingBarRouter() // from 'ngwr/loading-bar/router'`

Without it the bar never responds to navigation; it only moves for manual start() / complete(). Needed by `WrLoadingBar`.

### `provideWrI18n() + provideWrI18nBaseCatalogs({ en: wrEn }) + provideWrI18nStaticLoader({ en: { … } }) // from 'ngwr/i18n' + 'ngwr/i18n/en'`

The pipe and directive read from a catalog you provide. Register ngwr's with `provideWrI18nBaseCatalogs`, never spread it into yours: a spread is shallow, so any namespace you share with ngwr, e.g. `common` or `table`, keeps only the side spread last, and the other side's keys stop resolving with nothing logged — ngwr's components fall back to English and a `wrT` read of a lost key renders the raw key. Needed by `WrTPipe`, `WrTDirective`, `WrI18n`.

## Optional, app-wide

- `provideWrDensity({ defaultDensity: 'sm' })` — one control size for the whole
  app; `'sm' | 'md' | 'lg' | 'touch'`. It scales the paddings of the ten
  stylesheets that read the multipliers — button, input, textarea, select,
  cascader, tree, list, table, badge/tag, editor — so `touch` grows those together. A
  control with fixed geometry (checkbox, switch, radio, slider, rating,
  segmented) does not move; its ≥44px target comes from the `touch-target` mixin
  under `@media (pointer: coarse)` instead.
- A `validation` namespace in your own i18n catalog — ngwr ships no validation
  copy. `<wr-form-field>` reads `validation.<key>` for an error whose validator
  carries no `{ message }`, with the error payload as params.
