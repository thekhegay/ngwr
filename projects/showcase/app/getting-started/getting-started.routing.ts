import type { Routes } from '@angular/router';

import { routes } from '#routing';

const gettingStarted = routes.gettingStarted;

export default [
  { path: '', pathMatch: 'full', redirectTo: gettingStarted.installation },
  { path: gettingStarted.installation, loadComponent: () => import('./installation/installation') },
  { path: gettingStarted.theming, loadComponent: () => import('./theming/theming') },
  { path: gettingStarted.color, loadComponent: () => import('./color/color') },
  { path: gettingStarted.grid, loadComponent: () => import('./grid/grid') },
  { path: gettingStarted.overlay, loadComponent: () => import('./overlay/overlay') },
  { path: gettingStarted.mobile, loadComponent: () => import('./mobile/mobile') },
  { path: gettingStarted.i18n, loadComponent: () => import('./i18n/i18n') },
  { path: gettingStarted.configuration, loadComponent: () => import('./configuration/configuration') },
  { path: gettingStarted.schematics, loadComponent: () => import('./schematics/schematics') },
  { path: gettingStarted.migration, loadComponent: () => import('./migration/migration') },
] satisfies Routes;
