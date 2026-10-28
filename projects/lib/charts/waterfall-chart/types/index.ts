/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * One step of a `<wr-waterfall-chart>`: a change that moves the running total, or — with
 * `total` — a bar from zero that shows it.
 */
interface WrWaterfallStep {
  /** The step's name, under its bar, in the tooltip, in its accessible name and as its row header in the data table. */
  readonly label: string;
  /**
   * How much the step moves the running total: up for a positive value, down for a
   * negative one. Zero is neither: a hairline at the running total in the chart's neutral
   * `--wr-waterfall-chart-flat-color`, classed `--flat`, printed `0` with no sign. A value
   * that is not a finite number counts as zero, and so is drawn the same way — one bad
   * figure cannot break every total after it, nor pass for growth.
   *
   * On a `total` step it is the total itself, and the chart CHECKS it rather than draws
   * it: the bar is the running total the steps above add up to, and in dev mode a value
   * that differs warns. The one exception is a total that comes before every change, where
   * there is nothing to add up yet: its value is where the running total starts — an
   * opening balance.
   */
  readonly value: number;
  /**
   * Draw the step as a total: a full bar from zero to the running total, in the chart's
   * `totalColor`, with its figure written unsigned. @default false
   */
  readonly total?: boolean;
}

/**
 * Where a `<wr-waterfall-chart>` is about to write a figure, handed to its `valueFormat`
 * as the second argument: `'label'` for the figure printed past a bar, where room is
 * tight and a compact form fits (`1.2K`); `'tick'` for the value axis; `'value'` for the
 * tooltip, the accessible names and the data table, where a reader goes for the exact
 * figure.
 */
type WrWaterfallValueContext = 'label' | 'tick' | 'value';

export type { WrWaterfallStep, WrWaterfallValueContext };
