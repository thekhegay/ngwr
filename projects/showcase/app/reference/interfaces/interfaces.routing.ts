import type { Routes } from '@angular/router';

import { routes } from '#routing';

const t = routes.interfaces;

export default [
  { path: '', pathMatch: 'full', redirectTo: t.overview },
  { path: t.overview, loadComponent: () => import('./overview/overview') },
  { path: t.common, loadComponent: () => import('./common/common') },
  { path: t.theme, loadComponent: () => import('./theme/theme') },
  { path: t.catalog, loadComponent: () => import('./catalog/catalog') },
] satisfies Routes;
