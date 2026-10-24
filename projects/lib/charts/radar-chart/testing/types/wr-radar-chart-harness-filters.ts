/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-radar-chart>` a harness query matches. */
export interface WrRadarChartHarnessFilters extends BaseHarnessFilters {
  /** Match the drawing's accessible name. */
  readonly ariaLabel?: string | RegExp;
  /** Match a chart with an axis of this name. */
  readonly axisLabel?: string | RegExp;
}

/** One series' outline as {@link WrRadarChartHarness.getPolygons} reads it, in the order drawn. */
export interface WrRadarChartPolygon {
  /** The stroke the component wrote: the series' colour. */
  readonly color: string | null;
  /** The outline's `stroke-dasharray`, `''` for a solid one. */
  readonly dash: string;
  /**
   * Whether the outline closes through every axis. A series with a missing value is
   * drawn open, across the gap, and is never filled. In the polar-area variant the
   * outline is the silhouette round the wedges, which always closes, so this is always
   * `true` there.
   */
  readonly closed: boolean;
}

/**
 * One row of the chart's data table (`dataTable`): the axis it reads, as its row header,
 * and one cell per series shown, in the order of the table's columns.
 */
export interface WrRadarChartTableRow {
  /** The row header — the axis' name. */
  readonly header: string;
  /** Each series' own value on that axis, written as the tooltip writes it; `''` where it is missing. */
  readonly cells: readonly string[];
}
