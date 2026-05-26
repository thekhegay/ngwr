import type { Routes } from '@angular/router';

import { routes } from '#routing';

const gettingStarted = routes.gettingStarted;

export default [
  { path: '', pathMatch: 'full', redirectTo: gettingStarted.installation },
  { path: gettingStarted.installation, loadComponent: () => import('./installation/installation') },
  { path: gettingStarted.color, loadComponent: () => import('./color/color') },
  { path: gettingStarted.grid, loadComponent: () => import('./grid/grid') },
  { path: gettingStarted.overlay, loadComponent: () => import('./overlay/overlay') },
] satisfies Routes;
