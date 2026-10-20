import { DEMO_RELATED, DEPS, DOC_PAGES, type DocDeps } from '#core/generated/deps';

import { routeKey } from './since';

const ENTRY_BY_ROUTE = new Map(Object.entries(DOC_PAGES).map(([ep, page]) => [page.route, ep]));

/** The entry point a page documents, or `null`. */
export function entryOfRoute(url: string): string | null {
  return ENTRY_BY_ROUTE.get(routeKey(url.split(/[?#]/)[0])) ?? null;
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

/** Entry points a page relates to: what it is built on, then what its demos use with it. */
export function relatedOf(url: string): readonly string[] {
  const ep = entryOfRoute(url);
  const uses = depsOf(ep)?.uses ?? [];
  const demo = DEMO_RELATED[routeKey(url.split(/[?#]/)[0])] ?? [];
  return [...new Set([...uses, ...demo])].filter(e => e !== ep && DOC_PAGES[e]);
}
