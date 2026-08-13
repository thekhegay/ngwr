---
name: ngwr
description: Build Angular UIs with the ngwr component library (standalone, signals-first, zoneless). Use when adding, styling or debugging ngwr components — `wr-*` selectors, `ngwr/*` imports, `provideWr*` providers, `--wr-*` CSS custom properties — or when picking a component for an Angular app that already depends on ngwr.
---

# ngwr

An Angular 22 UI library: 202 tree-shakable entry points, 115 of them shipping a selector.
Standalone, signals-first, zoneless, `ViewEncapsulation.None`. One runtime
dependency (`tslib`).

## Get the facts, do not guess

Four sources ship in the package or on the docs site, in the order worth
reaching for:

1. `references/catalog.md` in this skill — every entry point, its import line
   and its selector(s).
2. `node_modules/ngwr/llms-full.txt` — the same catalog plus every public
   export per entry point.
3. Any docs page as markdown: append `.md` to the URL, e.g.
   `https://ngwr.dev/reference/components/select.md`.
4. `npx ngwr-mcp` — the bundled MCP server, when the agent speaks MCP:
   `search_ngwr`, `get_ngwr_component`, `get_ngwr_api`, `get_ngwr_setup`.

Exact input / output signatures are in the shipped `.d.ts` files. Do not invent
an input name; read one.

## The rules that are not guessable

These are the ones that compile and then behave wrong, or that a reasonable
guess gets backwards.

- **Import from the entry point, never a barrel.**
  `import { WrSelect } from 'ngwr/select'` — there is no `ngwr` root export for
  components, and the subpath is what makes the library tree-shakable.
- **The selector is not always the entry point name.** The button is
  `wr-btn`, not `wr-button`. Check `references/catalog.md` before writing a tag.
- **Check for a MODE before reaching for another component.** The catalog is
  deliberately consolidated: `wr-select` covers single / multi / search / tag,
  `wr-date-picker` covers date / time / datetime, `wr-popover` has a tooltip
  mode, `wr-drawer` doubles as a bottom sheet, `wr-table` owns pinning,
  resizing, grouping, tree rows, CSV export and virtual scroll.
- **There is no `ControlValueAccessor`.** Value components implement Signal
  Forms' `FormValueControl` / `FormCheckboxControl`. Bind
  `[formField]="form.x"`, or use the two-way model standalone —
  `[(value)]`, `[(checked)]`. `[(ngModel)]` and reactive forms still work:
  Angular 22 synthesises the accessor.
- **`<wr-checkbox>` group identity is `checkboxValue`, not `value`.**
  `value` is reserved for the form value, so a leftover `value="x"` lands on the
  host as a plain DOM attribute, every box in the group keeps the default
  identity `null`, and they all toggle together. No template error.
- **Styles are opt-in and global.** `@use 'ngwr'` for everything, or
  `@use 'ngwr/<name>'` per component. Components are `ViewEncapsulation.None`;
  their `.wr-*` BEM classes and `--wr-*` custom properties are PUBLIC API, so
  style against them rather than reaching into the DOM structure.
- **Theme through tokens, not overrides.** `--wr-color-{intent}` and its
  `-contrast` / `-ink` / `-soft` companions. `-contrast` is the label ON a
  filled intent; `-ink` is the intent used AS text. Using the bare intent as
  text fails WCAG AA on the soft tint in both themes.
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
ng g ngwr:provider overlay                           # splices a provider into bootstrap
```

`--path` is a NAMED option on `ngwr:use`; only the symbol is positional, and
passing the path bare fails with `Unknown argument`.

### Providers a component cannot work without

Each of these compiles fine and then does nothing, with no error naming the
cause.

- `provideWrOverlay() // from 'ngwr/overlay'`
  — overlays render into an ngwr-owned container; without it they never appear
  — needed by: `WrDialog`, `WrDrawer`, `WrToast`, `WrPopover`, `WrPopconfirm`, `WrContextMenu`, `WrSelect`, `WrDropdown`, `WrCommandPalette`, `WrCascader`, `WrMention`, `WrDatePicker`, `WrTour`, `WrLightbox`
- `provideWrIcons(lucideIcons({ … })) // from 'ngwr/icon' + 'ngwr/icon/adapters/lucide'`
  — icons resolve by name from a registry you populate
  — needed by: `WrIcon`
- `provideWrDateAdapter(wrDateFnsAdapter) // from 'ngwr/date-adapter-fns'`
  — every date mode goes through an adapter; there is no built-in default
  — needed by: `WrDatePicker`, `WrCalendar`, `WrEventCalendar`
- `provideWrI18n() + provideWrI18nStaticLoader({ en: wrEn }) // from 'ngwr/i18n'`
  — the pipe and directive read from a catalog you provide
  — needed by: `WrT`, `WrI18n`

## Testing

Every control, overlay, chart and most animations ship a CDK harness at
`ngwr/<name>/testing`. Use it instead of querying the DOM:

```ts
const select = await loader.getHarness(WrSelectHarness);
await select.open();
await select.selectOption({ text: 'Angular' });
```

Overlay panels render into the overlay container, NOT the fixture — provide
`provideWrOverlay()` in the test and load those harnesses from
`TestbedHarnessEnvironment.documentRootLoader(fixture)`.

## Reference files

- `references/catalog.md` — every entry point with import line and selectors.
- `references/setup.md` — bootstrap, styles, theme, i18n, date adapters.
