import type { Routes } from '@angular/router';

import { routes } from '#routing';

const t = routes.interfaces;

export default [
  // The cluster root is a catalog page, not a redirect to its first child —
  // see `reference.routing.ts` for why, and for the `data.index` it inherits.
  { path: '', pathMatch: 'full', loadComponent: () => import('#core/components/doc-index/doc-index') },
  { path: t.overview, loadComponent: () => import('./overview/overview') },
  { path: t.common, loadComponent: () => import('./common/common') },
  { path: t.theme, loadComponent: () => import('./theme/theme') },
  { path: t.catalog, loadComponent: () => import('./catalog/catalog') },
] satisfies Routes;
