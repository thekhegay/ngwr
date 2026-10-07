import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const components = ROUTES.reference.components;

/** Folder only — every page stays at `/reference/components/<slug>`. */
export const NAVIGATION_ROUTES = [
  { path: components.anchor.path, loadComponent: () => import('./anchor/anchor') },
  { path: components.backTop.path, loadComponent: () => import('./back-top/back-top') },
  { path: components.breadcrumbs.path, loadComponent: () => import('./breadcrumbs/breadcrumbs') },
  { path: components.burger.path, loadComponent: () => import('./burger/burger') },
  { path: components.dropdown.path, loadComponent: () => import('./dropdown/dropdown') },
  { path: components.sidebar.path, loadComponent: () => import('./sidebar/sidebar') },
  { path: components.stepper.path, loadComponent: () => import('./stepper/stepper') },
  { path: components.tabs.path, loadComponent: () => import('./tabs/tabs') },
] satisfies Routes;
