/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-funnel-chart>` a harness query matches. */
export interface WrFunnelChartHarnessFilters extends BaseHarnessFilters {
  /** Match the chart's accessible name. */
  readonly ariaLabel?: string | RegExp;
  /** Match a chart with a stage of this label. */
  readonly stageLabel?: string | RegExp;
}

/** One stage, as the chart draws and announces it. */
export interface WrFunnelChartStage {
  /** The label printed beside the bar — the full text, ellipsised on screen or not. */
  readonly label: string;
  /**
   * The value printed beside the bar, or `null` when none is: `showValues` is off, or the
   * stage's value is missing.
   */
  readonly value: string | null;
  /**
   * The share of the first stage printed under the value — "40% of first" — or `null` when
   * none is: the first stage, a stage with no such share, or a `conversion` that leaves it
   * off the drawing.
   */
  readonly fromFirst: string | null;
  /** What the stage announces: its label, its value and both conversions in one string. */
  readonly name: string | null;
  /**
   * The bar's width as a percentage of the track, as the component wrote it, or `null` for
   * a missing stage, which draws no bar. A stage of zero or below is `0`: its hairline is
   * the stylesheet's floor, not a width.
   */
  readonly widthPercent: number | null;
}

/**
 * One row of the chart's data table (`dataTable`): the stage it reads, as its row header,
 * and its value and both conversions, in the order of the table's columns.
 */
export interface WrFunnelChartTableRow {
  /** The row header — the stage's label. */
  readonly header: string;
  /** The value, the share of the previous stage and the share of the first; `''` for a figure the stage does not have. */
  readonly cells: readonly string[];
}
