import type { Routes } from '@angular/router';

import { ANIMATIONS_SIDEBAR } from '../_layout/sidebar/configs';

import { BACKGROUNDS_ROUTES } from './backgrounds/routing';
import { TEXT_ROUTES } from './text/routing';

import type { DocIndexData } from '#core/components';

/**
 * The animation effects, a cluster of their own: `ngwr/animations/<name>`,
 * assembled from one routing file per sidebar group.
 *
 * The groups are FOLDERS, not URL segments: every page is at
 * `/animations/<slug>`. The root renders the catalog page rather than
 * redirecting to its first child, for the reasons `reference/routing.ts`
 * gives: a list that exists only in the sidebar is unreachable from a search
 * result, and a redirect stub has no markdown twin.
 */
const index: DocIndexData = {
  title: 'Animations',
  description:
    'Text, background and interaction effects as entry points: each one readable to a screen reader, rendered under SSR and still under `prefers-reduced-motion`.',
  keywords: ['angular animations', 'text effects', 'ngwr animations'],
  groups: ANIMATIONS_SIDEBAR,
};

export default [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('#core/components/doc-index/doc-index'),
    data: { index },
  },
  ...TEXT_ROUTES,
  ...BACKGROUNDS_ROUTES,
] satisfies Routes;
