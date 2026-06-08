import type { Routes } from '@angular/router';

import { routes } from '#routing';

const i = routes.icons;

export default [
  { path: '', pathMatch: 'full', redirectTo: i.overview },
  { path: i.overview, loadComponent: () => import('./overview/overview') },
  { path: i.lucide, loadComponent: () => import('./lucide/lucide') },
  { path: i.feather, loadComponent: () => import('./feather/feather') },
  { path: i.tabler, loadComponent: () => import('./svg-only/tabler') },
  { path: i.phosphor, loadComponent: () => import('./svg-only/phosphor') },
  { path: i.heroicons, loadComponent: () => import('./svg-only/heroicons') },
  { path: i.iconoir, loadComponent: () => import('./svg-only/iconoir') },
  { path: i.radix, loadComponent: () => import('./svg-only/radix') },
  { path: i.bootstrap, loadComponent: () => import('./svg-only/bootstrap') },
] satisfies Routes;
