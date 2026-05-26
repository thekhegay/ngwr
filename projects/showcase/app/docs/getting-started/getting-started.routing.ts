import type { Routes } from '@angular/router';

import { routes } from '#routing';

const gettingStarted = routes.docs.gettingStarted;

export default [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: gettingStarted.installation,
  },
  {
    path: gettingStarted.installation,
    loadComponent: () => import('./installation/installation'),
  },
] satisfies Routes;
