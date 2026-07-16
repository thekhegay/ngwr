import type { Routes } from '@angular/router';

import { TOKENS_SIDEBAR, TRANSLATE_SIDEBAR, TYPOGRAPHY_SIDEBAR } from '../_layout/sidebar/configs';

import { routes } from '#routing';

const guides = routes.guides;

/**
 * Guides — how to do a job that spans more than one API. Each one links out to
 * the `/reference` pages for the APIs it uses, and those link back here.
 *
 * `tokens`, `translations` and `typography` still carry their own sidebars and
 * child routes because they arrived as whole sections; folding them into the
 * guides they belong to (theming / i18n) is the next pass.
 */
export default [
  { path: '', pathMatch: 'full', redirectTo: guides.theming },
  { path: guides.theming, loadComponent: () => import('./theming/theming') },
  { path: guides.color, loadComponent: () => import('./color/color') },
  { path: guides.grid, loadComponent: () => import('./grid/grid') },
  { path: guides.overlay, loadComponent: () => import('./overlay/overlay') },
  { path: guides.mobile, loadComponent: () => import('./mobile/mobile') },
  { path: guides.i18n, loadComponent: () => import('./i18n/i18n') },
  { path: guides.keyboard, loadComponent: () => import('./keyboard/keyboard') },
  {
    path: guides.tokens,
    data: { sidebar: TOKENS_SIDEBAR },
    loadChildren: () => import('./tokens/tokens.routing'),
  },
  {
    path: guides.translations,
    data: { sidebar: TRANSLATE_SIDEBAR },
    loadChildren: () => import('./translations/translations.routing'),
  },
  {
    path: guides.typography,
    data: { sidebar: TYPOGRAPHY_SIDEBAR },
    loadChildren: () => import('./typography/typography.routing'),
  },
] satisfies Routes;
