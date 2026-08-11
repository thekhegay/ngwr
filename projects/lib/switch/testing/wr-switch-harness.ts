/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrSwitchHarnessFilters } from './interfaces';

/**
 * Test harness for `<wr-switch>`.
 *
 * The track and thumb are painted `<span>`s; the state lives on a real
 * `<input type="checkbox" role="switch">` inside the label, and that is what this
 * reads and clicks. The role is why a switch is not a checkbox to a screen reader,
 * and {@link isOn} is named after it rather than after `checked` for the same
 * reason — a spec that reads "the switch is on" says what the user sees.
 *
 * @example
 * ```ts
 * const dark = await loader.getHarness(WrSwitchHarness.with({ label: 'Dark mode' }));
 * await dark.turnOn();
 * expect(await dark.isOn()).toBe(true);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrSwitchHarness extends ComponentHarness {
  static hostSelector = 'wr-switch';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrSwitchHarnessFilters = {}): HarnessPredicate<WrSwitchHarness> {
    return new HarnessPredicate(WrSwitchHarness, options)
      .addOption('label', options.label, (harness, label) => HarnessPredicate.stringMatches(harness.getLabel(), label))
      .addOption('on', options.on, async (harness, on) => (await harness.isOn()) === on)
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled);
  }

  private readonly input = this.locatorFor('input.wr-switch__input');

  /** The projected label text, trimmed. */
  async getLabel(): Promise<string> {
    return (await this.locatorFor('.wr-switch__label')()).text();
  }

  /** Whether the switch is on. */
  async isOn(): Promise<boolean> {
    return (await this.input()).getProperty<boolean>('checked');
  }

  async isDisabled(): Promise<boolean> {
    return (await this.input()).getProperty<boolean>('disabled');
  }

  /** What a screen reader is told this control is — `switch`, not `checkbox`. */
  async getRole(): Promise<string | null> {
    return (await this.input()).getAttribute('role');
  }

  /** Flip the switch. A disabled switch does not move; assert rather than assume. */
  async toggle(): Promise<void> {
    return (await this.input()).click();
  }

  async turnOn(): Promise<void> {
    if (!(await this.isOn())) await this.toggle();
  }

  async turnOff(): Promise<void> {
    if (await this.isOn()) await this.toggle();
  }

  async focus(): Promise<void> {
    return (await this.input()).focus();
  }

  async isFocused(): Promise<boolean> {
    return (await this.input()).isFocused();
  }
}
