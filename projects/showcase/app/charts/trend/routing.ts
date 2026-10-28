import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const charts = ROUTES.charts;

/** Charts of change over time. Folder only — the URL stays `/charts/<slug>`. */
export const TREND_ROUTES = [
  { path: charts.calendarHeatmap.path, loadComponent: () => import('./calendar-heatmap/calendar-heatmap') },
  { path: charts.candlestickChart.path, loadComponent: () => import('./candlestick-chart/candlestick-chart') },
  { path: charts.lineChart.path, loadComponent: () => import('./line-chart/line-chart') },
  { path: charts.sparkline.path, loadComponent: () => import('./sparkline/sparkline') },
] satisfies Routes;
