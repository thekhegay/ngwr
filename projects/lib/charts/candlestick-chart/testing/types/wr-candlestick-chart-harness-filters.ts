/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-candlestick-chart>` a harness query matches. */
export interface WrCandlestickChartHarnessFilters extends BaseHarnessFilters {
  /** Match the plot's accessible name. */
  readonly ariaLabel?: string | RegExp;
}

/** One drawn candle, as {@link WrCandlestickChartHarness.getCandles} reads it off the box the component wrote. */
export interface WrCandlestickChartHarnessCandle {
  /** The candle's period, as its position in `data` — a period with no candle keeps its position. */
  readonly index: number;
  /** The period's open. */
  readonly open: number;
  /** The period's high. */
  readonly high: number;
  /** The period's low. */
  readonly low: number;
  /** The period's close. */
  readonly close: number;
  /**
   * `'increase'` for a candle drawn rising — hollow, in the increase colour — and
   * `'decrease'` for one drawn falling, filled: the waterfall's words for a change up and
   * a change down.
   */
  readonly direction: 'increase' | 'decrease';
  /** Where the candle's centre sits, as a percentage of the drawing's width from its left edge. */
  readonly left: number;
  /** Where the candle's top sits, as a percentage of the drawing's height from its top edge. */
  readonly top: number;
  /** How far the candle reaches down from its top, as a percentage of the drawing's height. */
  readonly height: number;
  /** How much of the candle's own height the upper wick takes, from its top to the body, in percent. */
  readonly upperWick: number;
  /** How much of the candle's own height the lower wick takes, from the body to its bottom, in percent. */
  readonly lowerWick: number;
}

/** One row of the chart's data table (`dataTable`): the period, and its open, high, low and close. */
export interface WrCandlestickChartTableRow {
  /** The row header: the period's label. */
  readonly header: string;
  /** The open, the high, the low and the close, written as the tooltip writes them; empty where a price is not a number. */
  readonly cells: readonly string[];
}
