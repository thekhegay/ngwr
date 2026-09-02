import type { Routes } from '@angular/router';

import { routes } from '#routing';

const utils = routes.utils;

export default [
  // The cluster root is a catalog page, not a redirect to its first child —
  // see `reference.routing.ts` for why, and for the `data.index` it inherits.
  { path: '', pathMatch: 'full', loadComponent: () => import('#core/components/doc-index/doc-index') },
  { path: utils.resolveCssSize, loadComponent: () => import('./resolve-css-size/resolve-css-size') },
  { path: utils.getRootFontSize, loadComponent: () => import('./get-root-font-size/get-root-font-size') },
  { path: utils.randomId, loadComponent: () => import('./random-id/random-id') },
  { path: utils.isDefined, loadComponent: () => import('./is-defined/is-defined') },
  { path: utils.clamp, loadComponent: () => import('./clamp/clamp') },
  { path: utils.round, loadComponent: () => import('./round/round') },
  { path: utils.numAttr, loadComponent: () => import('./num-attr/num-attr') },
  // Types grew into their own top-level section. Spelled at its CURRENT path:
  // `/interfaces/common` is itself a pre-reorg alias, so this was a redirect to a
  // redirect — two hops, and the stub's markdown twin pointed at a URL that has
  // none.
  { path: utils.types, redirectTo: '/reference/interfaces/common' },
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
