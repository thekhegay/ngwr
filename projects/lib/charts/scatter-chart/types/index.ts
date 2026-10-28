/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** One point of a {@link WrScatterSeries}: where it sits, and optionally how large it is and what it is called. */
interface WrScatterPoint {
  /** Where the point sits along the x axis. A point whose `x` or `y` is not a finite number is not drawn. */
  readonly x: number;
  /** Where the point sits along the y axis. */
  readonly y: number;
  /**
   * A third value, drawn as the marker's AREA, which makes the chart a bubble chart: the
   * largest size shown is drawn at `maxRadius`. A size that is not a finite number at or
   * above zero counts as none, and the point is drawn at the plain point size.
   */
  readonly size?: number;
  /**
   * The point's own name — a country, a product. It heads the point's tooltip beside the
   * series' name and is the point's row header in the data table, which numbers the
   * points of a series from 1 otherwise.
   */
  readonly label?: string;
}

/** One series of a `<wr-scatter-chart>`: a name, its points, and optionally its colour. */
interface WrScatterSeries {
  /** The series' name, in the legend, the tooltip and the data table. */
  readonly label: string;
  /** The points, in any order. Repeated and uneven `x` values are fine. */
  readonly data: readonly WrScatterPoint[];
  /** Any CSS colour, `var(--wr-…)` included. Without one, the series takes the next palette colour. */
  readonly color?: string;
}

/**
 * Which number `valueFormat` is writing: an x value, a y value, or a point's `size`. The
 * axis ticks pass `'x'` or `'y'`, the tooltip and the data table pass all three.
 */
type WrScatterAxis = 'x' | 'y' | 'size';

export type { WrScatterAxis, WrScatterPoint, WrScatterSeries };
