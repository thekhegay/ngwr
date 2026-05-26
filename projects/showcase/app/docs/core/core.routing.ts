import type { Routes } from '@angular/router';

import { routes } from '#routing';

const core = routes.docs.core;

export default [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: core.colors,
  },
  {
    path: core.colors,
    loadComponent: () => import('./color/color'),
  },
  {
    path: core.directives,
    loadComponent: () => import('./directives/directives'),
  },
  {
    path: core.grid,
    loadComponent: () => import('./grid/grid'),
  },
  {
    path: core.overlay,
    loadComponent: () => import('./overlay/overlay'),
  },
  {
    path: core.pipes.index,
    loadChildren: () => import('./pipes/pipes.routing'),
  },
  {
    path: core.services.index,
    loadChildren: () => import('./services/services.routing'),
  },
  {
    path: core.utils.index,
    loadChildren: () => import('./utils/utils.routing'),
  },
] satisfies Routes;
