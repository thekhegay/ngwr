import type { Routes } from '@angular/router';

import { routes } from '#routing';

const utils = routes.docs.core.utils;

export default [
  { path: '', pathMatch: 'full', redirectTo: utils.cssSize },
  { path: utils.cssSize, loadComponent: () => import('./css-size/css-size') },
  { path: utils.randomId, loadComponent: () => import('./random-id/random-id') },
  { path: utils.guards, loadComponent: () => import('./guards/guards') },
  { path: utils.keys, loadComponent: () => import('./keys/keys') },
  { path: utils.misc, loadComponent: () => import('./misc/misc') },
] satisfies Routes;
