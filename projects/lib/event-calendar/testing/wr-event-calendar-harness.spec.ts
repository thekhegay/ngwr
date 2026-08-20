import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrDateFnsAdapter } from 'ngwr/date/adapters/fns';
import {
  WrEventCalendar,
  type WrCalendarEvent,
  type WrCalendarEventChange,
  type WrCalendarSlot,
  type WrCalendarView,
} from 'ngwr/event-calendar';
import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrEventCalendarHarness } from './wr-event-calendar-harness';

const AT = (day: number, hour = 9, minute = 0): Date => new Date(2026, 0, day, hour, minute);

const EVENTS: readonly WrCalendarEvent[] = [
  { id: 'standup', title: 'Standup', start: AT(14, 9), end: AT(14, 9, 30) },
  { id: 'review', title: 'Review', start: AT(14, 14), end: AT(14, 15) },
  { id: 'offsite', title: 'Offsite', start: AT(20, 10), end: AT(20, 12) },
];

@Component({
  imports: [WrEventCalendar],
  template: `
    <wr-event-calendar
      [editable]="editable()"
      [events]="events()"
      [(view)]="view"
      [(date)]="date"
      [views]="views()"
      [hideHeader]="hideHeader()"
      (eventClick)="clicked.set($event)"
      (slotClick)="slot.set($event)"
      (eventChange)="changed.set($event)"
    />
  `,
})
class Host {
  readonly editable = signal(true);
  readonly events = signal<readonly WrCalendarEvent[]>(EVENTS);
  readonly view = signal<WrCalendarView>('month');
  readonly date = signal(AT(14));
  readonly views = signal<readonly WrCalendarView[]>(['month', 'week', 'day']);
  readonly hideHeader = signal(false);
  readonly clicked = signal<WrCalendarEvent | null>(null);
  readonly slot = signal<WrCalendarSlot | null>(null);
  readonly changed = signal<WrCalendarEventChange | null>(null);
}

/**
 * Used as a consumer would. The two rules that shape every assertion: a chip lives in
 * the cell where its event STARTS and reaches out from there, and the calendar never
 * mutates `events` — a gesture emits `eventChange` and this host does not apply it,
 * so every move here is deliberately a cancelled one.
 */
describe('WrEventCalendarHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const calendar = (): Promise<WrEventCalendarHarness> => loader.getHarness(WrEventCalendarHarness);

  const mount = (providers: unknown[] = []): void => {
    // A chip's `pointerdown` hit-tests with `document.elementFromPoint`, which jsdom
    // does not implement — and the CDK's `click()` dispatches a full pointer sequence,
    // so every chip click would throw out of the listener. Stubbing it is the price of
    // driving a component whose drag is real; `null` is the honest answer, since
    // nothing has a box to be found at.
    document.elementFromPoint = (): Element | null => null;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrDateFnsAdapter(), ...(providers as never[])] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  };

  beforeEach(() => mount());

  afterEach(() => fixture.destroy());

  it('reads the view off the grid rather than off the input', async () => {
    const harness = await calendar();
    expect(await harness.getView()).toBe('month');

    fixture.componentInstance.view.set('week');
    await fixture.whenStable();
    expect(await harness.getView()).toBe('week');

    // Week and day share one grid shape and differ by their column count.
    fixture.componentInstance.view.set('day');
    await fixture.whenStable();
    expect(await harness.getView()).toBe('day');
  });

  it('reads the header, and names the grid', async () => {
    const harness = await calendar();

    expect(await harness.hasHeader()).toBe(true);
    expect(await harness.getTitle()).toBe('January 2026');
    expect(await harness.getAccessibleName()).toBe('Calendar');
    expect(await harness.getTodayLabel()).toBe('Today');
    expect([await harness.getPreviousLabel(), await harness.getNextLabel()]).toEqual(['Previous', 'Next']);
  });

  it('steps the period and comes back to today', async () => {
    const harness = await calendar();

    await harness.next();
    expect(await harness.getTitle()).toBe('February 2026');

    await harness.previous();
    await harness.previous();
    expect(await harness.getTitle()).toBe('December 2025');

    await harness.goToday();
    expect(fixture.componentInstance.date().getMonth()).toBe(new Date().getMonth());
  });

  it('switches view through the switcher, by the label it prints', async () => {
    const harness = await calendar();

    expect(await harness.getViewLabels()).toEqual(['Month', 'Week', 'Day']);
    expect(await harness.getActiveViewLabel()).toBe('Month');

    await harness.setView('Week');

    expect([await harness.getView(), await harness.getActiveViewLabel()]).toEqual(['week', 'Week']);
    await expect(harness.setView('Agenda')).rejects.toThrow(/Month, Week, Day/);
  });

  it('drops the switcher when there is only one view to offer', async () => {
    fixture.componentInstance.views.set(['month']);
    await fixture.whenStable();

    const harness = await calendar();
    expect([await harness.getViewLabels(), await harness.getActiveViewLabel()]).toEqual([[], null]);
  });

  it('says so when the header was hidden', async () => {
    fixture.componentInstance.hideHeader.set(true);
    await fixture.whenStable();

    const harness = await calendar();
    expect(await harness.hasHeader()).toBe(false);
    await expect(harness.goToday()).rejects.toThrow(/hideHeader/);
  });

  it('translates the header from the catalog', async () => {
    mount([provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }), provideWrI18nStaticLoader({ ru: wrRu })]);

    const harness = await calendar();
    expect(await harness.getTodayLabel()).toBe('Сегодня');
    expect(await harness.getViewLabels()).toEqual(['Месяц', 'Неделя', 'День']);
  });

  it('lays out a month as six weeks of day numbers', async () => {
    const harness = await calendar();

    expect(await harness.getWeekdayNames()).toHaveLength(7);
    expect(await harness.getDayNumbers()).toHaveLength(42);
  });

  it('puts each chip in the cell its event starts in', async () => {
    const harness = await calendar();

    expect(await harness.getChips()).toHaveLength(3);

    const onThe14th = await harness.getCellChips(AT(14));
    expect(await Promise.all(onThe14th.map(chip => chip.getTitle()))).toEqual(['Standup', 'Review']);

    const onThe20th = await harness.getCellChips(AT(20));
    expect(await Promise.all(onThe20th.map(chip => chip.getTitle()))).toEqual(['Offsite']);
  });

  it('announces a chip with its time and title, while the drawn text is hidden', async () => {
    const harness = await calendar();
    const [standup] = await harness.getChips({ title: 'Standup' });

    expect(await standup.getLabel()).toContain('Standup');
    expect(await standup.getTitle()).toBe('Standup');
    // Month chips are bands: one shape covers a month cell and the all-day row.
    expect(await standup.isBand()).toBe(true);
  });

  it('emits the event a chip click names, and does not reach the cell under it', async () => {
    const harness = await calendar();
    const [review] = await harness.getChips({ title: 'Review' });

    await review.click();

    expect(fixture.componentInstance.clicked()?.id).toBe('review');
    expect(fixture.componentInstance.slot()).toBeNull();
  });

  it('emits a slot from a click on the cell itself', async () => {
    const harness = await calendar();

    await harness.clickCell(AT(16));

    expect(fixture.componentInstance.slot()?.start.getDate()).toBe(16);
  });

  it('names a cell for the date it holds, and refuses one that is not on screen', async () => {
    const harness = await calendar();

    expect(await harness.getCellLabel(AT(14))).toContain('14');
    await expect(harness.clickCell(new Date(2027, 5, 1))).rejects.toThrow(/no such cell/);
  });

  it('moves an event with Alt and an arrow, and only emits it', async () => {
    const harness = await calendar();
    const [standup] = await harness.getChips({ title: 'Standup' });

    await standup.move('right');

    const change = fixture.componentInstance.changed();
    expect([change?.kind, change?.start.getDate()]).toEqual(['move', 15]);
    // `events` is an input the calendar never writes to: the host has to apply this.
    expect(fixture.componentInstance.events()[0].start.getDate()).toBe(14);
  });

  it('resizes with Alt and Shift, moving the end alone', async () => {
    const harness = await calendar();
    const [offsite] = await harness.getChips({ title: 'Offsite' });

    await offsite.resize('right');

    const change = fixture.componentInstance.changed();
    expect(change?.kind).toBe('resize');
    expect(change?.start).toEqual(AT(20, 10));
    expect(change?.end.getDate()).toBe(21);
  });

  it('refuses a resize that would end at or before the start', async () => {
    const harness = await calendar();
    const [standup] = await harness.getChips({ title: 'Standup' });

    // Half an hour long, and a left press takes a whole day off the end.
    await standup.resize('left');

    expect(fixture.componentInstance.changed()).toBeNull();
  });

  it('ignores both gestures on a calendar that is not editable', async () => {
    fixture.componentInstance.editable.set(false);
    await fixture.whenStable();

    const harness = await calendar();
    const [standup] = await harness.getChips({ title: 'Standup' });

    await standup.move('right');
    await standup.resize('right');

    expect(fixture.componentInstance.changed()).toBeNull();
  });

  it('keeps exactly one tab stop, and the arrows move it', async () => {
    const harness = await calendar();

    // The cursor exists from the start — a grid with no tab stop cannot be reached at
    // all — so this is about where it MOVES, not whether it appears.
    const before = await harness.getCursor();
    expect(before).not.toBeNull();

    await harness.focusCell(AT(14));
    await harness.pressArrow('right');

    expect(await harness.getCursor()).not.toBe(before);
  });

  it('reads the time views by their gutter and their columns', async () => {
    fixture.componentInstance.view.set('day');
    await fixture.whenStable();

    const harness = await calendar();

    expect(await harness.getView()).toBe('day');
    expect((await harness.getSlotLabels()).length).toBeGreaterThan(1);
    // The 14th is a work day with two timed events, and neither is all-day.
    expect(await harness.hasAllDayRow()).toBe(false);
    expect(await harness.getChips()).toHaveLength(2);
  });

  it('reads a timed chip as timed, with its printed time', async () => {
    fixture.componentInstance.view.set('day');
    await fixture.whenStable();

    const harness = await calendar();
    const [standup] = await harness.getChips({ title: 'Standup' });

    expect(await standup.isBand()).toBe(false);
    expect(await standup.getTime()).not.toBeNull();
    expect(await standup.hasResizeHandle()).toBe(true);
  });

  it('draws the all-day band only when something needs it', async () => {
    fixture.componentInstance.events.set([
      { id: 'holiday', title: 'Holiday', start: AT(14), end: AT(14), allDay: true },
    ]);
    fixture.componentInstance.view.set('day');
    await fixture.whenStable();

    const harness = await calendar();
    expect(await harness.hasAllDayRow()).toBe(true);
  });

  it('hides what a month cell cannot show behind a +N more button', async () => {
    fixture.componentInstance.events.set(
      Array.from({ length: 6 }, (_, i) => ({
        id: `e${i}`,
        title: `Event ${i}`,
        start: AT(14, 9 + i),
        end: AT(14, 10 + i),
      }))
    );
    await fixture.whenStable();

    const harness = await calendar();
    const overflow = await harness.getOverflowLabels();

    expect(overflow).toHaveLength(1);
    expect(overflow[0]).toContain('more');

    await harness.openOverflow();
    expect(await harness.getView()).toBe('day');
  });

  it('says nothing is overflowing when nothing is', async () => {
    const harness = await calendar();
    expect(await harness.getOverflowLabels()).toEqual([]);
    await expect(harness.openOverflow()).rejects.toThrow(/no cell is overflowing/);
  });

  it('matches on the title and the view', async () => {
    expect(await loader.getHarnessOrNull(WrEventCalendarHarness.with({ view: 'month' }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrEventCalendarHarness.with({ view: 'week' }))).toBeNull();
    expect(await loader.getHarnessOrNull(WrEventCalendarHarness.with({ title: /2026$/ }))).not.toBeNull();
  });
});
