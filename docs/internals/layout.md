# Workspace layout

Part of [AGENTS.md](../../AGENTS.md). Read this before changing entry point counts, the harness list or the scripts layout.

## Workspace layout

A pnpm + Angular CLI monorepo with three projects:

- **`projects/lib/`** — the published package (`ngwr`). Almost every subfolder is
  a **tree-shakable secondary entry point** consumed as `ngwr/<name>`
  (`ngwr/button`, `ngwr/select`, `ngwr/overlay`, …). How many is `entryPoints`
  in `#core/generated/quality`, which `pnpm gen:quality` counts from the
  `exports` map in `projects/lib/package.json`. Read it there: this line used to
  restate it and went stale with every new component. Count from that map, not
  from the directory tree: `styles/` and
  `schematics/` are not entry points, and the nested ones are the charts
  (`ngwr/charts/<name>`) — among them the public
  legend `ngwr/charts/chart-legend` and `ngwr/charts/core`, whose exports are all
  `@internal` (see Shared code below) — the twenty-two
  `ngwr/i18n/<locale>`, the two opt-in router adapters
  `ngwr/loading-bar/router` and `ngwr/tabs/router` that v14 added, and the CDK
  test harnesses (`testingEntryPoints` in the same file), which cover the form
  controls (`button`, `input`, `textarea`,
  `checkbox`, `switch`, `radio`, `select`, `input-number`, `input-otp`, `slider`,
  `rating`, `file-upload`, `color-picker`, `knob`, `form`, `segmented`, `editor`), the overlays
  (`date-picker`, `dropdown`, `popover`, `dialog`, `drawer`, `toast`,
  `context-menu`, `popconfirm`, `command-palette`, `cascader`, `mention`),
  the data views (`table`, `tree`, `graph`), the navigation / disclosure set (`tabs`,
  `stepper`, `carousel`, `pagination`, `collapse`, `transfer`), `splitter`, `speed-dial`, `load-state`,
  `lightbox`, `tour`, `calendar`, `event-calendar`, `window`, `image-cropper`
  and **every chart** — each at
  `ngwr/<name>/testing`. Charts are NESTED since v15:
  `ngwr/charts/bar-chart`, harnesses at
  `ngwr/charts/bar-chart/testing`. Seven folders that used to sit beside
  `button` and `select` in `projects/lib` now live under one, which is the only
  thing that changed — they are ordinary entry points, in the same package, and
  `pnpm gen:exports` writes their keys like any other. `@use 'ngwr/animations'`
  is the keyframe UTILITY sheet (`styles/_animations.scss`), not a component:
  the animation components the package carried through 15.5 were removed
  in 15.6. They export one more harness name than there are classes
  (`harnessClasses` in the same file): `WrCalendarDayHarness` is the
  one exported twice, since a date-picker's popup IS a calendar and
  `ngwr/date-picker/testing` keeps the name it shipped as.
  **One entry point is deliberately without one**: `virtual-scroll` is a thin
  wrapper over `cdk-virtual-scroll-viewport` whose whole observable behaviour is
  the window it measures — so every honest method would answer identically for a
  working component and a broken one. Do not "finish the set" by adding it.
  Built with **`@angular/build:library`**, not ng-packagr. TS path mapping:
  `ngwr/*` → `./projects/lib/*`, plus the bare `ngwr` → `./projects/lib/public-api.ts`
  (`provideWr`).
- **`projects/showcase/`** — the docs site (**ngwr.dev**): live demos + API
  docs, and where components are dogfooded. Docs are organised into five
  top-level clusters — **docs / guides / reference / charts / icons**:
  getting-started under `app/docs/`, task guides under `app/guides/`, API
  pages under `app/reference/<cluster>/<name>/` (directives, pipes, services,
  utils, validators, interfaces) and component pages one folder deeper, in
  the sidebar group they sit under (`app/reference/components/<group>/<name>/`),
  the chart family under `app/charts/<group>/<name>/` and the icon-set browsers
  under `app/icons/`; the pre-v15 `/start/*` URLs redirect (`app/routing.ts`). Shared doc scaffolding (the
  `<ngwr-doc-*>` components, services, shiki highlighting) is in `app/_core/`
  (alias `#core/*`).
- **`projects/starter/`** — the StackBlitz starter the docs header and home page
  link to (`stackblitz.com/github/thekhegay/ngwr/tree/main/projects/starter`). A
  standalone npm app on ngwr FROM NPM, with its own `package.json`, `angular.json`
  and `tsconfig.json`: it is not in the root `angular.json`, the root `pnpm
  install` does not install it, and stylelint skips it. Keep it to what boots in
  StackBlitz's container — a `development` configuration that `serve` defaults
  to, and one `@use` per rendered entry point after `ngwr/theme` — and move its
  `ngwr` range when a major ships.
- **`projects/lib/theme/`** — the styling foundation: design tokens (CSS custom
  properties, `--wr-*`) and SCSS mixins under `theme/styles/`. Not a component.
- **`scripts/`** — build/release tooling, run via `tsx`, **one directory per
  verb since v15**: `build/` (lib, showcase, schematics, MCP server, icon sets,
  dist-asset copy), `check/` (standalone gates), `gen/` (every generated file),
  `release/`, plus `baselines/` for the recorded JSON files and `lib/` for
  shared code. A `check:x` script runs either a file in `check/` or a
  generator's own `--check`, because a generator that can verify its output is
  one file, not two: `check:selectors`, `check:css-vars`, `check:install` and
  `check:api-docs` are `gen/<name>.ts --check`. One check file differs from its
  script's name: `check:attrs` runs `check/unknown-attrs.ts`.
  **The four browser-driven checks share `scripts/lib/dist-site.ts`** — the
  static server over `dist/showcase`, the route list, the "did you build it"
  guard, and `withDistBrowser`, which owns the server and the browser. The one
  thing they disagree on is its only parameter: `'spa' | '404'`. The contrast
  and state sweeps fall back to the SPA shell because an unresolved path is a
  client route; the two layout sweeps answer 404, because a target matching
  nothing has to fail the run rather than silently measure the home page.

### Anatomy of an entry point — e.g. `projects/lib/alert/`

| File                 | Role                                                        |
| -------------------- | ----------------------------------------------------------- |
| `alert.ts`           | the `@Component` / `@Directive` (`ViewEncapsulation.None`)  |
| `alert.html`         | template (components only)                                  |
| `styles/_index.scss` | consumable styles — imported by apps as `@use 'ngwr/alert'` |
| `types/`             | public types                                                |
| `public-api.ts`      | the entry point's exports — what `exports` points at       |
| `index.ts`           | barrel (`export * from './public-api'`)                     |
| _(no per-folder config)_ | the `exports` map declares it; `pnpm gen:exports` writes that |

`@use 'ngwr/<name>'` resolves through the `sass` condition in
`projects/lib/package.json`'s `exports` map.

**A component with a `styleUrl` splits that one file in two, and the rule is
mechanical: rules go in `styles/_rules.scss`, never in `_index.scss`.** Thirty-one
components have a `styleUrl`, and a component stylesheet is its OWN Sass
compilation — `@use` deduplicates within one compilation, not across them — so a
`_index.scss` that both `@use`s the theme and holds the rules inlines a second
copy of `:root` and the box-sizing reset into the FESM bundle, at 35–42 kB
apiece when it was measured. It also wins the cascade over the app's own palette, since
Angular appends component `<style>` blocks after the linked stylesheet: twenty
components were quietly reverting a documented `@use 'ngwr/theme' with
($base-colors: …)` customisation. So `_index.scss` is the public entry (`@use
'../../theme/styles'` + `@forward 'rules'`) and the `styleUrl` shim forwards
`./styles/rules`. `package.spec.ts` walks the `@use` / `@forward` closure of every
`styleUrl` and fails on a theme-layer emission inside it, so getting this wrong is
a red test rather than a silent 40 kB.

**A component's `_index.scss` loads the styles of every ngwr component it
renders.** With the umbrella gone (see Theme), a consumer writes one `@use` per
component they place and never learns about the ones placed inside it:
`@use 'ngwr/table'` alone gave unstyled checkboxes and an unstyled pager. So for
each ngwr declarable in the component's `imports: []`, `_index.scss` adds one
line such as `@use '../../checkbox/styles' as checkbox-styles; // WrCheckbox`,
under the shared "Styles for the entry points this component's own markup
renders" comment. It goes in `_index.scss` and never in `_rules.scss`, which the
`styleUrl` shim would carry into the bundle. Sass deduplicates it within one
compilation, and `theme/styles.spec.ts` fails with
`ngwr/x renders WrY and never loads ngwr/y` when a line is missing.

Public types live in each entry point's
`types/` folder (an `index.ts` barrel re-exported through
`public-api.ts`), and a type declared in a `tokens/*.token.ts` belongs there
too — the token file holds the `InjectionToken`, its contract lives beside every
other type the entry point publishes. The folder was `interfaces/` until v15 and
the name was a lie in most of them: what it holds is unions and aliases as often
as it is an `interface`. Cross-cutting types (e.g. `Maybe`, `SafeAny`) live in
`projects/lib/utils/types/` and are imported from `ngwr/utils` — never from
`ngwr/utils/types`, which resolves inside the repo through the path alias and
is not an entry point, so a consumer's compiler cannot follow it.
