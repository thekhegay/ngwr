import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const a = ROUTES.bits;

/** Full-bleed canvas backdrops. Folder only — the URL stays `/bits/<slug>`. */
export const BACKGROUND_ROUTES = [
  { path: a.aurora.path, loadComponent: () => import('./aurora/aurora') },
  { path: a.waves.path, loadComponent: () => import('./waves/waves') },
] satisfies Routes;
