import type { Routes } from '@angular/router';

import { routes } from '#routing';

const start = routes.start;

/**
 * Start — getting the library into an app: install it, wire the providers,
 * scaffold with the schematics, move between majors. Not how to USE a given
 * subsystem — that is `/guides`.
 */
export default [
  { path: '', pathMatch: 'full', redirectTo: start.installation },
  { path: start.installation, loadComponent: () => import('./installation/installation') },
  { path: start.configuration, loadComponent: () => import('./configuration/configuration') },
  { path: start.schematics, loadComponent: () => import('./schematics/schematics') },
  { path: start.migration, loadComponent: () => import('./migration/migration') },
] satisfies Routes;
