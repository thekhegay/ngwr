import { RELATED } from './related';
import { routeKey } from './since';

import { DEMO_RELATED, DEPS, DOC_PAGES, DOC_ROUTES, type DocDeps } from '#core/generated/deps';

const ENTRY_BY_ROUTE = new Map(Object.entries(DOC_PAGES).map(([ep, page]) => [page.route, ep]));

/** A URL's route: no leading slash, no query, no fragment. */
function pathOf(url: string): string {
  return routeKey(url.split(/[?#]/)[0]);
}

/** The page a route lands on: a section root with no page of its own redirects to its `overview`. */
function landingOf(route: string): string {
  return !DOC_ROUTES[route] && DOC_ROUTES[`${route}/overview`] ? `${route}/overview` : route;
}

/** A page the site serves: its route (no leading slash), its title, and its kind, `null` for a docs page. */
export interface DocPageRef {
  readonly route: string;
  readonly title: string;
  readonly kind: string | null;
}

/** The entry point a page documents, or `null`. */
export function entryOfRoute(url: string): string | null {
  return ENTRY_BY_ROUTE.get(pathOf(url)) ?? null;
}

/** An entry point's dependencies, or `null` when it has none worth listing. */
export function depsOf(ep: string | null): DocDeps | null {
  return ep ? (DEPS[ep] ?? null) : null;
}

/** The page documenting an entry point, or `null`. */
export function docPageOf(
  ep: string
): { readonly route: string; readonly title: string; readonly kind: string } | null {
  return DOC_PAGES[ep] ?? null;
}

/**
 * The page at a route, or `null` when the site serves none there. Read from `DOC_ROUTES`, which holds every page —
 * guides and docs pages included — where `DOC_PAGES` holds only the ones documenting an entry point.
 */
export function pageOfRoute(url: string): DocPageRef | null {
  const route = pathOf(url);
  const page = DOC_ROUTES[route];
  if (page) return { route, title: page.title, kind: page.kind };
  const ep = ENTRY_BY_ROUTE.get(route);
  const doc = ep ? DOC_PAGES[ep] : undefined;
  return doc ? { route, title: doc.title, kind: doc.kind } : null;
}

/**
 * The pages a page relates to, best first: the hand-curated `RELATED` for its route, then what its entry point is
 * built on, then what its demos use with it. Never the page itself, never a route in `taken` (the links the page
 * already shows), never a route the site does not serve, never one twice, and at most `limit` of them.
 */
export function relatedOf(url: string, taken: Iterable<string> = [], limit = Infinity): readonly DocPageRef[] {
  const route = pathOf(url);
  const ep = ENTRY_BY_ROUTE.get(route) ?? null;
  const built = (depsOf(ep)?.uses ?? []).map(e => DOC_PAGES[e]?.route);
  const demoed = (DEMO_RELATED[route] ?? []).map(e => DOC_PAGES[e]?.route);
  const seen = new Set([route, ...[...taken].map(t => landingOf(routeKey(t)))]);
  const out: DocPageRef[] = [];
  for (const candidate of [...(RELATED[route] ?? []), ...built, ...demoed]) {
    if (out.length >= limit) break;
    if (!candidate || seen.has(candidate)) continue;
    const page = pageOfRoute(candidate);
    if (!page) continue;
    seen.add(candidate);
    out.push(page);
  }
  return out;
}
