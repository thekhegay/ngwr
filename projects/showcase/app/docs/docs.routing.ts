import type { Routes } from '@angular/router';

import { routes } from '#routing';

export default [
  {
    path: '',
    loadComponent: () => import('#layout'),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: routes.docs.components.index,
      },
      {
        path: routes.docs.components.index,
        loadChildren: () => import('./components/components.routing'),
      },
    ],
  },
] satisfies Routes;
