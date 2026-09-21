# Setting up ngwr

## Install

```bash
ng add ngwr
```

Prompts for styles, date adapter, density and theme, installs the peers, and
prints a bootstrap snippet tailored to the answers.

## Bootstrap

```ts
import { provideWrTheme } from 'ngwr/theme';
import { provideWrOverlay } from 'ngwr/overlay';
import { provideWrIcons } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';

bootstrapApplication(App, {
  providers: [
    provideZonelessChangeDetection(),
    provideWrTheme(),
    provideWrOverlay(),
    provideWrIcons(lucideIcons({ check, chevronDown })),
  ],
});
```

`provideWrOverlay()` gives ngwr its OWN CDK overlay container, which is what
keeps it from colliding with Material or NG-ZORRO in the same app. It also
installs `WrVisualViewport`, which publishes `--wr-keyboard-inset`.

## Styles

```scss
@use 'ngwr';          // everything
@use 'ngwr/button';   // or one entry point at a time
```

Resolved through the `sass` condition in the package's `exports` map. Entry
points that ship no stylesheet (the `/testing` harnesses, `ngwr/utils`) have no
`@use` target — importing one fails the build.

## Providers with no default

### `provideWrOverlay() // from 'ngwr/overlay'`

Gives ngwr overlays their own container, so they never collide with other CDK overlays. Needed by `WrDialog`, `WrDrawer`, `WrToast`, `WrPopover`, `WrPopconfirm`, `WrContextMenu`, `WrSelect`, `WrDropdown`, `WrCommandPalette`, `WrCascader`, `WrMention`, `WrDatePicker`, `WrTour`, `WrLightbox`, `WrEditor`.

### `provideWrIcons(lucideIcons({ … })) // from 'ngwr/icon' + 'ngwr/icon/adapters/lucide'`

Icons resolve by name from a registry you populate. Needed by `WrIcon`.

### `provideWrDateFnsAdapter() // from 'ngwr/date/adapters/fns'`

Every date mode goes through an adapter; there is no built-in default. Needed by `WrDatePicker`, `WrCalendar`, `WrEventCalendar`.

### `provideWrLoadingBarRouter() // from 'ngwr/loading-bar/router'`

Without it the bar never responds to navigation; it only moves for manual start() / complete(). Needed by `WrLoadingBar`.

### `provideWrI18n() + provideWrI18nBaseCatalogs({ en: wrEn }) + provideWrI18nStaticLoader({ en: { … } }) // from 'ngwr/i18n' + 'ngwr/i18n/en'`

The pipe and directive read from a catalog you provide. Register ngwr's with `provideWrI18nBaseCatalogs`, never spread it into yours: a spread is shallow, so any namespace you share with ngwr, e.g. `common`, `validation`, `table`, keeps only the side spread last, and the other side's keys stop resolving with nothing logged — ngwr's components fall back to English and a `wrT` read of a lost key renders the raw key. Needed by `WrTPipe`, `WrTDirective`, `WrI18n`.

## Optional, app-wide

- `provideWrConfig({ button: { size: 'sm' } })` — component defaults. A bound
  value always wins, including a bound `false` over a configured `true`.
- `provideWrDensity({ defaultDensity: 'sm' })` — one control size for the whole
  app; `'sm' | 'md' | 'lg' | 'touch'`. It scales the paddings of the ten
  stylesheets that read the multipliers — button, input, textarea, select,
  cascader, tree, list, table, badge/tag, editor — so `touch` grows those together. A
  control with fixed geometry (checkbox, switch, radio, slider, rating,
  segmented) does not move; its ≥44px target comes from the `touch-target` mixin
  under `@media (pointer: coarse)` instead.
- `provideWrResponsiveOverlays()` — overlays present as bottom sheets under the
  breakpoint (640px by default). Per-component opt-out with `[responsive]="false"`.
- `provideWrFormErrors({ … })` — one place for validation copy; `<wr-form-field>`
  resolves a message per error key through it, then the i18n catalog, then a
  built-in fallback.
