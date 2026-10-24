import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const charts = ROUTES.charts;

/** Charts of one value against its range. Folder only — the URL stays `/charts/<slug>`. */
export const SINGLE_VALUE_ROUTES = [
  { path: charts.bulletChart.path, loadComponent: () => import('./bullet-chart/bullet-chart') },
  { path: charts.gauge.path, loadComponent: () => import('./gauge/gauge') },
] satisfies Routes;
