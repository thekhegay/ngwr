import type { Routes } from '@angular/router';

import {
  BITS_SIDEBAR,
  CHARTS_SIDEBAR,
  DOCS_SIDEBAR,
  GUIDES_SIDEBAR,
  ICONS_SIDEBAR,
  REFERENCE_SIDEBAR,
} from './_layout/sidebar/configs';

import { ROUTES } from '#routes';

export const routing: Routes = [
  {
    path: '',
    loadComponent: () => import('./_home/home'),
  },
  {
    path: '',
    loadComponent: () => import('#layout'),
    children: [
      // Doors by what the reader is doing, not by how the code is organised.
      // `docs` = get it installed. `guides` = do a job that spans several APIs.
      // `reference` = look one API up. Icons, charts and bits stay separate:
      // browsable catalogs, the chart family, and the reactbits ports.
      {
        path: ROUTES.docs.path,
        data: { sidebar: DOCS_SIDEBAR },
        loadChildren: () => import('./docs/routing'),
      },
      {
        path: ROUTES.guides.path,
        data: { sidebar: GUIDES_SIDEBAR },
        loadChildren: () => import('./guides/routing'),
      },
      // One sidebar for the whole section, attached here rather than per
      // cluster: components, directives, pipes, services, utils, validators
      // and interfaces are siblings in it, so the nav must not change shape
      // as the reader moves between them.
      {
        path: ROUTES.reference.path,
        data: { sidebar: REFERENCE_SIDEBAR },
        loadChildren: () => import('./reference/routing'),
      },
      {
        path: ROUTES.charts.path,
        data: { sidebar: CHARTS_SIDEBAR },
        loadChildren: () => import('./charts/routing'),
      },
      {
        path: ROUTES.icons.path,
        data: { sidebar: ICONS_SIDEBAR },
        loadChildren: () => import('./icons/routing'),
      },
      {
        path: ROUTES.bits.path,
        data: { sidebar: BITS_SIDEBAR },
        loadChildren: () => import('./bits/routing'),
      },

      // v15 moved `/start` to `/docs`, folded two pages into their neighbours,
      // deleted two, and gave the charts a cluster of their own. Every path
      // below was published, so every one keeps resolving.
      { path: 'start/comparison', redirectTo: '/docs/introduction' },
      { path: 'start/quality', redirectTo: '/docs/introduction' },
      { path: 'start/schematics', redirectTo: '/docs/installation' },
      // Playground is a StackBlitz starter now; a router redirect cannot leave
      // the app, so it lands on the page that links to it.
      { path: 'start/playground', redirectTo: '/docs/introduction' },
      { path: 'start/versioning', redirectTo: '/docs/migration' },
      { path: 'start/:page', redirectTo: ({ params }) => `/docs/${params['page']}` },
      { path: 'start', redirectTo: '/docs' },
      { path: 'guides/mcp', redirectTo: '/docs/mcp-server' },
      { path: 'guides/agent-skill', redirectTo: '/docs/skills' },
      { path: 'reference/components/bar-chart', redirectTo: '/charts/bar-chart' },
      { path: 'reference/components/calendar-heatmap', redirectTo: '/charts/calendar-heatmap' },
      { path: 'reference/components/donut-chart', redirectTo: '/charts/donut-chart' },
      { path: 'reference/components/gauge', redirectTo: '/charts/gauge' },
      { path: 'reference/components/line-chart', redirectTo: '/charts/line-chart' },
      { path: 'reference/components/meter-group', redirectTo: '/charts/meter-group' },
      { path: 'reference/components/sparkline', redirectTo: '/charts/sparkline' },

      // Legacy URLs. The docs were reorganised into start / guides / reference;
      // these keep every previously-published path resolving. Cheap to carry —
      // and the `/v7/` archive plus older CHANGELOG entries still point here.
      { path: 'getting-started/installation', redirectTo: '/docs/installation' },
      { path: 'getting-started/configuration', redirectTo: '/docs/configuration' },
      { path: 'getting-started/schematics', redirectTo: '/docs/installation' },
      { path: 'getting-started/migration', redirectTo: '/docs/migration' },
      // `/getting-started/i18n` was the old single-page tutorial; it is now the
      // Translations cluster, so that one slug needs its own landing spot.
      { path: 'getting-started/i18n', redirectTo: '/guides/translations' },
      // Same story for `color`: it folded into the token catalog rather than
      // keeping a guide of its own, so it can't ride the `:page` rule below.
      { path: 'getting-started/color', redirectTo: '/guides/tokens/colors' },
      { path: 'getting-started/:page', redirectTo: ({ params }) => `/guides/${params['page']}` },
      { path: 'getting-started', redirectTo: '/docs' },
      { path: 'tokens/:page', redirectTo: ({ params }) => `/guides/tokens/${params['page']}` },
      { path: 'tokens', redirectTo: '/guides/tokens' },
      { path: 'translate/:page', redirectTo: ({ params }) => `/guides/translations/${params['page']}` },
      { path: 'translate', redirectTo: '/guides/translations' },
      { path: 'typography/:page', redirectTo: ({ params }) => `/guides/typography/${params['page']}` },
      { path: 'typography', redirectTo: '/guides/typography' },
      { path: 'components/:page', redirectTo: ({ params }) => `/reference/components/${params['page']}` },
      { path: 'components', redirectTo: '/reference/components' },
      { path: 'directives/:page', redirectTo: ({ params }) => `/reference/directives/${params['page']}` },
      { path: 'directives', redirectTo: '/reference/directives' },
      { path: 'pipes/:page', redirectTo: ({ params }) => `/reference/pipes/${params['page']}` },
      { path: 'pipes', redirectTo: '/reference/pipes' },
      { path: 'services/:page', redirectTo: ({ params }) => `/reference/services/${params['page']}` },
      { path: 'services', redirectTo: '/reference/services' },
      { path: 'utils/:page', redirectTo: ({ params }) => `/reference/utils/${params['page']}` },
      { path: 'utils', redirectTo: '/reference/utils' },
      { path: 'validators/:page', redirectTo: ({ params }) => `/reference/validators/${params['page']}` },
      { path: 'validators', redirectTo: '/reference/validators' },
      { path: 'interfaces/:page', redirectTo: ({ params }) => `/reference/interfaces/${params['page']}` },
      { path: 'interfaces', redirectTo: '/reference/interfaces' },
      // The section briefly shipped as /types before it was /interfaces.
      { path: 'types/:page', redirectTo: ({ params }) => `/reference/interfaces/${params['page']}` },
      { path: 'types', redirectTo: '/reference/interfaces' },

      // `/docs/*` — the prefix EVERY page sat under until v7, when
      // `refactor(showcase): rename /docs to /getting-started` flattened the
      // sections out of it. Nothing has resolved these since, and search
      // engines still hand them out: a usability test's very first action was
      // `ngwr.dev/docs`, off a result advertising `ngwr.dev/docs/components/tag`.
      // Both landed on the 404. The three sub-trees below are the whole of what
      // ever shipped under the prefix — `getting-started`, `components`, and a
      // `core` that briefly also held the directive / pipe / service / util
      // sections before each became a sibling of its own.
      { path: 'docs/components/:page', redirectTo: ({ params }) => `/reference/components/${params['page']}` },
      { path: 'docs/components', redirectTo: '/reference/components' },
      { path: 'docs/getting-started/:page', redirectTo: ({ params }) => `/docs/${params['page']}` },
      { path: 'docs/getting-started', redirectTo: '/docs/installation' },
      { path: 'docs/core/color', redirectTo: '/guides/tokens/colors' },
      {
        path: 'docs/core/directives/:page',
        redirectTo: ({ params }) => `/reference/directives/${params['page']}`,
      },
      { path: 'docs/core/directives', redirectTo: '/reference/directives' },
      { path: 'docs/core/pipes/:page', redirectTo: ({ params }) => `/reference/pipes/${params['page']}` },
      { path: 'docs/core/pipes', redirectTo: '/reference/pipes' },
      { path: 'docs/core/services/:page', redirectTo: ({ params }) => `/reference/services/${params['page']}` },
      { path: 'docs/core/services', redirectTo: '/reference/services' },
      { path: 'docs/core/utils/:page', redirectTo: ({ params }) => `/reference/utils/${params['page']}` },
      { path: 'docs/core/utils', redirectTo: '/reference/utils' },
      // What is left under `core` is `grid` and `overlay`, both guides now.
      { path: 'docs/core/:page', redirectTo: ({ params }) => `/guides/${params['page']}` },
      { path: 'docs/core', redirectTo: '/guides' },
      // No `{ path: 'docs' }` rule any more: v15 made `/docs` a real cluster, so
      // the pre-v7 prefix root is now the page it used to redirect to. The
      // deeper `docs/*` rules above still fire, because none of them collides
      // with a page the cluster serves.
    ],
  },

  // Everything else. Without this the router threw `NG04002` on an unmatched
  // URL, the outlet never activated, and Angular restored the address bar to
  // `/` — leaving the header over a blank page that claimed to be the homepage.
  // Not a hypothetical: the legacy aliases above redirect archived `/v7/` links
  // into `/reference/*`, and the slugs that themselves moved (tooltip folded
  // into popover, scramble-text removed) arrive here.
  //
  // A client route, not a redirect to `/`: a redirect fixes the address bar and
  // keeps the silence. Catch-all routes are excluded from the prerender by the
  // builder, so nothing is emitted for it and the render mode in
  // `app.routes.server.ts` cannot change that — see the note there.
  {
    path: '**',
    loadComponent: () => import('./_not-found/not-found'),
  },
];
