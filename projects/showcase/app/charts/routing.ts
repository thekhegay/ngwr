import type { Routes } from '@angular/router';

import { routes } from '#routing';

const charts = routes.charts;

/** The chart components, their own cluster rather than a group under `reference`. */
export default [
  { path: '', pathMatch: 'full', redirectTo: charts.barChart },
  { path: charts.barChart, loadComponent: () => import('./bar-chart/bar-chart') },
  { path: charts.calendarHeatmap, loadComponent: () => import('./calendar-heatmap/calendar-heatmap') },
  { path: charts.donutChart, loadComponent: () => import('./donut-chart/donut-chart') },
  { path: charts.gauge, loadComponent: () => import('./gauge/gauge') },
  { path: charts.lineChart, loadComponent: () => import('./line-chart/line-chart') },
  { path: charts.meterGroup, loadComponent: () => import('./meter-group/meter-group') },
  { path: charts.sparkline, loadComponent: () => import('./sparkline/sparkline') },
] satisfies Routes;
