import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const t = ROUTES.guides.tokens;

export default [
  { path: '', pathMatch: 'full', redirectTo: t.colors.path },
  { path: t.colors.path, loadComponent: () => import('./colors/colors') },
  { path: t.sizing.path, loadComponent: () => import('./sizing/sizing') },
  { path: t.typography.path, loadComponent: () => import('./typography/typography') },
  { path: t.density.path, loadComponent: () => import('./density/density') },
  { path: t.motion.path, loadComponent: () => import('./motion/motion') },
  // The theme builder exported a runtime palette from `wrThemeTokens()`, which
  // v15 removed. Its page is a tombstone that points at the compile-time rebrand.
  { path: t.builder.path, loadComponent: () => import('./builder/builder') },
] satisfies Routes;
