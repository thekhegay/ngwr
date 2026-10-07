import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const charts = ROUTES.charts;

/** The chart components, their own cluster rather than a group under `reference`. */
export default [
  { path: '', pathMatch: 'full', redirectTo: charts.barChart.path },
  { path: charts.barChart.path, loadComponent: () => import('./bar-chart/bar-chart') },
  { path: charts.calendarHeatmap.path, loadComponent: () => import('./calendar-heatmap/calendar-heatmap') },
  { path: charts.donutChart.path, loadComponent: () => import('./donut-chart/donut-chart') },
  { path: charts.gauge.path, loadComponent: () => import('./gauge/gauge') },
  { path: charts.lineChart.path, loadComponent: () => import('./line-chart/line-chart') },
  { path: charts.meterGroup.path, loadComponent: () => import('./meter-group/meter-group') },
  { path: charts.sparkline.path, loadComponent: () => import('./sparkline/sparkline') },
] satisfies Routes;
