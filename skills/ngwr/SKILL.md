---
name: ngwr
description: Build Angular UIs with the ngwr component library (standalone, signals-first, zoneless). Use when adding, styling or debugging ngwr components — `wr-*` selectors, `ngwr/*` imports, `provideWr()` and its `with*()` features, `--wr-*` CSS custom properties — or when picking a component for an Angular app that already depends on ngwr.
---

# ngwr

An Angular 22 UI library: 238 tree-shakable entry points, 121 of them shipping a selector.
Standalone, signals-first, zoneless, `ViewEncapsulation.None`. No runtime
dependencies.

## Get the facts, do not guess

Four sources ship in the package or on the docs site, in the order worth
reaching for:

1. `references/catalog.md` in this skill — every entry point, its import line
   and its selector(s).
2. `node_modules/ngwr/llms-full.txt` — the same catalog plus every public
   export per entry point.
3. Any docs page as markdown: append `.md` to the URL, e.g.
   `https://ngwr.dev/reference/components/select.md`.
4. `npx -y -p ngwr ngwr-mcp` — the bundled MCP server, when the agent speaks
   MCP: `search_ngwr`, `get_ngwr_component`, `get_ngwr_api`, `get_ngwr_setup`.

Exact input / output signatures are in the shipped `.d.ts` files. Do not invent
an input name; read one.

## The rules that are not guessable

These are the ones that compile and then behave wrong, or that a reasonable
guess gets backwards.

- **Import from the entry point, never a barrel.**
  `import { WrSelect } from 'ngwr/select'` — the root `ngwr` exports only
  `provideWr()`, and the subpath is what makes the library tree-shakable.
  Charts and bits are nested: `ngwr/charts/<name>` (`ngwr/charts/bar-chart`)
  and `ngwr/bits/<name>` (`ngwr/bits/aurora`).
- **App-wide configuration is ONE call.**
  `provideWr(withDensity(), withToast({ … }), withTheme(), withDates(), withStorage(), withMeta())`,
  with `provideWr` from `ngwr` and each feature from the entry point it
  configures (`withDensity` from `ngwr/density`, and so on). Every feature is
  optional. There is no `provideWrDensity()`, `provideWrToastConfig()`,
  `provideWrConfig()`, `provideWrOverlay()` or `provideWrDateAdapter()`:
  overlays and dates need no provider, and a `size` or `rounded` default is
  bound on the input.
- **Code written for v14 or older: run `ng update ngwr`.** It runs
  `migration-v15`, which rewrites the paths, the provider calls, the `-rgb`
  reads and the renamed token reads, and lists by file and line what needs a
  decision. https://ngwr.dev/docs/migration lists every change.
- **The selector is not always the entry point name.** The button is
  `wr-btn`, not `wr-button`. Check `references/catalog.md` before writing a tag.
- **Check for a MODE before reaching for another component.** The catalog is
  deliberately consolidated: `wr-select` covers single / multi / search / tag,
  `wr-date-picker` covers date / time / datetime, `wr-popover` has a tooltip
  mode, `wr-drawer` doubles as a bottom sheet (and, with `hasBackdrop` off,
  a non-modal side panel), `wr-table` owns pinning,
  resizing, grouping, tree rows, CSV export and virtual scroll.
- **There is no `ControlValueAccessor`.** Value components implement Signal
  Forms' `FormValueControl` / `FormCheckboxControl`. Bind
  `[formField]="form.x"`, or use the two-way model standalone —
  `[(value)]`, `[(checked)]`. `[(ngModel)]` and reactive forms still bind,
  with no accessor created: Angular's `NgModel` / `FormControlDirective` drive
  the `value` or `checked` model directly. That bridge does NOT apply template
  validator directives — `required`, `minlength`, `maxlength`, `pattern` or
  `email` on an ngwr control is silently ignored and the form submits — so put
  validators on the `FormControl`. It also ignores `updateOn`, and a
  `{ emitEvent: false }` write needs `markForCheck()`.
- **ngwr ships no validation copy.** For an error no `<wr-form-error key>`
  claims, `<wr-form-field>` shows the validator's own message
  (`required(path.email, { message: '…' })`), else `validation.<key>` from the
  APP's i18n catalog. With neither, nothing renders and only dev mode warns.
- **`<wr-checkbox>` group identity is `checkboxValue`, not `value`.**
  `value` is reserved for the form value, so a leftover `value="x"` lands on the
  host as a plain DOM attribute, every box in the group keeps the default
  identity `null`, and they all toggle together. No template error.
- **Styles are opt-in, global, and per entry point.** `@use 'ngwr/theme'` first,
  then `@use 'ngwr/<name>'` for each component a template renders. There is no
  `@use 'ngwr'`. Two kinds of sheet need a line though no template names them, and
  nothing warns without them: `ngwr/density` with `withDensity()` or
  `[wrDensity]` (density silently does nothing), and the sheet of a component
  a service opens — `ngwr/dialog` for `WrDialog`, `ngwr/toast` for
  `WrToast`, `ngwr/drawer` for `WrDrawerManager`, `ngwr/window` for
  `WrWindowManager`, `ngwr/tour` for `WrTour` (the panel renders unstyled).
  Components are `ViewEncapsulation.None`;
  their `.wr-*` BEM classes and `--wr-*` custom properties are PUBLIC API, so
  style against them rather than reaching into the DOM structure.
- **Five intents, and no neutral one.** An intent `color` (`WrColor`) is
  `primary`, `success`, `warning`, `danger` or `info`. There is no
  `secondary`, `light`, `medium` or `dark`: without `strictTemplates` a
  removed value renders neutral, and a `var(--wr-color-medium)` drops its
  whole declaration, both with no error.
  Neutrals are role tokens: `--wr-color-surface`, `--wr-color-on-surface`,
  `--wr-color-on-surface-muted`, `--wr-border-base`.
- **Theme through tokens, not overrides.** `--wr-color-{intent}` and its
  `-contrast` / `-ink` / `-soft` companions. `-contrast` is the label ON a
  filled intent; `-ink` is the intent used AS text. Using the bare intent as
  text fails WCAG AA on the soft tint in both themes.
- **Dark mode is `color-scheme` plus `light-dark()`.** There is no
  `[data-theme]`, so a `[data-theme='dark']` selector matches nothing: write
  your own dark values as `light-dark(<light>, <dark>)`. There are no `-rgb`
  tokens either: `color-mix(in srgb, var(--wr-color-primary) 12%, transparent)`,
  never `rgba(var(--wr-color-primary-rgb), 0.12)`.
- **Never hard-code user-facing text in a wrapper component.** Strings route
  through `ngwr/i18n`; every component takes overridable `*Label` inputs.
- **Prefer the library over hand-rolling.** `ngwr/utils` (coercion, dom,
  keyboard, id, css-size, math), `ngwr/pipes` (`wrDate`, `wrBytes`,
  `wrTruncate`, `wrNumber`, `wrMark`, `wrPlural`, `wrRange`) and
  `ngwr/validators` already exist.

## Setting a component up

```bash
ng add ngwr                                          # prompts, installs peers, prints bootstrap
ng g ngwr:use WrSelect --path src/app/some.ts        # adds the import AND the @Component entry
ng g ngwr:provider icons                             # splices a provider into bootstrap
```

`--path` is a NAMED option on `ngwr:use`; only the symbol is positional, and
passing the path bare fails with `Unknown argument`. It takes declarables only:
a service such as `WrDialog` is refused, since the import line would compile and
the `imports` entry would not — `inject()` it instead.

### Providers a component cannot work without

Each of these compiles fine and then does nothing, with no error naming the
cause.

- `provideWrIcons(lucideIcons({ … })) // from 'ngwr/icon'`
  — icons resolve by name from a registry you populate
  — needed by: `WrIcon`
- `provideWrLoadingBarRouter() // from 'ngwr/loading-bar/router'`
  — without it the bar never responds to navigation; it only moves for manual start() / complete()
  — needed by: `WrLoadingBar`
- `provideWrI18n() + provideWrI18nBaseCatalogs({ en: wrEn }) + provideWrI18nStaticLoader({ en: { … } }) // from 'ngwr/i18n' + 'ngwr/i18n/en'`
  — the pipe and directive read from a catalog you provide. Register ngwr's with `provideWrI18nBaseCatalogs`, never spread it into yours: a spread is shallow, so any namespace you share with ngwr, e.g. `common` or `table`, keeps only the side spread last, and the other side's keys stop resolving with nothing logged — ngwr's components fall back to English and a `wrT` read of a lost key renders the raw key
  — needed by: `WrTPipe`, `WrTDirective`, `WrI18n`

## Testing

Every control, overlay, chart and most bits ship a CDK harness at
`ngwr/<entry>/testing` — `ngwr/select/testing`,
`ngwr/charts/bar-chart/testing`. Use it instead of querying the DOM:

```ts
const select = await loader.getHarness(WrSelectHarness);
await select.open();
await select.selectOption({ text: 'Angular' });
```

A harness whose component opens a panel reaches that panel itself, scoped by
the id its trigger publishes, so it loads from the fixture like any other. Only
what a SERVICE opens — `WrDialog`, `WrToast`, `WrDrawerManager` — renders
outside the fixture: load those from
`TestbedHarnessEnvironment.documentRootLoader(fixture)`.

## Reference files

- `references/catalog.md` — every entry point with import line and selectors.
- `references/setup.md` — bootstrap, styles, theme, i18n, the date adapter.
