import type { Routes } from '@angular/router';

import { routes } from '#routing';

const v = routes.validators;

export default [
  { path: '', pathMatch: 'full', redirectTo: v.match },
  { path: v.noWhitespace, loadComponent: () => import('./no-whitespace/no-whitespace') },
  { path: v.hexColor, loadComponent: () => import('./hex-color/hex-color') },
  { path: v.url, loadComponent: () => import('./url/url') },
  { path: v.cardNumber, loadComponent: () => import('./card-number/card-number') },
  { path: v.cvc, loadComponent: () => import('./cvc/cvc') },
  { path: v.iban, loadComponent: () => import('./iban/iban') },
  { path: v.match, loadComponent: () => import('./match/match') },
  { path: v.oneOf, loadComponent: () => import('./one-of/one-of') },
  { path: v.minDate, loadComponent: () => import('./min-date/min-date') },
  { path: v.maxDate, loadComponent: () => import('./max-date/max-date') },
] satisfies Routes;
