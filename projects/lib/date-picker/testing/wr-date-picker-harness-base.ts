/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, type HarnessLoader, type TestElement } from '@angular/cdk/testing';

import type { WrDatePickerDayHarnessFilters } from './interfaces';
import { WrDatePickerDayHarness } from './wr-date-picker-day-harness';
import { WrTimePanelHarness } from './wr-time-panel-harness';

/** The first element whose trimmed text is exactly `text`. */
async function byText(elements: TestElement[], text: string): Promise<TestElement | null> {
  for (const element of elements) {
    if ((await element.text()) === text) return element;
  }
  return null;
}

/**
 * Everything `<wr-date-picker>` and `<wr-date-range-picker>` do identically: the
 * trigger button, the popup it owns, and the `<wr-calendar>` inside it. Both
 * components render the SAME trigger element (`.wr-date-picker__trigger` — the
 * range picker reuses the class rather than minting its own) and both publish
 * their popup's id through the trigger's `aria-controls`, so the scoping story is
 * shared too.
 *
 * **Deliberately not exported, and `WrAnyDatePickerHarness` is what replaces it.**
 * The reason a consumer wanted this name was to write a helper taking "either
 * picker", which the union in `interfaces/` says directly and without publishing
 * anything else. Exporting the class instead would publish the `protected` members
 * below as a subclassing contract — including `timePanels()`, which hands back the
 * harness for `<wr-time-panel>`, a component this package does not ship as public
 * API. A type-only re-export is not the middle ground it looks like: the base is a
 * value in two `extends` clauses, so d.ts flattening promotes `export type` back to
 * a value export while the FESM bundle exports nothing — an import that type-checks
 * and is `undefined` at runtime.
 *
 * @internal
 */
export abstract class WrDatePickerHarnessBase extends ComponentHarness {
  /** Concrete class name, so errors read like the harness the caller reached for. */
  protected abstract readonly harnessName: string;

  /**
   * Whether the popup is up.
   *
   * Read from the trigger's `aria-expanded` rather than from a host class: unlike
   * `wr-select`, neither picker carries an `--open` modifier, and the ARIA state
   * is the thing a consumer's users actually get told.
   */
  async isOpen(): Promise<boolean> {
    return (await (await this.trigger()).getAttribute('aria-expanded')) === 'true';
  }

  /** Open the popup from the trigger. An already-open picker is left alone. */
  async open(): Promise<void> {
    if (await this.isOpen()) return;

    await (await this.trigger()).click();
    if (await this.isOpen()) return;

    throw new Error(
      `${this.harnessName}.open(): the trigger did not open a popup. A disabled picker refuses to open, and so ` +
        'does a readonly <wr-date-range-picker> — a readonly <wr-date-picker>, deliberately, still opens.'
    );
  }

  /**
   * Close the popup by clicking the trigger again. A closed picker is left alone.
   *
   * Deliberately not Escape: the CDK dispatches a keydown to the TOP-MOST overlay,
   * so with two pickers open this would close whichever opened last rather than
   * this one. The trigger only ever toggles its own popup.
   */
  async close(): Promise<void> {
    if (!(await this.isOpen())) return;

    await (await this.trigger()).click();
  }

  /** The popup's role — `'dialog'`, which is what the trigger's `aria-haspopup` promises. */
  async getPanelRole(): Promise<string | null> {
    return (await this.panel()).getAttribute('role');
  }

  /**
   * The popup's accessible name. Defaults to a catalog string chosen by `mode`
   * ("Choose date", "Choose time", …) and is overridden by `[panelAriaLabel]`.
   */
  async getPanelAriaLabel(): Promise<string | null> {
    return (await this.panel()).getAttribute('aria-label');
  }

  /**
   * Which of the calendar's three views is showing. The header label zooms out
   * (day → month → year); picking a month or a year zooms back in.
   */
  async getView(): Promise<'day' | 'month' | 'year'> {
    if (await this.inPanel('[role="grid"]')) return 'day';
    if (await this.inPanel('.wr-calendar__months')) return 'month';
    if (await this.inPanel('.wr-calendar__years')) return 'year';

    throw new Error(this.noCalendar('getView'));
  }

  /**
   * The calendar's header: `'January 2025'` in the day view, `'2025'` in the month
   * view, `'2016 – 2027'` in the year view.
   */
  async getPanelHeader(): Promise<string> {
    const label = await this.inPanel('.wr-calendar__label');
    if (!label) throw new Error(this.noCalendar('getPanelHeader'));

    return label.text();
  }

  /** The weekday strip, in display order — `role="columnheader"` cells of the grid's first row. */
  async getWeekdayLabels(): Promise<string[]> {
    const cells = await this.allInPanel('[role="columnheader"]');
    if (cells.length === 0) {
      throw new Error(
        `${this.harnessName}.getWeekdayLabels(): no weekday strip. Only the day view has one, and mode="time" ` +
          'has no calendar at all.'
      );
    }

    return Promise.all(cells.map(cell => cell.text()));
  }

  /**
   * Step the calendar forwards. What one step MEANS follows the active view, as
   * the button's own `aria-label` says: a month in the day view, a year in the
   * month view, twelve years in the year view.
   */
  async next(): Promise<void> {
    await this.navigate('next');
  }

  /** Step the calendar backwards — see {@link next} for what one step covers. */
  async previous(): Promise<void> {
    await this.navigate('prev');
  }

  /**
   * Zoom out one level by clicking the header, the way a user does: day → month,
   * month → year. Throws at the year view, where the header is inert.
   */
  async zoomOut(): Promise<void> {
    const label = await this.inPanel('.wr-calendar__label');
    if (!label) throw new Error(this.noCalendar('zoomOut'));

    if (await label.getProperty<boolean>('disabled')) {
      throw new Error(
        `${this.harnessName}.zoomOut(): the header is inert — the calendar is already showing the year view ` +
          '(or the whole picker is disabled), and there is nothing further to zoom out to.'
      );
    }

    await label.click();
  }

  /** Pick a month in the month view, by 0-based index or by the label the calendar renders. */
  async selectMonth(month: number | string): Promise<void> {
    const chips = await this.allInPanel('.wr-calendar__months .wr-calendar__chip');
    if (chips.length === 0) {
      throw new Error(
        `${this.harnessName}.selectMonth(): the calendar is not showing its month view — call zoomOut() first.`
      );
    }

    const chip = typeof month === 'number' ? chips[month] : await byText(chips, month);
    if (!chip) {
      throw new Error(
        `${this.harnessName}.selectMonth(${JSON.stringify(month)}): no such month. Pass a 0-based index, or the ` +
          'label the calendar renders — a short month name in the active locale.'
      );
    }

    await chip.click();
  }

  /** Pick a year in the year view. Only the twelve on show can be picked. */
  async selectYear(year: number): Promise<void> {
    const chips = await this.allInPanel('.wr-calendar__years .wr-calendar__chip');
    if (chips.length === 0) {
      throw new Error(
        `${this.harnessName}.selectYear(): the calendar is not showing its year view — call zoomOut() until ` +
          'getView() answers "year".'
      );
    }

    const chip = await byText(chips, String(year));
    if (!chip) {
      const shown = await Promise.all(chips.map(candidate => candidate.text()));
      throw new Error(
        `${this.harnessName}.selectYear(${year}): the year view is showing ${shown[0]}-${shown[shown.length - 1]} ` +
          '— call previous() / next() to move the twelve-year window first.'
      );
    }

    await chip.click();
  }

  /**
   * The day cells of the calendar in this picker's popup, in DOM order — 42 of
   * them, since the grid is always six weeks and pads into the neighbouring
   * months.
   */
  async getDays(filters: WrDatePickerDayHarnessFilters = {}): Promise<WrDatePickerDayHarness[]> {
    await this.requireGrid('getDays');

    return (await this.panelLoader()).getAllHarnesses(WrDatePickerDayHarness.with(filters));
  }

  /**
   * One day of the month on show. The padding days of the neighbouring months are
   * skipped, so `getDay(1)` is the 1st of THIS month and never the 1st of the next.
   */
  async getDay(dayOfMonth: number): Promise<WrDatePickerDayHarness> {
    const cells = await this.getDays({ text: String(dayOfMonth) });
    for (const cell of cells) {
      if (!(await cell.isOutOfMonth())) return cell;
    }

    throw new Error(
      `${this.harnessName}.getDay(${dayOfMonth}): the month on show (${await this.getPanelHeader()}) has no such ` +
        'day. Cells belonging to the neighbouring months are deliberately not matched — call previous() / next() ' +
        'to change month.'
    );
  }

  /** Click a day of the month on show. */
  async selectDay(dayOfMonth: number): Promise<void> {
    const cell = await this.getDay(dayOfMonth);
    if (await cell.isDisabled()) {
      throw new Error(
        `${this.harnessName}.selectDay(${dayOfMonth}): that day is disabled — min / max or dateFilter rules it ` +
          'out, and a disabled cell swallows the click rather than picking anything.'
      );
    }

    await cell.click();
  }

  /** The trigger button. Both components render it with the same class. */
  protected async trigger(): Promise<TestElement> {
    return this.locatorFor('.wr-date-picker__trigger')();
  }

  /**
   * The id of THIS picker's popup.
   *
   * The trigger publishes it as `aria-controls` only while the popup is up, which
   * makes one lookup answer both questions — is it open, and which of the panes
   * in the shared overlay container is ours.
   */
  protected async panelId(): Promise<string> {
    const id = await (await this.trigger()).getAttribute('aria-controls');
    if (!id) {
      throw new Error(
        `${this.harnessName}: the popup is closed — call open() first. The trigger only publishes aria-controls ` +
          'while its popup is up.'
      );
    }

    return id;
  }

  /** A loader scoped to THIS picker's popup, so a second open picker cannot answer for it. */
  protected async panelLoader(): Promise<HarnessLoader> {
    return this.documentRootLocatorFactory().harnessLoaderFor(`#${await this.panelId()}`);
  }

  /** One element inside THIS picker's popup, or `null`. */
  protected async inPanel(selector: string): Promise<TestElement | null> {
    return this.documentRootLocatorFactory().locatorForOptional(`#${await this.panelId()} ${selector}`)();
  }

  /** Every matching element inside THIS picker's popup, in DOM order. */
  protected async allInPanel(selector: string): Promise<TestElement[]> {
    return this.documentRootLocatorFactory().locatorForAll(`#${await this.panelId()} ${selector}`)();
  }

  /**
   * The time steppers in this popup, in DOM order — none in `date` mode, one for
   * `time` / `datetime`, and two (start then end) for a datetime range.
   */
  protected async timePanels(): Promise<WrTimePanelHarness[]> {
    return (await this.panelLoader()).getAllHarnesses(WrTimePanelHarness);
  }

  private async navigate(direction: 'prev' | 'next'): Promise<void> {
    const button = await this.inPanel(`.wr-calendar__nav--${direction}`);
    if (!button) throw new Error(this.noCalendar(direction === 'next' ? 'next' : 'previous'));

    await button.click();
  }

  /** Fail early on the day-cell methods rather than answering with an empty list. */
  private async requireGrid(method: string): Promise<void> {
    if (await this.inPanel('[role="grid"]')) return;

    throw new Error(
      `${this.harnessName}.${method}(): this popup has no day grid. mode="time" renders a time stepper only, and a ` +
        'calendar zoomed out to its month / year view offers chips instead of day cells — selectMonth() / ' +
        'selectYear() come back to the days.'
    );
  }

  private async panel(): Promise<TestElement> {
    return this.documentRootLocatorFactory().locatorFor(`#${await this.panelId()}`)();
  }

  private noCalendar(method: string): string {
    return `${this.harnessName}.${method}(): this popup has no calendar — mode="time" renders a time stepper only.`;
  }
}
