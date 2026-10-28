/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-boxplot-chart>` a harness query matches. */
export interface WrBoxplotChartHarnessFilters extends BaseHarnessFilters {
  /** Match the plot's accessible name. */
  readonly ariaLabel?: string | RegExp;
  /** Match a chart with a group of this name. */
  readonly groupLabel?: string | RegExp;
}

/** A group's summary, as the component wrote it beside the marks it drew. */
export interface WrBoxplotChartHarnessStats {
  /** Where the lower whisker ends. */
  readonly min: number;
  readonly q1: number;
  readonly median: number;
  readonly q3: number;
  /** Where the upper whisker ends. */
  readonly max: number;
  /** The outliers drawn, ascending. */
  readonly outliers: readonly number[];
}

/**
 * Where a group's marks sit, each as a percentage of the drawing's height from its top —
 * read off the custom properties the component wrote, never off a layout.
 */
export interface WrBoxplotChartHarnessPosition {
  /** The upper whisker, from its end at `max` down to the box's upper edge. */
  readonly upperWhisker: { readonly top: number; readonly bottom: number };
  /** The lower whisker, from the box's lower edge down to its end at `min`. */
  readonly lowerWhisker: { readonly top: number; readonly bottom: number };
  /** The upper whisker's cap: where `max` sits. */
  readonly max: number;
  /** The box's upper edge: where `q3` sits, for a summary in order. */
  readonly boxTop: number;
  /** The median line. */
  readonly median: number;
  /** The box's lower edge: where `q1` sits, for a summary in order. */
  readonly boxBottom: number;
  /** The lower whisker's cap: where `min` sits. */
  readonly min: number;
  /** Each outlier's dot, in the order of `stats.outliers`. */
  readonly outliers: readonly number[];
}

/** One group, as {@link WrBoxplotChartHarness.getGroups} reads it. */
export interface WrBoxplotChartHarnessGroup {
  /** The name under the group's slot. */
  readonly label: string;
  /**
   * Where the group's slot starts, as a percentage of the drawing's width from its inline
   * start: the left edge, or the right one under RTL.
   */
  readonly slotStart: number;
  /** How wide the group's slot is, as a percentage of the drawing's width. */
  readonly slotWidth: number;
  /** The colour the group is drawn in, as the component wrote it. */
  readonly color: string | null;
  /** The group's summary, or `null` when it has nothing to draw and its slot is empty. */
  readonly stats: WrBoxplotChartHarnessStats | null;
  /** Where its marks sit, or `null` when it draws none. */
  readonly position: WrBoxplotChartHarnessPosition | null;
}

/** The axes' names as drawn, each `null` when the chart draws none (`xLabel` / `yLabel` not given). */
export interface WrBoxplotChartAxisTitles {
  readonly x: string | null;
  readonly y: string | null;
}

/** One row of the chart's data table (`dataTable`): a group, with one cell per column. */
export interface WrBoxplotChartTableRow {
  /** The row header: the group's name. */
  readonly header: string;
  /**
   * The lower whisker, Q1, the median, Q3 and the upper whisker, written as the tooltip
   * writes them, then — when the table has the column — the outliers in one list. A
   * group with nothing to draw has empty cells.
   */
  readonly cells: readonly string[];
}
