import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const charts = ROUTES.charts;

/** Charts of how values are spread. Folder only — the URL stays `/charts/<slug>`. */
export const DISTRIBUTION_ROUTES = [
  { path: charts.boxplotChart.path, loadComponent: () => import('./boxplot-chart/boxplot-chart') },
  { path: charts.heatmapChart.path, loadComponent: () => import('./heatmap-chart/heatmap-chart') },
  { path: charts.scatterChart.path, loadComponent: () => import('./scatter-chart/scatter-chart') },
] satisfies Routes;
