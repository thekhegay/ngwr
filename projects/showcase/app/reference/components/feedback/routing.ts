import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const components = ROUTES.reference.components;

/** Folder only — every page stays at `/reference/components/<slug>`. */
export const FEEDBACK_ROUTES = [
  { path: components.alert.path, loadComponent: () => import('./alert/alert') },
  { path: components.empty.path, loadComponent: () => import('./empty/empty') },
  { path: components.pullToRefresh.path, loadComponent: () => import('./pull-to-refresh/pull-to-refresh') },
  { path: components.progress.path, loadComponent: () => import('./progress/progress') },
  { path: components.result.path, loadComponent: () => import('./result/result') },
  { path: components.skeleton.path, loadComponent: () => import('./skeleton/skeleton') },
  { path: components.spinner.path, loadComponent: () => import('./spinner/spinner') },
] satisfies Routes;
