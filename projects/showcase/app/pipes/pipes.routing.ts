import type { Routes } from '@angular/router';

import { routes } from '#routing';

const pipes = routes.pipes;

export default [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: pipes.wrNumber,
  },
  {
    path: pipes.wrNumber,
    loadComponent: () => import('./wr-number/wr-number'),
  },
  {
    path: pipes.wrBytes,
    loadComponent: () => import('./wr-bytes/wr-bytes'),
  },
  {
    path: pipes.wrDate,
    loadComponent: () => import('./wr-date/wr-date'),
  },
  {
    path: pipes.wrTruncate,
    loadComponent: () => import('./wr-truncate/wr-truncate'),
  },
  {
    path: pipes.wrMark,
    loadComponent: () => import('./wr-mark/wr-mark'),
  },
  {
    path: pipes.wrPlural,
    loadComponent: () => import('./wr-plural/wr-plural'),
  },
  {
    path: pipes.range,
    loadComponent: () => import('./range/range'),
  },
] satisfies Routes;
