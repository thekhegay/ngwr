/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, TestKey, type TestElement } from '@angular/cdk/testing';

import type { WrInputNumberHarnessFilters } from './interfaces';

/** The decimal + grouping characters `Intl` formats `locale` with. */
function separatorsFor(locale?: string): { decimal: string; group: string } {
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
  return {
    decimal: parts.find(part => part.type === 'decimal')?.value ?? '.',
    group: parts.find(part => part.type === 'group')?.value ?? '',
  };
}

/**
 * Locale-formatted text back into a number — `null` when the text is empty or is
 * not a number at all.
 *
 * The same two-step the component parses with: drop the grouping character, then
 * normalise the decimal one to `.`. Doing it in that order matters, because in
 * half the world's locales the two are swapped and `Number('1.234,5')` is `NaN`
 * either way.
 */
function parseNumber(text: string, locale?: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const { decimal, group } = separatorsFor(locale);
  let normalised = group ? trimmed.split(group).join('') : trimmed;
  if (decimal !== '.') normalised = normalised.split(decimal).join('.');

  const parsed = Number(normalised);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Test harness for `<wr-input-number>`.
 *
 * The control is a `type="text"` field plus a ▲▼ stepper column — deliberately
 * NOT an `<input type="number">` and NOT a `role="spinbutton"`, because it renders
 * grouped, locale-formatted text that a numeric input cannot hold. Two things
 * follow, and they shape this whole harness:
 *
 * - There is no `aria-valuenow` / `aria-valuemin` / `aria-valuemax` trio, and no
 *   `min` / `max` / `step` attribute, anywhere in the DOM. So the value is read
 *   out of the field's TEXT, and the bounds are read off the stepper buttons'
 *   disabled state — which is precisely what a user is given, and the reason
 *   {@link isIncrementDisabled} is named after the button rather than after "at
 *   the maximum".
 * - The text and the value are different things, and the gap between them is this
 *   control's trap. {@link getValueText} answers the raw characters;
 *   {@link getValue} answers the number they spell. Mid-type the two disagree
 *   with the MODEL as well: the component clamps and rounds on every keystroke
 *   but leaves the typed text alone until blur, so a field showing `999` under
 *   `[max]="10"` has already committed `10`. Call {@link blur} — which is also
 *   what emits `touch` — to make the field re-render from the committed value,
 *   and assert the host's own signal when what you mean is "the model".
 *
 * Stepping has two paths and both are here: {@link increment} / {@link decrement}
 * click the buttons, {@link stepUp} / {@link stepDown} press ArrowUp / ArrowDown
 * on the field. The keyboard is the accessible path, and in a unit test it is
 * also the honest one — jsdom has no layout, so nothing that needs a hit test can
 * be driven by coordinates. `{ shift: true }` is this control's page-up: it steps
 * by ten. There is deliberately no `pageUp()` / `home()` / `end()`, because the
 * component handles the two arrow keys and nothing else.
 *
 * @example
 * ```ts
 * const qty = await loader.getHarness(WrInputNumberHarness.with({ placeholder: 'Quantity' }));
 *
 * await qty.setValue(4);
 * await qty.increment();
 * expect(await qty.getValue()).toBe(5);
 *
 * await qty.stepUp({ shift: true });
 * expect(await qty.isIncrementDisabled()).toBe(true); // [max]="15"
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrInputNumberHarness extends ComponentHarness {
  static hostSelector = 'wr-input-number';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrInputNumberHarnessFilters = {}): HarnessPredicate<WrInputNumberHarness> {
    return new HarnessPredicate(WrInputNumberHarness, options)
      .addOption('text', options.text, (harness, text) => HarnessPredicate.stringMatches(harness.getValueText(), text))
      .addOption('value', options.value, async (harness, value) => (await harness.parsedValue()) === value)
      .addOption('placeholder', options.placeholder, (harness, placeholder) =>
        HarnessPredicate.stringMatches(harness.getPlaceholder(), placeholder)
      )
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled);
  }

  private readonly field = this.locatorFor('input[wrInput]');

  /** The raw characters in the field — mid-typed, ungrouped or nonsense included. */
  async getValueText(): Promise<string> {
    return (await this.field()).getProperty<string>('value');
  }

  /**
   * The number the field is SHOWING, or `null` when it is empty.
   *
   * Empty is `null` rather than `0` because the control draws that distinction
   * too — a required-field check has to be able to tell "nothing entered" from "a
   * deliberate zero". Text that is not a number throws instead: answering `null`
   * there would report a half-typed `-` as an empty field.
   *
   * `locale` defaults to the test runtime's, which for a stock Node run is the
   * same `en-US` Angular's `LOCALE_ID` defaults to. The component formats with
   * `LOCALE_ID` and a harness cannot reach that injector, so an app that provides
   * its own must pass it: `getValue('de-DE')`. Reading `'1.234,5'` as en-US
   * silently answers `1.2345`.
   */
  async getValue(locale?: string): Promise<number | null> {
    const text = await this.getValueText();
    if (!text.trim()) return null;

    const parsed = parseNumber(text, locale);
    if (parsed === null) {
      throw new Error(
        `WrInputNumberHarness.getValue(): the field is showing ${JSON.stringify(text)}, which is not a number in ` +
          `${locale ? `locale "${locale}"` : "the test runtime's locale"}. Mid-type the field holds text the ` +
          'control has not accepted — read getValueText() for the characters, or blur() to make it re-render from ' +
          'the committed value. If the app provides a LOCALE_ID of its own, pass it: getValue("de-DE").'
      );
    }

    return parsed;
  }

  /**
   * Type a number into the field, replacing whatever is there.
   *
   * Written with the LOCALE's decimal separator rather than with `String(value)`:
   * in a comma-decimal locale `'1.5'` is read as `15`, because `.` is that
   * locale's THOUSANDS separator. Grouping is deliberately not added — nothing
   * requires it, and the field regroups itself on blur anyway.
   *
   * The field is cleared first, so the value passes through `null` on the way, as
   * it does for a user who selects all and types over it. The control parses every
   * keystroke, so `min` / `max` / `decimals` are applied AS YOU TYPE while the
   * text is left exactly as typed — see {@link getValue}.
   */
  async setValue(value: number, locale?: string): Promise<void> {
    if (!Number.isFinite(value)) {
      throw new Error(
        `WrInputNumberHarness.setValue(${value}): a field can only be typed a finite number. Use clear() to empty it.`
      );
    }

    const { decimal } = separatorsFor(locale);
    await this.setValueText(decimal === '.' ? String(value) : String(value).replace('.', decimal));
  }

  /**
   * Type raw characters into the field, replacing whatever is there.
   *
   * For everything a number cannot express: a partial entry (`'-'`, `'1.'`), an
   * already-grouped string, or plain nonsense. Nothing is normalised on the way
   * in, and — as with {@link setValue} — the field is cleared first.
   */
  async setValueText(text: string): Promise<void> {
    const field = await this.field();
    await field.clear();
    // `sendKeys('')` throws — clearing was the whole request.
    if (text) await field.sendKeys(text);
  }

  /** Empty the field, which sets the value to `null` — not to `0`. */
  async clear(): Promise<void> {
    await (await this.field()).clear();
  }

  /** Whether the ▲▼ column is rendered at all — `[showSteppers]="false"` drops it. */
  async hasSteppers(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-input-number__steppers')()) !== null;
  }

  /**
   * Click ▲ once: up by `step`, clamped to `max`.
   *
   * A button at its bound — or on a disabled / readonly control — is `disabled`,
   * and the CDK does not deliver a click to a disabled element, so this is a
   * quiet no-op there rather than a throw. Ask {@link isIncrementDisabled} rather
   * than inferring the bound from a value that did not move. It throws only when
   * there is no stepper column to click.
   */
  async increment(): Promise<void> {
    await (await this.stepButton(1, 'increment')).click();
  }

  /** Click ▼ once: down by `step`, clamped to `min`. See {@link increment}. */
  async decrement(): Promise<void> {
    await (await this.stepButton(-1, 'decrement')).click();
  }

  /**
   * Whether ▲ refuses to step.
   *
   * Deliberately not named `isAtMax()`: the button is disabled at the maximum AND
   * on a disabled or readonly control, and it cannot tell you which. That
   * conflation is the control's own — it is what the user is offered — and the
   * name says so rather than promising a bound the DOM never publishes.
   */
  async isIncrementDisabled(): Promise<boolean> {
    return (await this.stepButton(1, 'isIncrementDisabled')).getProperty<boolean>('disabled');
  }

  /** Whether ▼ refuses to step — at the minimum, or on a locked control. */
  async isDecrementDisabled(): Promise<boolean> {
    return (await this.stepButton(-1, 'isDecrementDisabled')).getProperty<boolean>('disabled');
  }

  /**
   * Press ArrowUp on the field: up by `step`, or by TEN steps with
   * `{ shift: true }` — the control's page-up, since it handles no other keys.
   */
  async stepUp(options: { shift?: boolean } = {}): Promise<void> {
    await (await this.field()).sendKeys({ shift: options.shift === true }, TestKey.UP_ARROW);
  }

  /** Press ArrowDown on the field. See {@link stepUp} for the `shift` multiplier. */
  async stepDown(options: { shift?: boolean } = {}): Promise<void> {
    await (await this.field()).sendKeys({ shift: options.shift === true }, TestKey.DOWN_ARROW);
  }

  /** The `[prefix]` label (`'$'`), or `null` when the field has none. */
  async getPrefix(): Promise<string | null> {
    const prefix = await this.locatorForOptional('.wr-input-group__affix--prefix')();
    return prefix ? prefix.text() : null;
  }

  /**
   * The `[suffix]` label (`'kg'`), or `null` when the field has none.
   *
   * The stepper column rides in the same suffix slot and carries the same affix
   * class, so it is excluded here by name: a bare `--suffix` query answers with
   * the buttons' (empty) text for every field that has steppers and no suffix.
   */
  async getSuffix(): Promise<string | null> {
    const suffix = await this.locatorForOptional('.wr-input-group__affix--suffix:not(.wr-input-number__steppers)')();
    return suffix ? suffix.text() : null;
  }

  /** The field's placeholder. */
  async getPlaceholder(): Promise<string> {
    return (await this.field()).getProperty<string>('placeholder');
  }

  /**
   * The field's accessible name, or `null` when it has none of its own.
   *
   * Read from the native input, not from the host: an `aria-label` on a component
   * element does not reach the control inside it, which is why the component
   * takes an `ariaLabel` input and forwards it here (falling back to the
   * placeholder). Inside a `<wr-form-field>` the name comes from the label's
   * `for`, and `null` here is then correct rather than a missing name.
   */
  async getAriaLabel(): Promise<string | null> {
    return (await this.field()).getAttribute('aria-label');
  }

  /**
   * Whether the field refuses interaction.
   *
   * The native control's `disabled` property, not the host's
   * `wr-input-number--disabled` modifier: the modifier is the styling hook, the
   * property is what actually blocks typing, drops the field out of the tab order
   * and is reported to assistive technology.
   */
  async isDisabled(): Promise<boolean> {
    return (await this.field()).getProperty<boolean>('disabled');
  }

  /** Whether the field refuses new values while staying focusable and readable. */
  async isReadonly(): Promise<boolean> {
    return (await this.field()).getProperty<boolean>('readOnly');
  }

  /** Move focus to the field. While it is focused the control stops reformatting the text. */
  async focus(): Promise<void> {
    return (await this.field()).focus();
  }

  /**
   * Blur the field, which is what commits the display: the control re-renders the
   * text from its value — grouping it and applying `decimals` — and emits `touch`
   * so a bound `[formField]` can mark itself touched.
   */
  async blur(): Promise<void> {
    return (await this.field()).blur();
  }

  /** Whether the field currently has focus. */
  async isFocused(): Promise<boolean> {
    return (await this.field()).isFocused();
  }

  /**
   * The shown value for predicates: `null` for an empty field AND for text that is
   * not a number, so a mid-typed field matches no `value` filter instead of
   * throwing the whole query.
   */
  private async parsedValue(): Promise<number | null> {
    return parseNumber(await this.getValueText());
  }

  /**
   * One of the two stepper buttons, BY POSITION — ▲ first, ▼ second.
   *
   * Not by `aria-label`: those strings resolve through the i18n catalog
   * (`inputNumber.increment` / `.decrement`) and an `[incrementLabel]` /
   * `[decrementLabel]` binding overrides them, so keying on them would make this
   * harness answer in whatever locale the app under test is configured for — the
   * same call `WrTimePanelHarness` makes about its own columns. Order is the
   * layout contract, and the spec pins it by asserting which way each button
   * moves the value.
   */
  private async stepButton(direction: 1 | -1, method: string): Promise<TestElement> {
    const buttons = await this.locatorForAll('.wr-input-number__step')();
    const button = buttons[direction === 1 ? 0 : 1];
    if (!button) {
      throw new Error(
        `WrInputNumberHarness.${method}(): this field has no stepper column — it was rendered with ` +
          '[showSteppers]="false". Type a value with setValue(), or step it from the keyboard with stepUp() / ' +
          'stepDown(), which work either way.'
      );
    }

    return button;
  }
}
