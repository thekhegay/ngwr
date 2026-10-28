/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-heatmap-chart>` a harness query matches. */
export interface WrHeatmapChartHarnessFilters extends BaseHarnessFilters {
  /** Match the matrix's accessible name. */
  readonly ariaLabel?: string | RegExp;
  /** Match a chart with a row of this name. */
  readonly rowLabel?: string | RegExp;
  /** Match a chart with a column of this name. */
  readonly columnLabel?: string | RegExp;
}

/** One cell as {@link WrHeatmapChartHarness.getCells} reads it, row by row. */
export interface WrHeatmapChartCell {
  /** Its row's position, from 0, in the order of the row names. */
  readonly row: number;
  /** Its column's position, from 0, in the order of the column names. */
  readonly column: number;
  /** Its value, or `null` for an empty cell: no data, which is not zero. */
  readonly value: number | null;
  /**
   * Its level as a place on the scale, as the component wrote it, from 0 (the lowest level)
   * to 1 (the colour itself); `null` for an empty cell, which is hatched instead.
   */
  readonly level: number | null;
  /** Whether it is drawn as empty — hatched and outlined. */
  readonly empty: boolean;
  /** The value printed in it with `showValues`, `''` when it prints none. */
  readonly text: string;
}

/**
 * One row of the chart's data table (`dataTable`): the row's name, as its row header,
 * and one cell per column, in the order of the table's columns.
 */
export interface WrHeatmapChartTableRow {
  /** The row header — the row's name. */
  readonly header: string;
  /** Each column's value, written as the tooltip writes it; an empty cell is `noDataLabel`. */
  readonly cells: readonly string[];
}
