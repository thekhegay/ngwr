/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** One series of a `<wr-radar-chart>`: a name, one value per axis, and optionally its own colour. */
interface WrRadarSeries {
  /** The series' name, in the legend, the tooltip and the data table's column heading. */
  readonly label: string;
  /**
   * One value per axis, in the order of `axes`. A value that is not a finite number, or
   * one past the end of a shorter list, is MISSING: the outline breaks there and the
   * series is not filled. A value past the last axis is ignored.
   */
  readonly data: readonly number[];
  /** Any CSS colour, `var(--wr-…)` included. Left out, the series takes the next palette colour. */
  readonly color?: string;
}

/**
 * How a `<wr-radar-chart>` draws its series.
 *
 * - `'polygon'` — each series is a polygon through its values, one vertex per axis.
 * - `'polar-area'` — each axis is an equal-angle wedge per series, whose AREA encodes
 *   the value: the radius grows with its square root, so twice the value is twice the
 *   ink.
 */
type WrRadarVariant = 'polygon' | 'polar-area';

export type { WrRadarSeries, WrRadarVariant };
