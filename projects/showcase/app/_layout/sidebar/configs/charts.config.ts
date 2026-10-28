import { ROUTES, wrLink } from '#routes';
import type { SidebarGroup } from '#types';

/**
 * Sidebar for `/charts/*`, grouped by the question a chart answers, so a
 * reader who knows what they want to show finds the candidates side by side.
 *
 * The groups run in the order a reader reaches for them: comparing categories
 * is the first chart most pages need (the cluster lands on the bar chart),
 * then change over time, then the parts of a whole, then how values are
 * spread, then one value against its range. The legend is not a chart on its
 * own, so its group comes last. Rows are alphabetical inside a group.
 *
 * Each group is a folder under `app/charts/`; the URL never contains it.
 */
export const CHARTS_SIDEBAR: readonly SidebarGroup[] = [
  {
    title: 'Comparison',
    children: [
      wrLink(ROUTES.charts, ROUTES.charts.barChart),
      wrLink(ROUTES.charts, ROUTES.charts.funnelChart),
      wrLink(ROUTES.charts, ROUTES.charts.radarChart),
      wrLink(ROUTES.charts, ROUTES.charts.waterfallChart),
    ],
  },
  {
    title: 'Trend',
    children: [
      wrLink(ROUTES.charts, ROUTES.charts.calendarHeatmap),
      wrLink(ROUTES.charts, ROUTES.charts.candlestickChart),
      wrLink(ROUTES.charts, ROUTES.charts.lineChart),
      wrLink(ROUTES.charts, ROUTES.charts.sparkline),
    ],
  },
  {
    title: 'Part to whole',
    children: [
      wrLink(ROUTES.charts, ROUTES.charts.donutChart),
      wrLink(ROUTES.charts, ROUTES.charts.meterGroup),
      wrLink(ROUTES.charts, ROUTES.charts.treemapChart),
    ],
  },
  {
    title: 'Distribution',
    children: [
      wrLink(ROUTES.charts, ROUTES.charts.boxplotChart),
      wrLink(ROUTES.charts, ROUTES.charts.heatmapChart),
      wrLink(ROUTES.charts, ROUTES.charts.scatterChart),
    ],
  },
  {
    title: 'Single value',
    children: [wrLink(ROUTES.charts, ROUTES.charts.bulletChart), wrLink(ROUTES.charts, ROUTES.charts.gauge)],
  },
  {
    title: 'Building blocks',
    children: [wrLink(ROUTES.charts, ROUTES.charts.chartLegend)],
  },
];
