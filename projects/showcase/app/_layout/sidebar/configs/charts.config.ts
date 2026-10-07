import type { SidebarGroup } from '../sidebar.types';

/** Sidebar for `/charts/*`. Alphabetical — no chart leads the others. */
export const CHARTS_SIDEBAR: readonly SidebarGroup[] = [
  { title: 'Bar Chart', url: ['/charts', 'bar-chart'] },
  { title: 'Calendar Heatmap', url: ['/charts', 'calendar-heatmap'] },
  { title: 'Donut Chart', url: ['/charts', 'donut-chart'] },
  { title: 'Gauge', url: ['/charts', 'gauge'] },
  { title: 'Line Chart', url: ['/charts', 'line-chart'] },
  { title: 'Meter Group', url: ['/charts', 'meter-group'] },
  { title: 'Sparkline', url: ['/charts', 'sparkline'] },
];
