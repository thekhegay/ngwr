/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-bar-chart>` a harness query matches. */
export interface WrBarChartHarnessFilters extends BaseHarnessFilters {
  /** Match a chart holding a bar with this label. */
  readonly barLabel?: string | RegExp;
}

/** One column, as the chart draws and announces it. */
export interface WrBarChartBar {
  /** The label printed under the column — decoration, and `aria-hidden`. */
  readonly label: string;
  /** The value printed above it, or `null` when `showValues` is off. */
  readonly value: string | null;
  /** What the column announces: the label and the value in one string. */
  readonly name: string | null;
  /** The bar's height as a percentage of the chart's maximum. */
  readonly heightPercent: number;
}
