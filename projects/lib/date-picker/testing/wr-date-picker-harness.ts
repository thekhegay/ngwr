/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { HarnessPredicate, type TestElement } from '@angular/cdk/testing';

import { wrFromDay } from 'ngwr/date';
import type { WrDatePickerMode } from 'ngwr/date-picker';

import type { WrDatePickerHarnessFilters, WrDatePickerTimeFields } from './types';
import { WrDatePickerHarnessBase } from './wr-date-picker-harness-base';
import type { WrTimePanelHarness } from './wr-time-panel-harness';

/**
 * Test harness for `<wr-date-picker>` — the `date`, `time` and `datetime` modes
 * of the one component, and its period modes: `selectMonth()`, `selectYear()`,
 * `selectQuarter()` and `selectWeek()` are the pick where the mode makes them one.
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
  async getMode(): Promise<WrDatePickerMode> {
    const host = await this.host();
    for (const mode of ['time', 'datetime', 'week', 'month', 'quarter', 'year'] as const) {
      if (await host.hasClass(`wr-date-picker--${mode}`)) return mode;
    }
    return 'date';
  }

  /**
   * What the field is showing: the value in the picker's `format`, or `''` when it
   * is empty and the placeholder is up.
   */
  async getValueText(): Promise<string> {
    return (await this.field()).getProperty<string>('value');
  }

  /**
   * The held day of a `valueFormat="day"` picker, as the `YYYY-MM-DD` string its
   * model holds, or `null` when it is empty. Read from the host's `data-day`,
   * which the component writes from the model, so text the picker refused does
   * not show here. Throws on a picker that holds a `Date`.
   */
  async getDayValue(): Promise<string | null> {
    const day = await (await this.host()).getAttribute('data-day');
    if (day === null) {
      throw new Error(
        `${this.harnessName}.getDayValue(): this picker holds a Date, not a day string. Only valueFormat="day" ` +
          'in mode="date" or a period mode publishes one; read getValueText() instead.'
      );
    }

    return day === '' ? null : day;
  }

  /**
   * Pick a `YYYY-MM-DD` day out of the calendar, opening the popup when it is
   * closed: zoom out to the years, then pick the year, the month and the day,
   * as far as the mode goes (a `month` picker stops at the month, a `week`
   * picker takes the week the day is in). It needs no `valueFormat="day"`, and
   * it does not know the field's `format`, which is why it does not type.
   *
   * Throws on a string that is not in that form, on a year, month or day that
   * `min` / `max` or `dateFilter` rule out, and in `time` and `datetime` modes.
   * A read-only picker opens and takes the clicks without moving its value:
   * assert with {@link getDayValue}.
   */
  async setDayValue(day: string): Promise<void> {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
    // A day the calendar lacks fails here, before a month or year picker would
    // stop short of the day and take it.
    if (!match || !wrFromDay(day)) {
      throw new Error(`${this.harnessName}.setDayValue(${JSON.stringify(day)}): expected a day as YYYY-MM-DD.`);
    }
    const mode = await this.getMode();
    if (mode === 'time' || mode === 'datetime') {
      throw new Error(
        `${this.harnessName}.setDayValue(): mode="${mode}" holds a time as well, which a day does not name. Use ` +
          'setValueText(), or selectDay() and setTime().'
      );
    }
    const [year, month, dayOfMonth] = match.slice(1).map(Number);

    await this.open();
    while ((await this.getView()) !== 'year') await this.zoomOut();
    await this.showYear(year);
    await this.selectYear(year);
    if (!(await this.isOpen())) return;

    const view = await this.getView();
    if (view === 'year') {
      throw new Error(`${this.harnessName}.setDayValue(${JSON.stringify(day)}): the year ${year} is disabled.`);
    }
    if (view === 'quarter') return this.selectQuarter((Math.floor((month - 1) / 3) + 1) as 1 | 2 | 3 | 4);

    await this.selectMonth(month - 1);
    if (!(await this.isOpen())) return;
    if ((await this.getView()) !== 'day') {
      throw new Error(`${this.harnessName}.setDayValue(${JSON.stringify(day)}): that month is disabled.`);
    }
    await this.selectDay(dayOfMonth);
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
   * Not a click on the `×`: that button exists only on a `clearable` picker, and an
   * empty field gets back to `null` on every one.
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

  /** Page the year view until `year` is one of the twelve on show. */
  private async showYear(year: number): Promise<void> {
    // 0 to 9999 is 834 pages of twelve; a header that never reaches the year is a bug, not a wait.
    for (let page = 0; page < 840; page++) {
      const chips = await this.allInPanel('.wr-calendar__years .wr-calendar__chip');
      const shown = await Promise.all(chips.map(async chip => Number(await chip.text())));
      if (year < shown[0]) await this.previous();
      else if (year > shown[shown.length - 1]) await this.next();
      else return;
    }

    throw new Error(`${this.harnessName}.setDayValue(): the year view never reached ${year}.`);
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
