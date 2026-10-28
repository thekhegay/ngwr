import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const charts = ROUTES.charts;

/** Parts a chart is built from rather than charts. Folder only — the URL stays `/charts/<slug>`. */
export const BUILDING_BLOCK_ROUTES = [
  { path: charts.chartLegend.path, loadComponent: () => import('./chart-legend/chart-legend') },
] satisfies Routes;
