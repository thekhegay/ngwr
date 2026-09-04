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
pnpm lint             # eslint (lib + showcase + scripts) + stylelint + four repo checks
pnpm icons:sets       # rebuild showcase icon catalogs (also runs on postinstall)
```

Requirements:

- Node `^24.16 || >=26` (`.nvmrc` pins 24; `.npmrc` sets `engine-strict=true`,
  so an older Node fails `pnpm install` outright)
- pnpm `^11.10` (pinned via `packageManager`: `pnpm@11.10.0`)

## Filing issues

Use the appropriate template:

- **🐛 Bug** — something is broken. Include a minimal reproduction (StackBlitz,
  CodeSandbox, or repo link). Issues without a reproduction may be closed
  pending one.
- **✨ Feature request** — propose a new component or capability. Explain the
  use case first; we'll discuss API in the issue before any code.
- **Questions / discussions** — use
  [GitHub Discussions](https://github.com/thekhegay/ngwr/discussions), not
  Issues.
- **Security** — see [`SECURITY.md`](./SECURITY.md). Do not open a public issue.

## Commits

We follow [Conventional Commits](https://www.conventionalcommits.org/). Both
are enforced — PR titles by CI
([`pr-title.yml`](./.github/workflows/pr-title.yml)) and every local commit by
a commitlint `commit-msg` hook, installed via `simple-git-hooks` on
`pnpm install`. Subjects must be lowercase; the header is capped at 100 chars.
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

1. Branch from `main`.
2. Make focused changes — one PR per concern.
3. Run `pnpm lint && pnpm test && pnpm build:lib && pnpm build:showcase` before
   pushing.
4. PR title must be a valid conventional commit (CI enforces this).
5. Fill in the PR template — describe **what** changed and **why**.
6. We use **squash merge** so the PR title becomes the commit on `main`.

The maintainer cuts releases via the
[Release PR](./.github/workflows/release.yml) workflow — contributors don't
need to bump versions.

## Adding a new component

Each component is its own ng-packagr secondary entry point. Use an existing
small component (`projects/lib/alert` is a good template) and replicate the
structure:

```
projects/lib/<name>/
├── ng-package.json
├── index.ts
├── public-api.ts
├── <name>.ts                  # encapsulation: None, signals-only
├── <name>.html
├── styles/_index.scss
└── interfaces/index.ts        # public types, re-exported from public-api.ts
```

Then:

1. Add the entry to the umbrella SCSS at `projects/lib/styles.scss`.
2. Add the entry to `projects/lib/package.json` `exports` map.
3. Add a docs page under
   `projects/showcase/app/reference/components/<name>/` (`<name>.ts` +
   `<name>.html`).
4. Add the path constant to `projects/showcase/app/routing.ts` (the
   `components` map).
5. Add the lazy route to
   `projects/showcase/app/reference/components/components.routing.ts`.
6. Add the sidebar entry to
   `projects/showcase/app/_layout/sidebar/configs/components.config.ts`.
7. Add a `<name>.spec.ts` beside the component. Every entry point in the catalog
   has one, and the specs assert the rendered DOM — roles, ARIA state and the
   `.wr-*` classes — rather than component internals. Copy `projects/lib/tabs/`
   for a plain component, or `projects/lib/select/` for one with an overlay.

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
- **Verify lint by exit code.** `pnpm lint` is a seven-stage `&&` chain:
  `ng lint`, then `eslint scripts`, `lint:styles` (stylelint), `check:colors`,
  `check:rtl`, `check:registry` and `check:tokens`. The first stage prints
  `All files pass linting.` even when a later stage fails, so run
  `pnpm lint; echo $?` and trust the code, not the output. CI runs **nine
  gates** on every PR: `lint`, `test:coverage`, `check:api-docs`, `check:llms`,
  `check:css-vars`, `build:lib`, `build:showcase`, `check:theme` and
  `check:a11y` — the last two need the prerendered site, which is why they sit
  after the showcase build. `check:contrast`, `check:state-a11y` and
  `check:rtl-layout` need a real browser and run nightly instead, so a green PR
  says nothing about painted contrast or RTL overflow.

## Setting up your editor

ESLint flat config + Prettier are configured. Any modern editor will pick
them up. If you use VS Code, enable "Format on save" with Prettier as the
default formatter.
