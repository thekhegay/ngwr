import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const a = ROUTES.bits;

/** Pointer-driven effects. Folder only — the URL stays `/bits/<slug>`. */
export const EFFECT_ROUTES = [
  { path: a.clickSpark.path, loadComponent: () => import('./click-spark/click-spark') },
  { path: a.confetti.path, loadComponent: () => import('./confetti/confetti') },
  { path: a.splashCursor.path, loadComponent: () => import('./splash-cursor/splash-cursor') },
] satisfies Routes;
