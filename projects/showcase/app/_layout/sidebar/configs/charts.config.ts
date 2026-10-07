import { ROUTES, wrLink } from '#routes';
import type { SidebarGroup } from '#types';

/** Sidebar for `/charts/*`. Alphabetical — no chart leads the others. */
export const CHARTS_SIDEBAR: readonly SidebarGroup[] = [
  wrLink(ROUTES.charts, ROUTES.charts.barChart),
  wrLink(ROUTES.charts, ROUTES.charts.calendarHeatmap),
  wrLink(ROUTES.charts, ROUTES.charts.donutChart),
  wrLink(ROUTES.charts, ROUTES.charts.gauge),
  wrLink(ROUTES.charts, ROUTES.charts.lineChart),
  wrLink(ROUTES.charts, ROUTES.charts.meterGroup),
  wrLink(ROUTES.charts, ROUTES.charts.sparkline),
];
