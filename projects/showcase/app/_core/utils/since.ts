import { NGWR_VERSION } from 'ngwr/version';

import { SINCE, UPDATED } from '#core/generated/since';

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
const DECLARED_UPDATED: Readonly<Record<string, string>> = UPDATED;

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

/** Whether line `a` is later than line `b`. */
function laterLine(a: readonly [number, number], b: readonly [number, number]): boolean {
  return a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);
}

/** The declared version on the latest line, or `null` when none is readable. */
function newest(versions: Iterable<string>): string | null {
  let best: string | null = null;
  let bestLine: readonly [number, number] | null = null;
  for (const version of versions) {
    const candidate = line(version);
    if (candidate && (!bestLine || laterLine(candidate, bestLine))) {
      best = version;
      bestLine = candidate;
    }
  }
  return best;
}

/** Every version a page declares, `since` and `updated` alike. */
const DECLARED_VERSIONS: readonly string[] = [...Object.values(DECLARED), ...Object.values(DECLARED_UPDATED)];

/** {@link markVersion}'s rule, kept private so the module can work out its own default before any export. */
function judgedAgainst(shipped: string, declared: Iterable<string>): string {
  const own = line(shipped);
  if (!own) return shipped;
  const ahead = newest(declared);
  const aheadLine = ahead === null ? null : line(ahead);
  return ahead !== null && aheadLine !== null && laterLine(aheadLine, own) ? ahead : shipped;
}

/** {@link markVersion} for the version this app was built with, worked out once. */
const MARK_VERSION = judgedAgainst(NGWR_VERSION, DECLARED_VERSIONS);

/**
 * Whether a declared version belongs to the CURRENT release line — the
 * comparison behind every mark in the nav, and the reason nothing has to be
 * cleaned up by hand. Which line counts as current is {@link markVersion}'s
 * answer; this function only compares.
 *
 * The comparison is on the MINOR line, `major.minor`, and it is `>=` rather than
 * `===` so a version declared AHEAD of `current` is marked too: that is the same
 * statement as "not yet released", and a page is written before the release
 * that carries it.
 *
 * A patch does not move the line — 14.5.1 leaves the 14.5 marks standing, which
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
 * The version the nav's `New` and `Updated` marks are judged against: whichever
 * of `shipped` (`NGWR_VERSION`) and the newest version any page declares sits on
 * the LATER minor line.
 *
 * **The site marks what is new in the release it is heading to.** A page is
 * written before its release exists, so the release a site is heading to shows
 * up in the pages before it shows up in `NGWR_VERSION`: on `next`, 15.1 pages
 * declare `15.1.0` while the constant still says `15.0.1`, the patch `main` last
 * shipped. Judged against the constant alone, every 15.0 mark stood beside the
 * 15.1 ones, and the nav could not say which release a mark was about. Judged
 * against the newest declared line, the 15.0 marks step back the moment the
 * first 15.1 page lands, and only what 15.1 adds or changes is marked.
 *
 * The other two states come out unchanged. With nothing declared ahead of the
 * constant (`main` between feature releases), the constant's own line is the
 * answer, so the marks of the release it just shipped stay up across its
 * patches. And once a release ships, `release:prepare` moves `NGWR_VERSION` onto
 * that line, which the declarations already sit on — nothing moves until the
 * next feature release declares its first page, or the line after it ships and
 * every mark of this one expires with no edit anywhere.
 *
 * A declaration far ahead by mistake (`51.0.0` for `15.1.0`) would make every
 * other mark step back, so `since.spec.ts` holds every declared version to the
 * next major at the latest.
 *
 * An unreadable `shipped` is returned as it is, so {@link isNewIn} fails closed
 * on it exactly as it did before this rule existed — and the spec running the
 * live constant through the rule is still the thing that catches it.
 *
 * `declared` is a parameter so the rule can be exercised against versions no
 * page declares; it defaults to the generated map.
 */
export function markVersion(shipped: string = NGWR_VERSION, declared: Iterable<string> = DECLARED_VERSIONS): string {
  return judgedAgainst(shipped, declared);
}

/**
 * The short form a page prints — `'14.5.0'` → `'v14.5'`, `'15.0.0'` → `'v15'`,
 * `'14.4.2'` → `'v14.4.2'`.
 *
 * A trailing `.0` is dropped because a feature ships in a MINOR, and "v14.5.0"
 * spends three characters saying so twice; a major's `.0.0` goes for the same
 * reason, since "Updated in v15" is how a reader names that release. A non-zero
 * patch is kept: something that first shipped in 14.4.2 did not exist in
 * 14.4.0, and rounding it down would state a falsehood a reader can act on.
 */
export function releaseLabel(version: string): string {
  return `v${version
    .trim()
    .replace(/^(\d+)\.0\.0$/, '$1')
    .replace(/^(\d+\.\d+)\.0$/, '$1')}`;
}

/** `'/reference/components/graph'` → `'reference/components/graph'`, the key the generated map uses. */
export function routeKey(url: string): string {
  return url.replace(/^\/+|\/+$/g, '');
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

/** The version a route's page says its public API changed in, or `null` — see `updated` on `<ngwr-doc-page>`. */
export function updatedOf(route: string): string | null {
  return Object.hasOwn(DECLARED_UPDATED, route) ? (DECLARED_UPDATED[route] ?? null) : null;
}

/**
 * Whether a nav link points at a page declared for the current release line.
 *
 * Used by both surfaces that list the same links — the sidebar and the cluster
 * index pages — so the two cannot disagree about what is new. `current` is the
 * version marks are judged against, {@link markVersion} when omitted.
 */
export function isNewLink(url: string | undefined, current: string = MARK_VERSION): boolean {
  if (!url) return false;
  const since = sinceOf(routeKey(url));
  return since !== null && isNewIn(since, current);
}

/**
 * The one mark a nav row wears, decided from what its page declares — the rule
 * both nav surfaces (the sidebar and the cluster index pages) draw from.
 *
 * - `new` while `since` is on the current release line ({@link isNewIn}).
 * - `updated` while `updated` is on the current release line, by the same rule
 *   and so expiring the same way.
 *
 * The current line is {@link markVersion}'s unless `current` pins another. One
 * mark per row, `new` first. A page cannot declare `updated` no later than
 * `since` — `pnpm gen:api-docs` refuses it — so the order only settles a page
 * whose `since` and `updated` both sit on a line still current, where "new" is
 * the stronger news.
 */
export function linkMark(url: string | undefined, current: string = MARK_VERSION): DocLinkMark | null {
  if (!url) return null;
  if (isNewLink(url, current)) return 'new';
  const updated = updatedOf(routeKey(url));
  return updated !== null && isNewIn(updated, current) ? 'updated' : null;
}

/** Which of the two marks a nav row wears, if any. See {@link linkMark}. */
export type DocLinkMark = 'new' | 'updated';
