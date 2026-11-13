import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, describe, expect, it } from 'vitest';

import { WrEventCalendar } from './event-calendar';
import type { WrCalendarEvent } from './types';

type Labels = Partial<
  Record<
    | 'todayLabel'
    | 'previousLabel'
    | 'nextLabel'
    | 'allDayLabel'
    | 'timeLabel'
    | 'monthLabel'
    | 'weekLabel'
    | 'dayLabel',
    string
  >
>;

const CUSTOM: Labels = {
  todayLabel: 'x-todayLabel',
  previousLabel: 'x-previousLabel',
  nextLabel: 'x-nextLabel',
  allDayLabel: 'x-allDayLabel',
  timeLabel: 'x-timeLabel',
  monthLabel: 'x-monthLabel',
  weekLabel: 'x-weekLabel',
  dayLabel: 'x-dayLabel',
};

@Component({
  imports: [WrEventCalendar],
  template: `
    <wr-event-calendar
      view="week"
      [date]="day"
      [events]="events"
      [todayLabel]="labels().todayLabel ?? null"
      [previousLabel]="labels().previousLabel ?? null"
      [nextLabel]="labels().nextLabel ?? null"
      [allDayLabel]="labels().allDayLabel ?? null"
      [timeLabel]="labels().timeLabel ?? null"
      [monthLabel]="labels().monthLabel ?? null"
      [weekLabel]="labels().weekLabel ?? null"
      [dayLabel]="labels().dayLabel ?? null"
    />
  `,
})
class Host {
  readonly labels = signal<Labels>({});
  readonly day = new Date(2026, 0, 14);
  // An all-day event, so the week view draws the band the all-day label names.
  readonly events: readonly WrCalendarEvent[] = [
    { id: 1, title: 'Offsite', start: new Date(2026, 0, 14), end: new Date(2026, 0, 15), allDay: true },
  ];
}

describe('WrEventCalendar per-instance labels', () => {
  let fixture: ComponentFixture<Host>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const mount = async (russian = false): Promise<void> => {
    TestBed.configureTestingModule({
      providers: russian
        ? [provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }), provideWrI18nStaticLoader({ ru: wrRu })]
        : [],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const set = async (labels: Labels): Promise<void> => {
    fixture.componentInstance.labels.set(labels);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  afterEach(() => TestBed.resetTestingModule());

  const q = (selector: string): HTMLElement => root().querySelector<HTMLElement>(selector)!;
  const text = (el: Element): string => el.textContent.trim();

  const read = (): Promise<Labels> => {
    const views = [...root().querySelectorAll('.wr-event-calendar__view')].map(text);
    return Promise.resolve({
      todayLabel: text(q('.wr-event-calendar__today')),
      previousLabel: q('.wr-event-calendar__step--prev').getAttribute('aria-label') ?? '',
      nextLabel: q('.wr-event-calendar__step--next').getAttribute('aria-label') ?? '',
      allDayLabel: text(q('.wr-event-calendar__row--allday [role="rowheader"]')),
      timeLabel: q('[role="columnheader"].wr-event-calendar__gutter').getAttribute('aria-label') ?? '',
      monthLabel: views[0],
      weekLabel: views[1],
      dayLabel: views[2],
    });
  };

  it('prints each input in place of its built-in string', async () => {
    await mount();
    await set(CUSTOM);

    expect(await read()).toEqual({
      todayLabel: 'x-todayLabel',
      previousLabel: 'x-previousLabel',
      nextLabel: 'x-nextLabel',
      allDayLabel: 'x-allDayLabel',
      timeLabel: 'x-timeLabel',
      monthLabel: 'x-monthLabel',
      weekLabel: 'x-weekLabel',
      dayLabel: 'x-dayLabel',
    });
  });

  it('falls back to the built-in English with every input null', async () => {
    await mount();

    expect(await read()).toEqual({
      todayLabel: 'Today',
      previousLabel: 'Previous',
      nextLabel: 'Next',
      allDayLabel: 'All day',
      timeLabel: 'Time',
      monthLabel: 'Month',
      weekLabel: 'Week',
      dayLabel: 'Day',
    });
  });

  it('keeps a registered catalog under a null input, and an input over the catalog', async () => {
    await mount(true);

    expect(await read()).toEqual({
      todayLabel: 'Сегодня',
      previousLabel: 'Назад',
      nextLabel: 'Вперёд',
      allDayLabel: 'Весь день',
      timeLabel: 'Время',
      monthLabel: 'Месяц',
      weekLabel: 'Неделя',
      dayLabel: 'День',
    });

    await set({ todayLabel: 'x-todayLabel' });

    expect(await read()).toEqual({
      todayLabel: 'x-todayLabel',
      previousLabel: 'Назад',
      nextLabel: 'Вперёд',
      allDayLabel: 'Весь день',
      timeLabel: 'Время',
      monthLabel: 'Месяц',
      weekLabel: 'Неделя',
      dayLabel: 'День',
    });
  });
});
