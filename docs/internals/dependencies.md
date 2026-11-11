# Requirements and dependencies

Part of [AGENTS.md](../../AGENTS.md). Read this before changing Node, pnpm, `engines`, peers or a dependency.

**Requirements are in `package.json` and nowhere else — read them there.**
`engines` carries the Node and pnpm ranges, `packageManager` the exact pnpm,
`.nvmrc` the Node CI runs, and `devDependencies` the Angular and TypeScript the
repo builds against. No version is restated in this file, in README.md or in
CONTRIBUTING.md: a copy is a claim that goes stale silently, and CONTRIBUTING
carried four wrong ones for exactly as long as it took someone to look.

The shape, which the manifest does not explain: the Node range is Angular's own,
arm for arm, with the same majors and the same minimums, and one difference.
Angular leaves its newest arm open-ended (`>=`) and `engines` closes it at that
major (`^`), so `devEngines` refuses a Node major the repository has never run.
Compare the two when Angular moves its range. `.nvmrc` and
every workflow run the newest of them; the nightly covers Node 22 and 24.

**The version guard is `devEngines` in `package.json`, and `.npmrc` is empty on
purpose.** It used to carry `engine-strict=true`, and pnpm reads no behavioural
setting from that file — measured on 11 and on 12, both of which apply
`node-linker=hoisted` from `pnpm-workspace.yaml` and ignore it from `.npmrc`. Nor
does `engines.node` refuse on its own: an incompatible range prints a warning and
the install carries on, so without `devEngines` the next failure is somewhere
inside a build. What that
file IS still read for is npm-compatible registry and auth config, which is why
it is kept with a comment rather than deleted — it is where someone would
otherwise re-add a setting that does nothing. `devEngines.runtime` refuses with a clear message;
keep its range equal to `engines` by hand, since v15 removed the spec that held
the two together. **`devEngines.packageManager` is deliberately absent**: npm reads
`devEngines` too, and an entry naming pnpm makes every npm invocation in the
repo fail `EBADDEVENGINES` — including the `npx commitlint` in the commit-msg
hook, which is how it was found, on the commit that added it. The pnpm version
is pinned by `packageManager` and enforced by corepack, which is the mechanism
that actually does the work.

**A pnpm major is verified against Dependabot, because nothing else notices it
breaking.** The repository ran pnpm 12 from 2026-09-07 to 2026-09-13 and went back
to 11 without a single red run. A pnpm 12 lockfile is a stream of two YAML
documents, the package manager's own pin first and the dependency graph second, and
GitHub read only the first
([dependabot-core#15904](https://github.com/dependabot/dependabot-core/issues/15904)):
it saw no npm dependency at all, and closed eleven open alerts as fixed while
`pnpm audit` still reported every one of them. Version updates failed another way:
the updater could not download the pnpm the manifest names
([#16095](https://github.com/dependabot/dependabot-core/issues/16095)), and that
stayed invisible for six days, because a run with nothing past the cooldown never
invokes pnpm and reports success. Both were fixed upstream, and the repository
moved to 12 for good on 2026-11-04. Measured on that commit:
`gh api repos/thekhegay/ngwr/dependency-graph/compare/<before>...<after>` returned an
empty diff with no snapshot warning, the SBOM kept all its packages, the one open
alert stayed open, and a manual "Check for updates" finished with no
`Could not download the pnpm`. Repeat those on the next major. Angular running a
version says nothing about this: `angular/angular` updates through Renovate.

**`minimumReleaseAge` was considered for the supply chain and rejected on
evidence.** A cooling-off window on newly published versions is the right idea
for a repo whose publish job holds an OIDC token — but pnpm applies it to
`--frozen-lockfile` too, so a Dependabot PR naming a version younger than the
window fails CI until the clock catches up. Verified: a lockfile pinning
`@types/node@26.4.1` under a long window refuses to install at all. The cooling
off belongs where versions are CHOSEN — Dependabot's own `cooldown` — not where
they are installed.

**The `@angular/*` peers are a caret on the MINOR the repository builds with,
never an open `>=`.** Angular's library guide supports an app only on the same
or a newer Angular than the one that built the library, so the published
package is built on the lowest version it promises, and the minor counts as
much as the major. 15.0.0 promised `^22.0.0` while building on 22.2:
`ngwr/schema-form` imports `isFieldTree`, which arrived in 22.1, and
`ngwr/sidebar` imports `containsTree`, which arrived in 22.2, so an app on
22.1 failed its build on an export that did not exist. `package.spec.ts` holds
each peer's floor to the major and minor of the version the repository
installs, so a bump to a new Angular minor is red until the peers move with
it. A newer framework major joins the range in a release once a CI job has run the suite on it; building on that
major instead would break every app still on the one below. v14 shipped
`>=22.0.0`, which promised every future major untested, and v15 closed it. The
library builder does not force the move: `@angular/build:library` arrives in a
minor of the current line, and its `@angular/compiler-cli` peer is that line.

**Dependencies.** Check with `pnpm outdated` (one shot — don't query packages
one by one). Angular **tooling** (`@angular/cli`, `@angular/build`,
`@angular-devkit/*`, `@schematics/angular`) patches independently of the
**framework** (`@angular/core` et al.) — bump only the train that moved.
**`@angular/build` is held on the 22.3 prerelease on purpose**, because
`@angular/build:library` ships there: move it to `^22.3.0` once that is stable,
and do not align it with the framework train before then.
Dependabot (grouped, checked daily) handles the PRs — one per group, and `groups` does NOT cross ecosystems, so the npm groups say nothing about GitHub Actions bumps (those have their own group, minor/patch only; a major action bump still arrives alone so it cannot be merged unread). **TypeScript is pinned on purpose** to
the 6.0 line (a tilde range in `devDependencies`) — Angular 22's peer range is
`typescript >=6.0 <6.1`, and TypeScript 7 is out. `.github/dependabot.yml`
carries one `ignore` for it, `>=6.1`, which covers TypeScript 7 too, and holds
`vitest` below 5 the same way: the unit-test target
runs through `@angular/build:unit-test`, and `@angular/build` declares a 4.x
`vitest` peer. Revisit that one when the peer widens. If either bump appears in
a PR anyway, it came from somewhere other than the bot; don't take it. The matching `@types/node` ignore is GONE — the types and the runtime moved
to 26 together, and they have to keep moving together: types ahead of the
runtime describe APIs that are not there, which type-checks clean rather than
failing.

**The runtime is Node 26, and one thing about the jsdom suite came with it.**
Angular 22 accepts three Node majors, so `.nvmrc` and every
workflow moved to the newest — but Node 25 unflagged the Web Storage API and Node 26
leaves `localStorage` on `globalThis` as `undefined` unless `--localstorage-file`
is passed. The key existing is enough: vitest skips window keys that are already
on the global, so jsdom's own `localStorage` never lands and forty-six specs
across six unrelated files fail on one root cause. `projects/lib/vitest-setup.ts`
(wired through `setupFiles` in `angular.json`) installs the library's own
`wrCreateMemoryStorage()` when the name is taken and empty, and does nothing on a
Node that supplies a working one. **Not `--no-webstorage`**, which fixes it at
the source and does not exist on Node 24 — it is refused inside `NODE_OPTIONS`
there — so a repo whose `engines` accepts both cannot set it statically. Upstream
is not coming: vitest closed the collision as not planned. The LIBRARY was never
affected — `storage-engine.ts` already falls back to memory on a missing
`localStorage` — which is what makes this scaffolding rather than a product fix.
`engines` still accepts 22 and 24 — both LTS, to April 2027 and 2028 — so the
nightly `legacy-node` job runs `pnpm test` and `build:lib` on each.
`Intl.Locale.prototype.getWeekInfo` does not exist on Node 22, and
`WrNativeDateAdapter.getFirstDayOfWeek` carries a fallback for it.
