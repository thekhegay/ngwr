import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const v = ROUTES.reference.validators;

export default [
  // The cluster root is a catalog page, not a redirect to its first child —
  // see `reference.routing.ts` for why, and for the `data.index` it inherits.
  { path: '', pathMatch: 'full', loadComponent: () => import('#core/components/doc-index/doc-index') },
  { path: v.noWhitespace.path, loadComponent: () => import('./no-whitespace/no-whitespace') },
  { path: v.hexColor.path, loadComponent: () => import('./hex-color/hex-color') },
  { path: v.url.path, loadComponent: () => import('./url/url') },
  { path: v.cardNumber.path, loadComponent: () => import('./card-number/card-number') },
  { path: v.cvc.path, loadComponent: () => import('./cvc/cvc') },
  { path: v.iban.path, loadComponent: () => import('./iban/iban') },
  { path: v.match.path, loadComponent: () => import('./match/match') },
  { path: v.matchFields.path, loadComponent: () => import('./match-fields/match-fields') },
  { path: v.oneOf.path, loadComponent: () => import('./one-of/one-of') },
  { path: v.minDate.path, loadComponent: () => import('./min-date/min-date') },
  { path: v.maxDate.path, loadComponent: () => import('./max-date/max-date') },
] satisfies Routes;
