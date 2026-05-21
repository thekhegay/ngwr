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
        redirectTo: `${routes.docs.gettingStarted.index}/${routes.docs.gettingStarted.installation}`,
      },
      {
        path: routes.docs.gettingStarted.index,
        loadChildren: () => import('./getting-started/getting-started.routing'),
      },
      {
        path: routes.docs.components.index,
        loadChildren: () => import('./components/components.routing'),
      },
      {
        path: routes.docs.core.index,
        loadChildren: () => import('./core/core.routing'),
      },
    ],
  },
] satisfies Routes;
