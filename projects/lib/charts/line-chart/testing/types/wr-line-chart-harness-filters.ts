/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-line-chart>` a harness query matches. */
export interface WrLineChartHarnessFilters extends BaseHarnessFilters {
  /** Match the plot's accessible name. */
  readonly ariaLabel?: string | RegExp;
  /** Match a chart whose legend holds this series. */
  readonly seriesLabel?: string | RegExp;
}

/** One row of the hover tooltip — a series and its value at the hovered index. */
export interface WrLineChartTooltipRow {
  readonly label: string;
  readonly value: string;
}

/**
 * One row of the chart's data table (`dataTable`): the x it reads, as its row header,
 * and one cell per series shown, in the order of the table's columns.
 */
export interface WrLineChartTableRow {
  /** The row header — the x label, as the tooltip heads that x. */
  readonly header: string;
  /** Each series' own value at that x, written as the tooltip writes it; `''` on a hole. */
  readonly cells: readonly string[];
}
