# Versions and releases

Part of [AGENTS.md](../../AGENTS.md). Read this before changing a version, a release, the `next` branch or a codemod.

**v12 carried two BREAKING changes, and they are the reason it was a major.**
Kept here as history, because both still shape the catalog a reader sees today.
What breaks on the CURRENT upgrade is listed in `MIGRATION.md` under "v14 to
v15" and on `/docs/migration`; the Versioning section below covers release
mechanics and codemod policy.

**One — the date entry points moved**, from `ngwr/date-adapter` to
`ngwr/date`, from `ngwr/date-adapter-fns` to `ngwr/date/adapters/fns` and from
`ngwr/date-adapter-luxon` to `ngwr/date/adapters/luxon`, so the catalog nests
implementations under their feature the way `ngwr/icon/adapters/*` did until
v15 removed them. Import paths only — every symbol keeps its name, and these
entry points ship no styles, so no `@use` path moves with them. `migration-v12`
rewrites all of it, which is what makes this a codemod rather than a release
note: a path is exactly what a codemod can move without reading the code around
it. v15 then removed the two date adapters, leaving `ngwr/date` alone, and the
codemod still rewrites to their paths — which fail the build rather than
resolve to anything.

**Two — `readI18nText()` returns `Signal<string>`.** Exported from `ngwr/i18n`,
it returned `string`, so every call site needs a `()`. A fix rather than a
refactor: `WrI18n` writes every loader-backed catalog from
`firstValueFrom(...).then(...)`, which lands a microtask AFTER the first
change-detection pass, so the old one-shot read froze the ENGLISH fallback for
the life of the app — a `<wr-date-picker>` announced "Открыть календарь" on the
field and "Open calendar" on the button beside it, off the same key. A sync read
cannot be correct against an async catalog, so the type had to move. Deliberately
NOT codemodded: adding `()` means knowing which identifiers hold the result, and
a wrong guess is a silent behaviour change — whereas the type error names every
site. `useI18nText`, the `wrT` pipe and the `[wrT]` directive are untouched.

Both are still on the user-facing migration guide at `/docs/migration`, which
carries every step back to v6. **The newest section is the one a consumer
follows** (`ng update ngwr`) — the guide is ordered newest-first for that reason.

**Versioning.** **v15 is the current major line, on `main` and npm's
`latest`;** `next` carries the release after it, a minor or a major. `projects/lib/package.json`,
the `NGWR_VERSION` constant, the `SECURITY.md` support table and
`CHANGELOG.md` are written by `release:prepare`, so read the version from there
rather than from this file, and never hand-edit any of the four. A FIFTH copy
is generated rather than written — `#core/generated/quality.ts`, which the
site's printed counts bind to — and it shipped stale on two consecutive releases
because `release:prepare` did not run `gen:quality`. `release.yml` runs it now,
in its own step after the bump. Don't bump the
version by hand either — releases are cut from Actions, by running the "Release
PR" workflow with its `bump` input, which runs `pnpm check:release`, then
`release:prepare` / `release:body`, and opens a `chore(release)` PR. Merging it does not put the
version on npm: `publish.yml` runs `npm stage publish`, and the version is
installable once the maintainer approves it with 2FA (`npm stage approve` or
the package's Staged Packages tab). What makes a compromised run unable to ship
is the trusted publisher on npmjs.com having direct `npm publish` switched off;
every configuration may stage by default, so that holds only while no
configuration on the package allows a direct publish. ngwr.dev deploys from the
same push, and the `production` environment that deploy runs in requires the
maintainer's approval too: approve the npm stage first and the deploy second,
or the site and its "Added in" marks run one version ahead of npm. Before any
of that, `publish.yml` runs `pnpm release:check`: the CHANGELOG section is
written when the release PR is cut, so a feat or fix merged into main
afterwards would ship in the tag with no line anywhere, and the job refuses
until the Release PR workflow is run again with the same bump.

**The next release lives on the `next` branch, and it is a minor as often as
a major.** Its release candidates are cut by running the same workflow there
with `bump: rc`, which reads the commits since the last stable tag: breaking
ones give `16.0.0-rc.0`, library features (a `feat` not scoped `showcase`) give
`15.1.0-rc.0`, anything else `15.0.1-rc.0`, and a later run counts the rc up.
It opens the release PR against `next` and stages npm under the `next`
dist-tag. Every push to `next` redeploys `next.ngwr.dev` (`deploy-next.yml`,
the `next` environment, no approval; the server marks the host noindex), and
its banner names the candidate, or no number before the first one. The SECURITY
table moves only with a stable major, and a stable version can only publish
from `main`.

**Shipping next as a stable release, and the two sites stay apart.** Merge
`next` into `main` through a branch cut from it (`git switch -c ship-15.1
origin/next`, then `gh pr create --base main`), never with `next` itself as the
head: the repository deletes a merged head branch, and merging #974 deleted
`next`. Then run the Release PR workflow on `main` with `minor` or `major`.
After the release, bring `next` up to `main`. A stable release commit that
reaches `next` that way neither redeploys next.ngwr.dev nor fails `Publish`
(its tag already exists), and an rc on `next` never touches production:
ngwr.dev deploys only on a stable release commit on `main`, and only a stable
major archives the one it supersedes.

**Work for the next release branches from `next`, not from `main`.** Open the PR with
`gh pr create --base next`, since `gh` targets `main` by default, and resync
after a merge with `git fetch --prune origin && git merge --ff-only origin/next`.
**No PR CI and no nightly run on `next`**: `ci.yml` triggers on `main` only, and
the nightly checks `main`. The only automatic signals are `deploy-next.yml`'s
`build:showcase` after a push and `check:release` when an RC is cut, so a PR
into `next` merges with nothing checked.

**Whether a major ships a codemod is decided by one rule, and the rule is about
the SHAPE of the break rather than its size: a codemod runs when the new form
means what the old one meant in the same place — a name, a path — and is refused
when repairing the break needs a value only the app knows.**
`schematics/migrations/` holds **v7, v8, v9, v12, v13, v14 and v15**, and every gap in
that sequence is a position rather than an oversight:

- **v10 and v11 ship none, and must not.** v10's three breaks were all
  CSS/token-level — WCAG contrast on `--wr-color-*-contrast`, table header
  casing, tooltip theming — and v11's was the same shape: five intents deepened
  so their labels can be white (see Styling). Painted colour is not something a
  codemod can repair, and an empty `migration-v10` would tell consumers their
  visual regressions were handled when they were not.
- **v12 resumed the sequence**, and the contrast with v10 / v11 is the whole
  rule: it moved three import paths, which is exactly what a codemod moves
  without reading the code around it. v12 also carries the largest defect sweep
  the library has had: 257 confirmed and fixed across six passes — five reading
  code (SSR, teardown, zoneless, cross-component consistency, hard-coded strings,
  untrusted input, harnesses, config, package surface, edge inputs, performance,
  APG and WCAG criterion by criterion) and one measuring PIXELS in a real
  browser, which found 58 on its own and is the lens the other five could not
  apply.
- **v13 ships `migration-v13`, and it rewrites nothing on purpose.** Its one
  breaking change stopped `[id]` landing on the HOST of `<wr-checkbox>` /
  `<wr-radio>` / `<wr-switch>` — the id goes to the inner `<input>`, where the
  input was always documented to put it, and where `<label for>` can reach a
  labelable element again. A codemod can FIND every `wr-checkbox#agree`, and
  deliberately rewrites none: whether that selector should become `#agree` (the
  tick), `wr-checkbox:has(#agree)` (the row) or a class is a decision only the
  author can make, and a selector that stops matching is silent in CSS, in
  `querySelector` and in a test locator alike. So it reports — the same half of
  the rule `migration-v14` uses.
- **v13's commit subject announced a rename it did not make, and v14 made it.**
  `feat!: … and input size loses its prefix` promised `[wrInput]`'s `wrSize`
  input as `size`, and the directive shipped `readonly wrSize` unchanged through
  v12.2.0, v13.0.0 and v13.0.1. The gap was live for a release: the migration
  guide repeated the note, and following it wrote a static `size` that
  `strictTemplates` accepts as an unknown attribute while the control falls back
  to `md`. v14 performed the rename for real and `migration-v14` rewrites it,
  anchored on the DIRECTIVE rather than the tag, because `size` is a legal
  native attribute and rewriting one that was never ngwr's would silently
  rebind a character-width hint. The published v13 changelog cannot be edited;
  the docs that repeated it were corrected.
- **v15 ships `migration-v15`, because the maintainer asked for it on
  2026-10-23.** A first one was written during v15 and deleted on 2026-10-16
  under the one-consumer rule of 2026-10-02 (a removal is deleted outright,
  with no deprecation and no codemod). The request reversed that for the
  release: the migration guide, the codemod, the schematics and the showcase's
  New and Updated marks ship together. It splits down the middle of the
  rule like v14's. It REWRITES the twenty-eight chart and bit paths (from
  `ngwr/<name>` to `ngwr/charts/<name>` or `ngwr/bits/<name>`), from
  `ngwr/drag-drop` to `ngwr/sortable-list` and from
  `ngwr/icon/adapters/lucide` to `ngwr/icon`, in TypeScript, Sass and JSON;
  the five config calls and `provideWrTheme()` into one `provideWr()` with a
  feature each, imports included, but only where each call is a plain entry of
  a providers array, because there the feature keeps the injector, the order
  and the options; every `rgba(var(--wr-…-rgb), a)` it can read into
  `color-mix()`; the READS of the neutral tokens MIGRATION.md maps one to one;
  and the two values named after a removed intent. It REPORTS the rest by file
  and line, counted in the file as the rewrite left it: the umbrella, a removed
  intent anywhere, `[data-theme]` and `theme.dark`, a token DECLARATION
  (setting `--wr-color-medium` restyled a fill in v14, and the same value on
  `--wr-color-on-surface-muted` would restyle text), a second provider call of
  one kind in one array (the same feature twice throws in dev mode), every
  removed entry point and provider, the sortable list's loop, the sidebar and
  the validation copy. Three things about it are easy to break. A declaration
  is any place a name is SET, not only `name:` — a `[style.--…]` binding,
  `setProperty()`, Renderer2's `setStyle()`, a style-object key — and the first
  version renamed all four as reads; the rename and the report share one list
  of those positions so a skipped name is always listed. It is registered
  as `15.0.0`, which `ng update` runs for an rc target and re-runs for an app
  already on an rc (rc.0 and rc.1 shipped without it), so every rule has to
  stay idempotent — the spec runs it twice. And it moves a provider or edits an
  import only in CODE, read through a view with strings and comments blanked:
  a docs snippet holds `providers: [...]` and `import` lines too, and the first
  run over the v14 showcase edited a real import because of one. Do not write
  a migration for a later major unless the maintainer asks for one; the shape
  rule above says what such a rule may rewrite.
- **v14 ships `migration-v14`, split down the middle of the rule**, and that
  split is the thing to copy. It REWRITES the six renames — on `<wr-alert>`
  from `closeable` to `closable`, on `<wr-table>` from `totalItems` to `total`,
  on `<wr-pagination>` from `currentPage` to `page` (and from
  `currentPageChange` to `pageChange`), from `isDisabledWhenLoading` to
  `disabledWhenLoading`, the window `chromeSize` scale from
  `'compact' | 'normal'` to `'sm' | 'md'` (the
  `.wr-window--chrome-compact` class included), and `[wrInput]`'s `wrSize` to
  `size` — the rename v13's own commit subject announced and never made, which
  is why its rules are anchored on the DIRECTIVE rather than on the attribute
  name: `size` on a bare `<input>` is a legal HTML attribute meaning something
  else entirely. It REPORTS the rest, naming files
  rather than touching them: router integration is now opt-in
  (`<wr-loading-bar>` needs `provideWrLoadingBarRouter()` from
  `ngwr/loading-bar/router`, a `<wr-tab routerLink>` needs `wrTabsRouting` on
  the strip plus `WrTabsRouting` in `imports`), `WR_DATE_LOCALE` and `WrI18n`'s
  `defaultLocale` / `availableLocales` now resolve from Angular's `LOCALE_ID`
  instead of the browser, and `<wr-pagination ofLabel>` is gone
  with the `pagination.of` key — the range is one `pagination.range` template.
  A migration that pretended to have handled any of those would be worse than
  none, because the silence reads as "nothing to do".
