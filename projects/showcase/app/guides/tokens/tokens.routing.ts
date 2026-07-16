import type { Routes } from '@angular/router';

import { routes } from '#routing';

const t = routes.tokens;

export default [
  { path: '', pathMatch: 'full', redirectTo: t.colors },
  { path: t.colors, loadComponent: () => import('./colors/colors') },
  { path: t.sizing, loadComponent: () => import('./sizing/sizing') },
  { path: t.typography, loadComponent: () => import('./typography/typography') },
  { path: t.density, loadComponent: () => import('./density/density') },
  { path: t.motion, loadComponent: () => import('./motion/motion') },
] satisfies Routes;
