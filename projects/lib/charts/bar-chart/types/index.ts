/** One bar's worth of data. */
interface WrBarChartDatum {
  readonly label: string;
  readonly value: number;
  readonly color?: string;
}

/**
 * One series of a `<wr-bar-chart>` drawn from `series`: a name, one value per
 * category, and optionally its own colour.
 */
interface WrBarSeries {
  /** The series' name, in the legend, the tooltip, each bar's accessible name and the data table's column heading. */
  readonly label: string;
  /**
   * One value per category, in the order of `categories`. `null`, or anything that is
   * not a finite number, is MISSING: that category draws no bar for the series and
   * leaves its cell in the data table empty. A shorter list is missing past its end.
   */
  readonly data: readonly (number | null)[];
  /** Any CSS colour, `var(--wr-…)` included. Left out, the series takes the next palette colour. */
  readonly color?: string;
}

/**
 * One line of a `<wr-bar-chart>`'s `lines`, drawn over the bars through the middle of
 * each category, on the bars' own value axis: a name, one value per category, and
 * optionally its own colour.
 */
interface WrBarChartLine {
  /** The line's name, in the legend, the tooltip, the accessible name of its points' group and the data table's column heading. */
  readonly label: string;
  /**
   * One value per category, in the chart's category order: the order of `categories`
   * with `series`, of `data` without. `null`, or anything that is not a finite number,
   * is MISSING: the line breaks there and that category draws no point. A shorter list
   * is missing past its end, and a value past the last category is not drawn, since the
   * categories belong to the bars.
   */
  readonly data: readonly (number | null)[];
  /**
   * Any CSS colour, `var(--wr-…)` included. Left out, the line takes the palette's next
   * colour after the bars': past the last series with `series`, the palette's second
   * with `data`.
   */
  readonly color?: string;
}

/**
 * Which way the bars run. `vertical` stands them up from a baseline under the
 * categories; `horizontal` lays them along the inline axis, the categories in a
 * gutter at inline start — on the right under RTL, with the bars growing leftwards.
 */
type WrBarChartOrientation = 'vertical' | 'horizontal';

export type { WrBarChartDatum, WrBarChartLine, WrBarChartOrientation, WrBarSeries };
