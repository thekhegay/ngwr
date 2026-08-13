/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrBarChartBar, WrBarChartHarnessFilters } from './interfaces';

/**
 * Test harness for `<wr-bar-chart>`.
 *
 * **The bars are read as PERCENTAGES, not as pixels.** Each column's height is
 * written inline as a share of the chart's maximum, which is the one number that
 * survives a test with no layout — and it is also the component's whole job, since
 * the maximum is either given or derived from the data.
 *
 * **The visible label row is decoration.** Every column carries `role="img"` with
 * the label AND the value in its name, and the printed labels underneath are
 * `aria-hidden` — so {@link WrBarChartBar.name} is what a screen reader gets and
 * {@link WrBarChartBar.label} is what is drawn. Asserting only the second would pass
 * on a chart that announces nothing.
 *
 * @example
 * ```ts
 * const chart = await loader.getHarness(WrBarChartHarness);
 *
 * expect(await chart.getLabels()).toEqual(['Mon', 'Tue', 'Wed']);
 * expect((await chart.getBars())[1].heightPercent).toBe(100);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrBarChartHarness extends ComponentHarness {
  static hostSelector = 'wr-bar-chart';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrBarChartHarnessFilters = {}): HarnessPredicate<WrBarChartHarness> {
    return new HarnessPredicate(WrBarChartHarness, options).addOption(
      'barLabel',
      options.barLabel,
      async (harness, label) => {
        for (const printed of await harness.getLabels()) {
          if (await HarnessPredicate.stringMatches(printed, label)) return true;
        }
        return false;
      }
    );
  }

  /** Every column, in data order. */
  async getBars(): Promise<WrBarChartBar[]> {
    const columns = await this.locatorForAll('.wr-bar-chart__column')();
    const bars = await this.locatorForAll('.wr-bar-chart__bar')();
    const labels = await this.getLabels();

    return Promise.all(
      columns.map(async (column, index) => {
        const value = await column.text();
        return {
          label: labels[index] ?? '',
          value: value === '' ? null : value,
          name: await column.getAttribute('aria-label'),
          heightPercent: Number.parseFloat(await bars[index].getCssValue('height')),
        };
      })
    );
  }

  /** The labels printed under the columns, in order. */
  async getLabels(): Promise<string[]> {
    const labels = await this.locatorForAll('.wr-bar-chart__label')();
    return Promise.all(labels.map(label => label.text()));
  }

  /** What each column announces — the label and the value together. */
  async getAccessibleNames(): Promise<(string | null)[]> {
    const columns = await this.locatorForAll('.wr-bar-chart__column')();
    return Promise.all(columns.map(column => column.getAttribute('aria-label')));
  }

  /** How many columns the chart drew. */
  async getBarCount(): Promise<number> {
    return (await this.locatorForAll('.wr-bar-chart__column')()).length;
  }

  /** Whether the values are printed above the bars (`showValues`). */
  async hasValues(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-bar-chart__value')()) !== null;
  }

  /** The plot's height in pixels, as the component writes it inline. */
  async getPlotHeight(): Promise<number> {
    return Number.parseFloat(await (await this.locatorFor('.wr-bar-chart__plot')()).getCssValue('height'));
  }
}
