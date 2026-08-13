/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrGaugeHarnessFilters } from './interfaces';

/**
 * Test harness for `<wr-gauge>`.
 *
 * **The dial is `aria-hidden` and the printed number is optional, so the ARIA is the
 * whole readable surface.** The component carries `role="meter"` with the value
 * trio and an `aria-valuetext` that includes the suffix — which is what makes a
 * gauge with `showValue` off readable at all. {@link getValue} is what it announces;
 * {@link getDisplayValue} is what is drawn, and it is `null` when nothing is.
 *
 * The arc is an SVG path, and its `d` is a rendering detail rather than an
 * assertion — it moves with the size, the stroke width and the sweep.
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrGaugeHarness extends ComponentHarness {
  static hostSelector = 'wr-gauge';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrGaugeHarnessFilters = {}): HarnessPredicate<WrGaugeHarness> {
    return new HarnessPredicate(WrGaugeHarness, options)
      .addOption('ariaLabel', options.ariaLabel, (harness, label) =>
        HarnessPredicate.stringMatches(harness.getAccessibleName(), label)
      )
      .addOption('value', options.value, async (harness, value) => (await harness.getValue()) === value);
  }

  private readonly surface = this.locatorFor('.wr-gauge__surface');

  /** The role the dial announces — `meter`, which is what a gauge is. */
  async getRole(): Promise<string | null> {
    return (await this.surface()).getAttribute('role');
  }

  /** The dial's accessible name. */
  async getAccessibleName(): Promise<string | null> {
    return (await this.surface()).getAttribute('aria-label');
  }

  /** The value it announces, from `aria-valuenow`. */
  async getValue(): Promise<number> {
    return Number(await (await this.surface()).getAttribute('aria-valuenow'));
  }

  /** The bottom of the range, from `aria-valuemin`. */
  async getMin(): Promise<number> {
    return Number(await (await this.surface()).getAttribute('aria-valuemin'));
  }

  /** The top of the range, from `aria-valuemax`. */
  async getMax(): Promise<number> {
    return Number(await (await this.surface()).getAttribute('aria-valuemax'));
  }

  /**
   * The spoken form of the value — the number with its suffix.
   *
   * The reason a gauge with no printed value is still readable, and worth asserting
   * separately from {@link getValue}: a percentage announced as a bare `72` says
   * something different from `72%`.
   */
  async getValueText(): Promise<string | null> {
    return (await this.surface()).getAttribute('aria-valuetext');
  }

  /** The number printed in the middle, suffix included, or `null` when `showValue` is off. */
  async getDisplayValue(): Promise<string | null> {
    const text = await this.locatorForOptional('.wr-gauge__text')();
    return text ? text.text() : null;
  }

  /** The suffix alone, or `null` when there is none — or nothing is printed. */
  async getSuffix(): Promise<string | null> {
    const suffix = await this.locatorForOptional('.wr-gauge__suffix')();
    if (!suffix) return null;
    const text = await suffix.text();
    return text === '' ? null : text;
  }

  /** The dial's width in pixels, as the component writes it inline. */
  async getSize(): Promise<number> {
    return Number.parseFloat(await (await this.surface()).getCssValue('width'));
  }
}
