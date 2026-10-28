/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-scatter-chart>` a harness query matches. */
export interface WrScatterChartHarnessFilters extends BaseHarnessFilters {
  /** Match the plot's accessible name. */
  readonly ariaLabel?: string | RegExp;
  /** Match a chart whose legend holds this series. */
  readonly seriesLabel?: string | RegExp;
}

/** One drawn point, as {@link WrScatterChartHarness.getPoints} reads it off the marker the component wrote. */
export interface WrScatterChartHarnessPoint {
  /** The point's series, as its position in `series` — hidden series keep their positions. */
  readonly series: number;
  /** The point's x value. */
  readonly x: number;
  /** The point's y value. */
  readonly y: number;
  /** The point's size, or `null` when it is drawn at the plain point size. */
  readonly size: number | null;
  /** The marker's shape: `'circle'`, `'square'`, `'triangle'`, `'diamond'`, `'cross'` or `'triangle-down'`. */
  readonly marker: string;
  /** The marker's fill, as the component wrote it. */
  readonly color: string | null;
  /** The marker's radius in px: the area every shape shares with a circle of this radius. */
  readonly radius: number;
  /** Where the point's centre sits, as a percentage of the drawing's width from its left edge. */
  readonly left: number;
  /** Where the point's centre sits, as a percentage of the drawing's height from its top edge. */
  readonly top: number;
}

/** The axes' names as drawn, each `null` when the chart draws none (`xLabel` / `yLabel` not given). */
export interface WrScatterChartAxisTitles {
  readonly x: string | null;
  readonly y: string | null;
}

/**
 * One row of the chart's data table (`dataTable`): the point it reads, under its series'
 * name, with one cell per column.
 */
export interface WrScatterChartTableRow {
  /** The name of the series the row belongs to — the group header over its rows. */
  readonly series: string;
  /** The row header: the point's `label`, or its position in the series from 1. */
  readonly header: string;
  /** The point's x, y and — when the table has the column — size, written as the tooltip writes them. */
  readonly cells: readonly string[];
}
