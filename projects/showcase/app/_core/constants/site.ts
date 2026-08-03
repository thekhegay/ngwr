/**
 * Canonical origin of the published docs site.
 *
 * Meta tags MUST build absolute URLs from this constant rather than from the
 * runtime document. The showcase is prerendered in Node (`outputMode: 'static'`),
 * where `document.URL` is Angular's placeholder origin `http://ng-localhost/` —
 * reading it emitted `<link rel="canonical" href="https://ng-localhost/…">` on
 * every prerendered page, pointing at a host that does not resolve.
 */
export const SITE_ORIGIN = 'https://ngwr.dev';

/** Site name used for `og:site_name`. */
export const SITE_NAME = 'ngwr';

/**
 * Static social preview (1200×630). Absolute URL — crawlers do not resolve
 * relative `og:image` values reliably.
 */
export const SITE_OG_IMAGE = `${SITE_ORIGIN}/images/og-cover.png`;

/** Alt text for the social preview, for `og:image:alt`. */
export const SITE_OG_IMAGE_ALT = 'ngwr — signals-first Angular UI library with 100+ components';

/** Joins a route path onto {@link SITE_ORIGIN}, normalising slashes. */
export function siteUrl(path: string): string {
  if (!path || path === '/') return `${SITE_ORIGIN}/`;
  return `${SITE_ORIGIN}/${path.replace(/^\/+/, '')}`;
}
