/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, TestKey, type TestElement } from '@angular/cdk/testing';

import { WrButtonHarness } from 'ngwr/button/testing';
import type { WrCalendarView } from 'ngwr/event-calendar';

import type {
  WrEventCalendarArrowKey,
  WrEventCalendarChipHarnessFilters,
  WrEventCalendarHarnessFilters,
} from './interfaces';
import { WrEventCalendarChipHarness } from './wr-event-calendar-chip-harness';

const ARROWS: Record<WrEventCalendarArrowKey, TestKey> = {
  left: TestKey.LEFT_ARROW,
  right: TestKey.RIGHT_ARROW,
  up: TestKey.UP_ARROW,
  down: TestKey.DOWN_ARROW,
};

/**
 * Test harness for `<wr-event-calendar>` — month, week and day in one component.
 *
 * **Every chip lives inside the `role="gridcell"` where its event STARTS**, and
 * reaches out from there with a `calc()` width or a percentage height. That is a
 * deliberate structural choice — a floating events layer would leave `role="row"`
 * owning something other than cells — and it is why {@link getChips} can be scoped
 * to a cell at all.
 *
 * **The view is read from the DOM, not from the input.** A month renders one grid
 * shape and week / day another, and those two are told apart by how many day columns
 * they draw. That is the honest answer for a harness: `view` is a model a consumer
 * can write, and the grid is what the user sees.
 *
 * **Nothing here mutates the events.** A move or a resize emits `eventChange` and
 * the host applies it — so a spec whose host ignores the output is asserting a
 * CANCELLED gesture, which is the contract rather than a bug.
 *
 * @example
 * ```ts
 * const calendar = await loader.getHarness(WrEventCalendarHarness);
 *
 * expect(await calendar.getView()).toBe('month');
 * const [standup] = await calendar.getChips({ title: 'Standup' });
 * await standup.move('right');
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrEventCalendarHarness extends ComponentHarness {
  static hostSelector = 'wr-event-calendar';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrEventCalendarHarnessFilters = {}): HarnessPredicate<WrEventCalendarHarness> {
    return new HarnessPredicate(WrEventCalendarHarness, options)
      .addOption('title', options.title, (harness, title) => HarnessPredicate.stringMatches(harness.getTitle(), title))
      .addOption('view', options.view, async (harness, view) => (await harness.getView()) === view);
  }

  private readonly grid = this.locatorFor('.wr-event-calendar__grid');

  /**
   * Which view is on screen.
   *
   * `month` has its own grid modifier; `week` and `day` share the time grid and are
   * told apart by the column count the component publishes on it. Reading the DOM
   * rather than the `view` model is the point — that model is an input a consumer can
   * set to anything, and this is what got rendered.
   */
  async getView(): Promise<WrCalendarView> {
    const grid = await this.grid();
    if (await grid.hasClass('wr-event-calendar__grid--month')) return 'month';

    const columns = (await this.locatorForAll('.wr-event-calendar__colhead')()).length;
    return columns > 1 ? 'week' : 'day';
  }

  /** The header title — the month, the week's range, or the day. */
  async getTitle(): Promise<string> {
    return (await this.locatorFor('.wr-event-calendar__title')()).text();
  }

  /** Whether the header is rendered at all (`hideHeader`). */
  async hasHeader(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-event-calendar__header')()) !== null;
  }

  /** The grid's accessible name. */
  async getAccessibleName(): Promise<string | null> {
    return (await this.grid()).getAttribute('aria-label');
  }

  /** Step back one month, week or day, depending on the view. */
  async previous(): Promise<void> {
    await (await this.step('prev')).click();
  }

  /** Step forward one month, week or day. */
  async next(): Promise<void> {
    await (await this.step('next')).click();
  }

  /** Press the Today button — jumping to the period containing today. */
  async goToday(): Promise<void> {
    await (await this.headerButton('.wr-event-calendar__today', 'goToday')).click();
  }

  /** The back arrow's accessible name — the two steps are icon-only. */
  async getPreviousLabel(): Promise<string | null> {
    return (await this.stepElement('prev')).getAttribute('aria-label');
  }

  /** The forward arrow's accessible name. */
  async getNextLabel(): Promise<string | null> {
    return (await this.stepElement('next')).getAttribute('aria-label');
  }

  /** The Today button's label. */
  async getTodayLabel(): Promise<string> {
    return (await this.headerButton('.wr-event-calendar__today', 'getTodayLabel')).getText();
  }

  /**
   * The view switcher's labels, in order — empty when the calendar was given a single
   * view, which drops the switcher entirely.
   */
  async getViewLabels(): Promise<string[]> {
    const buttons = await this.locatorForAll(WrButtonHarness.with({ selector: '.wr-event-calendar__view' }))();
    return Promise.all(buttons.map(button => button.getText()));
  }

  /** The label of the view currently pressed, or `null` when there is no switcher. */
  async getActiveViewLabel(): Promise<string | null> {
    for (const button of await this.locatorForAll('.wr-event-calendar__view')()) {
      if ((await button.getAttribute('aria-pressed')) === 'true') return button.text();
    }
    return null;
  }

  /**
   * Switch view by the label the switcher prints.
   *
   * By label rather than by the `WrCalendarView` value, because the label is what the
   * DOM has — the value never reaches it, and a spec that passed one would be naming
   * something only the component can see. {@link getViewLabels} lists them.
   */
  async setView(label: string): Promise<void> {
    for (const button of await this.locatorForAll('.wr-event-calendar__view')()) {
      if ((await button.text()) === label) {
        await button.click();
        return;
      }
    }
    throw new Error(
      `WrEventCalendarHarness.setView("${label}"): the switcher offers: ` +
        `${(await this.getViewLabels()).join(', ')}.`
    );
  }

  /** The weekday column headers of the month view. */
  async getWeekdayNames(): Promise<string[]> {
    const names = await this.locatorForAll('.wr-event-calendar__weekday')();
    return Promise.all(names.map(name => name.text()));
  }

  /** The day numbers of the month grid, in order — 42 of them, spill days included. */
  async getDayNumbers(): Promise<string[]> {
    const days = await this.locatorForAll('.wr-event-calendar__daynum')();
    return Promise.all(days.map(day => day.text()));
  }

  /** The time-gutter labels down the left of a week or day view. */
  async getSlotLabels(): Promise<string[]> {
    const gutters = await this.locatorForAll('.wr-event-calendar__row .wr-event-calendar__gutter')();
    return Promise.all(gutters.map(gutter => gutter.text()));
  }

  /** Whether the time views drew an all-day band, which they only do when something needs it. */
  async hasAllDayRow(): Promise<boolean> {
    return (await this.locatorForOptional('.wr-event-calendar__row--allday')()) !== null;
  }

  /**
   * Every chip on screen, in DOM order.
   *
   * A multi-day event has ONE chip, in the cell where it starts — the band reaches
   * across the rest — so this counts events-in-view rather than event-days.
   */
  async getChips(filters: WrEventCalendarChipHarnessFilters = {}): Promise<WrEventCalendarChipHarness[]> {
    return this.locatorForAll(WrEventCalendarChipHarness.with(filters))();
  }

  /** The chips' announced names, in DOM order. */
  async getChipLabels(): Promise<(string | null)[]> {
    const chips = await this.getChips();
    return Promise.all(chips.map(chip => chip.getLabel()));
  }

  /**
   * The "+N more" overflow buttons of the month view, by the text they print.
   *
   * A month cell shows `maxLanes` chips and hides the rest behind one of these, which
   * opens the day view — so its presence is the only sign that a cell has more than
   * it is showing.
   */
  async getOverflowLabels(): Promise<string[]> {
    const more = await this.locatorForAll('.wr-event-calendar__more')();
    return Promise.all(more.map(button => button.text()));
  }

  /** Click the first "+N more" button, which drops to the day view for that date. */
  async openOverflow(): Promise<void> {
    const [more] = await this.locatorForAll('.wr-event-calendar__more')();
    if (!more) {
      throw new Error(
        'WrEventCalendarHarness.openOverflow(): no cell is overflowing. A month cell only draws the button ' +
          'once it has more events than `maxLanes` lets it show.'
      );
    }
    await more.click();
  }

  /**
   * Click an empty part of a cell — which emits `slotClick` with its date and minutes.
   *
   * A cell is addressed by its DAY and, in a time view, the minutes from midnight of
   * its row (`-1` means a month cell or the all-day band). Both come off the two data
   * attributes every cell publishes for the drag's own hit-testing, which makes them
   * the one stable way to name a cell from outside — a row index would mean something
   * different in each view.
   */
  async clickCell(day: Date, minutes = -1): Promise<void> {
    await (await this.requireCell(day, minutes, 'clickCell')).click();
  }

  /** A cell's accessible name — the date, and the time for a slot. */
  async getCellLabel(day: Date, minutes = -1): Promise<string | null> {
    return (await this.requireCell(day, minutes, 'getCellLabel')).getAttribute('aria-label');
  }

  /** The chips inside ONE cell, which is where a chip's event starts. */
  async getCellChips(day: Date, minutes = -1): Promise<WrEventCalendarChipHarness[]> {
    const cell = await this.requireCell(day, minutes, 'getCellChips');
    const index = await cell.getAttribute('data-cell-index');
    return this.locatorForAll(WrEventCalendarChipHarness.with({ ancestor: `[data-cell-index="${index}"]` }))();
  }

  /**
   * The grid's single tab stop, as `"<day>:<minutes>"`.
   *
   * The cursor roves rather than every cell being tabbable, and it is RAW — it
   * survives a view switch, so the same pair means a different cell in a month grid
   * and a week one.
   */
  async getCursor(): Promise<string | null> {
    for (const cell of await this.locatorForAll('.wr-event-calendar__cell')()) {
      if ((await cell.getAttribute('tabindex')) === '0') return cell.getAttribute('data-cell-index');
    }
    return null;
  }

  /** Move keyboard focus to a cell, which is also what moves the roving cursor onto it. */
  async focusCell(day: Date, minutes = -1): Promise<void> {
    await (await this.requireCell(day, minutes, 'focusCell')).focus();
  }

  /**
   * Press an arrow on the cell that currently holds the cursor.
   *
   * Sent to that cell rather than to the grid, because the component listens per cell
   * — the element carrying the keyboard should be the one that holds focus — and
   * anything originating inside a chip is deliberately let through untouched.
   */
  async pressArrow(arrow: WrEventCalendarArrowKey): Promise<void> {
    await (await this.cursorCell('pressArrow')).sendKeys(ARROWS[arrow]);
  }

  /** Press Home on the cursor cell — the first day of its week. */
  async pressHome(): Promise<void> {
    await (await this.cursorCell('pressHome')).sendKeys(TestKey.HOME);
  }

  /** Press End on the cursor cell — the last day of its week. */
  async pressEnd(): Promise<void> {
    await (await this.cursorCell('pressEnd')).sendKeys(TestKey.END);
  }

  private async step(direction: 'prev' | 'next'): Promise<WrButtonHarness> {
    return this.locatorFor(WrButtonHarness.with({ selector: `.wr-event-calendar__step--${direction}` }))();
  }

  private async stepElement(direction: 'prev' | 'next'): Promise<TestElement> {
    return this.locatorFor(`.wr-event-calendar__step--${direction}`)();
  }

  private async headerButton(selector: string, method: string): Promise<WrButtonHarness> {
    const button = await this.locatorForOptional(WrButtonHarness.with({ selector }))();
    if (!button) {
      throw new Error(
        `WrEventCalendarHarness.${method}(): there is no header — this calendar was opened with ` +
          '`hideHeader`, so its navigation belongs to the page around it.'
      );
    }
    return button;
  }

  /**
   * The stamp a cell publishes for a day — local midnight, which is what the
   * component's own `startOfDay` produces. Taking a `Date` and normalising here keeps
   * the timestamp out of every spec.
   */
  private stamp(day: Date): number {
    return new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  }

  private async requireCell(day: Date, minutes: number, method: string): Promise<TestElement> {
    const stamp = this.stamp(day);
    const cell = await this.locatorForOptional(`[data-cell-date="${stamp}"][data-cell-minutes="${minutes}"]`)();

    if (!cell) {
      throw new Error(
        `WrEventCalendarHarness.${method}(${day.toDateString()}, ${minutes}): no such cell in the ` +
          `${await this.getView()} view — it is not on screen, or \`minutes\` names no row. Pass -1 for a ` +
          'month cell or the all-day band.'
      );
    }
    return cell;
  }

  private async cursorCell(method: string): Promise<TestElement> {
    for (const cell of await this.locatorForAll('.wr-event-calendar__cell')()) {
      if ((await cell.getAttribute('tabindex')) === '0') return cell;
    }
    throw new Error(
      `WrEventCalendarHarness.${method}(): no cell holds the roving cursor, so there is nothing to send a key ` +
        'to. Call focusCell() first.'
    );
  }
}
