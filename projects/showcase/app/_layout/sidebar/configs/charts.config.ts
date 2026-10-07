import { ROUTES } from '#routes';
import type { SidebarGroup } from '#types';

/** Sidebar for `/charts/*`. Alphabetical — no chart leads the others. */
export const CHARTS_SIDEBAR: readonly SidebarGroup[] = [
  ROUTES.charts.barChart,
  ROUTES.charts.calendarHeatmap,
  ROUTES.charts.donutChart,
  ROUTES.charts.gauge,
  ROUTES.charts.lineChart,
  ROUTES.charts.meterGroup,
  ROUTES.charts.sparkline,
];
