/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-sparkline>` a harness query matches. */
export interface WrSparklineHarnessFilters extends BaseHarnessFilters {
  /** Match the sparkline's accessible name — `null` for the decorative ones. */
  readonly ariaLabel?: string | RegExp;
}

/**
 * One row of the sparkline's data table (`dataTable`): the point's position in the series
 * as its row header, then its value.
 */
export interface WrSparklineTableRow {
  /** The row header: the point's position, counted from one. */
  readonly header: string;
  /** Its value, as the tooltip writes it. */
  readonly cells: readonly string[];
}
