# Showcase pages

Part of [AGENTS.md](../../AGENTS.md). Read this before changing a docs page, a mark, a printed claim or the AI assets.

**Showcase page = the docs.** Every component ships a docs page, and a new
one takes four steps, all under `projects/showcase/app/`:

1. Create the page in `reference/components/<group>/<name>/`,
   `charts/<group>/<name>/` or `animations/<group>/<name>/`. The group folder is the
   sidebar group (buttons, data, display, feedback, form, layout, navigation
   and overlays for components; comparison, trend, part-to-whole,
   distribution, single-value and building-blocks for charts; text,
   backgrounds and interaction for animations) and never part
   of the URL.
2. Add its node to `ROUTES` in `_core/constants/routes.ts` (imported as
   `#routes`): its own URL segment and its title, the one tree every route and
   nav row reads.
3. Add a `loadComponent` row to the `routing.ts` beside the page's folder,
   e.g. `{ path: components.qrCode.path, loadComponent: () => import('./qr/qr') }`.
4. Add a `wrLink(...)` row to the sidebar config in
   `_layout/sidebar/configs/`: `COMPONENT_GROUPS` in `components.config.ts`,
   `charts.config.ts` or `animations.config.ts`.

Author it with the doc-page components from
`#core/components`: `<ngwr-doc-page>`,
`<ngwr-doc-section>`, `<ngwr-doc-code>` (code blocks), `<ngwr-doc-snippet>` (live
demo), and `<ngwr-doc-api>` (API table). A component isn't done without it.

**The Installation section is rendered by the SHELL, from the page's own
imports.** `pnpm gen:install` writes `#core/generated/install.ts` — route →
`{ path, symbols, styled }` — and `<ngwr-doc-page>` draws the section from it as
two tabs, the TypeScript import and the `@use`. It replaced 128 hand-written
copies of the same two-line recipe, and the reason it had to is v15: removing
the `@use 'ngwr'` umbrella made the style entry load-bearing, and **not one of
the 128 mentioned it** — three pages out of the whole catalog showed a `styles`
snippet at all. A page that shows the import and omits the `@use` teaches half
an installation, and the omitted half fails silently, with the component
rendering unstyled and nothing in the build or the console to say so. Two things
it reads deliberately: the page's OWN imports rather than the selector map,
because a docs page imports exactly what it renders while an entry point exports
more; and the page's own entry point FIRST, because the select page pulls
`ngwr/avatar` for an option template and a recipe opening with someone else's
entry point reads as though you need it. Template literals are stripped before
the scan — a docs page is full of snippet strings containing `import … from
'ngwr/…'`, and counting those made the map describe what a page PRINTS rather
than what it renders. One page is still hand-written and says why at the line:
`reference/interfaces/common` documents types, so it has no class to declare and
no entry point to `@use`.

**A page for something NEW declares the version it first shipped in, and the
sidebar's mark is DERIVED from that** — `<ngwr-doc-page since="14.5.0">`, which
the page prints as "Added in v14.5" beside its title and `pnpm gen:api-docs`
reads out of the template into `#core/generated/since` (a second output of that
run, so `check:api-docs` fails on a stale map rather than a tenth gate doing it).
The version is the SUBJECT's, as the `since` input's JSDoc says, not the page's:
a new page about something that already shipped declares nothing.
`releaseLabel()` drops a zero patch, and a major's `.0.0` with it, so `15.0.0`
prints as "v15". `isNewLink()` and `linkMark()` in `#core/utils` judge a nav
row against `markVersion()`: the later MAJOR of `NGWR_VERSION` and the newest
version any page declares. So a page written before its release is marked from
the commit that adds it, a mark stands through every minor and patch of its
major, and all of them step back once a page declares the next major, or at the
latest when `NGWR_VERSION` reaches it. The first release of a major counts like any other, so `updated="15.0.0"` stands until v16
and a major that moved a lot wears a lot of `Updated`: that was the maintainer's
call, against a mark judged per minor. Never type a version beside a nav row —
one per item is what this deliberately is not. A page that declares nothing
shows nothing: no `@since` exists in `projects/lib` to backfill from, and git
cannot supply one, because a renamed entry point looks new the day it moves.

**That map is keyed by the ROUTE, and the route is not the page's directory.**
Both readers look a page up by the URL its nav row carries, so a key taken from
`dirname()` is written, never read, and green on both sides. The two differ for
every component page, whose group folder is not in the URL, and further for
two: `reference/components/display/qr/` serves `/reference/components/qrcode`,
and `icons/svg-only/` is one template behind six galleries.
`scripts/lib/page-routes.ts` answers what Angular actually serves each page
directory at, by IMPORTING the routing tree (every `routing.ts` holds plain
data, so `tsx` can load it and the array is the one the router uses); a
template that no single route renders is REFUSED a version rather than keyed by
walk order. The sidebar's marks are `<wr-sidebar>` word badges,
chosen in `_layout/sidebar/entries.ts` — `New` in the primary tone; `Updated`,
`Optional` and `Soon` neutral, since the sidebar has no calmer intent
than primary and the word carries the meaning. A row wears one badge, and
`Optional` wins over a version mark, which would otherwise hide it for a whole
major; a group whose every page is optional says so once, so its rows keep their
marks. `showcase/styles/_badge.scss` draws the
catalog index's marks only.

**One more mark rides the same scan: `updated`.** `updated="15.0.0"` is the
version the subject changed its PUBLIC API in — an input, an output, an export,
a token, a hook, a harness method, or the entry point's own path, so the charts
nesting counts. The page prints "Updated in v15". A restyle or a fix
is not an update. A change made to every component at once (the palette, the
spacing scale, the new hooks) is marked on the token and theming pages, never on
each component. `pnpm gen:api-docs` writes both maps into
`#core/generated/since` (`SINCE`, `UPDATED`). `check:api-docs` fails on a stale
map, a bound attribute, a version that is not `major.minor.patch`, or an
`updated` no later than `since`. `linkMark()` gives a nav row ONE mark, `New`
before `Updated`, on the sidebar and the cluster index pages alike. A removed
entry point has no page: its page, route, nav row and `RELATED` entries are
deleted with it, and `/docs/migration` says what replaced it. A MOVED one keeps
a redirect (`drag-drop`, `/animations/*`, the chart slugs), and its new page
declares `updated`.

**Claims the site prints.** v15 deleted the comparison, quality and playground
pages: `/start/comparison`, `/start/quality` and `/start/playground` redirect to
`/docs/introduction`, and the trial surface is the StackBlitz starter. **A
number the site shows binds to `#core/generated/quality`, written by
`pnpm gen:quality` from the repository** — the home page's entry-point count,
the translations guide's locale list; typed as a literal, it starts lying. Two
rules from the old comparison page: a claim about ngwr's own history must
survive `git` (an early draft said "zoneless from the first commit", and v5.0.3
has sixteen `@NgModule`s, v6 one, with the zoneless bootstrap arriving in v6.1.0
and the last module deleted in v7); a claim about a competitor must reduce to
something observable — the npm `license` field or a linked issue, never a
summary of someone's licensing terms.

**AI assets.** `llms-full.txt` AND the agent skill (`skills/ngwr/SKILL.md` plus
`references/{catalog,setup}.md`) regenerate from library source on every build,
both from the one `collect()` pass in `scripts/gen/ai-assets.ts` — so the catalog
cannot say two different things in two files. The skill ships inside the npm
tarball (copied by `copy-dist-assets.ts`) and is served at `/skills/ngwr/SKILL.md`;
its provider table is imported from `projects/lib/mcp/providers.ts`, which the MCP
server's `get_ngwr_setup` reads too. The generator throws on a selector that is
not a tag or an attribute (a harness predicate read as one). Hand-editing
either is pointless, but only `llms-full.txt` is gitignored — `skills/ngwr/**` is
TRACKED, so a build regenerates it into the working tree and the diff has to be
committed like any other. Nothing gates that it was: the skill sat two entry
points stale through a whole cycle because every check reads the freshly built
copy, never the committed one; `sitemap.xml` and the per-page **markdown twins**
regenerate from the prerendered route list after `build:showcase`
(`scripts/gen/sitemap.ts`, `scripts/gen/md-docs.ts`) — so a new entry point or
route is picked up automatically. The twins are what `/reference/components/select.md`
serves: the same page as markdown, converted from the prerendered HTML rather
than from `app/` so it cannot drift, with the live demos dropped and their
source blocks kept. Each page advertises its own via
`<link rel="alternate" type="text/markdown">` (`MetaService.setMarkdownAlternate()`),
and `ngwr-doc-code` reflects `data-language` purely so the export can fence a
block correctly — a bound `[language]` does not reach the DOM on its own.
`llms-full.txt` is rewritten on every build, so never hand-edit it; edit
`scripts/gen/ai-assets.ts`. Only the curated
[`llms.txt`](llms.txt) and this file are hand-maintained: update them when the
doc structure or the headline components change. (A rename once silently
emptied the sitemap because its generator hard-coded the old `app/components`
path — the rewrite derives from the prerender output and floor-checks the count
so that can't recur.)
