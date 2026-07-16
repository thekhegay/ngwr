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
  // `api` used to live here and duplicated the WrI18n table — and drifted ahead
  // of the "real" one in reference. It now redirects to the single copy.
  { path: t.api, redirectTo: '/reference/services/i18n' },
] satisfies Routes;
