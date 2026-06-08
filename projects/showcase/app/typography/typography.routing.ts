import type { Routes } from '@angular/router';

import { routes } from '#routing';

const t = routes.typography;

export default [
  { path: '', pathMatch: 'full', redirectTo: t.overview },
  { path: t.overview, loadComponent: () => import('./overview/overview') },
  { path: t.headings, loadComponent: () => import('./headings/headings') },
  { path: t.text, loadComponent: () => import('./text/text') },
  { path: t.code, loadComponent: () => import('./code/code') },
  { path: t.keyboard, loadComponent: () => import('./keyboard/keyboard') },
] satisfies Routes;
