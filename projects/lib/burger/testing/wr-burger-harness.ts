/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrBurgerHarnessFilters } from './types';

/**
 * Test harness for `<wr-burger>`, the animated menu toggle.
 *
 * Open and closed are read from the button's `aria-expanded`, not from the
 * `wr-burger--opened` modifier that drives the morph: the attribute is what a
 * screen reader is told. The morph itself is a CSS tween, which a unit test has
 * no way to see, so nothing here asks about it.
 *
 * @example
 * ```ts
 * const burger = await loader.getHarness(WrBurgerHarness);
 *
 * await burger.open();
 * expect(await burger.isOpen()).toBe(true);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrBurgerHarness extends ComponentHarness {
  static hostSelector = 'wr-burger';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrBurgerHarnessFilters = {}): HarnessPredicate<WrBurgerHarness> {
    return new HarnessPredicate(WrBurgerHarness, options)
      .addOption('label', options.label, (harness, label) => HarnessPredicate.stringMatches(harness.getLabel(), label))
      .addOption('open', options.open, async (harness, open) => (await harness.isOpen()) === open)
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled);
  }

  private readonly button = this.locatorFor('button.wr-burger__btn');

  /** The button's accessible name (`label`, else the `burger.label` catalog entry). */
  async getLabel(): Promise<string | null> {
    return (await this.button()).getAttribute('aria-label');
  }

  /** Whether the toggle is open, from the button's `aria-expanded`. */
  async isOpen(): Promise<boolean> {
    return (await (await this.button()).getAttribute('aria-expanded')) === 'true';
  }

  /** Whether the button refuses interaction, from its own `disabled` property. */
  async isDisabled(): Promise<boolean> {
    return (await this.button()).getProperty<boolean>('disabled');
  }

  /** Click the button. A disabled toggle ignores it: assert, or use {@link open} / {@link close}. */
  async toggle(): Promise<void> {
    return (await this.button()).click();
  }

  /** Open the toggle. An already-open one is left alone; a disabled one throws. */
  async open(): Promise<void> {
    if (await this.isOpen()) return;
    await this.toggle();
    if (!(await this.isOpen())) {
      throw new Error('WrBurgerHarness.open(): the toggle did not open. A disabled burger refuses its own button.');
    }
  }

  /** Close the toggle. An already-closed one is left alone; a disabled one throws. */
  async close(): Promise<void> {
    if (!(await this.isOpen())) return;
    await this.toggle();
    if (await this.isOpen()) {
      throw new Error('WrBurgerHarness.close(): the toggle did not close. A disabled burger refuses its own button.');
    }
  }

  /** Move keyboard focus to the button. */
  async focus(): Promise<void> {
    return (await this.button()).focus();
  }

  /** Whether the button holds focus. */
  async isFocused(): Promise<boolean> {
    return (await this.button()).isFocused();
  }
}
