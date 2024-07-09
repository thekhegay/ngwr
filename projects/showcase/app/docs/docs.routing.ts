import { Routes } from '@angular/router';

import { routes } from '#routing';

export default [
  {
    path: '',
    loadComponent: () => import('#core/components/layout/layout.component').then(c => c.LayoutComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: routes.docs.gettingStarted.index,
      },
      {
        path: routes.docs.gettingStarted.index,
        loadChildren: () => import('./getting-started/getting-started.routing')
      },
      {
        path: routes.docs.components.index,
        loadChildren: () => import('./components/components.routing'),
      },
    ],
  },
] satisfies Routes;
