/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, TestKey, type TestElement } from '@angular/cdk/testing';

import type { WrCalendarMode } from 'ngwr/calendar';

import type {
  WrCalendarChip,
  WrCalendarDayHarnessFilters,
  WrCalendarHarnessFilters,
  WrCalendarView,
} from './interfaces';
import { WrCalendarDayHarness } from './wr-calendar-day-harness';

/** The arrow keys, by the direction a user would say out loud. */
type Arrow = 'left' | 'right' | 'up' | 'down';

const ARROWS: Record<Arrow, TestKey> = {
  left: TestKey.LEFT_ARROW,
  right: TestKey.RIGHT_ARROW,
  up: TestKey.UP_ARROW,
  down: TestKey.DOWN_ARROW,
};

/**
 * Test harness for `<wr-calendar>` — the standalone month grid, and the one
 * `<wr-date-picker>` puts in an overlay.
 *
 * **It is three views behind one header.** Clicking the header label walks
 * `day → month → year`, and each view renders something different: a
 * `role="grid"` of day cells, or a `role="listbox"` of chips. Every day method
 * throws off the day view rather than answering `[]`, which would read as "this
 * month has no days".
 *
 * **The roving cell is not the selection.** The grid has one tab stop and the
 * arrows move it; it starts on the selected date, or on today when nothing is
 * picked. And it does NOT follow {@link next} / {@link previous} — a grid paged
 * away from the roving month has no active cell at all, and so no tab stop, until
 * a key or a click puts one back. That is the component's behaviour, and
 * {@link getActiveDay} is how a spec sees it.
 *
 * **Keys go to the host, not to a cell.** The component listens on its own element,
 * so {@link pressArrow} works whether or not jsdom managed to put real focus
 * anywhere — which it often does not, since the calendar moves focus in an
 * `afterNextRender` and a disabled cell cannot take it.
 *
 * @example
 * ```ts
 * const calendar = await loader.getHarness(WrCalendarHarness);
 *
 * expect(await calendar.getHeaderLabel()).toBe('March 2026');
 * await (await calendar.getDay(14)).click();
 * expect(await calendar.getSelectedDayNumbers()).toEqual([14]);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrCalendarHarness extends ComponentHarness {
  static hostSelector = 'wr-calendar';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrCalendarHarnessFilters = {}): HarnessPredicate<WrCalendarHarness> {
    return new HarnessPredicate(WrCalendarHarness, options)
      .addOption('headerLabel', options.headerLabel, (harness, label) =>
        HarnessPredicate.stringMatches(harness.getHeaderLabel(), label)
      )
      .addOption('mode', options.mode, async (harness, mode) => (await harness.getMode()) === mode)
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled);
  }

  private readonly header = this.locatorFor('.wr-calendar__label');
  private readonly prevButton = this.locatorFor('.wr-calendar__nav--prev');
  private readonly nextButton = this.locatorFor('.wr-calendar__nav--next');

  /** Which sub-view is showing. */
  async getView(): Promise<WrCalendarView> {
    if ((await this.locatorForOptional('.wr-calendar__months')()) !== null) return 'month';
    if ((await this.locatorForOptional('.wr-calendar__years')()) !== null) return 'year';
    return 'day';
  }

  /** Single- or range-selection, from the host modifier. */
  async getMode(): Promise<WrCalendarMode> {
    return (await (await this.host()).hasClass('wr-calendar--range')) ? 'range' : 'single';
  }

  /** Whether the whole calendar refuses interaction. */
  async isDisabled(): Promise<boolean> {
    return (await this.host()).hasClass('wr-calendar--disabled');
  }

  /** The header text — `March 2026`, `2026`, or `2016 – 2027` depending on the view. */
  async getHeaderLabel(): Promise<string> {
    return (await this.header()).text();
  }

  /**
   * Click the header — stepping `day → month → year`.
   *
   * The year view is the end of the walk: the header is disabled there, so this
   * throws rather than clicking a button the DOM would ignore.
   */
  async clickHeader(): Promise<void> {
    const header = await this.header();
    if (await header.getProperty<boolean>('disabled')) {
      throw new Error(
        `WrCalendarHarness.clickHeader(): the header is disabled — the calendar is on the ` +
          `${await this.getView()} view, which is where the walk stops (or the whole calendar is disabled).`
      );
    }
    await header.click();
  }

  /**
   * Step back — a month, a year or twelve years, depending on the view.
   *
   * The roving day cell does NOT come along: paging is a view change, not a
   * navigation, and the tab stop stays on the month it was in.
   */
  async previous(): Promise<void> {
    await (await this.prevButton()).click();
  }

  /** Step forward — a month, a year or twelve years, depending on the view. */
  async next(): Promise<void> {
    await (await this.nextButton()).click();
  }

  /**
   * The back arrow's accessible name, which changes with the view — the arrows are
   * icon-only, so this is the only name they have.
   */
  async getPreviousLabel(): Promise<string | null> {
    return (await this.prevButton()).getAttribute('aria-label');
  }

  /** The forward arrow's accessible name. */
  async getNextLabel(): Promise<string | null> {
    return (await this.nextButton()).getAttribute('aria-label');
  }

  /** The weekday column headers, in the order the adapter's first day of week puts them. */
  async getWeekdayNames(): Promise<string[]> {
    await this.requireView('day', 'getWeekdayNames');
    const names = await this.locatorForAll('.wr-calendar__weekday')();
    return Promise.all(names.map(name => name.text()));
  }

  /**
   * Every day cell, in DOM order — 42 of them, since the grid is always six weeks.
   *
   * That includes the spill days of the neighbouring months, which are selectable
   * and not "in" the month; {@link getDay} skips them, and
   * `WrCalendarDayHarness.isOutOfMonth()` tells them apart.
   */
  async getDays(filters: WrCalendarDayHarnessFilters = {}): Promise<WrCalendarDayHarness[]> {
    await this.requireView('day', 'getDays');
    return this.locatorForAll(WrCalendarDayHarness.with(filters))();
  }

  /**
   * The cell for a day of THIS month.
   *
   * The number alone is ambiguous — a 42-cell grid shows most numbers twice — so
   * the spill days are skipped rather than matched, which is what "the 3rd" means
   * to someone reading the calendar.
   */
  async getDay(dayOfMonth: number): Promise<WrCalendarDayHarness> {
    for (const day of await this.getDays({ text: String(dayOfMonth) })) {
      if (!(await day.isOutOfMonth())) return day;
    }
    throw new Error(
      `WrCalendarHarness.getDay(${dayOfMonth}): no such day in ${await this.getHeaderLabel()}. Only cells of ` +
        'the displayed month count — the grid spills into its neighbours, and those are skipped.'
    );
  }

  /** The day numbers currently selected — one in single mode, both ends in range mode. */
  async getSelectedDayNumbers(): Promise<number[]> {
    const selected = await this.getDays({ selected: true });
    return Promise.all(selected.map(day => day.getDayOfMonth()));
  }

  /** The day numbers strictly inside a picked range — never the ends. */
  async getInRangeDayNumbers(): Promise<number[]> {
    const inRange = await this.getDays({ inRange: true });
    return Promise.all(inRange.map(day => day.getDayOfMonth()));
  }

  /**
   * The day number holding the roving tab stop, or `null` when the grid has none.
   *
   * `null` is a real answer, not a failure: paging with {@link next} leaves the
   * roving date behind in another month, and the grid then has no `tabindex="0"`
   * at all until a key or a click puts one back.
   */
  async getActiveDayNumber(): Promise<number | null> {
    for (const day of await this.getDays()) {
      if (await day.isActive()) return day.getDayOfMonth();
    }
    return null;
  }

  /** The month chips, with their state. Throws off the month view. */
  async getMonths(): Promise<WrCalendarChip[]> {
    await this.requireView('month', 'getMonths');
    return this.readChips();
  }

  /** The year chips, with their state. Throws off the year view. */
  async getYears(): Promise<WrCalendarChip[]> {
    await this.requireView('year', 'getYears');
    return this.readChips();
  }

  /**
   * Click a month or year chip by its printed label — which drops the calendar back
   * one view, the way clicking the header climbed up.
   *
   * Throws on the day view, where there are no chips, and on a label the view does
   * not offer, naming what it does.
   */
  async selectChip(label: string): Promise<void> {
    const view = await this.getView();
    if (view === 'day') {
      throw new Error(
        'WrCalendarHarness.selectChip(): the calendar is on the day view, which has no chips. Click the ' +
          'header first — it walks day → month → year.'
      );
    }

    for (const chip of await this.locatorForAll('.wr-calendar__chip')()) {
      if ((await chip.text()) === label) {
        await chip.click();
        return;
      }
    }

    const offered = (await this.readChips()).map(chip => chip.label);
    throw new Error(`WrCalendarHarness.selectChip("${label}"): the ${view} view offers: ${offered.join(', ')}.`);
  }

  /**
   * Press an arrow key — one day left or right, one WEEK up or down.
   *
   * Sent to the host, where the component listens, so this does not depend on jsdom
   * having managed to focus a cell. Under `dir="rtl"` the horizontal pair mirrors:
   * ArrowRight goes back a day, because the grid itself is mirrored.
   */
  async pressArrow(arrow: Arrow): Promise<void> {
    await (await this.host()).sendKeys(ARROWS[arrow]);
  }

  /** Press Home — the first day of the roving cell's week, not of the month. */
  async pressHome(): Promise<void> {
    await (await this.host()).sendKeys(TestKey.HOME);
  }

  /** Press End — the last day of the roving cell's week. */
  async pressEnd(): Promise<void> {
    await (await this.host()).sendKeys(TestKey.END);
  }

  /** Press PageUp — a month back, or a YEAR back with `shift`. */
  async pressPageUp(options: { shift?: boolean } = {}): Promise<void> {
    const host = await this.host();
    await (options.shift ? host.sendKeys({ shift: true }, TestKey.PAGE_UP) : host.sendKeys(TestKey.PAGE_UP));
  }

  /** Press PageDown — a month on, or a YEAR on with `shift`. */
  async pressPageDown(options: { shift?: boolean } = {}): Promise<void> {
    const host = await this.host();
    await (options.shift ? host.sendKeys({ shift: true }, TestKey.PAGE_DOWN) : host.sendKeys(TestKey.PAGE_DOWN));
  }

  /** Press Enter — picking the roving day, exactly as clicking it would. */
  async pressEnter(): Promise<void> {
    await (await this.host()).sendKeys(TestKey.ENTER);
  }

  /**
   * The role of the element that owns the day rows.
   *
   * Worth asserting rather than assuming: the grid is NOT the host. The host also
   * holds the nav header, and a `role="grid"` may only own rows — so the role sits
   * on the body, and the weekday strip is a row inside it rather than a sibling.
   */
  async getGridRole(): Promise<string | null> {
    const body = await this.locatorForOptional('.wr-calendar__body')();
    return body ? body.getAttribute('role') : null;
  }

  /** How many week rows the grid renders — always six, which is what keeps it from reflowing. */
  async getWeekCount(): Promise<number> {
    await this.requireView('day', 'getWeekCount');
    return (await this.locatorForAll('.wr-calendar__week')()).length;
  }

  private async readChips(): Promise<WrCalendarChip[]> {
    const chips = await this.locatorForAll('.wr-calendar__chip')();

    return Promise.all(
      chips.map(async (chip: TestElement) => ({
        label: await chip.text(),
        selected: (await chip.getAttribute('aria-selected')) === 'true',
        current: await chip.hasClass('wr-calendar__chip--current'),
        disabled: (await chip.getAttribute('aria-disabled')) === 'true',
      }))
    );
  }

  private async requireView(view: WrCalendarView, method: string): Promise<void> {
    const current = await this.getView();
    if (current === view) return;

    throw new Error(
      `WrCalendarHarness.${method}(): the calendar is showing the ${current} view, not the ${view} one — those ` +
        'elements are not rendered at all. The header walks day → month → year; clicking a chip walks back down.'
    );
  }
}
