import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const pipes = ROUTES.reference.pipes;

export default [
  // The cluster root is a catalog page, not a redirect to its first child —
  // see `reference.routing.ts` for why, and for the `data.index` it inherits.
  { path: '', pathMatch: 'full', loadComponent: () => import('#core/components/doc-index/doc-index') },
  {
    path: pipes.wrNumber.path,
    loadComponent: () => import('./wr-number/wr-number'),
  },
  {
    path: pipes.wrBytes.path,
    loadComponent: () => import('./wr-bytes/wr-bytes'),
  },
  {
    path: pipes.wrDate.path,
    loadComponent: () => import('./wr-date/wr-date'),
  },
  {
    path: pipes.wrTruncate.path,
    loadComponent: () => import('./wr-truncate/wr-truncate'),
  },
  {
    path: pipes.wrMark.path,
    loadComponent: () => import('./wr-mark/wr-mark'),
  },
  {
    path: pipes.wrPlural.path,
    loadComponent: () => import('./wr-plural/wr-plural'),
  },
  {
    path: pipes.wrRange.path,
    loadComponent: () => import('./wr-range/wr-range'),
  },
  // The folder was the one unprefixed pipe route; `/reference/pipes/range` was
  // published, so it keeps resolving.
  { path: 'range', redirectTo: pipes.wrRange.path },
] satisfies Routes;
