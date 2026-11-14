/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * The helpers ngwr's charts share: the series palette, dashes and marker shapes,
 * the number writers, the nice-number axis, rounding, label thinning, one hover and
 * one resize listener, the empty / loading / error state, and the data table a chart
 * renders beside its drawing. The chart theme itself, `--wr-chart-*`, is this entry
 * point's stylesheet. Every export is `@internal` - an entry point of its own so
 * that the charts and the legend can all import it without one chart importing
 * another, and not a public API: nothing here carries a stability promise, and an
 * app imports a chart instead.
 */
export { wrChartAxis } from './axis';
export { WrChartState, useChartState } from './chart-state';
export type { WrChartStateKind, WrChartStateOptions, WrChartStateView } from './chart-state';
export { WrChartTable } from './chart-table';
export { useChartHover, useChartSize, wrChartDim, wrChartObserveSize } from './interaction';
export type { WrChartHoverHandlers, WrChartSize } from './interaction';
export { wrChartLabelStep, wrChartLongest } from './labels';
export { WR_CHART_MARKERS, wrChartMarker, wrChartMarkerExtent, wrChartMarkerPath } from './markers';
export { useChartNumbers, wrChartNumberFormat } from './numbers';
export {
  WR_CHART_DASHES,
  WR_CHART_LEGACY_PALETTE,
  WR_CHART_PALETTE,
  wrChartColor,
  wrChartDash,
  wrChartLegacyColor,
} from './palette';
export { wrChartRound } from './round';
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
