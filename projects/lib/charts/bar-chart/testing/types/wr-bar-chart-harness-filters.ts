/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-bar-chart>` a harness query matches. */
export interface WrBarChartHarnessFilters extends BaseHarnessFilters {
  /** Match a chart holding a bar — or, with `series`, a category — with this label. */
  readonly barLabel?: string | RegExp;
  /** Match the chart's accessible name. */
  readonly ariaLabel?: string | RegExp;
}

/** One column, as the chart draws and announces it. */
export interface WrBarChartBar {
  /** The label printed under the column, or in the gutter lying down — decoration, and `aria-hidden`. */
  readonly label: string;
  /** The value printed at the bar, or `null` when `showValues` is off. */
  readonly value: string | null;
  /** What the column announces: the label and the value in one string. */
  readonly name: string | null;
  /**
   * How much of the value axis the bar covers, as a percentage of the whole axis: its
   * height standing up, its length lying down (`orientation="horizontal"`). The bar runs
   * from zero, so where zero is the axis minimum this is the bar's value as a percentage of
   * the axis maximum; beside a line below zero the axis reaches further and the bar starts
   * at {@link WrBarChartHarness.getZeroPercent}, ending that many points above it — or
   * below it, for a negative bar beside `lines`.
   */
  readonly heightPercent: number;
}

/**
 * One bar of a chart drawn from `series`, as {@link WrBarChartHarness.getSeriesBars}
 * reads it, in the order drawn: category by category, and within one in series order.
 */
export interface WrBarChartSeriesBar {
  /** The category the bar is in: the accessible name of the group round it. */
  readonly category: string | null;
  /** What the bar announces: its series' name and its own value, stacked or not. */
  readonly name: string | null;
  /**
   * Where the bar starts along the value axis, as a percentage of the axis from its
   * minimum: 0 at the bottom (or at inline start sideways), the zero line's own share
   * for a bar standing on it, and a stacked bar's share where the pile under it ends.
   */
  readonly startPercent: number;
  /** How much of the value axis the bar covers, as a percentage of it. */
  readonly sizePercent: number;
  /** The colour the component wrote on the bar: its series' own, or the palette's. */
  readonly color: string | null;
  /** The `stroke-dasharray` of the bar's outline, `''` for a solid one. */
  readonly dash: string;
}

/**
 * One row of the chart's data table (`dataTable`): the category it reads, as its row
 * header, and one cell per column — each series shown, or `data`'s bars, then each line
 * shown — in the order of the table's columns.
 */
export interface WrBarChartTableRow {
  /** The row header — the category's name. */
  readonly header: string;
  /**
   * Each series' own value in that category — or the bar's, with `data` — then each line's,
   * written as the tooltip writes it; `''` where it is missing.
   */
  readonly cells: readonly string[];
}

/**
 * One point of a line drawn from `lines`, as {@link WrBarChartHarnessLine.points} reads it,
 * in category order.
 */
export interface WrBarChartHarnessLinePoint {
  /** What the point announces: its category's name and the line's value there. */
  readonly name: string | null;
  /**
   * Where the point sits along the value axis, as a percentage of the axis from its
   * minimum — the scale every series bar's {@link WrBarChartSeriesBar.startPercent} is on,
   * and {@link WrBarChartHarness.getZeroPercent}, so a point and a bar can be held against
   * each other: a `data` bar ends {@link WrBarChartBar.heightPercent} past zero. Read off the
   * position the component wrote, whichever way the chart runs.
   */
  readonly valuePercent: number;
}

/** One line drawn from `lines`, as {@link WrBarChartHarness.getLines} reads it. */
export interface WrBarChartHarnessLine {
  /** The line's name: the accessible name of the group its points are in. */
  readonly label: string | null;
  /** The colour the component painted the line's points with: its own, or the palette's. */
  readonly color: string | null;
  /**
   * The `stroke-dasharray` of the line's runs, `''` for a solid one — and `null` for a
   * line drawn with no runs at all (only lone points), which has no dash to read.
   */
  readonly dash: string | null;
  /** The marker shape its points are drawn as: `circle`, `square`, `triangle`, … */
  readonly marker: string | null;
  /** How many straight runs the line is drawn in: one fewer than its points, less one for each break. */
  readonly segmentCount: number;
  /** Its points, in category order: a missing value has none. */
  readonly points: readonly WrBarChartHarnessLinePoint[];
}
