import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrCalendar, type WrCalendarMode, type WrCalendarRange } from 'ngwr/calendar';
import { provideWrDateFnsAdapter } from 'ngwr/date/adapters/fns';
import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrCalendarHarness } from './wr-calendar-harness';

@Component({
  imports: [WrCalendar],
  template: `
    <wr-calendar
      [mode]="mode()"
      [(date)]="date"
      [(range)]="range"
      [min]="min()"
      [max]="max()"
      [dateFilter]="filter()"
      [disabled]="disabled()"
    />
  `,
})
class Host {
  readonly mode = signal<WrCalendarMode>('single');
  readonly date = signal<Date | null>(new Date(2026, 2, 15));
  readonly range = signal<WrCalendarRange>([null, null]);
  readonly min = signal<Date | null>(null);
  readonly max = signal<Date | null>(null);
  readonly filter = signal<((date: Date) => boolean) | null>(null);
  readonly disabled = signal(false);
}

/**
 * Used as a consumer would. Two things shape every assertion here: the grid is
 * always six weeks, so most day numbers appear twice and the spill days have to be
 * skipped; and the calendar is three views behind one header, so the day methods
 * refuse off the day view rather than answering with an empty list.
 *
 * Keys go to the HOST. The component listens there, which also means a spec does not
 * depend on jsdom having focused a cell — the calendar moves real focus in an
 * `afterNextRender`, and a disabled button cannot take it at all.
 */
describe('WrCalendarHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const calendar = (): Promise<WrCalendarHarness> => loader.getHarness(WrCalendarHarness);

  const mount = (providers: unknown[] = []): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrDateFnsAdapter(), ...(providers as never[])] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  };

  beforeEach(() => mount());

  afterEach(() => fixture.destroy());

  it('opens on the month of the selected date', async () => {
    const harness = await calendar();

    expect(await harness.getView()).toBe('day');
    expect(await harness.getHeaderLabel()).toBe('March 2026');
    expect(await harness.getSelectedDayNumbers()).toEqual([15]);
  });

  it('renders six weeks and a weekday row, inside one grid', async () => {
    const harness = await calendar();

    expect(await harness.getWeekCount()).toBe(6);
    expect(await harness.getDays()).toHaveLength(42);
    expect(await harness.getWeekdayNames()).toHaveLength(7);

    // The role is on the body, not the host: the host also holds the nav header,
    // and a grid may only own rows.
    expect(await harness.getGridRole()).toBe('grid');
  });

  it('addresses a day of THIS month, skipping the spill days', async () => {
    const harness = await calendar();

    // March 2026 starts on a Sunday, so the grid's first cell is the 1st of March
    // and its last row spills into April — where a "3" also appears.
    const third = await harness.getDay(3);
    expect([await third.getText(), await third.isOutOfMonth()]).toEqual(['3', false]);

    const allThirds = await harness.getDays({ text: '3' });
    expect(allThirds.length).toBeGreaterThan(1);
  });

  it('picks a day and writes it back through the two-way binding', async () => {
    const harness = await calendar();

    await (await harness.getDay(20)).click();

    expect(await harness.getSelectedDayNumbers()).toEqual([20]);
    expect(fixture.componentInstance.date()?.getDate()).toBe(20);
  });

  it('reads a range as two ends and the days between them', async () => {
    fixture.componentInstance.mode.set('range');
    fixture.componentInstance.date.set(null);
    fixture.componentInstance.range.set([new Date(2026, 2, 10), new Date(2026, 2, 14)]);
    await fixture.whenStable();

    const harness = await calendar();

    expect(await harness.getMode()).toBe('range');
    expect(await harness.getSelectedDayNumbers()).toEqual([10, 14]);
    expect(await harness.getInRangeDayNumbers()).toEqual([11, 12, 13]);
  });

  it('pages the month, and leaves the roving cell behind', async () => {
    const harness = await calendar();
    expect(await harness.getActiveDayNumber()).toBe(15);

    await harness.next();

    expect(await harness.getHeaderLabel()).toBe('April 2026');
    // Paging is a view change rather than a navigation, so the ring stays in March
    // — and this grid has no tab stop at all until a key or a click puts one back.
    expect(await harness.getActiveDayNumber()).toBeNull();

    await harness.previous();
    expect(await harness.getHeaderLabel()).toBe('March 2026');
  });

  it('names the arrows for what they do in the current view', async () => {
    const harness = await calendar();
    expect([await harness.getPreviousLabel(), await harness.getNextLabel()]).toEqual(['Previous month', 'Next month']);

    await harness.clickHeader();
    expect([await harness.getPreviousLabel(), await harness.getNextLabel()]).toEqual(['Previous year', 'Next year']);

    await harness.clickHeader();
    expect([await harness.getPreviousLabel(), await harness.getNextLabel()]).toEqual([
      'Previous 12 years',
      'Next 12 years',
    ]);
  });

  it('translates those names from the catalog', async () => {
    mount([provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }), provideWrI18nStaticLoader({ ru: wrRu })]);

    const harness = await calendar();
    expect(await harness.getPreviousLabel()).toBe('Предыдущий месяц');

    await harness.clickHeader();
    await harness.clickHeader();
    expect(await harness.getNextLabel()).toBe('Следующие 12 лет');
  });

  it('walks day → month → year, and stops there', async () => {
    const harness = await calendar();

    await harness.clickHeader();
    expect([await harness.getView(), await harness.getHeaderLabel()]).toEqual(['month', '2026']);

    await harness.clickHeader();
    expect(await harness.getView()).toBe('year');

    await expect(harness.clickHeader()).rejects.toThrow(/year view/);
  });

  it('refuses day questions off the day view', async () => {
    const harness = await calendar();
    await harness.clickHeader();

    await expect(harness.getDays()).rejects.toThrow(/month view/);
    await expect(harness.getWeekdayNames()).rejects.toThrow(/month view/);
    await expect(harness.getWeekCount()).rejects.toThrow(/month view/);
  });

  it('reads the month chips and walks back down through one', async () => {
    const harness = await calendar();
    await harness.clickHeader();

    const months = await harness.getMonths();
    expect(months).toHaveLength(12);
    expect(months.filter(month => month.selected).map(month => month.label)).toEqual(['Mar']);

    await harness.selectChip('Jun');

    expect([await harness.getView(), await harness.getHeaderLabel()]).toEqual(['day', 'June 2026']);
  });

  it('reads the year chips as a twelve-year page', async () => {
    const harness = await calendar();
    await harness.clickHeader();
    await harness.clickHeader();

    const years = await harness.getYears();
    expect(years).toHaveLength(12);
    expect(years.filter(year => year.selected).map(year => year.label)).toEqual(['2026']);

    await harness.selectChip('2027');
    expect([await harness.getView(), await harness.getHeaderLabel()]).toEqual(['month', '2027']);
  });

  it('names what a view offers when a chip is not there', async () => {
    const harness = await calendar();

    await expect(harness.selectChip('Jun')).rejects.toThrow(/day view/);

    await harness.clickHeader();
    await expect(harness.selectChip('Smarch')).rejects.toThrow(/Jan, Feb, Mar/);
  });

  it('moves the ring with the arrows, a day and a week at a time', async () => {
    const harness = await calendar();

    await harness.pressArrow('right');
    expect(await harness.getActiveDayNumber()).toBe(16);

    await harness.pressArrow('down');
    expect(await harness.getActiveDayNumber()).toBe(23);

    await harness.pressArrow('up');
    await harness.pressArrow('left');
    expect(await harness.getActiveDayNumber()).toBe(15);
  });

  it('moves the ring to the ends of its WEEK with Home and End', async () => {
    const harness = await calendar();

    // The 15th of March 2026 is a Sunday, which is where the week starts here.
    await harness.pressEnd();
    expect(await harness.getActiveDayNumber()).toBe(21);

    await harness.pressHome();
    expect(await harness.getActiveDayNumber()).toBe(15);
  });

  it('pages the ring by month and by year', async () => {
    const harness = await calendar();

    await harness.pressPageDown();
    expect(await harness.getHeaderLabel()).toBe('April 2026');

    await harness.pressPageUp({ shift: true });
    expect(await harness.getHeaderLabel()).toBe('April 2025');
  });

  it('picks the roving day with Enter', async () => {
    const harness = await calendar();

    await harness.pressArrow('right');
    await harness.pressEnter();

    expect(fixture.componentInstance.date()?.getDate()).toBe(16);
  });

  it('steps the ring ACROSS a closed-off day rather than onto it', async () => {
    // Weekends off: the ring must keep going in the direction it was travelling,
    // because the roving cell is the grid's only tab stop and a disabled one takes
    // the whole calendar out of the tab order.
    fixture.componentInstance.date.set(new Date(2026, 2, 16)); // a Monday
    fixture.componentInstance.filter.set(date => date.getDay() !== 0 && date.getDay() !== 6);
    await fixture.whenStable();

    const harness = await calendar();
    await harness.pressArrow('left');

    expect(await harness.getActiveDayNumber()).toBe(13);
  });

  it('reports a disabled calendar, and one that ignores its own keys', async () => {
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    const harness = await calendar();

    expect(await harness.isDisabled()).toBe(true);
    await expect(harness.clickHeader()).rejects.toThrow(/disabled/);

    await harness.pressArrow('right');
    expect(await harness.getActiveDayNumber()).toBe(15);
  });

  it('marks the days min and max ruled out', async () => {
    fixture.componentInstance.min.set(new Date(2026, 2, 10));
    fixture.componentInstance.max.set(new Date(2026, 2, 20));
    await fixture.whenStable();

    const harness = await calendar();

    expect(await (await harness.getDay(9)).isDisabled()).toBe(true);
    expect(await (await harness.getDay(10)).isDisabled()).toBe(false);
    expect(await (await harness.getDay(21)).isDisabled()).toBe(true);
  });

  it('matches on the header, the mode and the disabled state', async () => {
    expect(await loader.getHarnessOrNull(WrCalendarHarness.with({ headerLabel: 'March 2026' }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrCalendarHarness.with({ headerLabel: /2026$/ }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrCalendarHarness.with({ mode: 'single' }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrCalendarHarness.with({ mode: 'range' }))).toBeNull();
    expect(await loader.getHarnessOrNull(WrCalendarHarness.with({ disabled: true }))).toBeNull();
  });
});
