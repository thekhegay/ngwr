import type { Routes } from '@angular/router';

import { routes } from '#routing';

const a = routes.bits;

/** Full-bleed canvas backdrops. Folder only — the URL stays `/bits/<slug>`. */
export const BACKGROUND_ROUTES = [
  { path: a.aurora, loadComponent: () => import('./aurora/aurora') },
  { path: a.waves, loadComponent: () => import('./waves/waves') },
] satisfies Routes;
