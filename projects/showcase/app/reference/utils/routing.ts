import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const utils = ROUTES.reference.utils;

export default [
  // The cluster root is a catalog page, not a redirect to its first child —
  // see `reference.routing.ts` for why, and for the `data.index` it inherits.
  { path: '', pathMatch: 'full', loadComponent: () => import('#core/components/doc-index/doc-index') },
  { path: utils.wrResolveCssSize.path, loadComponent: () => import('./wr-resolve-css-size/wr-resolve-css-size') },
  { path: utils.wrResolveCssColor.path, loadComponent: () => import('./wr-resolve-css-color/wr-resolve-css-color') },
  { path: utils.wrGetRootFontSize.path, loadComponent: () => import('./wr-get-root-font-size/wr-get-root-font-size') },
  { path: utils.wrRandomId.path, loadComponent: () => import('./wr-random-id/wr-random-id') },
  { path: utils.wrIsDefined.path, loadComponent: () => import('./wr-is-defined/wr-is-defined') },
  { path: utils.wrClamp.path, loadComponent: () => import('./wr-clamp/wr-clamp') },
  { path: utils.wrRound.path, loadComponent: () => import('./wr-round/wr-round') },
  { path: utils.wrNumAttr.path, loadComponent: () => import('./wr-num-attr/wr-num-attr') },
  { path: utils.wrToClassList.path, loadComponent: () => import('./wr-to-class-list/wr-to-class-list') },
  // Types grew into their own top-level section. Spelled at its CURRENT path:
  // `/interfaces/common` is itself a pre-reorg alias, so this was a redirect to a
  // redirect — two hops, and the stub's markdown twin pointed at a URL that has
  // none.
  { path: utils.types.path, redirectTo: '/reference/interfaces/common' },
  { path: utils.wrIsNonEmptyArray.path, loadComponent: () => import('./wr-is-non-empty-array/wr-is-non-empty-array') },
  { path: utils.wrIsObservable.path, loadComponent: () => import('./wr-is-observable/wr-is-observable') },
  { path: utils.wrKeys.path, loadComponent: () => import('./wr-keys/wr-keys') },
  { path: utils.wrHasModifier.path, loadComponent: () => import('./wr-has-modifier/wr-has-modifier') },
  { path: utils.wrIsComposing.path, loadComponent: () => import('./wr-is-composing/wr-is-composing') },
  { path: utils.wrIsPrintableKey.path, loadComponent: () => import('./wr-is-printable-key/wr-is-printable-key') },
  { path: utils.wrNoop.path, loadComponent: () => import('./wr-noop/wr-noop') },
  { path: utils.wrBadgeLog.path, loadComponent: () => import('./wr-badge-log/wr-badge-log') },
  { path: utils.wrDebounce.path, loadComponent: () => import('./wr-debounce/wr-debounce') },
  { path: utils.wrThrottle.path, loadComponent: () => import('./wr-throttle/wr-throttle') },
  {
    path: utils.wrGetFocusableElements.path,
    loadComponent: () => import('./wr-get-focusable-elements/wr-get-focusable-elements'),
  },
  { path: utils.wrTrapFocus.path, loadComponent: () => import('./wr-trap-focus/wr-trap-focus') },
  { path: utils.wrAction.path, loadComponent: () => import('./wr-action/wr-action') },
  { path: utils.wrDecimal.path, loadComponent: () => import('./wr-decimal/wr-decimal') },
  { path: utils.wrDownloadBlob.path, loadComponent: () => import('./wr-download-blob/wr-download-blob') },
  { path: utils.wrInitials.path, loadComponent: () => import('./wr-initials/wr-initials') },
  { path: utils.wrPoll.path, loadComponent: () => import('./wr-poll/wr-poll') },
  { path: utils.wrQueryParam.path, loadComponent: () => import('./wr-query-param/wr-query-param') },
  {
    path: utils.withRenderOnNavigation.path,
    loadComponent: () => import('./with-render-on-navigation/with-render-on-navigation'),
  },
  // v16 put the `wr` prefix on every util, and each page took its new name.
  // Every old slug was published, so every one keeps resolving.
  { path: 'badge-log', redirectTo: '/reference/utils/wr-badge-log' },
  { path: 'clamp', redirectTo: '/reference/utils/wr-clamp' },
  { path: 'debounce', redirectTo: '/reference/utils/wr-debounce' },
  { path: 'get-focusable-elements', redirectTo: '/reference/utils/wr-get-focusable-elements' },
  { path: 'get-root-font-size', redirectTo: '/reference/utils/wr-get-root-font-size' },
  { path: 'has-modifier', redirectTo: '/reference/utils/wr-has-modifier' },
  { path: 'is-composing', redirectTo: '/reference/utils/wr-is-composing' },
  { path: 'is-defined', redirectTo: '/reference/utils/wr-is-defined' },
  { path: 'is-non-empty-array', redirectTo: '/reference/utils/wr-is-non-empty-array' },
  { path: 'is-observable', redirectTo: '/reference/utils/wr-is-observable' },
  { path: 'is-printable-key', redirectTo: '/reference/utils/wr-is-printable-key' },
  { path: 'keys', redirectTo: '/reference/utils/wr-keys' },
  { path: 'noop', redirectTo: '/reference/utils/wr-noop' },
  { path: 'num-attr', redirectTo: '/reference/utils/wr-num-attr' },
  { path: 'random-id', redirectTo: '/reference/utils/wr-random-id' },
  { path: 'resolve-css-color', redirectTo: '/reference/utils/wr-resolve-css-color' },
  { path: 'resolve-css-size', redirectTo: '/reference/utils/wr-resolve-css-size' },
  { path: 'round', redirectTo: '/reference/utils/wr-round' },
  { path: 'throttle', redirectTo: '/reference/utils/wr-throttle' },
  { path: 'to-class-list', redirectTo: '/reference/utils/wr-to-class-list' },
  { path: 'trap-focus', redirectTo: '/reference/utils/wr-trap-focus' },
] satisfies Routes;
