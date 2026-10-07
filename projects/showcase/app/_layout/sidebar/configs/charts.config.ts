import { ROUTES, wrPath, type WrRoute } from '#routes';
import type { SidebarGroup, SidebarLink } from '#types';

const base = [ROUTES.charts];

/** A row takes its title and its link from the route node, so the two cannot disagree. */
const link = (route: WrRoute): SidebarLink => ({ title: route.title, url: wrPath(...base, route) });

/** Sidebar for `/charts/*`. Alphabetical — no chart leads the others. */
export const CHARTS_SIDEBAR: readonly SidebarGroup[] = [
  link(ROUTES.charts.barChart),
  link(ROUTES.charts.calendarHeatmap),
  link(ROUTES.charts.donutChart),
  link(ROUTES.charts.gauge),
  link(ROUTES.charts.lineChart),
  link(ROUTES.charts.meterGroup),
  link(ROUTES.charts.sparkline),
];
