# MCP server and schematics

Part of [AGENTS.md](../../AGENTS.md). Read this before changing the MCP server, a schematic or a migration.

## MCP server

`projects/lib/mcp/` is NOT an Angular entry point — it is a Node CLI shipped in
the same tarball, built by `scripts/build/mcp.ts` into `dist/lib/mcp/` and exposed
as the `ngwr-mcp` bin. It mirrors how `schematics/` is built: its own
`tsconfig.json` (extending the root, so the repo's strictness applies), `tsc -p`,
and a step in the `build:lib` chain.

Four tools over stdio JSON-RPC — `search_ngwr`, `get_ngwr_component`,
`get_ngwr_api`, `get_ngwr_setup`. **It adds no second copy of the catalog**: it
reads `llms-full.txt`, `schematics/use/symbol-map.json` and `types/*.d.ts` out of
its own installed package, which is the only reason it can never drift. Two rules
if you touch it: nothing may write to stdout except protocol JSON (a stray
`console.log` corrupts the stream and the client drops the connection), and every
branch must end in exactly one reply per request and none for a notification — a
client that never receives a response for an id does not fail, it waits.

## Schematics

The lib ships an `ng` schematics suite — source in `projects/lib/schematics/`
(`collection.json` + a dir per generator), built by `scripts/build/schematics.ts`
(which also generates `use/symbol-map.json` from a public-api scan):

- `ng add ngwr` — prompts for styles / density, installs peers, prints a
  tailored bootstrap snippet; a picked density arrives as
  `provideWr(withDensity({ defaultDensity }))` and writes `@use 'ngwr/density'`
  after the theme line in a Sass stylesheet (a CSS or Less one gets the line in
  the printed message instead).
- `ng g ngwr:use WrFoo --path path/to/cmp.ts` — adds the import + splices it into
  the component's `@Component` imports. Only `symbol` is positional; `path` is a
  named option, so passing it bare fails with `Unknown argument`.
- `ng g ngwr:provider <name>` — splices a provider into the app config:
  `density`, `toast`, `storage` and `theme` as features INSIDE the array's
  `provideWr(...)` (added, with its import from `ngwr`, when there is none),
  `icons`, `i18n` and `loading-bar-router` as calls of their own. `density`
  also writes `@use 'ngwr/density'` into the global stylesheet, after the
  theme, since the feature does nothing without that sheet. `withMeta()` and
  `withDates()` are not offered: each carries a value only the app knows.
- `ng g ngwr:icon-set` / `ngwr:component-style` / `ngwr:page` — icon barrel /
  per-component `@use` / starter pages.
- `ng update ngwr@<latest major>` — ONE command from any earlier major. The CLI
  installs the target, then runs every migration in the TARGET's
  `migrations.json` whose version is above the installed one and at or below
  the target, in order, so an 8.x app gets v9, v12, v13, v14, v15 and v16 in
  one pass. "At or below the target" is read with the target's prerelease
  stripped (`executeMigrations` in the CLI's `utilities/migration.js`), which
  is why `migration-v15` at `15.0.0` runs for an rc target too.
  **Never document stepping through the majors, and never a 7.x, 8.x or 9.x
  target.** Every release from 7.0.0 to 9.1.0 ships CommonJS schematics under a
  `"type": "module"` manifest with no nested `schematics/package.json`, so
  `ng update ngwr@7` / `@8` / `@9`, `ng add` and every `ng g ngwr:*` against
  them die with `exports is not defined in ES module scope`; 10.0.0 is the first
  release carrying the `{ "type": "commonjs" }` manifest
  `scripts/build/schematics.ts` writes. A step that failed that way had already
  moved `package.json` and the lockfile, so a later `ng update ngwr@14` starts
  from that release and silently skips its migration — `MIGRATION.md` carries
  the recovery. The CLI's "migrate each major version individually" refusal is
  Angular's own: it matches `@angular/*` and `@nguniversal/*` only
  (`ANGULAR_PACKAGES_REGEXP` in `@angular/cli`'s update command) and never
  applies to ngwr, so it is no reason to restore step-through advice.
  Migrations, one dir per major under
  `schematics/migrations/` (v7 tag rewrites, v8 density/pagination renames,
  **v9 `<wr-checkbox>` from `value` to `checkboxValue`**, **v12 from
  `ngwr/date-adapter*` to `ngwr/date` and `ngwr/date/adapters/*`** (v15 removed
  the adapters it rewrites to), **v14 the six vocabulary
  renames, plus a report for the router / locale / `ofLabel` changes no codemod
  should guess at**, whose date-locale warning names both spellings, the v15
  `provideWr(withDates({ locale }))` and the v14 `provideWrDateAdapter({ locale })`),
  **v15 the chart, bit, sortable-list and Lucide paths, the config calls into
  one `provideWr()`, the `-rgb` reads into `color-mix()`, the neutral token
  reads and two values, plus a report for everything that needs a decision**,
  **v16 the `wr` / `WR_` / `Wr` prefix on the functions, constants and types
  imported from ngwr, matched by binding with the TypeScript checker, plus a
  report for `ngwr/animations/core`**,
  plus **v13, which reports every host-`id` selector on `<wr-checkbox>` /
  `<wr-radio>` / `<wr-switch>` and rewrites nothing** — all
  registered in `schematics/migrations.json`. There is deliberately no
  `migration-v10` or `-v11`; see Versioning for why each is absent.

**A codemod pattern that steps over quoted values must use the quote-safe form,
`(?:"[^"]*"|'[^']*'|[^>"'])*?`, and carry a timing spec.** The ambiguous
spelling, whose `[^>]` fallback also consumes a quote, froze
`ng update ngwr@14` on ordinary templates in every 14.x release up to 14.5.0: a
pairing that starts at a CLOSING quote jumps over `/>` into later elements, so an
element without the attribute a rule is after sends the search across the rest of
the file, with exponentially many parses in the number of quotes that follow.
`ng update` commits each migration's tree separately, so v12 and v13 were written
and v14 was silently lost. The timing specs in `migrations/v{7,8,9,14}` keep their
fixtures small on purpose — a catastrophic regex is synchronous, vitest's timeout
cannot interrupt it, and a fixture that costs the old form seconds rather than
hours is what makes a regression fail instead of freezing the suite.
