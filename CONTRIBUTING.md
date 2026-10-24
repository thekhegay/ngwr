# Contributing to NGWR

Thanks for taking the time to contribute! This document covers the day-to-day
workflow. For community standards see [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md);
for security issues see [`SECURITY.md`](./SECURITY.md).

## Quick start

```shell
git clone https://github.com/thekhegay/ngwr
cd ngwr
pnpm install
pnpm dev              # ng serve --o (showcase at http://localhost:4200)
```

Other scripts:

```shell
pnpm build:lib        # build the publishable library → dist/lib
pnpm build:showcase   # build the docs site         → dist/showcase
pnpm lint             # eslint (lib + showcase + scripts) + stylelint + the repo's check:* stages
pnpm icons:sets       # rebuild showcase icon catalogs (also runs on postinstall)
```

**Requirements: read them from `package.json`, not from here.** `engines` names
the Node and pnpm ranges, `packageManager` the exact pnpm corepack fetches, and
`.nvmrc` the Node version CI runs. No number is repeated in this document on
purpose — every copy of a version is correct only until someone bumps the
original, and this block was wrong about all four of its facts for exactly that
reason.

What is worth knowing here is what ENFORCES them, because the two are enforced
differently. Node is checked by `devEngines.runtime`: an unsupported runtime
fails `pnpm install` with a clear message. The pnpm version is not checked there
at all — `packageManager` pins it and corepack fetches that exact build.
**Neither is enforced by `.npmrc`**, which is deliberately empty of settings: it
used to carry `engine-strict=true`, and pnpm reads none of its own behaviour from
that file. The pnpm major is held back on purpose — read AGENTS.md before bumping
it.

## Filing issues

Use the appropriate template:

- **🐛 Bug report** — something is broken. Include a minimal reproduction
  (StackBlitz, CodeSandbox, or repo link). Issues without a reproduction may be
  closed pending one.
- **✨ Feature request** — propose a new component or capability. Explain the
  use case first; we'll discuss API in the issue before any code.
- **Questions / discussions** — use
  [GitHub Discussions](https://github.com/thekhegay/ngwr/discussions), not
  Issues.
- **Security** — see [`SECURITY.md`](./SECURITY.md). Do not open a public issue.

## Commits

We follow [Conventional Commits](https://www.conventionalcommits.org/),
enforced on every local commit by a commitlint `commit-msg` hook, installed via
`simple-git-hooks` on `pnpm install`. Subjects must be lowercase; the header is
capped at 100 chars.
Types:

| Type | When |
|---|---|
| `feat` | new feature or capability |
| `fix` | bug fix |
| `perf` | performance improvement |
| `refactor` | neither feature nor fix |
| `docs` | documentation only |
| `style` | formatting only, no behaviour change |
| `test` | tests only |
| `build` | dependency or build pipeline change |
| `ci` | GitHub Actions change |
| `chore` | tooling, cleanup |
| `revert` | revert a previous commit |

Add `!` after the type for a breaking change: `feat(button)!: drop legacy color prop`.

Scope is the component or area in kebab-case: `feat(button)`, `fix(select)`,
`docs(icon)`, `ci`.

## Pull requests

1. Branch from `main`. A breaking change for the next major branches from
   `next` instead.
2. Make focused changes — one PR per concern.
3. Run `pnpm lint && pnpm test && pnpm build:lib && pnpm build:showcase` before
   pushing — and check `pnpm lint`'s exit code rather than its output, for the
   reason in the style guide below. Those two builds also REGENERATE tracked
   files (`projects/showcase/app/_core/generated/*.ts` and `skills/ngwr/**`), so
   run `git status` afterwards and commit whatever moved. They are not the whole
   gate set: CI runs more, listed in the style guide.
4. Fill in the PR template — describe **what** changed and **why**.
5. Merging is **rebase or merge commit** — squash merging is disabled on the
   repository, so `gh pr merge --squash` fails outright. Keep the branch to one
   focused commit and `--rebase` lands exactly that commit on `main`.

The maintainer cuts releases via the
[Release PR](./.github/workflows/release.yml) workflow — contributors don't
need to bump versions.

## Adding a new component

Each component is its own secondary entry point. Use an existing
small component (`projects/lib/alert` is a good template) and replicate the
structure:

```
projects/lib/<name>/
├── index.ts
├── public-api.ts
├── <name>.ts                  # encapsulation: None, signals-only
├── <name>.html
├── styles/_index.scss         # @use 'ngwr/<name>'
└── types/index.ts             # public types, re-exported from public-api.ts
```

A component with a `styleUrl` splits its styles: the rules go in
`styles/_rules.scss`, and `_index.scss` only loads the theme and forwards
them. AGENTS.md says why.

Charts and bits nest one level deeper: the source goes in
`projects/lib/charts/<name>/` or `projects/lib/bits/<name>/` (styled with
`@use 'ngwr/charts/<name>'` or `@use 'ngwr/bits/<name>'`), the page in
`projects/showcase/app/charts/<group>/<name>/` or
`projects/showcase/app/bits/<group>/<name>/`, and steps 3 to 5 below use that
cluster's `charts` or `bits` node in `routes.ts`, the `routing.ts` beside the
page's folder and its
sidebar config (`charts.config.ts` or `bits.config.ts`). AGENTS.md's "Showcase
page = the docs" has the detail.

Then:

1. Run `pnpm gen:exports`. It adds the entry point to the `exports` map in
   `projects/lib/package.json`, with a `sass` condition when
   `styles/_index.scss` exists, and adds it to the showcase's stylesheet.
2. Add a docs page under
   `projects/showcase/app/reference/components/<group>/<name>/` (`<name>.ts` +
   `<name>.html`), in the group the sidebar shows it under.
3. Add the route constant to `projects/showcase/app/_core/constants/routes.ts`
   (the `components` map).
4. Add the lazy route to
   `projects/showcase/app/reference/components/<group>/routing.ts`.
5. Add the sidebar entry to
   `projects/showcase/app/_layout/sidebar/configs/components.config.ts`.
6. Add a `<name>.spec.ts` beside the component. Every component in the catalog
   has one, and the specs assert the rendered DOM — roles, ARIA state and the
   `.wr-*` classes — rather than component internals. Copy `projects/lib/tabs/`
   for a plain component, or `projects/lib/select/` for one with an overlay.
7. Declare the version it first ships in on the page's own
   `<ngwr-doc-page since="14.5.0">` — the next release, not the current one, if
   yours has not shipped yet. The page prints "Added in v14.5" beside its title,
   and the sidebar's "new" mark is derived from that one attribute, so nothing
   is typed twice and nothing has to be removed later: the mark covers the
   minor line the site is heading to and leaves by itself once the next
   release declares its first page. A page that
   declares nothing shows nothing, which is right for everything that was
   already here.
8. Run `pnpm gen:api-docs` and commit `projects/showcase/app/_core/generated/api.ts`
   and `since.ts`. No build regenerates these for you:
   `build:showcase` refreshes the selector, CSS-variable and quality data, but
   the API tables are generated on demand and `check:api-docs` compares both
   committed files against the source — the JSDoc for one, the pages' own
   `since` attributes for the other. Skip it and CI fails on a file you never
   touched.
9. Run `pnpm gen:install` and commit `projects/showcase/app/_core/generated/install.ts`,
   which draws the page's Installation section. `pnpm lint` fails on a stale
   copy.

## Style guide

- **Signals-first, zoneless-friendly.** Use `input()`, `model()`, `output()`,
  `signal()`, `computed()`, `effect()`, `viewChild()`, `contentChildren()`. No
  `setTimeout` to nudge change detection. Don't add `standalone: true` (the
  Angular 22 default) or `changeDetection: OnPush` — neither is the convention
  here.
- **`ViewEncapsulation.None`.** The BEM `.wr-*` classes are public API —
  consumers style against them, so renaming one is a breaking change.
- **CDK for primitives.** Overlay, portal, a11y, focus management — use
  `@angular/cdk`, not custom code. Always inject `WR_OVERLAY` (not
  `Overlay`) so isolation works.
- **CSS custom properties scoped per component.** Component styles read from
  `--wr-*` tokens; consumers can override per-instance.
- **Verify lint by exit code.** `pnpm lint` is an `&&` chain: `ng lint`, then
  `eslint scripts`, `lint:styles` (stylelint) and the repo's own `check:*`
  scripts; the `lint` script in `package.json` is the list. The first stage
  prints `All files pass linting.` even when a later stage fails, so run
  `pnpm lint; echo $?` and trust the code, not the output.
- **Three tiers of checks.** Every PR runs the steps in
  [`ci.yml`](./.github/workflows/ci.yml): `lint`, `test`, `check:api-docs`,
  `check:css-vars`, `build:lib`, `check:package` and `build:showcase`. The site
  checks (`check:a11y`, `check:contrast`, `check:state-a11y`, `check:layout`,
  `check:rtl-layout`) run in [`nightly.yml`](./.github/workflows/nightly.yml),
  only on a night `main` moved, along with the suite and the library build on
  Node 22 and 24; a failure opens a `Nightly failed` issue. The Release PR
  workflow runs everything first. `pnpm check:nightly` and
  `pnpm check:release` run a tier locally.

## Setting up your editor

ESLint flat config + Prettier are configured. Any modern editor will pick
them up. If you use VS Code, enable "Format on save" with Prettier as the
default formatter.
