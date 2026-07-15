import { RenderMode, type ServerRoute } from '@angular/ssr';

import { routes } from '#routing';

const icons = routes.icons;

/**
 * Per-route render modes for the static prerender (`outputMode: 'static'`).
 *
 * Everything is prerendered by default — the docs are static content, and
 * shipping real HTML is the whole point (crawlers and AI agents currently
 * see an empty shell). Two groups opt out:
 *
 * 1. `types/:page` — a legacy-URL redirect and the app's only parameterised
 *    route. Prerendering a parameterised path requires `getPrerenderParams`;
 *    since these URLs only bounce to `/interfaces/*`, client rendering is
 *    cheaper than enumerating them.
 * 2. The raw-SVG icon galleries — each inlines up to `VISIBLE_CAP` (240)
 *    arbitrary, alphabetically-first SVGs whose search is client-only, so the
 *    static HTML would carry weight with no SEO value. The adapter pages
 *    (overview / lucide / feather) stay prerendered: those are real docs.
 *
 * Client-rendered routes emit no HTML and fall through to the existing nginx
 * SPA fallback, exactly as today.
 */
export const serverRoutes: ServerRoute[] = [
  { path: 'types/**', renderMode: RenderMode.Client },

  { path: `${icons.index}/${icons.tabler}`, renderMode: RenderMode.Client },
  { path: `${icons.index}/${icons.phosphor}`, renderMode: RenderMode.Client },
  { path: `${icons.index}/${icons.heroicons}`, renderMode: RenderMode.Client },
  { path: `${icons.index}/${icons.iconoir}`, renderMode: RenderMode.Client },
  { path: `${icons.index}/${icons.radix}`, renderMode: RenderMode.Client },
  { path: `${icons.index}/${icons.bootstrap}`, renderMode: RenderMode.Client },

  { path: '**', renderMode: RenderMode.Prerender },
];
