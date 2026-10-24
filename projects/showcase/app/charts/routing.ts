import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const charts = ROUTES.charts;

/** The chart components, their own cluster rather than a group under `reference`. */
export default [
  { path: '', pathMatch: 'full', redirectTo: charts.barChart.path },
  { path: charts.barChart.path, loadComponent: () => import('./bar-chart/bar-chart') },
  { path: charts.boxplotChart.path, loadComponent: () => import('./boxplot-chart/boxplot-chart') },
  { path: charts.bulletChart.path, loadComponent: () => import('./bullet-chart/bullet-chart') },
  { path: charts.calendarHeatmap.path, loadComponent: () => import('./calendar-heatmap/calendar-heatmap') },
  { path: charts.candlestickChart.path, loadComponent: () => import('./candlestick-chart/candlestick-chart') },
  { path: charts.chartLegend.path, loadComponent: () => import('./chart-legend/chart-legend') },
  { path: charts.donutChart.path, loadComponent: () => import('./donut-chart/donut-chart') },
  { path: charts.funnelChart.path, loadComponent: () => import('./funnel-chart/funnel-chart') },
  { path: charts.gauge.path, loadComponent: () => import('./gauge/gauge') },
  { path: charts.heatmapChart.path, loadComponent: () => import('./heatmap-chart/heatmap-chart') },
  { path: charts.lineChart.path, loadComponent: () => import('./line-chart/line-chart') },
  { path: charts.meterGroup.path, loadComponent: () => import('./meter-group/meter-group') },
  { path: charts.radarChart.path, loadComponent: () => import('./radar-chart/radar-chart') },
  { path: charts.scatterChart.path, loadComponent: () => import('./scatter-chart/scatter-chart') },
  { path: charts.sparkline.path, loadComponent: () => import('./sparkline/sparkline') },
  { path: charts.treemapChart.path, loadComponent: () => import('./treemap-chart/treemap-chart') },
  { path: charts.waterfallChart.path, loadComponent: () => import('./waterfall-chart/waterfall-chart') },
] satisfies Routes;
