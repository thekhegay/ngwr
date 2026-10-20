import { routeKey } from './since';

/**
 * Routes that document an opt-in part of ngwr: the library works without it.
 * A prefix covers a whole cluster. The sidebar and the page header both read
 * this list, so the two marks cannot disagree.
 */
const OPTIONAL_ROUTES: readonly string[] = ['guides/grid', 'guides/typography', 'reference/directives/typography'];

/** Whether a nav row or a page URL documents something optional. */
export function isOptionalLink(url: string | undefined): boolean {
  if (!url) return false;
  const key = routeKey(url.split(/[?#]/)[0]);
  return OPTIONAL_ROUTES.some(r => key === r || key.startsWith(`${r}/`));
}
