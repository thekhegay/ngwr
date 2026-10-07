import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const t = ROUTES.guides.translations;

export default [
  { path: '', pathMatch: 'full', redirectTo: t.overview.path },
  { path: t.overview.path, loadComponent: () => import('./overview/overview') },
  { path: t.setup.path, loadComponent: () => import('./setup/setup') },
  { path: t.usage.path, loadComponent: () => import('./usage/usage') },
  { path: t.scopes.path, loadComponent: () => import('./scopes/scopes') },
  { path: t.interpolation.path, loadComponent: () => import('./interpolation/interpolation') },
  // `api` used to live here and duplicated the WrI18n table — and drifted ahead
  // of the "real" one in reference. It now redirects to the single copy.
  { path: t.api.path, redirectTo: '/reference/services/i18n' },
] satisfies Routes;
