import type { Routes } from '@angular/router';

import { BUILDING_BLOCK_ROUTES } from './building-blocks/routing';
import { COMPARISON_ROUTES } from './comparison/routing';
import { DISTRIBUTION_ROUTES } from './distribution/routing';
import { PART_TO_WHOLE_ROUTES } from './part-to-whole/routing';
import { SINGLE_VALUE_ROUTES } from './single-value/routing';
import { TREND_ROUTES } from './trend/routing';

import { ROUTES } from '#routes';

/**
 * The chart components, their own cluster rather than a group under
 * `reference`, assembled from one routing file per sidebar group.
 *
 * The groups are FOLDERS, not URL segments: every page stays at
 * `/charts/<slug>`, so a link published before the grouping still resolves.
 */
export default [
  { path: '', pathMatch: 'full', redirectTo: ROUTES.charts.barChart.path },
  ...COMPARISON_ROUTES,
  ...TREND_ROUTES,
  ...PART_TO_WHOLE_ROUTES,
  ...DISTRIBUTION_ROUTES,
  ...SINGLE_VALUE_ROUTES,
  ...BUILDING_BLOCK_ROUTES,
] satisfies Routes;
