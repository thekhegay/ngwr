/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrMeterGroupHarnessFilters, WrMeterGroupSlice } from './interfaces';

/** The `width: <n>%` the component writes onto a band, out of its inline `style`. */
const SLICE_WIDTH = /(?:^|;)\s*width\s*:\s*([\d.]+)%/;

/**
 * Test harness for `<wr-meter-group>` — one bar divided into labelled bands.
 *
 * **The bar is a single `progressbar`, and its value is the TOTAL.** The bands
 * themselves announce nothing: they carry a `title` for a mouse and their share as an
 * inline width, and the legend is where their labels and values are readable. So a
 * spec that wants "how much of each" reads {@link getSlices} for the shares or
 * {@link getLegendLabels} / {@link getLegendValues} for what is printed, and one that
 * wants "how full" reads {@link getValue}.
 *
 * **A band's share is read off the `style` ATTRIBUTE, not through `getCssValue()`**,
 * and the difference is not cosmetic: `getCssValue()` is `getComputedStyle()`, and
 * `width` resolves to the USED value — so the declared `30%` comes straight back in
 * jsdom and arrives as `180px` on a 600px bar in a real browser, and the same harness
 * answered 30 here and 180 under a browser runner with nothing to say which one you
 * got.
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrMeterGroupHarness extends ComponentHarness {
  static hostSelector = 'wr-meter-group';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrMeterGroupHarnessFilters = {}): HarnessPredicate<WrMeterGroupHarness> {
    return new HarnessPredicate(WrMeterGroupHarness, options)
      .addOption('ariaLabel', options.ariaLabel, (harness, label) =>
        HarnessPredicate.stringMatches(harness.getAccessibleName(), label)
      )
      .addOption('sliceLabel', options.sliceLabel, async (harness, label) => {
        for (const printed of await harness.getLegendLabels()) {
          if (await HarnessPredicate.stringMatches(printed, label)) return true;
        }
        return false;
      });
  }

  private readonly bar = this.locatorFor('.wr-meter-group__bar');

  /** The role the bar announces — `progressbar`, for the total. */
  async getRole(): Promise<string | null> {
    return (await this.bar()).getAttribute('role');
  }

  /** The bar's accessible name. */
  async getAccessibleName(): Promise<string | null> {
    return (await this.bar()).getAttribute('aria-label');
  }

  /** The total the bands add up to, from `aria-valuenow`. */
  async getValue(): Promise<number> {
    return Number(await (await this.bar()).getAttribute('aria-valuenow'));
  }

  /** The full capacity, from `aria-valuemax` — given, or the sum of the bands. */
  async getMax(): Promise<number> {
    return Number(await (await this.bar()).getAttribute('aria-valuemax'));
  }

  /** The bands, in order, with the share of the bar each takes. */
  async getSlices(): Promise<WrMeterGroupSlice[]> {
    const slices = await this.locatorForAll('.wr-meter-group__slice')();

    return Promise.all(
      slices.map(async slice => {
        const label = await slice.getAttribute('title');
        return { label, percent: WrMeterGroupHarness.percentOf(label, await slice.getAttribute('style')) };
      })
    );
  }

  /** Parse one band's declared share. See the class note on why this is not `getCssValue()`. */
  private static percentOf(label: string | null, style: string | null): number {
    const match = SLICE_WIDTH.exec(style ?? '');
    if (!match) {
      throw new Error(
        `WrMeterGroupHarness.getSlices(): the band ${label === null ? '(untitled)' : `"${label}"`} carries no ` +
          `inline width percentage (style: "${style ?? ''}"). The component writes one for every band, since the ` +
          'total always falls back to 1 — so its absence is the bug, and reporting 0 would read as an empty band.'
      );
    }
    return Number.parseFloat(match[1]);
  }

  /** Whether the legend is rendered (`showLegend`, and at least one band). */
  async hasLegend(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-meter-group__legend')()) !== null;
  }

  /** The legend's labels, in order. */
  async getLegendLabels(): Promise<string[]> {
    const labels = await this.locatorForAll('.wr-meter-group__legend-label')();
    return Promise.all(labels.map(label => label.text()));
  }

  /** The legend's values, in order — empty when `showValues` is off. */
  async getLegendValues(): Promise<string[]> {
    const values = await this.locatorForAll('.wr-meter-group__legend-value')();
    return Promise.all(values.map(value => value.text()));
  }
}
