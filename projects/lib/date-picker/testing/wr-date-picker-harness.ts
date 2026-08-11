/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { HarnessPredicate, type TestElement } from '@angular/cdk/testing';

import type { WrDatePickerHarnessFilters, WrDatePickerTimeFields } from './interfaces';
import { WrDatePickerHarnessBase } from './wr-date-picker-harness-base';
import type { WrTimePanelHarness } from './wr-time-panel-harness';

/**
 * Test harness for `<wr-date-picker>` — the `date`, `time` and `datetime` modes
 * of the one component.
 *
 * The popup is NOT inside the picker: it is a pane in the overlay container, a
 * sibling of the whole app. Everything inside it is therefore reached through the
 * document root, scoped by the id the trigger publishes as `aria-controls` —
 * which is what keeps two pickers on one page from reading each other's calendar.
 *
 * The value lives in a text field, so there are two ways in and the harness
 * offers both: {@link setValueText} types a date, {@link selectDay} picks one out
 * of the grid. There is deliberately no clear BUTTON on this component — an
 * emptied field is what clears the value, and that is what {@link clear} does.
 *
 * @example
 * ```ts
 * const picker = await loader.getHarness(WrDatePickerHarness);
 *
 * await picker.open();
 * expect(await picker.getPanelHeader()).toBe('January 2025');
 * await picker.selectDay(14);
 *
 * expect(await picker.getValueText()).toBe('14.01.2025');
 * expect(await (await picker.getDay(14)).isSelected()).toBe(true);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrDatePickerHarness extends WrDatePickerHarnessBase {
  static hostSelector = 'wr-date-picker';

  /** Build a predicate that narrows the query. */
  static with(options: WrDatePickerHarnessFilters = {}): HarnessPredicate<WrDatePickerHarness> {
    return new HarnessPredicate(WrDatePickerHarness, options)
      .addOption('text', options.text, (harness, text) => HarnessPredicate.stringMatches(harness.getValueText(), text))
      .addOption('placeholder', options.placeholder, (harness, placeholder) =>
        HarnessPredicate.stringMatches(harness.getPlaceholder(), placeholder)
      )
      .addOption('mode', options.mode, async (harness, mode) => (await harness.getMode()) === mode)
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled)
      .addOption('open', options.open, async (harness, open) => (await harness.isOpen()) === open);
  }

  protected readonly harnessName = 'WrDatePickerHarness';

  /** Which mode the picker is in, read from the `wr-date-picker--*` modifier. */
  async getMode(): Promise<'date' | 'time' | 'datetime'> {
    const host = await this.host();
    if (await host.hasClass('wr-date-picker--time')) return 'time';
    if (await host.hasClass('wr-date-picker--datetime')) return 'datetime';
    return 'date';
  }

  /**
   * What the field is showing: the value in the picker's `format`, or `''` when it
   * is empty and the placeholder is up.
   */
  async getValueText(): Promise<string> {
    return (await this.field()).getProperty<string>('value');
  }

  /** The field's placeholder. */
  async getPlaceholder(): Promise<string> {
    return (await this.field()).getProperty<string>('placeholder');
  }

  /**
   * Type a date into the field, replacing whatever is there.
   *
   * The field is cleared first, so the value passes through `null` on the way —
   * exactly as it does for a user who selects all and types over it. The picker
   * parses on every keystroke and commits only when the text parses in full, so a
   * partial or out-of-bounds entry leaves the model on its last good value.
   */
  async setValueText(text: string): Promise<void> {
    const field = await this.field();
    await field.clear();
    // `sendKeys()` with an empty string throws — clearing was the whole request.
    if (text) await field.sendKeys(text);
  }

  /**
   * Empty the field, which clears the value.
   *
   * There is no clear button to click: unlike `wr-select`, this component ships no
   * `×` affordance, and an empty field is the documented way to get back to `null`.
   */
  async clear(): Promise<void> {
    await (await this.field()).clear();
  }

  /** Whether the picker refuses interaction. */
  async isDisabled(): Promise<boolean> {
    return (await this.host()).hasClass('wr-date-picker--disabled');
  }

  /**
   * Whether the field refuses typing. A read-only picker still OPENS its popup —
   * documented behaviour, and the one place it parts company with the range picker.
   */
  async isReadonly(): Promise<boolean> {
    return (await this.field()).getProperty<boolean>('readOnly');
  }

  /** Move focus to the field. */
  async focus(): Promise<void> {
    return (await this.field()).focus();
  }

  /**
   * Blur the field, which is what reformats a value to canonical and emits `touch`
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
   * The open time stepper's value as `HH:MM`, plus `:SS` when `showSeconds` is on
   * and ` AM`/` PM` in 12-hour mode.
   */
  async getTime(): Promise<string> {
    return (await this.timePanel()).getTimeText();
  }

  /** Type into the open time stepper's boxes. Omitted fields are left alone. */
  async setTime(fields: WrDatePickerTimeFields): Promise<void> {
    await (await this.timePanel()).setFields(fields);
  }

  /** Click one of the stepper's ▲ / ▼ buttons. Minutes and seconds move by `step`. */
  async stepTime(unit: 'hours' | 'minutes' | 'seconds', direction: 1 | -1): Promise<void> {
    await (await this.timePanel()).step(unit, direction);
  }

  /** Flip the stepper between AM and PM. Throws in 24-hour mode, which has no such control. */
  async toggleMeridiem(): Promise<void> {
    await (await this.timePanel()).toggleMeridiem();
  }

  private async field(): Promise<TestElement> {
    return this.locatorFor('input[wrInput]')();
  }

  /** The one stepper in the popup — `panelId()` has already refused a closed picker. */
  private async timePanel(): Promise<WrTimePanelHarness> {
    const [panel] = await this.timePanels();
    if (!panel) {
      throw new Error(
        `${this.harnessName}: this popup has no time stepper — mode="date" renders a calendar only. Use mode="time" ` +
          'or mode="datetime".'
      );
    }

    return panel;
  }
}
