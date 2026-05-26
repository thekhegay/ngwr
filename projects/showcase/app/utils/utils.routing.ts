import type { Routes } from '@angular/router';

import { routes } from '#routing';

const utils = routes.utils;

export default [
  { path: '', pathMatch: 'full', redirectTo: utils.cssSize },
  { path: utils.cssSize, loadComponent: () => import('./css-size/css-size') },
  { path: utils.randomId, loadComponent: () => import('./random-id/random-id') },
  { path: utils.guards, loadComponent: () => import('./guards/guards') },
  { path: utils.keys, loadComponent: () => import('./keys/keys') },
  { path: utils.noop, loadComponent: () => import('./noop/noop') },
  { path: utils.badgeLog, loadComponent: () => import('./badge-log/badge-log') },
  { path: utils.rate, loadComponent: () => import('./rate/rate') },
  { path: utils.focus, loadComponent: () => import('./focus/focus') },
] satisfies Routes;
