/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrDonutChartHarnessFilters, WrDonutChartLegendEntry } from './interfaces';

/**
 * Test harness for `<wr-donut-chart>`.
 *
 * **The ring itself is unreadable, and that is by design.** The slices are SVG
 * paths inside a `role="img"` drawing: a screen reader is given that drawing's
 * `aria-label` and nothing else, and a spec cannot get a label or a value off a
 * path's `d`. {@link getLegend} is where the numbers are — which is also the
 * argument for keeping `showLegend` on, since with it off the only other text is
 * whatever {@link getCenterValue} and {@link getCenterLabel} were given.
 *
 * The name is read off the `<svg>` rather than off the surface that wraps it, and
 * the two are not interchangeable: `img` makes its whole subtree presentational, so
 * a name on the wrapper would take the centre text down with it.
 *
 * {@link getSliceCount} is therefore the one thing the ring answers: how many
 * wedges were drawn. Compare it with the legend's length to catch a slice that was
 * filtered out of one and not the other.
 *
 * @example
 * ```ts
 * const chart = await loader.getHarness(WrDonutChartHarness);
 *
 * expect(await chart.getSliceCount()).toBe(3);
 * expect(await chart.getLegend()).toEqual([
 *   { label: 'Direct', value: '48' },
 *   { label: 'Search', value: '32' },
 *   { label: 'Social', value: '20' },
 * ]);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrDonutChartHarness extends ComponentHarness {
  static hostSelector = 'wr-donut-chart';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrDonutChartHarnessFilters = {}): HarnessPredicate<WrDonutChartHarness> {
    return new HarnessPredicate(WrDonutChartHarness, options)
      .addOption('ariaLabel', options.ariaLabel, (harness, label) =>
        HarnessPredicate.stringMatches(harness.getAccessibleName(), label)
      )
      .addOption('sliceLabel', options.sliceLabel, async (harness, label) => {
        for (const entry of await harness.getLegend()) {
          if (await HarnessPredicate.stringMatches(entry.label, label)) return true;
        }
        return false;
      });
  }

  /** The name the ring announces — the whole chart's, since the slices announce nothing. */
  async getAccessibleName(): Promise<string | null> {
    return (await this.locatorFor('.wr-donut-chart__surface svg')()).getAttribute('aria-label');
  }

  /** How many wedges were drawn. */
  async getSliceCount(): Promise<number> {
    return (await this.locatorForAll('.wr-donut-chart__surface path')()).length;
  }

  /** Whether the legend is rendered (`showLegend`, and at least one slice). */
  async hasLegend(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-donut-chart__legend')()) !== null;
  }

  /** The legend rows in order — the only textual form the data has. */
  async getLegend(): Promise<WrDonutChartLegendEntry[]> {
    const labels = await this.locatorForAll('.wr-donut-chart__legend-label')();
    const values = await this.locatorForAll('.wr-donut-chart__legend-value')();

    return Promise.all(
      labels.map(async (label, index) => ({
        label: await label.text(),
        value: (await values[index]?.text()) ?? '',
      }))
    );
  }

  /** The big number in the middle, or `null` when the chart has none. */
  async getCenterValue(): Promise<string | null> {
    const center = await this.locatorForOptional('.wr-donut-chart__center-value')();
    return center ? center.text() : null;
  }

  /** The caption under the centre value, or `null`. */
  async getCenterLabel(): Promise<string | null> {
    const center = await this.locatorForOptional('.wr-donut-chart__center-label')();
    return center ? center.text() : null;
  }

  /** The ring's diameter in pixels, as the component writes it inline. */
  async getSize(): Promise<number> {
    return Number.parseFloat(await (await this.locatorFor('.wr-donut-chart__surface')()).getCssValue('width'));
  }
}
