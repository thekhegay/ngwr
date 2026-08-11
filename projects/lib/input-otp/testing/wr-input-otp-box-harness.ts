/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrInputOtpBoxHarnessFilters } from './interfaces';

/**
 * Test harness for ONE box of a `<wr-input-otp>` — the `<input>` that holds a
 * single character.
 *
 * A box is more than the string it shows: it carries its own accessible name
 * (`Digit 3`), its own emptiness, its own masking, and it is the thing that
 * either has focus or does not. The root harness answers the control's
 * questions (the assembled code, which index is focused); this one answers the
 * box's, so a spec can hold on to "the box that has focus" instead of zipping
 * four parallel arrays by index.
 *
 * @example
 * ```ts
 * await otp.setValue('12');
 * // Two digits in, the first box still waiting is the third.
 * const [box] = await otp.getBoxes({ empty: true });
 * expect(await box.getLabel()).toBe('Digit 3');
 * await box.type('7');
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrInputOtpBoxHarness extends ComponentHarness {
  /**
   * The cell class, not `wr-input-otp input`: the class is public API, so it is
   * the stable handle on a cell, and matching on it keeps the harness usable on
   * its own — `getAllHarnesses(WrInputOtpBoxHarness)` finds cells without
   * collecting every other `<input>` on the page.
   */
  static hostSelector = 'input.wr-input-otp__cell';

  /** Build a predicate that narrows the query. */
  static with(options: WrInputOtpBoxHarnessFilters = {}): HarnessPredicate<WrInputOtpBoxHarness> {
    return new HarnessPredicate(WrInputOtpBoxHarness, options)
      .addOption('value', options.value, (harness, value) => HarnessPredicate.stringMatches(harness.getValue(), value))
      .addOption('empty', options.empty, async (harness, empty) => (await harness.isEmpty()) === empty)
      .addOption('label', options.label, (harness, label) => HarnessPredicate.stringMatches(harness.getLabel(), label));
  }

  /**
   * The character the box shows, or `''`.
   *
   * Read from the `value` PROPERTY. The `value` attribute is never written at all
   * — Angular binds the property, and the component rewrites that property again
   * in its own `input` handler to keep one character per box — so
   * `getAttribute('value')` answers `null` for every box, full or empty.
   */
  async getValue(): Promise<string> {
    return (await this.host()).getProperty<string>('value');
  }

  /** Whether the box is still waiting for a character. */
  async isEmpty(): Promise<boolean> {
    return (await this.getValue()) === '';
  }

  /**
   * The box's accessible name — `Digit 1`, `Digit 2`, …
   *
   * This is the whole of a box's identity for a screen-reader user: the boxes
   * carry no visible label and no position in an `aria-*` set, so the name is
   * how someone knows which one they are in.
   */
  async getLabel(): Promise<string | null> {
    return (await this.host()).getAttribute('aria-label');
  }

  /** Whether the box hides what was typed, like a password field. */
  async isMasked(): Promise<boolean> {
    return (await (await this.host()).getProperty<string>('type')) === 'password';
  }

  async isDisabled(): Promise<boolean> {
    return (await this.host()).getProperty<boolean>('disabled');
  }

  async isFocused(): Promise<boolean> {
    return (await this.host()).isFocused();
  }

  /** Put the caret in this box. Throws when the control is disabled. */
  async focus(): Promise<void> {
    await this.assertEnabled('focus');
    await (await this.host()).focus();
  }

  /**
   * Type one character into this box.
   *
   * Focus advances to the next box when the character is accepted — the control
   * moves it in the `input` handler, so it has already happened when this
   * resolves. A character the box's `mode` rejects leaves the box EMPTY and
   * focus where it was, which is what a browser shows too.
   */
  async type(char: string): Promise<void> {
    await this.assertEnabled('type');
    if ([...char].length !== 1) {
      throw new Error(
        `WrInputOtpBoxHarness.type('${char}'): a box holds exactly one character (maxlength="1") — ` +
          'use WrInputOtpHarness.setValue() to enter a whole code.'
      );
    }
    await (await this.host()).sendKeys(char);
  }

  private async assertEnabled(method: string): Promise<void> {
    if (!(await this.isDisabled())) return;
    throw new Error(
      `WrInputOtpBoxHarness.${method}(): this box is disabled. A disabled input fires no events and ` +
        'takes no focus, so driving it here would report interaction a browser never delivers.'
    );
  }
}
