/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * The helpers ngwr's charts share: the series palette, dashes and marker shapes,
 * the number writers, the nice-number axis, and the data table a chart renders
 * beside its drawing. Every export is `@internal` — an entry point of its own so
 * that the charts and the legend can all import it without one chart importing
 * another, and not a public API: nothing here carries a stability promise, and an
 * app imports a chart instead.
 */
export { chartAxis } from './axis';
export { WrChartTable } from './chart-table';
export { CHART_MARKERS, chartMarker, chartMarkerExtent, chartMarkerPath } from './markers';
export { useChartNumbers } from './numbers';
export { CHART_DASHES, CHART_PALETTE, chartColor, chartDash } from './palette';
export type {
  WrChartAxis,
  WrChartAxisOptions,
  WrChartMarkerExtent,
  WrChartMarkerShape,
  WrChartNumbers,
  WrChartTableData,
  WrChartTableGroup,
  WrChartTableRow,
} from './types';
