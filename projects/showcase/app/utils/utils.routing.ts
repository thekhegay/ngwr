import type { Routes } from '@angular/router';

import { routes } from '#routing';

const utils = routes.utils;

export default [
  { path: '', pathMatch: 'full', redirectTo: utils.resolveCssSize },
  { path: utils.resolveCssSize, loadComponent: () => import('./resolve-css-size/resolve-css-size') },
  { path: utils.getRootFontSize, loadComponent: () => import('./get-root-font-size/get-root-font-size') },
  { path: utils.randomId, loadComponent: () => import('./random-id/random-id') },
  { path: utils.isDefined, loadComponent: () => import('./is-defined/is-defined') },
  // Types grew into their own top-level section.
  { path: utils.types, redirectTo: '/types/common' },
  { path: utils.isNonEmptyArray, loadComponent: () => import('./is-non-empty-array/is-non-empty-array') },
  { path: utils.isObservable, loadComponent: () => import('./is-observable/is-observable') },
  { path: utils.keys, loadComponent: () => import('./keys/keys') },
  { path: utils.hasModifier, loadComponent: () => import('./has-modifier/has-modifier') },
  { path: utils.isPrintableKey, loadComponent: () => import('./is-printable-key/is-printable-key') },
  { path: utils.noop, loadComponent: () => import('./noop/noop') },
  { path: utils.badgeLog, loadComponent: () => import('./badge-log/badge-log') },
  { path: utils.debounce, loadComponent: () => import('./debounce/debounce') },
  { path: utils.throttle, loadComponent: () => import('./throttle/throttle') },
  { path: utils.getFocusableElements, loadComponent: () => import('./get-focusable-elements/get-focusable-elements') },
  { path: utils.trapFocus, loadComponent: () => import('./trap-focus/trap-focus') },
] satisfies Routes;
