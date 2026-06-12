import type { Routes } from '@angular/router';

import { routes } from '#routing';

const t = routes.types;

export default [
  { path: '', pathMatch: 'full', redirectTo: t.common },
  { path: t.common, loadComponent: () => import('./common/common') },
  { path: t.theme, loadComponent: () => import('./theme/theme') },
  { path: t.catalog, loadComponent: () => import('./catalog/catalog') },
] satisfies Routes;
