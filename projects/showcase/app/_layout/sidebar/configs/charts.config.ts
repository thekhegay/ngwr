import { ROUTES, wrLink } from '#routes';
import type { SidebarGroup } from '#types';

/** Sidebar for `/charts/*`. Alphabetical — no chart leads the others. */
export const CHARTS_SIDEBAR: readonly SidebarGroup[] = [
  wrLink(ROUTES.charts, ROUTES.charts.barChart),
  wrLink(ROUTES.charts, ROUTES.charts.boxplotChart),
  wrLink(ROUTES.charts, ROUTES.charts.bulletChart),
  wrLink(ROUTES.charts, ROUTES.charts.calendarHeatmap),
  wrLink(ROUTES.charts, ROUTES.charts.candlestickChart),
  wrLink(ROUTES.charts, ROUTES.charts.chartLegend),
  wrLink(ROUTES.charts, ROUTES.charts.donutChart),
  wrLink(ROUTES.charts, ROUTES.charts.funnelChart),
  wrLink(ROUTES.charts, ROUTES.charts.gauge),
  wrLink(ROUTES.charts, ROUTES.charts.heatmapChart),
  wrLink(ROUTES.charts, ROUTES.charts.lineChart),
  wrLink(ROUTES.charts, ROUTES.charts.meterGroup),
  wrLink(ROUTES.charts, ROUTES.charts.radarChart),
  wrLink(ROUTES.charts, ROUTES.charts.scatterChart),
  wrLink(ROUTES.charts, ROUTES.charts.sparkline),
  wrLink(ROUTES.charts, ROUTES.charts.treemapChart),
  wrLink(ROUTES.charts, ROUTES.charts.waterfallChart),
];
