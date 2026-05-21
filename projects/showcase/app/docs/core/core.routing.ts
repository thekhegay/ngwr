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
    path: core.grid,
    loadComponent: () => import('./grid/grid.component'),
  },
  {
    path: core.overlay,
    loadComponent: () => import('./overlay/overlay.component'),
  },
  {
    path: core.utils,
    loadComponent: () => import('./utils/utils.component'),
  },
] satisfies Routes;
