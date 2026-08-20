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

Overlays render into an ngwr-owned container; without it they never appear. Needed by `WrDialog`, `WrDrawer`, `WrToast`, `WrPopover`, `WrPopconfirm`, `WrContextMenu`, `WrSelect`, `WrDropdown`, `WrCommandPalette`, `WrCascader`, `WrMention`, `WrDatePicker`, `WrTour`, `WrLightbox`.

### `provideWrIcons(lucideIcons({ … })) // from 'ngwr/icon' + 'ngwr/icon/adapters/lucide'`

Icons resolve by name from a registry you populate. Needed by `WrIcon`.

### `provideWrDateFnsAdapter() // from 'ngwr/date/adapters/fns'`

Every date mode goes through an adapter; there is no built-in default. Needed by `WrDatePicker`, `WrCalendar`, `WrEventCalendar`.

### `provideWrI18n() + provideWrI18nStaticLoader({ en: wrEn }) // from 'ngwr/i18n' + 'ngwr/i18n/en'`

The pipe and directive read from a catalog you provide. Needed by `WrTPipe`, `WrTDirective`, `WrI18n`.

## Optional, app-wide

- `provideWrConfig({ button: { size: 'sm' } })` — component defaults. A bound
  value always wins, including a bound `false` over a configured `true`.
- `provideWrDensity({ defaultDensity: 'sm' })` — one control size for the whole
  app; `'sm' | 'md' | 'lg' | 'touch'`. It scales the paddings of the nine
  stylesheets that read the multipliers — button, input, textarea, select,
  cascader, tree, list, table, badge/tag — so `touch` grows those together. A
  control with fixed geometry (checkbox, switch, radio, slider, rating,
  segmented) does not move; its ≥44px target comes from the `touch-target` mixin
  under `@media (pointer: coarse)` instead.
- `provideWrResponsiveOverlays()` — overlays present as bottom sheets under the
  breakpoint (640px by default). Per-component opt-out with `[responsive]="false"`.
- `provideWrFormErrors({ … })` — one place for validation copy; `<wr-form-field>`
  resolves a message per error key through it, then the i18n catalog, then a
  built-in fallback.
