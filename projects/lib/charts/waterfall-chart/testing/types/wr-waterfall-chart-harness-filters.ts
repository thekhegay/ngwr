/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `<wr-waterfall-chart>` a harness query matches. */
export interface WrWaterfallChartHarnessFilters extends BaseHarnessFilters {
  /** Match the chart's accessible name. */
  readonly ariaLabel?: string | RegExp;
  /** Match a chart with a step of this label. */
  readonly stepLabel?: string | RegExp;
}

/** One step, as the chart draws and announces it. */
export interface WrWaterfallChartHarnessStep {
  /** The label printed under the bar — the full text, ellipsised on screen or not. */
  readonly label: string;
  /**
   * What the step is, read off its modifier class: a change `'increase'` or `'decrease'`,
   * a `'flat'` change of zero (a value that is not a finite number included), or a `'total'`.
   */
  readonly kind: 'increase' | 'decrease' | 'flat' | 'total';
  /** What the step announces: its change and the running total after it, or its total, in one string. */
  readonly name: string | null;
  /**
   * The figure printed past the bar's end — a signed change, or a total — or `null` when
   * none is printed (`showValues` off). One wider than its column is printed and then
   * wrapped out of sight by the stylesheet, which jsdom cannot show, so it is read here.
   */
  readonly value: string | null;
  /** The running total before the step. */
  readonly start: number;
  /** The running total after it — what a total step shows. */
  readonly end: number;
  /** The bar's bottom, as the percentage of the drawing's height from its bottom the component wrote. */
  readonly bottomPercent: number;
  /** The bar's top, the same way. A change of zero has its top at its bottom: its hairline is the stylesheet's floor. */
  readonly topPercent: number;
  /** Whether a connector leaves the step for the next one (`showConnectors`, and a next step that starts from it). */
  readonly connected: boolean;
}

/**
 * One row of the chart's data table (`dataTable`): the step it reads, as its row header,
 * and its change and the running total after it.
 */
export interface WrWaterfallChartTableRow {
  /** The row header — the step's label. */
  readonly header: string;
  /** The change, `''` on a total, and the running total after the step, written as the tooltip writes them. */
  readonly cells: readonly string[];
}
