import type { Routes } from '@angular/router';

import { routes } from '#routing';

const v = routes.validators;

export default [
  // The cluster root is a catalog page, not a redirect to its first child —
  // see `reference.routing.ts` for why, and for the `data.index` it inherits.
  { path: '', pathMatch: 'full', loadComponent: () => import('#core/components/doc-index/doc-index') },
  { path: v.noWhitespace, loadComponent: () => import('./no-whitespace/no-whitespace') },
  { path: v.hexColor, loadComponent: () => import('./hex-color/hex-color') },
  { path: v.url, loadComponent: () => import('./url/url') },
  { path: v.cardNumber, loadComponent: () => import('./card-number/card-number') },
  { path: v.cvc, loadComponent: () => import('./cvc/cvc') },
  { path: v.iban, loadComponent: () => import('./iban/iban') },
  { path: v.match, loadComponent: () => import('./match/match') },
  { path: v.matchFields, loadComponent: () => import('./match-fields/match-fields') },
  { path: v.oneOf, loadComponent: () => import('./one-of/one-of') },
  { path: v.minDate, loadComponent: () => import('./min-date/min-date') },
  { path: v.maxDate, loadComponent: () => import('./max-date/max-date') },
] satisfies Routes;
