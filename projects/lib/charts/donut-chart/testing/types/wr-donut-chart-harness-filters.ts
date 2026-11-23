/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-donut-chart>` a harness query matches. */
export interface WrDonutChartHarnessFilters extends BaseHarnessFilters {
  /** Match the chart's accessible name. */
  readonly ariaLabel?: string | RegExp;
  /** Match a chart whose legend holds this label. */
  readonly sliceLabel?: string | RegExp;
}

/** One legend row: a slice's label and value, as the chart prints them. */
export interface WrDonutChartLegendEntry {
  readonly label: string;
  readonly value: string;
}

/**
 * One row of the chart's data table (`dataTable`): the slice's label as its row header,
 * then its value and its share of the ring.
 */
export interface WrDonutChartTableRow {
  /** The row header: the slice's label. */
  readonly header: string;
  /** Its value and its share, as the chart writes them; `''` where it has none. */
  readonly cells: readonly string[];
}
