import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const charts = ROUTES.charts;

/** Charts of the parts of a whole. Folder only — the URL stays `/charts/<slug>`. */
export const PART_TO_WHOLE_ROUTES = [
  { path: charts.donutChart.path, loadComponent: () => import('./donut-chart/donut-chart') },
  { path: charts.meterGroup.path, loadComponent: () => import('./meter-group/meter-group') },
  { path: charts.treemapChart.path, loadComponent: () => import('./treemap-chart/treemap-chart') },
] satisfies Routes;
