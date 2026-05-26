import type { Routes } from '@angular/router';

import { routes } from '#routing';

// The outer `Layout` is already mounted by the root routing config — this
// file just declares the docs sub-tree. Components live as a sibling at
// `/components/*` (see routing.ts), not here.
export default [
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
    path: routes.docs.core.index,
    loadChildren: () => import('./core/core.routing'),
  },
] satisfies Routes;
