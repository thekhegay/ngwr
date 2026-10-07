import type { Routes } from '@angular/router';

import { routes } from '#routing';

const start = routes.start;

/**
 * Start — deciding on the library, then getting it into an app: compare it,
 * try it in a sandbox, read what gates it, install it, wire the providers,
 * scaffold with the schematics, move between majors. Not how to USE a given
 * subsystem — that is `/guides`. `versioning` is the fourth pre-install page:
 * what the version number promises, how long a line is supported, and what the
 * open-ended Angular peer range does and does not mean.
 *
 * The first four are pre-install on purpose. `''` still redirects to
 * `installation` rather than to `comparison`: `/start` is reached from "Get
 * started", which is a decision already made, and landing a converted reader
 * back on a comparison table reopens it.
 */
export default [
  { path: '', pathMatch: 'full', redirectTo: start.installation },
  { path: start.comparison, loadComponent: () => import('./comparison/comparison') },
  { path: start.playground, loadComponent: () => import('./playground/playground') },
  { path: start.quality, loadComponent: () => import('./quality/quality') },
  { path: start.versioning, loadComponent: () => import('./versioning/versioning') },
  { path: start.installation, loadComponent: () => import('./installation/installation') },
  { path: start.configuration, loadComponent: () => import('./configuration/configuration') },
  { path: start.schematics, loadComponent: () => import('./schematics/schematics') },
  { path: start.migration, loadComponent: () => import('./migration/migration') },
] satisfies Routes;
