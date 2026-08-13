/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrLineChartHarnessFilters, WrLineChartTooltipRow } from './interfaces';

/**
 * Test harness for `<wr-line-chart>`.
 *
 * **The lines are paths and the paths are not assertable.** A `d` attribute is a
 * rendering detail — it moves with the viewBox, the padding and the value range — so
 * this harness counts the lines and reads everything TEXTUAL instead: the legend, the
 * axis ticks, the x labels and the tooltip. Those are what a reader gets, and they
 * are what breaks when the data wiring does.
 *
 * **The tooltip cannot be opened from a spec, and the reason is worth knowing.** It
 * follows a `pointermove` over the plot, and the component turns the cursor's x into
 * an index by measuring the plot's box — which jsdom reports as 0×0, so every
 * synthetic move resolves to the same index or to none at all. There is deliberately
 * no `hoverAt()`; {@link getTooltipRows} reads the tooltip when something else has
 * opened it, which in practice means a browser-run harness.
 *
 * @example
 * ```ts
 * const chart = await loader.getHarness(WrLineChartHarness);
 *
 * expect(await chart.getSeriesLabels()).toEqual(['Revenue', 'Costs']);
 * expect(await chart.getLineCount()).toBe(2);
 * expect(await chart.getXLabels()).toEqual(['Jan', 'Feb', 'Mar']);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrLineChartHarness extends ComponentHarness {
  static hostSelector = 'wr-line-chart';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrLineChartHarnessFilters = {}): HarnessPredicate<WrLineChartHarness> {
    return new HarnessPredicate(WrLineChartHarness, options)
      .addOption('ariaLabel', options.ariaLabel, (harness, label) =>
        HarnessPredicate.stringMatches(harness.getAccessibleName(), label)
      )
      .addOption('seriesLabel', options.seriesLabel, async (harness, label) => {
        for (const series of await harness.getSeriesLabels()) {
          if (await HarnessPredicate.stringMatches(series, label)) return true;
        }
        return false;
      });
  }

  /** The plot's accessible name — the only name the drawing has. */
  async getAccessibleName(): Promise<string | null> {
    return (await this.locatorFor('.wr-line-chart__plot')()).getAttribute('aria-label');
  }

  /** Whether the legend is rendered (`showLegend`, and at least one series). */
  async hasLegend(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-line-chart__legend')()) !== null;
  }

  /** The series names from the legend, in order. */
  async getSeriesLabels(): Promise<string[]> {
    const items = await this.locatorForAll('.wr-line-chart__legend-item')();
    return Promise.all(items.map(item => item.text()));
  }

  /**
   * How many lines were drawn.
   *
   * Worth comparing with {@link getSeriesLabels}: the legend and the paths come from
   * the same list, so a mismatch is a series that got filtered out of one of them.
   */
  async getLineCount(): Promise<number> {
    return (await this.locatorForAll('.wr-line-chart__line')()).length;
  }

  /** How many point dots were drawn across every series (`showDots`). */
  async getDotCount(): Promise<number> {
    return (await this.locatorForAll('.wr-line-chart__dot')()).length;
  }

  /** Whether the horizontal grid lines are drawn (`showGrid`). */
  async hasGrid(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-line-chart__grid-line')()) !== null;
  }

  /** The y-axis tick labels, top to bottom as drawn. */
  async getYTicks(): Promise<string[]> {
    const ticks = await this.locatorForAll('.wr-line-chart__tick')();
    return Promise.all(ticks.map(tick => tick.text()));
  }

  /** The x-axis labels under the plot, in order. */
  async getXLabels(): Promise<string[]> {
    const labels = await this.locatorForAll('.wr-line-chart__x-label')();
    return Promise.all(labels.map(label => label.text()));
  }

  /** Whether the hover tooltip is showing. */
  async hasTooltip(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-line-chart__tooltip')()) !== null;
  }

  /** The tooltip's heading — the x label of the hovered point — or `null` while it is closed. */
  async getTooltipLabel(): Promise<string | null> {
    const label = await this.locatorForOptional('.wr-line-chart__tooltip-label')();
    return label ? label.text() : null;
  }

  /** The tooltip's rows, one per series, or `[]` while it is closed. */
  async getTooltipRows(): Promise<WrLineChartTooltipRow[]> {
    const names = await this.locatorForAll('.wr-line-chart__tooltip-name')();
    const values = await this.locatorForAll('.wr-line-chart__tooltip-value')();

    return Promise.all(
      names.map(async (name, index) => ({
        label: await name.text(),
        value: (await values[index]?.text()) ?? '',
      }))
    );
  }

  /** The plot's height in pixels, as the component writes it inline. */
  async getPlotHeight(): Promise<number> {
    return Number.parseFloat(await (await this.locatorFor('.wr-line-chart__plot')()).getCssValue('height'));
  }
}
