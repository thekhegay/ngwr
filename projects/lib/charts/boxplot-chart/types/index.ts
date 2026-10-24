/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * The five numbers a `<wr-boxplot-chart>` draws for one group, plus the values it draws
 * as dots beyond them.
 *
 * `min` and `max` are the WHISKERS' ends, not the extremes of the data: with outliers,
 * the whisker stops at the farthest value that is not one, and the outliers lie past it.
 */
interface WrBoxplotStats {
  /** Where the lower whisker ends: the smallest value that is not an outlier. */
  readonly min: number;
  /** The first quartile: the box's lower edge. */
  readonly q1: number;
  /** The median: the line across the box. */
  readonly median: number;
  /** The third quartile: the box's upper edge. */
  readonly q3: number;
  /** Where the upper whisker ends: the largest value that is not an outlier. */
  readonly max: number;
  /** The values drawn as dots past the whiskers, in any order. One that is not a finite number is left out. */
  readonly outliers?: readonly number[];
}

/**
 * One box of a `<wr-boxplot-chart>`: a name, and either the raw values to summarise or
 * the summary itself.
 */
interface WrBoxplotGroup {
  /** The group's name: under its box, in the tooltip and as its data table row. */
  readonly label: string;
  /**
   * The raw values, in any order. The chart works out the quartiles by linear
   * interpolation (type 7: R's default, NumPy's and Excel's `QUARTILE.INC`) and draws
   * the whiskers to the farthest value within 1.5 IQR of the box; anything farther is an
   * outlier. A value that is not a finite number is left out. Ignored when `stats` is
   * given.
   */
  readonly values?: readonly number[];
  /**
   * A summary worked out elsewhere, drawn as given: nothing is recomputed, reordered or
   * checked against `values`. A summary with a number that is not finite draws nothing.
   */
  readonly stats?: WrBoxplotStats;
  /** Any CSS colour, `var(--wr-…)` included. Without one, the group takes the chart's `color`. */
  readonly color?: string;
}

export type { WrBoxplotGroup, WrBoxplotStats };
