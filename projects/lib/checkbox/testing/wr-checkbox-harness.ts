/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrCheckboxHarnessFilters } from './interfaces';

/**
 * Test harness for `<wr-checkbox>`.
 *
 * The visible box is a `<span>` the stylesheet paints; the state lives on a real
 * `<input type="checkbox">` inside the label, and that is what this harness reads
 * and clicks. Toggling through the input rather than the painted box is what makes
 * `check()` behave the way a user does — the label is what a click lands on.
 *
 * Note `checkboxValue` versus `value`: a checkbox's group identity is
 * `checkboxValue`, because `FormCheckboxControl` reserves `value` for the form
 * value. {@link getCheckboxValue} reads the identity.
 *
 * @example
 * ```ts
 * const terms = await loader.getHarness(WrCheckboxHarness.with({ label: 'I agree' }));
 * await terms.check();
 * expect(await terms.isChecked()).toBe(true);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrCheckboxHarness extends ComponentHarness {
  static hostSelector = 'wr-checkbox';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrCheckboxHarnessFilters = {}): HarnessPredicate<WrCheckboxHarness> {
    return new HarnessPredicate(WrCheckboxHarness, options)
      .addOption('label', options.label, (harness, label) => HarnessPredicate.stringMatches(harness.getLabel(), label))
      .addOption('checked', options.checked, async (harness, checked) => (await harness.isChecked()) === checked)
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled);
  }

  private readonly input = this.locatorFor('input.wr-checkbox__input');

  /** The projected label text, trimmed. */
  async getLabel(): Promise<string> {
    return (await this.locatorFor('.wr-checkbox__label')()).text();
  }

  async isChecked(): Promise<boolean> {
    return (await this.input()).getProperty<boolean>('checked');
  }

  /**
   * Whether the box is in its third state.
   *
   * `indeterminate` is a DOM PROPERTY, not an attribute — reading the attribute
   * would report `null` for a box that is visibly dashed.
   */
  async isIndeterminate(): Promise<boolean> {
    return (await this.input()).getProperty<boolean>('indeterminate');
  }

  async isDisabled(): Promise<boolean> {
    return (await this.input()).getProperty<boolean>('disabled');
  }

  /**
   * The group identity — `checkboxValue`, not the form value.
   *
   * Read off the host's `data-checkbox-value`, which the component reflects for
   * exactly this. It used to read `value` from the inner `<input>`, an attribute
   * nothing writes, so it answered `null` for every checkbox whatever its
   * identity — the shape these harnesses are not allowed to have.
   *
   * `null` still means one honest thing: no identity, or an identity that is not
   * a primitive. An object or an array has no attribute form, and a harness
   * cannot reach a TypeScript value the DOM never carried.
   */
  async getCheckboxValue(): Promise<string | null> {
    return (await this.host()).getAttribute('data-checkbox-value');
  }

  /** Flip the box. A disabled checkbox does not move; assert rather than assume. */
  async toggle(): Promise<void> {
    return (await this.input()).click();
  }

  /** Tick the box if it is not already ticked. */
  async check(): Promise<void> {
    if (!(await this.isChecked())) await this.toggle();
  }

  /** Untick the box if it is ticked. */
  async uncheck(): Promise<void> {
    if (await this.isChecked()) await this.toggle();
  }

  async focus(): Promise<void> {
    return (await this.input()).focus();
  }

  async isFocused(): Promise<boolean> {
    return (await this.input()).isFocused();
  }
}
