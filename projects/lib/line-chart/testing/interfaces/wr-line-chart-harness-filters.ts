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
