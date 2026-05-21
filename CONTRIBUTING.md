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
pnpm lint             # lint lib + showcase + scripts
pnpm generate:icons   # regenerate icon constants from SVGs
```

Requirements:

- Node `^22.12 || ^24`
- pnpm `^11`

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

We follow [Conventional Commits](https://www.conventionalcommits.org/). The
PR title is enforced; individual commits inside the branch are not. Common
types:

| Type | When |
|---|---|
| `feat` | new feature or capability |
| `fix` | bug fix |
| `perf` | performance improvement |
| `refactor` | neither feature nor fix |
| `docs` | documentation only |
| `test` | tests only |
| `build` | dependency or build pipeline change |
| `ci` | GitHub Actions change |
| `chore` | tooling, cleanup |

Add `!` after the type for a breaking change: `feat(button)!: drop legacy color prop`.

Scope is the component or area in kebab-case: `feat(button)`, `fix(select)`,
`docs(icon)`, `ci`.

## Pull requests

1. Branch from `main`.
2. Make focused changes — one PR per concern.
3. Run `pnpm lint && pnpm build:lib && pnpm build:showcase` before pushing.
4. PR title must be a valid conventional commit (CI enforces this).
5. Fill in the PR template — describe **what** changed and **why**.
6. We use **squash merge** so the PR title becomes the commit on `main`.

The maintainer cuts releases via the
[Release PR](./.github/workflows/release.yml) workflow — contributors don't
need to bump versions.

## Adding a new component

Each component is its own ng-packagr secondary entry point. Use an existing
small component (`projects/lib/badge` is a good template) and replicate the
structure:

```
projects/lib/<name>/
├── ng-package.json
├── index.ts
├── public-api.ts
├── <name>.component.ts        # standalone, OnPush, encapsulation: None
├── <name>.component.html
├── styles/_index.scss
└── types/index.ts             # only if you have public types
```

Then:

1. Add the entry to the umbrella SCSS at `projects/lib/styles.scss`.
2. Add the entry to `projects/lib/package.json` `exports` map.
3. Add a docs page under `projects/showcase/app/docs/components/<name>/`.
4. Add a sidebar link in
   `projects/showcase/app/_layout/sidebar/sidebar.component.ts`.

## Style guide

- **Standalone, signals-first.** Use `input()`, `model()`, `output()`,
  `signal()`, `computed()`, `effect()`, `viewChild()`, `contentChildren()`.
- **OnPush + zoneless-friendly.** No `setTimeout` to nudge change detection.
- **CDK for primitives.** Overlay, portal, a11y, focus management — use
  `@angular/cdk`, not custom code. Always inject `WR_OVERLAY` (not
  `Overlay`) so isolation works.
- **CSS custom properties scoped per component.** Component styles read from
  `--wr-*` tokens; consumers can override per-instance.
- **Lint is the source of truth.** If `pnpm lint` is green, you're good.

## Setting up your editor

ESLint flat config + Prettier are configured. Any modern editor will pick
them up. If you use VS Code, enable "Format on save" with Prettier as the
default formatter.
