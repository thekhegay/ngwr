import type { Routes } from '@angular/router';

import { routes } from '#routing';

const utils = routes.docs.core.utils;

export default [
  { path: '', pathMatch: 'full', redirectTo: utils.cssSize },
  { path: utils.cssSize, loadComponent: () => import('./css-size/css-size.component') },
  { path: utils.randomId, loadComponent: () => import('./random-id/random-id.component') },
  { path: utils.guards, loadComponent: () => import('./guards/guards.component') },
  { path: utils.keys, loadComponent: () => import('./keys/keys.component') },
  { path: utils.misc, loadComponent: () => import('./misc/misc.component') },
] satisfies Routes;
