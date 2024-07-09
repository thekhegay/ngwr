import { Routes } from '@angular/router';

import { routes as r } from '#routing';

export default [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: r.docs.gettingStarted.installation,
  },
  {
    path: r.docs.gettingStarted.installation,
    loadComponent: () => import('./installation/installation.component').then(c => c.InstallationComponent),
  },
] satisfies Routes;
