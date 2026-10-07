import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const t = ROUTES.reference.interfaces;

export default [
  // The cluster root is a catalog page, not a redirect to its first child —
  // see `reference.routing.ts` for why, and for the `data.index` it inherits.
  { path: '', pathMatch: 'full', loadComponent: () => import('#core/components/doc-index/doc-index') },
  { path: t.overview.path, loadComponent: () => import('./overview/overview') },
  { path: t.common.path, loadComponent: () => import('./common/common') },
  { path: t.theme.path, loadComponent: () => import('./theme/theme') },
  { path: t.catalog.path, loadComponent: () => import('./catalog/catalog') },
] satisfies Routes;
