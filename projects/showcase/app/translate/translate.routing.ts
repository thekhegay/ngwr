import type { Routes } from '@angular/router';

import { routes } from '#routing';

const t = routes.translate;

export default [
  { path: '', pathMatch: 'full', redirectTo: t.overview },
  { path: t.overview, loadComponent: () => import('./overview/overview') },
  { path: t.setup, loadComponent: () => import('./setup/setup') },
  { path: t.usage, loadComponent: () => import('./usage/usage') },
  { path: t.scopes, loadComponent: () => import('./scopes/scopes') },
  { path: t.interpolation, loadComponent: () => import('./interpolation/interpolation') },
  { path: t.api, loadComponent: () => import('./api/api') },
] satisfies Routes;
