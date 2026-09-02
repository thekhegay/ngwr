import type { Routes } from '@angular/router';

import { routes } from '#routing';

const pipes = routes.pipes;

export default [
  // The cluster root is a catalog page, not a redirect to its first child —
  // see `reference.routing.ts` for why, and for the `data.index` it inherits.
  { path: '', pathMatch: 'full', loadComponent: () => import('#core/components/doc-index/doc-index') },
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
    path: pipes.wrRange,
    loadComponent: () => import('./wr-range/wr-range'),
  },
  // The folder was the one unprefixed pipe route; `/reference/pipes/range` was
  // published, so it keeps resolving.
  { path: 'range', redirectTo: pipes.wrRange },
] satisfies Routes;
