import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const animations = ROUTES.animations;

/** Effects behind a region's content. Folder only — the URL stays `/animations/<slug>`. */
export const BACKGROUNDS_ROUTES = [
  { path: animations.aurora.path, loadComponent: () => import('./aurora/aurora') },
  { path: animations.dotGrid.path, loadComponent: () => import('./dot-grid/dot-grid') },
  { path: animations.flowLines.path, loadComponent: () => import('./flow-lines/flow-lines') },
  { path: animations.rippleGrid.path, loadComponent: () => import('./ripple-grid/ripple-grid') },
  { path: animations.threadLines.path, loadComponent: () => import('./thread-lines/thread-lines') },
] satisfies Routes;
