import type { Routes } from '@angular/router';

import { BACKGROUND_ROUTES } from './backgrounds/routing';
import { BLOCK_ROUTES } from './blocks/routing';
import { EFFECT_ROUTES } from './effects/routing';
import { TEXT_ROUTES } from './text/routing';

import { ROUTES } from '#routes';

/**
 * The bits cluster, assembled from one routing file per sidebar group.
 *
 * The groups are FOLDERS, not URL segments: every page stays at
 * `/bits/<slug>`, so a link published before the regrouping still resolves.
 */
export default [
  { path: '', pathMatch: 'full', redirectTo: ROUTES.bits.aurora.path },
  ...BACKGROUND_ROUTES,
  ...BLOCK_ROUTES,
  ...EFFECT_ROUTES,
  ...TEXT_ROUTES,
] satisfies Routes;
