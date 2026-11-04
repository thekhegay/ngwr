# AGENTS.md

Guidance for AI coding agents working in **ngwr**, an Angular UI library
(standalone, signals-first, zoneless, fully tree-shakable). For what the library
_is_ and how to consume it, read [README.md](README.md); for direction and
priorities, read [ROADMAP.md](ROADMAP.md). This file is about how to _work in the
repo_.

It holds what every task needs. The detail, and the reason behind each rule,
lives in one file per topic under [docs/internals/](docs/internals/). **Read the
topic file before you change anything it covers.** A comment elsewhere in the
repo that says "see AGENTS.md" means these files too.

| Before you touch                                                                          | Read                                                     |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Tokens, colours, dark mode, `-ink` / `-contrast`, component hooks, the Sass entry         | [theme.md](docs/internals/theme.md)                      |
| `provideWr`, overlays, icons, i18n, density, dates, router adapters, shared utils, charts core, `wr-table`, sortable list, virtual scroll, editor, responsive and touch | [systems.md](docs/internals/systems.md) |
| Value controls, Signal Forms, `wr-schema-form`, validation copy                           | [forms.md](docs/internals/forms.md)                      |
| Specs, coverage, harnesses, deferred DOM work                                             | [testing.md](docs/internals/testing.md)                  |
| Lint stages, `check:api-docs`, CI tiers, ngtrue, package checks                           | [gates.md](docs/internals/gates.md)                      |
| Accessibility gates, contrast, state sweeps, layout, RTL, focus ring, decided a11y trades | [a11y.md](docs/internals/a11y.md)                        |
| Docs pages, the Installation section, `since` / `updated` marks, printed claims, AI assets | [showcase.md](docs/internals/showcase.md)               |
| Versions, the release flow, the `next` branch, codemod policy, past breaking changes      | [releases.md](docs/internals/releases.md)                |
| Node, pnpm, `engines`, `@angular/*` peers, dependency bumps                               | [dependencies.md](docs/internals/dependencies.md)        |
| The MCP server, schematics, migrations                                                    | [tooling.md](docs/internals/tooling.md)                  |
| Behaviour that looks like a bug, before you "fix" it                                      | [contracts.md](docs/internals/contracts.md)              |
| Entry point counts, the harness list, scripts layout                                      | [layout.md](docs/internals/layout.md)                    |

## Workspace layout

A pnpm + Angular CLI monorepo:

- **`projects/lib/`** is the published package. Almost every subfolder is a
  tree-shakable entry point (`ngwr/button`, `ngwr/charts/bar-chart`,
  `ngwr/bits/aurora`, `ngwr/i18n/de`, harnesses at `ngwr/<name>/testing`). The
  `exports` map in `projects/lib/package.json` is the list, and `pnpm gen:exports`
  writes it. Counts live in `#core/generated/quality`, never in prose. Built with
  `@angular/build:library`, not ng-packagr.
- **`projects/showcase/`** is the docs site (ngwr.dev). Shared doc scaffolding is
  in `app/_core/` (alias `#core/*`).
- **`projects/starter/`** is the StackBlitz starter, a standalone npm app on ngwr
  from npm, outside the root `angular.json` and `pnpm install`.
- **`projects/lib/theme/`** is the styling foundation: `--wr-*` tokens and SCSS
  mixins, not a component.
- **`scripts/`** is tooling run via `tsx`: `build/`, `check/`, `gen/`, `release/`,
  `baselines/`, `lib/`.

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

Two rules on stylesheets, each held by a spec:

- A component with a `styleUrl` keeps its rules in `styles/_rules.scss`, never in
  `_index.scss`. `_index.scss` is the public entry (`@use '../../theme/styles'` +
  `@forward 'rules'`) and the `styleUrl` shim forwards `./styles/rules`.
- `_index.scss` loads the styles of every ngwr component the markup renders, one
  line per declarable: `@use '../../checkbox/styles' as checkbox-styles; // WrCheckbox`.
  It goes in `_index.scss`, never in `_rules.scss`.

Public types live in the entry point's `types/` folder. Cross-cutting types come
from `ngwr/utils`, never from `ngwr/utils/types`, which is not an entry point.

## Rules every change meets

**Library.**

- App-wide configuration is `provideWr(...features)`. A new setting is a `withX()`
  in its own entry point, never a new `provideWrX()` and never a key on `provideWr`.
- A new overlay injects `WR_OVERLAY`, never CDK's `Overlay`, and calls
  `wrFollowDirection(...)` right after `overlay.create(...)`.
- A value control implements `FormValueControl` or `FormCheckboxControl`, with
  `value` as a `model()` plus a `touch` output and `disabled` and `readonly` inputs.
  `ControlValueAccessor` is gone, never add one. The library ships no validation
  copy: a control reports a key and a payload.
- A component that would inject `Router` splits it into a nested adapter entry
  point (`ngwr/tabs/router`). `ngwr/editor` is the only entry point that imports
  `prosemirror-*`. ngwr has no runtime dependency.
- Reuse `ngwr/utils`, `ngwr/pipes`, `ngwr/validators` and `ngwr/charts/core` before
  writing a helper. A new public function carries the `wr` prefix.
- Deferred DOM work uses `afterNextRender`, not `queueMicrotask`. No constructor-time
  DOM access.

**Styling.**

- A component paints only through its own `--wr-<block>-*` hooks, each defaulting
  to a role or space token. It paints with a role, never with a ramp step.
- A colour that differs between schemes is declared once, as
  `light-dark(<light>, <dark>)`. No ancestor selector for dark mode and no `-rgb`
  lists: `color-mix(in srgb, var(--wr-color-primary) 12%, transparent)`. A canvas
  resolves colours through `resolveCssColor` from `ngwr/utils`.
- Text on a surface or a `-soft` tint reads `-ink`, a label on a fill reads
  `-contrast`, a graphic keeps the bare intent, a placeholder reads
  `--wr-color-placeholder`.
- A physical, direction-dependent property needs an `rtl-ok:` reason within three
  lines above it.

**Tests and gates.**

- `pnpm lint` is multi-stage and prints success before a later stage fails. Trust
  the exit code: `pnpm lint; echo $?`.
- `pnpm test --filter <x>` is a test-name regex, not a file filter. To run one file,
  pass its path to the builder's `include`.
- Specs sit next to the code and read the rendered DOM. Copy
  `projects/lib/tabs/tabs.spec.ts`, or `select.spec.ts` for an overlay. Copy
  `projects/lib/collapse/testing/` for a harness.
- PR gates into `main`: `lint`, `test`, `check:api-docs`, `check:css-vars`,
  `build:lib`, `check:package`, `build:showcase`. No CI runs on a PR into `next`.

**Branches and releases.**

- Work for the next release branches from `next`: `gh pr create --base next`, and
  resync with `git fetch --prune origin && git merge --ff-only origin/next`.
- Releases are cut from Actions by the "Release PR" workflow. Never bump a version
  or edit `CHANGELOG.md` by hand. Versions of Node, pnpm and Angular live in
  `package.json` only, never in prose.

**A component isn't done without its docs page**: see
[showcase.md](docs/internals/showcase.md).

## Commands

| Task              | Command                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| Install           | `pnpm install`                                                                                      |
| Dev server (docs) | `pnpm dev` (`ng serve` → showcase, opens browser)                                                   |
| Build the library | `pnpm build:lib`                                                                                    |
| Build the docs    | `pnpm build:showcase`                                                                               |
| Lint everything   | `pnpm lint`                                                                                         |
| A tier by hand    | `pnpm check:nightly` / `pnpm check:release` (see Three tiers)                                       |
| a11y sweep        | `pnpm check:a11y` (axe over `dist/showcase` — run `build:showcase` first — **nightly**)             |
| Contrast sweep    | `pnpm check:contrast` (axe in a real Chromium, both themes × both `prefers-contrast` modes — **nightly**; `--theme=` / `--contrast=` narrow it) |
| State a11y        | `pnpm check:state-a11y` (the FULL axe set INSIDE hovers / overlays — **nightly**)                   |
| RTL source gate   | `pnpm check:rtl` (physical direction-dependent CSS with no `rtl-ok:` reason — a `pnpm lint` stage)  |
| RTL layout sweep  | `pnpm check:rtl-layout` (Chromium, LTR vs RTL overflow per route — **nightly**)                     |
| Dangling tokens   | `pnpm check:tokens` (a `var(--wr-color-…)` / `var(--wr-border-…)` at a token nothing declares — a `pnpm lint` stage) |
| Layout geometry   | `pnpm check:layout` (box sizes vs `scripts/baselines/layout.json`; `--update` re-records — **nightly**)        |
| API-docs drift    | `pnpm check:api-docs` (docs tables vs the library JSDoc); `pnpm gen:api-docs` rewrites the data      |
| Selector map      | `pnpm gen:selectors` (every `@Component` / `@Directive` selector → symbol + subpath, for the docs' code tabs, `check:attrs` and `gen:install`); `check:selectors` gates the committed copy — a `pnpm lint` stage |
| Component hooks   | `pnpm gen:css-vars` (the `--wr-<name>-*` each component publishes → the docs' CSS-variables tables); `check:css-vars` gates the committed copy |
| Dependencies      | `pnpm gen:deps` (each entry point's peers, add-ons, what it is built on and used by → the docs' Dependencies section and See also) |
| Quality numbers   | `pnpm gen:quality` (entry points, harnesses, specs, gates → `#core/generated/quality`, which the home page and the translations guide bind to) |
| Unit tests        | `pnpm test` (`ng test lib` — vitest via `@angular/build:unit-test`); `pnpm test:watch`; `pnpm test:coverage` is what PR CI runs, for Codecov |

## Conventions

**Build on ngwr first (dogfood).** Whenever there's any chance an ngwr primitive
already covers the need, use it — an existing component (check the catalog
before hand-rolling), `ngwr/utils`, `ngwr/pipes`, `ngwr/validators`, theme
tokens — rather than hand-rolling raw markup/logic or pulling an external
library where an internal tool exists. The catalog is large (over two hundred
entry points; the exact count is `entryPoints` in `#core/generated/quality`):
check before writing a bare `<input type="file">`, a date / number / truncate
helper, a coercion, an id generator, and so on. ngwr has no runtime
dependency at all — `tslib` went in v15, since the ES2022 output imports none of
its helpers — and a new one needs a strong justification; `check:package` fails
on a shipped import the manifest does not declare.

**Framework.** Angular 22, **standalone**, **signals-first**, **zoneless**
(`provideZonelessChangeDetection`). Don't write `standalone: true` (the Angular
22 default — 0 occurrences in the lib) or `ChangeDetectionStrategy.OnPush`
(zoneless CD is signal-driven; only 2 legacy files in `window/` set it).
Use `input()` / `model()` / `output()` / `signal()` / `computed()` / `effect()`
/ `afterNextRender()` / `viewChild()` / `inject()` — not decorators,
constructor DI, or RxJS where a signal is clearer. A root service is
`@Service()`, Angular 22's auto-provided decorator, never
`@Injectable({ providedIn: 'root' })`. `@Injectable` stays only where
`@Service` cannot do the job: on `WrDateAdapter`, which says why at the line
(a `@Service` factory would ignore the subclass passed to `withDates()`), and
on a class provided per element rather than at the root, such as
`WrIconRegistry`.

**Public API is wider than TS.** Lib components are `ViewEncapsulation.None`,
and their **BEM `.wr-*` classes are part of the public API** — consumers style
against them, so don't rename or restructure them casually. The `--wr-*` CSS
custom properties are public too.

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
`feat(select): leading visual on options`.

**Git flow.** **Never push to `main`.** Branch _before_ you start work (not
after committing) → short commit → **push the feature branch** → open a PR; the
maintainer merges. **Squash merging is disabled on the repository** — only
merge and rebase are allowed, so `gh pr merge --squash` fails outright with
`Squash merges are not allowed on this repository`; `--rebase` is the
equivalent, and for the one-commit branch this flow produces it lands the same
single linear commit. After a merge, resync local main:
`git fetch --prune origin && git merge --ff-only origin/main`. Work for the next
major follows the same flow against `next` instead (see Versioning).

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

**Docs prose.** In changelogs / docs, write "from X to Y" — not "X → Y" (no
arrow) — for version and before/after descriptions.

## Building components

The catalog is large (over two hundred entry points) and **deliberately consolidated** —
many "components" are modes or inputs on one host (e.g. `wr-select` covers
single / multi / search / tag; `wr-date-picker` covers date / time / datetime;
`wr-popover` has a `tooltip` mode; `wr-drawer` doubles as a bottom-sheet).
**Before adding a new component, check whether an existing one should grow a
mode or input instead.** Orient with the grouped catalog at
https://ngwr.dev/reference/components. Its groups are `COMPONENT_GROUPS` in
`projects/showcase/app/_layout/sidebar/configs/components.config.ts`, and
charts and bits have their own in `charts.config.ts` and `bits.config.ts`. For
a flat list, read `skills/ngwr/references/catalog.md` (generated) or run
`ls projects/lib projects/lib/{charts,bits}`.

**Skeleton.** Mirror the nearest existing entry point (`projects/lib/alert/` is
the cleanest match) — copy its `@Component` shape (`ViewEncapsulation.None`,
`host` bindings, signal `input()` / `model()` / `output()`; no `standalone` or
`changeDetection` property), plus `styles/_index.scss`, `public-api.ts`,
and `index.ts`, then `pnpm gen:exports`. The catalog is consistent — match the local
idiom rather than inventing one.

**Naming.** Selector prefix `wr-` (mind the abbreviations — the button is
`wr-btn`, not `wr-button`). Classes are BEM: `.wr-<block>__<element>--<modifier>`.
Because components are `ViewEncapsulation.None`, those classes are **public API** —
choose them deliberately and don't rename them on a whim.

**Strings & i18n.** Never hard-code user-facing text. Expose overridable `*Label`
inputs and route built-in strings (including ARIA labels) through the `ngwr/i18n`
catalog (`wrT`) so consuming apps can localize. Validation messages are the
exception: the library ships none at all (see Forms).

## Gotchas

- **`<wr-checkbox>` group identity is `checkboxValue`, not `value`.**
  `FormCheckboxControl` reserves `value` for the form value, so the boolean
  state is the `checked` model and group membership is `checkboxValue`. A
  leftover static `value="x"` lands on the host as a plain DOM attribute — no
  template error, and every checkbox in the group keeps the default identity
  `null`, so they all toggle together. `migration-v9` rewrites it, as a step
  of `ng update ngwr` from any release before 9.0.0 — never by targeting
  `ngwr@9`, whose schematics do not load (see Schematics).
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

`pnpm lint` + `pnpm test` + `pnpm build:lib` + `pnpm build:showcase` are the
real gates — Angular `strictTemplates` type-checks templates, so most wiring
errors surface at build, and `pnpm test` covers the pure-logic layer. `build:showcase` also prerenders every route in Node and **fails on
prerender errors** (`scripts/build/showcase-app.ts` greps the worker log, because
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

- **What exists** → https://ngwr.dev/reference/components, or
  `skills/ngwr/references/catalog.md` (generated from source).
- **How to consume it** → [README.md](README.md) for install, and
  https://ngwr.dev/docs/installation for the detail.
- **Direction and priorities** → [ROADMAP.md](ROADMAP.md).
- **A working example of any pattern** → the nearest existing entry point in
  `projects/lib/` and its showcase page. The catalog is large and consistent;
  copy the local idiom.
