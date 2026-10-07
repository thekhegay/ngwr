import type { Routes } from '@angular/router';

import { routes } from '#routing';

const a = routes.bits;

/** Pointer-driven effects. Folder only — the URL stays `/bits/<slug>`. */
export const EFFECT_ROUTES = [
  { path: a.clickSpark, loadComponent: () => import('./click-spark/click-spark') },
  { path: a.confetti, loadComponent: () => import('./confetti/confetti') },
  { path: a.splashCursor, loadComponent: () => import('./splash-cursor/splash-cursor') },
] satisfies Routes;
