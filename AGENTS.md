# AGENTS.md

Guidance for AI coding agents working in **ngwr** — an Angular UI library
(standalone, signals-first, zoneless, fully tree-shakable). For what the
library _is_ and how to consume it, read [README.md](README.md); for direction
and priorities, read [ROADMAP.md](ROADMAP.md). This file is about how to _work
in the repo_.

## Workspace layout

A pnpm + Angular CLI monorepo with two projects:

- **`projects/lib/`** — the published package (`ngwr`). Every subfolder is a
  **tree-shakable secondary entry point** consumed as `ngwr/<name>` — ~124 of
  them (`ngwr/button`, `ngwr/select`, `ngwr/overlay`, …). Built with
  **ng-packagr**. TS path mapping: `ngwr/*` → `./projects/lib/*`.
- **`projects/showcase/`** — the docs site (**ngwr.dev**): live demos + API
  docs, and where components are dogfooded. Pages live under
  `app/components/<name>/` and `app/getting-started/<name>/`; shared doc
  scaffolding (the `<ngwr-doc-*>` components, services, shiki highlighting)
  is in `app/_core/` (alias `#core/*`).
- **`projects/lib/theme/`** — the styling foundation: design tokens (CSS custom
  properties, `--wr-*`) and SCSS mixins under `theme/styles/`. Not a component.
- **`scripts/`** — build/release tooling (schematics, icon-set generation,
  dist-asset copy, release prep), run via `tsx`.

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
  `provideWrIcons(lucideIcons({…}))`; adapters under `ngwr/icon/adapters/*`
  (lucide, feather, tabler, phosphor, heroicons, iconoir, …).
- **i18n** (`ngwr/i18n`) — the `wrT` pipe + `[wrT]` directive, `WrI18n` service,
  `provideWrI18n()` + `provideWrI18nStaticLoader()`; ngwr's own catalogs at
  `ngwr/i18n/{ru,en}`.
- **Density** (`ngwr/density`) — `provideWrDensity()`, the `[wrDensity]`
  directive, `WrDensity` service; values compact / default / comfortable / touch
  drive the `--wr-density-*` multipliers.
- **Breakpoints** (`ngwr/media` + SCSS) — `WrMedia.matches('md')` returns a
  `Signal<boolean>`; SCSS mixin API via `@use 'ngwr/breakpoints'`.
- **Theme** (`ngwr/theme`) — `provideWrTheme()` sets the `--wr-*` token layer
  (see Styling). Global CSS: `@use 'ngwr'` (umbrella) or `@use 'ngwr/<name>'`.
- **Date adapters** (`ngwr/date-adapter-fns`, `…-luxon`) —
  `provideWrDateAdapter(...)` powers calendar + every date-picker mode.
- **Shared code — don't reinvent these.** `ngwr/utils` (`coercion` incl.
  `numAttr` for input transforms; plus `dom`, `guards`, `id`, `keyboard`,
  `css-size`, `fn`, `math`, `log`), `ngwr/pipes` (`wrDate`, `wrBytes`,
  `wrTruncate`, `wrNumber`, `wrMark`, `wrRange`), and `ngwr/validators`
  (`WrValidators`).

**Forms.** Value components are ControlValueAccessors → bind via Signal Forms
`[formField]="form.x"` or `[(ngModel)]`. (Signal Forms-native `FormValueControl`
is the B1 roadmap track.)

**Responsive / touch.** Adaptive components take a `responsive` opt-in modifier
(container-query reflow). Touch ergonomics use the `touch-target` SCSS mixin
(≥44px hit area gated `@media (pointer: coarse)`); the `touch` density preset
enlarges every control at once.

## Commands

| Task              | Command                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| Install           | `pnpm install`                                                                                                     |
| Dev server (docs) | `pnpm dev` (`ng serve` → showcase, opens browser)                                                                  |
| Build the library | `pnpm build:lib`                                                                                                   |
| Build the docs    | `pnpm build:showcase`                                                                                              |
| Lint everything   | `pnpm lint`                                                                                                        |
| Unit tests        | `pnpm test` (`ng test`) — suite is still being established, see ROADMAP A1; **lint + build are the current gates** |

Requirements: Node `^24.16.0 || >=26` (`.nvmrc` pins 24), pnpm `^11.8`,
TypeScript `~6.0`, Angular `22.x`.

### Linting — read before trusting a green run

`pnpm lint` is **multi-stage**: `ng lint` (lib, then showcase) `&&`
`eslint scripts` `&&` `stylelint`. The first stage prints
`All files pass linting.` even when a _later_ stage fails — so **verify by exit
code, never by grepping the output**:

```sh
pnpm lint; echo $?     # 0 = actually green
```

Autofix most issues (prettier wrapping long template lines, etc.) with
`pnpm exec ng lint <lib|showcase> --fix`.

**CI gates on `pnpm lint` + `pnpm build`** — both must be green (a silently
failed lint stage once slipped past and blocked a publish). Conventional-commit
subjects are checked locally (commitlint `commit-msg` hook) and PR titles on CI.

## Conventions

**Build on ngwr first (dogfood).** Whenever there's any chance an ngwr primitive
already covers the need, use it — an existing component (check the catalog
before hand-rolling), `ngwr/utils`, `ngwr/pipes`, `ngwr/validators`, theme
tokens — rather than hand-rolling raw markup/logic or pulling an external
library where an internal tool exists. The catalog is large (~124 entry points):
check before writing a bare `<input type="file">`, a date / number / truncate
helper, a coercion, an id generator, and so on. New external runtime
dependencies need a strong justification — the only runtime dependency today is
`tslib`.

**Framework.** Angular 22, **standalone**, **signals-first**, **zoneless**
(`provideZonelessChangeDetection`), explicit `ChangeDetectionStrategy.OnPush`.
Use `input()` / `model()` / `output()` / `signal()` / `computed()` / `effect()`
/ `afterNextRender()` / `viewChild()` / `inject()` — not decorators,
constructor DI, or RxJS where a signal is clearer.

**Public API is wider than TS.** Lib components are `ViewEncapsulation.None`,
and their **BEM `.wr-*` classes are part of the public API** — consumers style
against them, so don't rename or restructure them casually. The `--wr-*` CSS
custom properties are public too.

**Styling.** Component styles live in `styles/_index.scss`, themed through
**CSS custom properties** (`--wr-*`), not encapsulation. The token layer (set
by `provideWrTheme()`): colors
`--wr-color-{primary,secondary,success,warning,danger,light,medium,dark}`, each
with `-contrast / -light / -lighter / -dark / -darker / -rgb`; plus
`--wr-border-radius-{sm,base,lg,pill}`, `--wr-text-*`, `--wr-font-weight-*`,
`--wr-duration-*`, `--wr-ease-*`. Pull mixins and tokens from `ngwr/theme`.

**SSR-safe.** Components must render under SSR / hydration: OnPush, zoneless,
and **no constructor-time DOM access** (guard with `afterNextRender` /
`isPlatformBrowser`). (Roadmap A4.)

**Commits.** **Lowercase conventional**, single-line **subject only** — no body,
no bullet recap, no `-m "$(cat <<EOF…)"` heredocs — **≤80 chars**, lean shorter.
Enforced by commitlint. **No AI / assistant attribution** anywhere (commits,
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
smallest diff that satisfies the request.

**Versioning.** Additive work ships as **7.x minors**; **8.0.0** is reserved
for the breaking baseline only (Angular 23 peer + the `@angular/aria` internals
swap). Don't bump the version pre-release — releases are maintainer-cut via tags
(`pnpm release:prepare` / `release:body`).

**Dependencies.** Check with `pnpm outdated` (one shot — don't query packages
one by one). Angular **tooling** (`@angular/cli`, `@angular/build`,
`@angular-devkit/*`, `@schematics/angular`) patches independently of the
**framework** (`@angular/core` et al.) — bump only the train that moved.
Dependabot (grouped) handles the PRs.

**Docs prose.** In changelogs / docs, write "from X to Y" — not "X → Y" (no
arrow) — for version and before/after descriptions.

## Building components

The catalog is large (~124 entry points) and **deliberately consolidated** —
many "components" are modes or inputs on one host (e.g. `wr-select` covers
single / multi / search / tag; `wr-date-picker` covers date / time / datetime;
`wr-popover` has a `tooltip` mode; `wr-drawer` doubles as a bottom-sheet).
**Before adding a new component, check whether an existing one should grow a
mode or input instead.** Orient with the grouped catalog in [README.md](README.md)
(Form / Data / Feedback / Display / Layout / Navigation / Overlays) or
`ls projects/lib`.

**Skeleton.** Mirror the nearest existing entry point — copy its `@Component`
shape (standalone, `OnPush`, `ViewEncapsulation.None`, `host` bindings, signal
`input()` / `model()` / `output()`), plus `styles/_index.scss`, `public-api.ts`,
`index.ts`, and `ng-package.json`. The catalog is consistent — match the local
idiom rather than inventing one.

**Naming.** Selector prefix `wr-` (mind the abbreviations — the button is
`wr-btn`, not `wr-button`). Classes are BEM: `.wr-<block>__<element>--<modifier>`.
Because components are `ViewEncapsulation.None`, those classes are **public API** —
choose them deliberately and don't rename them on a whim.

**Strings & i18n.** Never hard-code user-facing text. Expose overridable `*Label`
inputs and route built-in strings (including ARIA labels) through the `ngwr/i18n`
catalog (`wrT`) so consuming apps can localize.

**Accessibility.** Interactive components follow the WAI-ARIA APG patterns —
correct roles/states, keyboard navigation, and focus management; overlays use the
CDK a11y primitives (focus trap) plus live-region announcements. (a11y CI is
roadmap A3.)

**Showcase page = the docs.** Every component ships a page under
`projects/showcase/app/components/<name>/`, wired into routing and authored with
the doc-page components from `#core/components`: `<ngwr-doc-page>`,
`<ngwr-doc-section>`, `<ngwr-doc-code>` (code blocks), `<ngwr-doc-snippet>` (live
demo), and `<ngwr-doc-api>` (API table). A component isn't done without it.

## Schematics

The lib ships an `ng` schematics suite (built by `scripts/build-schematics.ts`,
which also generates `use/symbol-map.json` from a public-api scan):

- `ng add ngwr` — prompts for styles / dateAdapter / density / theme, installs
  peers, prints a tailored bootstrap snippet.
- `ng g ngwr:use WrFoo path/to/cmp.ts` — adds the import + splices it into the
  component's `@Component` imports.
- `ng g ngwr:provider <name>` — splices a provider into bootstrap.
- `ng g ngwr:icon-set` / `ngwr:component-style` / `ngwr:page` — icon barrel /
  per-component `@use` / starter pages.
- `ng update ngwr@N` — migrations (e.g. the v7 deprecated-tag rewrites).

## Gotchas

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

## Verifying changes

`pnpm build` + `pnpm lint` are the real gates — Angular `strictTemplates`
type-checks templates, so most wiring errors surface at build. For runtime
behavior, run `pnpm dev` and exercise it.

Caveat for headless / backgrounded browser tabs: timers are throttled and WAAPI
animations pause, so screenshots can come back blank and wall-clock-dependent
checks flake. Verify gesture / animation _logic_ by calling component methods
directly (e.g. via `ng.getComponent(el)` / `ng.getDirectives(el)` in dev mode)
rather than relying on timing. Touch _feel_ ultimately needs a real device.

## Where to look first

- **What exists / how to consume it** → [README.md](README.md) (full catalog,
  install, quick start).
- **Direction and priorities** → [ROADMAP.md](ROADMAP.md).
- **A working example of any pattern** → the nearest existing entry point in
  `projects/lib/` and its showcase page. The catalog is large and consistent;
  copy the local idiom.
