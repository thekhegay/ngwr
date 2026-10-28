/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * One period of a `<wr-candlestick-chart>`: its name and its four prices.
 *
 * A period whose four prices are not all finite numbers keeps its place on the x axis
 * and draws no candle, the way a line chart leaves a hole.
 */
interface WrCandlestickDatum {
  /**
   * The period, as text: a day, a week, an hour. Printed under the candle when there is
   * room, and heading its tooltip and its data table row. The chart parses nothing, so
   * write it the way the reader should see it.
   */
  readonly label: string;
  /** The first price of the period: one end of the body. */
  readonly open: number;
  /**
   * The highest price of the period: the top of the wick. A high below the body is
   * drawn at the body's top, and the tooltip and the data table still give it as passed.
   */
  readonly high: number;
  /**
   * The lowest price of the period: the bottom of the wick. A low above the body is
   * drawn at the body's bottom, and the tooltip and the data table still give it as passed.
   */
  readonly low: number;
  /**
   * The last price of the period: the other end of the body. At or above `open` the
   * candle is RISING — drawn hollow, in the up colour — and below it FALLING, drawn
   * filled, in the down colour.
   */
  readonly close: number;
}

export type { WrCandlestickDatum };
