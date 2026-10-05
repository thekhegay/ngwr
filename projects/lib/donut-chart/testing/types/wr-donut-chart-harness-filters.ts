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

/** One legend row — the only place a slice's label and value are readable. */
export interface WrDonutChartLegendEntry {
  readonly label: string;
  readonly value: string;
}
