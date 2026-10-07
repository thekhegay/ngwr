import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const utils = ROUTES.reference.utils;

export default [
  // The cluster root is a catalog page, not a redirect to its first child —
  // see `reference.routing.ts` for why, and for the `data.index` it inherits.
  { path: '', pathMatch: 'full', loadComponent: () => import('#core/components/doc-index/doc-index') },
  { path: utils.resolveCssSize.path, loadComponent: () => import('./resolve-css-size/resolve-css-size') },
  { path: utils.getRootFontSize.path, loadComponent: () => import('./get-root-font-size/get-root-font-size') },
  { path: utils.randomId.path, loadComponent: () => import('./random-id/random-id') },
  { path: utils.isDefined.path, loadComponent: () => import('./is-defined/is-defined') },
  { path: utils.clamp.path, loadComponent: () => import('./clamp/clamp') },
  { path: utils.round.path, loadComponent: () => import('./round/round') },
  { path: utils.numAttr.path, loadComponent: () => import('./num-attr/num-attr') },
  { path: utils.toClassList.path, loadComponent: () => import('./to-class-list/to-class-list') },
  // Types grew into their own top-level section. Spelled at its CURRENT path:
  // `/interfaces/common` is itself a pre-reorg alias, so this was a redirect to a
  // redirect — two hops, and the stub's markdown twin pointed at a URL that has
  // none.
  { path: utils.types.path, redirectTo: '/reference/interfaces/common' },
  { path: utils.isNonEmptyArray.path, loadComponent: () => import('./is-non-empty-array/is-non-empty-array') },
  { path: utils.isObservable.path, loadComponent: () => import('./is-observable/is-observable') },
  { path: utils.keys.path, loadComponent: () => import('./keys/keys') },
  { path: utils.hasModifier.path, loadComponent: () => import('./has-modifier/has-modifier') },
  { path: utils.isComposing.path, loadComponent: () => import('./is-composing/is-composing') },
  { path: utils.isPrintableKey.path, loadComponent: () => import('./is-printable-key/is-printable-key') },
  { path: utils.noop.path, loadComponent: () => import('./noop/noop') },
  { path: utils.badgeLog.path, loadComponent: () => import('./badge-log/badge-log') },
  { path: utils.debounce.path, loadComponent: () => import('./debounce/debounce') },
  { path: utils.throttle.path, loadComponent: () => import('./throttle/throttle') },
  {
    path: utils.getFocusableElements.path,
    loadComponent: () => import('./get-focusable-elements/get-focusable-elements'),
  },
  { path: utils.trapFocus.path, loadComponent: () => import('./trap-focus/trap-focus') },
] satisfies Routes;
