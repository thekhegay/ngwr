/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import type { WrCalendarDayHarnessFilters } from './interfaces';

/**
 * Test harness for one day cell of a `<wr-calendar>` grid.
 *
 * The cell belongs to the calendar, and a date-picker's popup is a calendar in an
 * overlay — so this is the harness for both, re-exported from
 * `ngwr/date-picker/testing` under the name it shipped as
 * (`WrDatePickerDayHarness`). Reach it through `WrCalendarHarness.getDays()`, or
 * through `WrDatePickerHarness.getDay()` / `getDays()`, which scope it to ONE
 * picker's panel — those cells are in the shared overlay container, so a bare query
 * would answer with whichever picker opened first.
 *
 * State is read the way a screen reader reads it (`role`, `aria-selected`,
 * `aria-disabled`) with the `.wr-calendar__day--*` modifiers filling in what
 * ARIA has no word for: today, the spill days of the neighbouring months, and
 * the interior of a picked range.
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrCalendarDayHarness extends ComponentHarness {
  static hostSelector = '.wr-calendar__day';

  /** Build a predicate that narrows the query. */
  static with(options: WrCalendarDayHarnessFilters = {}): HarnessPredicate<WrCalendarDayHarness> {
    return new HarnessPredicate(WrCalendarDayHarness, options)
      .addOption('text', options.text, (harness, text) => HarnessPredicate.stringMatches(harness.getText(), text))
      .addOption('selected', options.selected, async (harness, selected) => (await harness.isSelected()) === selected)
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled)
      .addOption('inRange', options.inRange, async (harness, inRange) => (await harness.isInRange()) === inRange);
  }

  /** The day number as rendered. */
  async getText(): Promise<string> {
    return (await this.host()).text();
  }

  /** The day number as a number, for mapping a list of cells to dates. */
  async getDayOfMonth(): Promise<number> {
    return Number(await this.getText());
  }

  /**
   * What a screen reader announces for this cell — "Thursday, January 15, 2026".
   *
   * A SECOND question from {@link getText}, and the reason this method exists:
   * until v14 the cell had no name at all, so the two answers were "15" and
   * nothing. A spec that reads only the drawn number passes on a grid that
   * announces bare integers with no month, year or weekday anywhere in it.
   *
   * The string is `calendar.dayLabel` interpolated with the adapter's
   * `longDate`, so it moves with the locale AND with the adapter — assert
   * against the pair your spec provides, not against an English literal.
   */
  async getAccessibleName(): Promise<string | null> {
    return (await this.host()).getAttribute('aria-label');
  }

  /** `'gridcell'` — the cell is a button, and the grid semantics are what a spec should assert. */
  async getRole(): Promise<string | null> {
    return (await this.host()).getAttribute('role');
  }

  /** Whether this day is (one end of) the current selection. */
  async isSelected(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-selected')) === 'true';
  }

  /**
   * Whether the day refuses selection — `min` / `max` or `dateFilter` ruled it
   * out, or the whole calendar is disabled.
   */
  async isDisabled(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-disabled')) === 'true';
  }

  /** Whether the cell is today's date. */
  async isToday(): Promise<boolean> {
    return (await this.host()).hasClass('wr-calendar__day--today');
  }

  /**
   * Whether the cell belongs to a neighbouring month. The grid is always 6x7, so
   * every month is padded with days that are selectable but not "in" the month —
   * which is why `WrDatePickerHarness.getDay` and {@link WrCalendarHarness.getDay} skip them.
   */
  async isOutOfMonth(): Promise<boolean> {
    return (await this.host()).hasClass('wr-calendar__day--out-of-month');
  }

  /** Whether the day lies strictly between the two ends of a picked range. */
  async isInRange(): Promise<boolean> {
    return (await this.host()).hasClass('wr-calendar__day--in-range');
  }

  /**
   * Whether this is the roving cell — the grid's single tab stop, and where the
   * arrow keys move from.
   *
   * At most ONE cell answers `true`, and it is not always one: the calendar's
   * roving date does not follow `next()` / `previous()`, so a grid navigated away
   * from that month has no active cell (and, deliberately or not, no tab stop)
   * until a cell is clicked or the arrows move it.
   */
  async isActive(): Promise<boolean> {
    return (await this.host()).hasClass('wr-calendar__day--focused');
  }

  /** Click the cell. A disabled cell swallows the click — assert, do not assume. */
  async click(): Promise<void> {
    return (await this.host()).click();
  }
}
