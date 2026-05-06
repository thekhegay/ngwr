import type { Routes } from '@angular/router';

import { routes } from '#routing';

const components = routes.docs.components;

export default [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: components.icon,
  },
  {
    path: components.icon,
    loadComponent: () => import('./icon/icon.component'),
  },
] satisfies Routes;
