/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * A marker shape a legend row can draw as its key, matching the point it names.
 * Every shape has the area of the circle at the same size, so none reads heavier.
 */
type WrChartMarker = 'circle' | 'square' | 'triangle' | 'diamond' | 'cross' | 'triangle-down';

/** One row of a `ul[wr-chart-legend]`: the key, the name, and optionally a value. */
interface WrChartLegendItem {
  /** The series' name. Printed as the row's text, and the toggle's name when the legend is `toggleable`. */
  readonly label: string;
  /** Any CSS colour, `var(--wr-…)` included: the swatch's fill, or its stroke when the key is a line. */
  readonly color: string;
  /**
   * A value printed after the label, muted, exactly as given — format it first. The row has
   * no value element at all when this is left out.
   */
  readonly value?: string | null;
  /**
   * Draws the key as this shape rather than a dot, for a series told apart by its
   * marker. With `dash` as well, the shape sits on the middle of the line.
   */
  readonly marker?: WrChartMarker;
  /**
   * Draws the key as a short line in this SVG `stroke-dasharray`, for a series told
   * apart by its dash; `''` is a solid line. Left out, the key is a dot (or `marker`).
   */
  readonly dash?: string;
}

/** What `(toggled)` emits when a reader shows or hides a series from a `toggleable` legend. */
interface WrChartLegendToggle {
  /** The row's position in `items`, which is the series' position in the chart. */
  readonly index: number;
  /** The row's label, for convenience; two series may share one, so key on `index`. */
  readonly label: string;
  /** Whether the series is hidden now. */
  readonly hidden: boolean;
}

export type { WrChartLegendItem, WrChartLegendToggle, WrChartMarker };
