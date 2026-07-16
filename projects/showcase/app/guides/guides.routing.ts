import type { Routes } from '@angular/router';

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
  // `color` was a thinner second copy of the colour tokens — same swatch grid
  // for 8 of the 9 intents, and its two rebrand snippets had drifted onto a
  // SCSS path that no longer resolves. The catalog page is the single copy.
  { path: guides.color, redirectTo: '/guides/tokens/colors' },
  { path: guides.grid, loadComponent: () => import('./grid/grid') },
  { path: guides.overlay, loadComponent: () => import('./overlay/overlay') },
  { path: guides.mobile, loadComponent: () => import('./mobile/mobile') },
  { path: guides.keyboard, loadComponent: () => import('./keyboard/keyboard') },
  // These three are multi-page clusters, but they deliberately do NOT declare
  // their own `data.sidebar`: the sidebar resolves from the deepest activated
  // route, so a child sidebar would replace the guides nav on entry. They nest
  // inside GUIDES_SIDEBAR instead.
  { path: guides.tokens, loadChildren: () => import('./tokens/tokens.routing') },
  { path: guides.translations, loadChildren: () => import('./translations/translations.routing') },
  { path: guides.typography, loadChildren: () => import('./typography/typography.routing') },
] satisfies Routes;
