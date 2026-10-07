import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const components = ROUTES.reference.components;

/** Folder only — every page stays at `/reference/components/<slug>`. */
export const BUTTONS_ROUTES = [
  { path: components.button.path, loadComponent: () => import('./button/button') },
  { path: components.buttonGroup.path, loadComponent: () => import('./button-group/button-group') },
  { path: components.speedDial.path, loadComponent: () => import('./speed-dial/speed-dial') },
] satisfies Routes;
