/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { HarnessPredicate, type TestElement } from '@angular/cdk/testing';

import type { WrDatePickerTimeFields, WrDateRangePickerHarnessFilters } from './interfaces';
import { WrDatePickerHarnessBase } from './wr-date-picker-harness-base';
import type { WrTimePanelHarness } from './wr-time-panel-harness';

/** Which end of the range a call applies to. */
type End = 'start' | 'end';

/**
 * Test harness for `<wr-date-range-picker>` — two text fields over one range
 * calendar.
 *
 * A separate harness rather than a mode of {@link WrDatePickerHarness}, because
 * the DOM a spec has to reach is genuinely different: two fields with a separator
 * between them, and in `datetime` mode two time steppers instead of one. Every
 * call that could mean either field takes an explicit `'start'` / `'end'` — the
 * component's own bugs were nearly all "which end did that belong to", and a
 * harness that guessed would reproduce them.
 *
 * The popup, the calendar and the scoping work exactly as they do for the single
 * picker: a pane in the overlay container, addressed by the id the trigger
 * publishes as `aria-controls`.
 *
 * @example
 * ```ts
 * const period = await loader.getHarness(WrDateRangePickerHarness);
 *
 * await period.open();
 * await period.selectDay(14);
 * await period.selectDay(20);
 *
 * expect([await period.getStartText(), await period.getEndText()]).toEqual(['14.01.2025', '20.01.2025']);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrDateRangePickerHarness extends WrDatePickerHarnessBase {
  static hostSelector = 'wr-date-range-picker';

  /** Build a predicate that narrows the query. */
  static with(options: WrDateRangePickerHarnessFilters = {}): HarnessPredicate<WrDateRangePickerHarness> {
    return new HarnessPredicate(WrDateRangePickerHarness, options)
      .addOption('startText', options.startText, (harness, text) =>
        HarnessPredicate.stringMatches(harness.getStartText(), text)
      )
      .addOption('endText', options.endText, (harness, text) =>
        HarnessPredicate.stringMatches(harness.getEndText(), text)
      )
      .addOption('mode', options.mode, async (harness, mode) => (await harness.getMode()) === mode)
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled)
      .addOption('open', options.open, async (harness, open) => (await harness.isOpen()) === open);
  }

  protected readonly harnessName = 'WrDateRangePickerHarness';

  /** Which mode the picker is in, read from the `wr-date-range-picker--*` modifier. */
  async getMode(): Promise<'date' | 'datetime'> {
    return (await (await this.host()).hasClass('wr-date-range-picker--datetime')) ? 'datetime' : 'date';
  }

  /** What the start field is showing — `''` while that end is unpicked. */
  async getStartText(): Promise<string> {
    return (await this.field('start')).getProperty<string>('value');
  }

  /** What the end field is showing — `''` while that end is unpicked. */
  async getEndText(): Promise<string> {
    return (await this.field('end')).getProperty<string>('value');
  }

  /** The glyph rendered between the two fields (`[separator]`, `'–'` by default). */
  async getSeparator(): Promise<string> {
    return (await this.locatorFor('.wr-date-range-picker__separator')()).text();
  }

  /** The placeholder of one field. */
  async getPlaceholder(end: End): Promise<string> {
    return (await this.field(end)).getProperty<string>('placeholder');
  }

  /**
   * Type a date into the start field, replacing whatever is there.
   *
   * Ends typed out of order are NOT swapped here — the component settles the
   * ordering when the interaction is over, so call {@link blur} (or close the
   * popup) to see a normalised range.
   */
  async setStartText(text: string): Promise<void> {
    await this.type('start', text);
  }

  /** Type a date into the end field — see {@link setStartText} on ordering. */
  async setEndText(text: string): Promise<void> {
    await this.type('end', text);
  }

  /** Empty both fields, which clears the range. Neither end has a clear button. */
  async clear(): Promise<void> {
    await (await this.field('start')).clear();
    await (await this.field('end')).clear();
  }

  /** Whether the picker refuses interaction. */
  async isDisabled(): Promise<boolean> {
    return (await this.host()).hasClass('wr-date-range-picker--disabled');
  }

  /**
   * Whether the fields refuse typing. Stricter than `<wr-date-picker>`: a
   * read-only range picker also refuses to open, since two fields over one
   * calendar leaves no reading of "untypeable" that still lets the grid rewrite
   * both ends.
   */
  async isReadonly(): Promise<boolean> {
    return (await this.field('start')).getProperty<boolean>('readOnly');
  }

  /** Move focus to one field. */
  async focus(end: End): Promise<void> {
    return (await this.field(end)).focus();
  }

  /**
   * Blur one field. This is the moment an out-of-order range is put back in
   * order, and — when focus leaves the control rather than hopping to the other
   * end — the moment `touch` is emitted.
   */
  async blur(end: End): Promise<void> {
    return (await this.field(end)).blur();
  }

  /** Whether one field currently has focus. */
  async isFocused(end: End): Promise<boolean> {
    return (await this.field(end)).isFocused();
  }

  /**
   * One end's time stepper as `HH:MM`, plus `:SS` when `showSeconds` is on and
   * ` AM`/` PM` in 12-hour mode. `datetime` mode only.
   */
  async getTime(end: End): Promise<string> {
    return (await this.timePanel(end)).getTimeText();
  }

  /** Type into one end's time stepper. Omitted fields are left alone. */
  async setTime(end: End, fields: WrDatePickerTimeFields): Promise<void> {
    await (await this.timePanel(end)).setFields(fields);
  }

  /** Click one of an end's ▲ / ▼ buttons. Minutes and seconds move by `step`. */
  async stepTime(end: End, unit: 'hours' | 'minutes' | 'seconds', direction: 1 | -1): Promise<void> {
    await (await this.timePanel(end)).step(unit, direction);
  }

  /** Flip one end between AM and PM. Throws in 24-hour mode, which has no such control. */
  async toggleMeridiem(end: End): Promise<void> {
    await (await this.timePanel(end)).toggleMeridiem();
  }

  private async type(end: End, text: string): Promise<void> {
    const field = await this.field(end);
    await field.clear();
    // `sendKeys()` with an empty string throws — clearing was the whole request.
    if (text) await field.sendKeys(text);
  }

  /** The two fields are addressed by position, which is the order they render in. */
  private async field(end: End): Promise<TestElement> {
    const fields = await this.locatorForAll('.wr-date-range-picker__input')();
    const field = fields[end === 'start' ? 0 : 1];
    if (!field) {
      throw new Error(`${this.harnessName}: no "${end}" field — the picker rendered ${fields.length} of them.`);
    }

    return field;
  }

  /**
   * One end's stepper. Both are mounted together in `datetime` mode, start first —
   * the group labels are localized, so position is the addressable thing.
   */
  private async timePanel(end: End): Promise<WrTimePanelHarness> {
    const panels = await this.timePanels();
    if (panels.length === 0) {
      throw new Error(
        `${this.harnessName}: this popup has no time steppers — mode="date" renders a calendar only. Use ` +
          'mode="datetime".'
      );
    }

    const panel = panels[end === 'start' ? 0 : 1];
    if (!panel) {
      throw new Error(`${this.harnessName}: no "${end}" time stepper — the popup rendered ${panels.length}.`);
    }

    return panel;
  }
}
