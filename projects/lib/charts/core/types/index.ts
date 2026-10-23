/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * A marker shape, in the order the charts hand them out. Every shape has the
 * same AREA as the circle at the same size, so no series looks heavier than
 * another for its shape alone.
 *
 * @internal
 */
type WrChartMarkerShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'cross' | 'triangle-down';

/**
 * How far a marker reaches from its centre, in px, before any stroke.
 *
 * @internal
 */
interface WrChartMarkerExtent {
  /** From the centre up to the marker's top. */
  readonly top: number;
  /** From the centre down to the marker's bottom. */
  readonly bottom: number;
  /** From the centre to either side: every shape is symmetric about its vertical. */
  readonly side: number;
  /** From the centre to the marker's farthest point: the circle that holds it. */
  readonly radius: number;
}

/**
 * A value axis snapped to a readable step.
 *
 * @internal
 */
interface WrChartAxis {
  /** The bottom of the axis, a whole multiple of `step`. */
  readonly min: number;
  /** The top of the axis, a whole multiple of `step`, above the data. */
  readonly max: number;
  /** The gap between two ticks: 1, 2, 2.5 or 5 times a power of ten. */
  readonly step: number;
  /** Every tick from the top down, the order a y axis reads, rounded to six fraction digits. */
  readonly ticks: readonly number[];
}

/**
 * How {@link WrChartAxis} is fitted to the data.
 *
 * @internal
 */
interface WrChartAxisOptions {
  /**
   * Stretch the range to zero, on whichever side of it the data lies: the
   * baseline an area fills to, or a radar's centre. @default false
   */
  readonly includeZero?: boolean;
  /**
   * Keep data off BOTH frames. By default only the top is lifted a step when the
   * peak lands on it, which is what a chart with a baseline wants; a scale with no
   * baseline (a scatter's x and y) lifts the bottom too. A flat range is centred:
   * its value becomes the middle of three ticks, a round step on either side.
   * @default false
   */
  readonly symmetric?: boolean;
  /** How many gaps the axis aims for. @default 4 */
  readonly tickCount?: number;
}

/**
 * The number writers one chart shares between its axis, its labels and its
 * tooltip, all in `LOCALE_ID` unless the chart's `valueFormat` is given.
 *
 * Every method reads the format signal when it is called, so a `computed` that
 * calls one follows `valueFormat`.
 *
 * @internal
 */
interface WrChartNumbers<A extends readonly unknown[] = []> {
  /**
   * A value written in full, never compact: the tooltip, a legend value, an
   * accessible name — wherever a reader goes for the exact figure. Below one it
   * keeps three significant digits rather than three fraction digits, which
   * would write 0.0004 as `0`.
   */
  value(value: number, ...args: A): string;
  /**
   * A value printed in a tight space, such as above a bar: compact from a
   * thousand up (`1.2K`), and below a thousand exactly as {@link value} writes it,
   * since compact rounding would print 12.5 as `13`.
   */
  label(value: number, ...args: A): string;
  /**
   * An axis' tick labels, decided for the AXIS rather than one tick at a time:
   * each tick compact to exactly the significant digits `step` needs, unless that
   * makes the longest label longer than writing every tick in full.
   */
  ticks(values: readonly number[], step: number, ...args: A): string[];
}

export type { WrChartAxis, WrChartAxisOptions, WrChartMarkerExtent, WrChartMarkerShape, WrChartNumbers };
export type { WrChartTableData, WrChartTableGroup, WrChartTableRow } from './chart-table';
