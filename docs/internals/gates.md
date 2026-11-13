# Gates

Part of [AGENTS.md](../../AGENTS.md). Read this before changing a lint stage, `check:api-docs` or a CI tier.

### Linting — read before trusting a green run

`pnpm lint` is **multi-stage**: `ng lint` (lib, then showcase) `&&`
`eslint scripts` `&&` `stylelint` `&&` `check:rtl` (`scripts/check/rtl.ts`, see RTL below) `&&` `check:tokens` (`scripts/check/tokens.ts`
— a `var()` read of a theme token nothing declares) `&&` `check:generated`
(`scripts/check/generated.ts`), which runs three checks in one process, in this
order, each still a script of its own: `check:selectors`, `check:attrs` and
`check:install`. One process starts tsx once and lexes the library once, where
three did both three times and twice. `check:selectors` is `scripts/gen/selectors.ts --check` — the committed
`#core/generated/selectors.ts` against what the generator produces now, the same
`--check` shape `gen/css-vars.ts` and `gen/api-docs.ts` use. It reads source and
`projects/lib/package.json` only, which is why it is a lint stage where
`check:css-vars` is a CI step. Before it existed the generator wrote the file
unconditionally, so a run meant to inspect the drift created it instead, and a
stale copy sat in the tree for two days after a `lucide` bump. **Keep the root
`package.json` out of the generated map**: it once carried `lucide`'s range, so
every Dependabot bump of it failed this stage until someone regenerated. It
runs before the next two checks because both read that map). `check:attrs` is
(`scripts/check/unknown-attrs.ts` — a STATIC attribute on an ngwr element that
is none of its inputs, which `strictTemplates` accepts because an unknown
attribute on a custom element is legal HTML), and `check:install` is
(`scripts/gen/install.ts --check` — the committed `#core/generated/install.ts`
against the generator) — and the last stages are the ones that most often turn
a green-looking run red. The first stage prints `All files pass linting.` even
when a _later_ stage fails — so **verify by exit code, never by grepping the
output**:

```sh
pnpm lint; echo $?     # 0 = actually green
```

Autofix most issues (prettier wrapping long template lines, etc.) with
`pnpm exec ng lint <lib|showcase> --fix`.

**`check:api-docs` compares three columns and re-derives the generated file, and
its blind spots are worth knowing before you re-derive them.** It reads every
page documenting an API — hand-written `DocApiRow` arrays and pages consuming
`API.Wr*` alike — and holds each to the library: names, `default`, and since v12
`type` as well. The type column was compared nowhere before that, on any page, so
a docs table could say `number` for a `string` and every gate stayed green; that
is closed for every page mapped to an entry point and for every row of
`_core/generated/api.ts`, which the run now re-serialises in memory and compares
against the committed file. **The counts are printed by the run itself — read
them there rather than from this file**, which carried `107 pages` and `933 rows`
long after both had moved. A page expanding a named alias (`'sm' | 'md' | 'lg'`
for `WrKbdSize`) is accepted, and editing the alias in `projects/lib` indicts
every page that spelled the old union out. Outputs print the PAYLOAD, bare —
`void`, `Blob`, `{ text: string; index: number }` — never a wrapper;
`EventEmitter` is wrong for every one of them, since `output<T>()` returns
`OutputEmitterRef<T>` and the library has not used an `@Output()` since v7.

Four things it cannot see, all measured rather than assumed. **A member the
extractor never read is invisible from birth** — `unreadMembers()` re-reads the
library under a wider rule and names anything `MEMBER_RE` missed, so a member
that STOPS being read is caught (and the run then says *not* to regenerate,
because baking the loss in is the failure mode), but a class whose
`public-api.ts` uses `export *` is filtered out of both reads and cannot be
witnessed at all. **The pages documenting something else** — guides, utils,
validators, interfaces — carry the rows nothing compares (the run prints both
counts; the difference between its `hand-written row(s)` and its `type(s)
compared` IS that number). It is not a hypothetical: a sweep of those rows found
fourteen wrong, including a parameter type that does not compile
(`wrIsNonEmptyArray` takes `WrMaybe<T[]>`, not `readonly T[]`), an error payload
documented as `true` where the validator returns an object, and a second
argument documented as an optional scope where the function requires a fallback
string. A wrong type there is silent. **The comparison never opens a
template**, so a row is "documented" even when no `<ngwr-doc-api>` renders it, and 47 generated rows ship `description: "—"`
because the member carries no JSDoc. And **a hand-written row for a REQUIRED
input is exempt from the existence half**, since `DocApiRow` tells authors to
omit `default:` for those and that is the field the check keys on — 17 rows on
15 pages, so deleting a required input leaves its docs row standing. Union
ORDER and a different alias with identical arms are admitted deliberately: both
are value-set identities, and no binding changes.

### Three tiers

| Tier    | Workflow                                     | Runs                                                                                              |
| ------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| PR      | `ci.yml`, PRs into and pushes to `main`      | `lint`, `test`, `check:api-docs`, `check:css-vars`, `build:lib`, `check:package`, `build:showcase` |
| Nightly | `nightly.yml`, 20:00 UTC                     | `build:showcase` once, then `check:a11y`, `check:contrast`, `check:state-a11y`, `check:layout` and `check:rtl-layout` on its `dist/showcase`; `test` + `build:lib` on Node 22 and 24 |
| Release | `release.yml`, before it cuts the release PR | `pnpm check:release`: the PR set plus the five site checks                                        |

**`check:nav` is the last step of `build:showcase`** (`scripts/check/nav.ts`),
so it runs in every tier that builds the site, `check:release` included, with no
workflow edit: it reads `dist/showcase/prerendered-routes.json` and the sidebar
configs (imported through tsx like the route tree), and fails on a nav row with
no prerendered page or a prerendered page with no nav row. Nothing is listed by
hand: a redirect stub is read off its meta-refresh HTML, a page served by an
underscore directory (`_home`, `_labels`, `_core/components/doc-index`) is site
scaffolding, and a row the router serves but the build did not prerender is a
client-rendered page (the six raw-SVG icon galleries). A prerendered route the
route walk serves nowhere fails as a stale build. `pnpm check:nav` runs it alone
on an existing `dist/showcase`.

The nightly skips every job when `main` is still at the commit the last
finished nightly checked; a manual dispatch always runs. A failed job opens one
`Nightly failed` issue (or comments on the open one) with the date, the SHA,
the run and the failed jobs, and the next green nightly closes it. The lists
are parsed into `prGates` / `nightlyGates` in `#core/generated/quality`.
`pnpm check:nightly` and `pnpm check:release` run a tier by hand (Playwright's
Chromium needed; the Node 22 / 24 job has no local twin) — not to be confused with
`release:check`, the CHANGELOG guard in `publish.yml`, which also re-runs
`pnpm lint` + `pnpm build:lib` before it ships. Commit subjects are checked by
the commitlint `commit-msg` hook; PR titles are not, since a rebase merge
never puts one in the history.

**[ngtrue](https://ngtrue.khegay.dev) checks the controls and the package.** It
is a dev dependency with two halves here. `form/signal-forms-conformance.spec.ts`
runs `assertSignalFormsControl` from `ngtrue/testing` on every public Signal
Forms control, a fresh fixture each, and fails when a control the source
declares is missing from its table (the Forms grep, `internal/` left out).
`pnpm check:package` (`scripts/check/package.ts`) runs the eight `ngtrue/node`
packaging checks after `build:lib`: seven read `dist/lib`, and
`peerDependencyMismatches` reads `projects/lib`, since it scans imports.
`unloadableEntryPoints` imports every entry point unlinked, as a server would,
so a top-level browser global or an import cycle fails it. The exceptions sit in
each check's own `ignore`, with the reason beside it — the `./i18n/*.json` and
`./schematics/*` wildcards, which no check can probe — and ngtrue reports an
entry that excuses nothing, so the list cannot outlive what it was written for.
