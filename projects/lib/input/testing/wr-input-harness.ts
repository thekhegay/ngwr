/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrInputHarnessFilters } from './interfaces';

/**
 * Test harness for `[wrInput]` — the directive form, on a real `<input>` or
 * `<textarea>`.
 *
 * There is no `<wr-input>` component to wrap: ngwr styles the native control in
 * place, which is why the value, the placeholder and the disabled state are all
 * read straight off the host. {@link setValue} dispatches `input` AND `change`,
 * because a signal-forms control listens to the first and classic `[(ngModel)]`
 * setups to the second — typing into only one of them makes a harness that works
 * in some consumers' specs and not others.
 *
 * @example
 * ```ts
 * const email = await loader.getHarness(WrInputHarness.with({ placeholder: 'Email' }));
 * await email.setValue('ada@example.test');
 * expect(await email.getValue()).toBe('ada@example.test');
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrInputHarness extends ComponentHarness {
  static hostSelector = 'input[wrInput], textarea[wrInput]';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrInputHarnessFilters = {}): HarnessPredicate<WrInputHarness> {
    return new HarnessPredicate(WrInputHarness, options)
      .addOption('value', options.value, (harness, value) => HarnessPredicate.stringMatches(harness.getValue(), value))
      .addOption('placeholder', options.placeholder, (harness, placeholder) =>
        HarnessPredicate.stringMatches(harness.getPlaceholder(), placeholder)
      )
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled);
  }

  async getValue(): Promise<string> {
    return (await this.host()).getProperty<string>('value');
  }

  /**
   * Type a value in, the way a user would as far as the framework can tell.
   *
   * `input` and `change` are both dispatched: signal-forms controls listen to the
   * first, classic `[(ngModel)]` to the second.
   */
  async setValue(value: string): Promise<void> {
    const host = await this.host();
    await host.clear();
    await host.sendKeys(value);
    await host.dispatchEvent('change');
  }

  /** Clear the field, dispatching the same pair of events as {@link setValue}. */
  async clear(): Promise<void> {
    const host = await this.host();
    await host.clear();
    await host.dispatchEvent('change');
  }

  async getPlaceholder(): Promise<string> {
    return (await this.host()).getProperty<string>('placeholder');
  }

  async isDisabled(): Promise<boolean> {
    return (await this.host()).getProperty<boolean>('disabled');
  }

  async isReadonly(): Promise<boolean> {
    return (await this.host()).getProperty<boolean>('readOnly');
  }

  /** `input` or `textarea` — the directive styles both. */
  async getTagName(): Promise<string> {
    return (await (await this.host()).getProperty<string>('tagName')).toLowerCase();
  }

  /**
   * Whether the field is marked invalid.
   *
   * `<wr-form-field>` sets `aria-invalid` when it has an error to describe, so
   * this answers what a screen reader is told rather than what the model thinks.
   */
  async isInvalid(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-invalid')) === 'true';
  }

  async focus(): Promise<void> {
    return (await this.host()).focus();
  }

  async blur(): Promise<void> {
    return (await this.host()).blur();
  }

  async isFocused(): Promise<boolean> {
    return (await this.host()).isFocused();
  }
}
