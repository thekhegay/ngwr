import type { Routes } from '@angular/router';

import { routes } from '#routing';

const pipes = routes.docs.core.pipes;

export default [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: pipes.wrNumber,
  },
  {
    path: pipes.wrNumber,
    loadComponent: () => import('./wr-number/wr-number.component'),
  },
  {
    path: pipes.wrBytes,
    loadComponent: () => import('./wr-bytes/wr-bytes.component'),
  },
  {
    path: pipes.wrDate,
    loadComponent: () => import('./wr-date/wr-date.component'),
  },
  {
    path: pipes.wrTruncate,
    loadComponent: () => import('./wr-truncate/wr-truncate.component'),
  },
  {
    path: pipes.range,
    loadComponent: () => import('./range/range.component'),
  },
] satisfies Routes;
