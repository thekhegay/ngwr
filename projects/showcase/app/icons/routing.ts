import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const i = ROUTES.icons;

export default [
  { path: '', pathMatch: 'full', redirectTo: i.overview.path },
  { path: i.overview.path, loadComponent: () => import('./overview/overview') },
  { path: i.lucide.path, loadComponent: () => import('./lucide/lucide') },
  { path: i.feather.path, loadComponent: () => import('./feather/feather') },
  { path: i.tabler.path, loadComponent: () => import('./svg-only/tabler') },
  { path: i.phosphor.path, loadComponent: () => import('./svg-only/phosphor') },
  { path: i.heroicons.path, loadComponent: () => import('./svg-only/heroicons') },
  { path: i.iconoir.path, loadComponent: () => import('./svg-only/iconoir') },
  { path: i.radix.path, loadComponent: () => import('./svg-only/radix') },
  { path: i.bootstrap.path, loadComponent: () => import('./svg-only/bootstrap') },
] satisfies Routes;
