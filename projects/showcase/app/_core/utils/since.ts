import { NGWR_VERSION } from 'ngwr/version';

import { SINCE } from '#core/generated/since';

/**
 * Widened on purpose. `SINCE` keeps its keys literal so anyone who wants the
 * union of declared routes can have it — but the lookups here are by a route
 * the router or a sidebar config hands over at runtime, and the literal-keyed
 * form would need a cast that stops compiling the day the map is EMPTY
 * (`keyof {}` is `never`, and `route as never` is an error). A docs map with
 * nothing in it is a legal state — no page declares a version — and it must not
 * be a red build.
 */
const DECLARED: Readonly<Record<string, string>> = SINCE;

/**
 * `'14.5.0'` → `[14, 5]`, `'14.5.0-rc.1'` → `[14, 5]`; `null` for anything else.
 *
 * **A prerelease suffix is accepted and then ignored, and that is not laxity —
 * it is the one shape `NGWR_VERSION` takes that is not a plain triple.**
 * `release:prepare` implements `--bump=rc` (`1.2.3` → `1.2.4-rc.0` →
 * `1.2.4-rc.1`) and `writeVersion()` syncs whatever it produced into the
 * constant, so `'15.0.0-rc.0'` is a state this repository's own tooling reaches.
 * Refused, it would take EVERY mark off the site for the length of the
 * candidate line — the one window in which the marks matter most — with no gate
 * anywhere saying so, because the failure is total rather than per-page.
 *
 * Ignoring the suffix is also the right reading: a candidate belongs to the line
 * it is a candidate FOR, so `14.5.0-rc.1` is 14.5 and a page declaring `14.5.0`
 * is marked throughout it. A page's own `since` never carries one —
 * `pnpm gen:api-docs` refuses anything but `major.minor.patch` at the page,
 * where an author can see it — so this branch only ever reads `current`.
 */
function line(version: string): readonly [number, number] | null {
  const match = /^(\d+)\.(\d+)\.\d+(?:-[0-9A-Za-z.-]+)?$/.exec(version.trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2])];
}

/**
 * Whether a declared version belongs to the CURRENT release line — the one rule
 * behind every "new" mark in the nav, and the reason nothing has to be cleaned
 * up by hand.
 *
 * The comparison is on the MINOR line, `major.minor`, and it is `>=` rather than
 * `===` for one specific reason: a page is written before the release that
 * carries it exists. `ngwr/graph` declares `14.5.0` while `NGWR_VERSION` still
 * says `14.4.0`, and it has to be marked from the commit that adds it — the mark
 * is for a reader of the site, and the site ships from `main` well before the
 * tag. Anything ahead of the current line is therefore "new" too, which is the
 * same statement as "not yet released".
 *
 * And it expires on its own. `release:prepare` writes `NGWR_VERSION`, so the
 * minute 14.6.0 ships, everything declared for 14.5 falls behind the current
 * line and every one of those marks disappears with no edit anywhere. A patch
 * release does not move the line — 14.5.1 leaves the 14.5 marks standing, which
 * is right: a patch adds no pages, and the reader's question is "what arrived in
 * this feature release", not "what arrived in this build".
 *
 * `current` is a parameter rather than a read of the constant so the rule can be
 * exercised against a version other than the one the app was built with.
 */
export function isNewIn(since: string, current: string): boolean {
  const declared = line(since);
  const shipped = line(current);
  // Unreadable on either side means no mark, and the two sides are watched by
  // different things. A malformed `since` is caught by `pnpm check:api-docs` at
  // the page it was declared on, where the author can see it; guessing at one
  // here would paint a mark off a string nobody parsed. A malformed `current`
  // would take every mark off the site at once and name no page at all — so
  // `since.spec.ts` runs the live `NGWR_VERSION` through this rule, and a
  // release that writes a shape `line()` cannot read is a red suite rather than
  // a silent site.
  if (!declared || !shipped) return false;
  return declared[0] > shipped[0] || (declared[0] === shipped[0] && declared[1] >= shipped[1]);
}

/**
 * The short form a page prints — `'14.5.0'` → `'v14.5'`, `'14.4.2'` → `'v14.4.2'`.
 *
 * A trailing `.0` is dropped because a feature ships in a MINOR, and "v14.5.0"
 * spends three characters saying so twice. A non-zero patch is kept: something
 * that first shipped in 14.4.2 did not exist in 14.4.0, and rounding it down
 * would state a falsehood a reader can act on.
 */
export function releaseLabel(version: string): string {
  return `v${version.trim().replace(/^(\d+\.\d+)\.0$/, '$1')}`;
}

/** `['/reference/components', 'graph']` → `'reference/components/graph'`, the key the generated map uses. */
export function routeKey(url: readonly string[]): string {
  return url.join('/').replace(/^\/+|\/+$/g, '');
}

/**
 * The version a route's page declares, or `null` when it declares none — which
 * is most of them, and is the escape hatch rather than a gap: nothing in
 * `projects/lib` carries `@since`, so there is no history to backfill from and a
 * git-derived guess would call a RENAMED entry point new.
 */
export function sinceOf(route: string): string | null {
  return Object.hasOwn(DECLARED, route) ? (DECLARED[route] ?? null) : null;
}

/**
 * Whether a nav link points at a page declared for the current release line.
 *
 * Used by both surfaces that list the same links — the sidebar and the cluster
 * index pages — so the two cannot disagree about what is new.
 */
export function isNewLink(url: readonly string[] | undefined, current: string = NGWR_VERSION): boolean {
  if (!url) return false;
  const since = sinceOf(routeKey(url));
  return since !== null && isNewIn(since, current);
}
