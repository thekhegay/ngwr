import type { Routes } from '@angular/router';

import { routes } from '#routing';

// Pipes / services / utils / directives moved out to top-level sibling
// routes (see routing.ts). This file now only holds the remaining
// core docs that don't have their own section.
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
    path: core.grid,
    loadComponent: () => import('./grid/grid'),
  },
  {
    path: core.overlay,
    loadComponent: () => import('./overlay/overlay'),
  },
] satisfies Routes;
