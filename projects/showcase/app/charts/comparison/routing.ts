import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const charts = ROUTES.charts;

/** Charts that compare categories. Folder only — the URL stays `/charts/<slug>`. */
export const COMPARISON_ROUTES = [
  { path: charts.barChart.path, loadComponent: () => import('./bar-chart/bar-chart') },
  { path: charts.funnelChart.path, loadComponent: () => import('./funnel-chart/funnel-chart') },
  { path: charts.radarChart.path, loadComponent: () => import('./radar-chart/radar-chart') },
  { path: charts.waterfallChart.path, loadComponent: () => import('./waterfall-chart/waterfall-chart') },
] satisfies Routes;
