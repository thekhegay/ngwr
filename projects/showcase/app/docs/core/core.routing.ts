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
    loadComponent: () => import('./color/color.component'),
  },
  {
    path: core.directives,
    loadComponent: () => import('./directives/directives.component'),
  },
  {
    path: core.grid,
    loadComponent: () => import('./grid/grid.component'),
  },
  {
    path: core.overlay,
    loadComponent: () => import('./overlay/overlay.component'),
  },
  {
    path: core.pipes.index,
    loadChildren: () => import('./pipes/pipes.routing'),
  },
  {
    path: core.services,
    loadComponent: () => import('./services/services.component'),
  },
  {
    path: core.utils,
    loadComponent: () => import('./utils/utils.component'),
  },
] satisfies Routes;
