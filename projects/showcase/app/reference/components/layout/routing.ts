import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const components = ROUTES.reference.components;

/** Folder only — every page stays at `/reference/components/<slug>`. */
export const LAYOUT_ROUTES = [
  { path: components.card.path, loadComponent: () => import('./card/card') },
  { path: components.carousel.path, loadComponent: () => import('./carousel/carousel') },
  { path: components.collapse.path, loadComponent: () => import('./collapse/collapse') },
  { path: components.layout.path, loadComponent: () => import('./layout/layout') },
  { path: components.list.path, loadComponent: () => import('./list/list') },
  { path: components.pageHeader.path, loadComponent: () => import('./page-header/page-header') },
  { path: components.splitter.path, loadComponent: () => import('./splitter/splitter') },
  { path: components.toolbar.path, loadComponent: () => import('./toolbar/toolbar') },
] satisfies Routes;
