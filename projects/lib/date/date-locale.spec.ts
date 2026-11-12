import { Component, LOCALE_ID, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { provideWr } from 'ngwr';
import { WrCalendar } from 'ngwr/calendar';
import { WrDatePicker } from 'ngwr/date-picker';
import { WrI18n, provideWrI18n } from 'ngwr/i18n';
import { WrDate } from 'ngwr/pipes';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { wrDateLocale } from './date-locale';
import { withDates } from './with-dates';
import { WrDateAdapter } from './wr-date-adapter';

const DAY = new Date(2026, 10, 12, 13, 45);

@Component({
  imports: [WrDate, WrCalendar, WrDatePicker],
  template: `<p>{{ day | wrDate: 'd MMMM yyyy' }}</p>
    <wr-calendar [date]="day" />
    <wr-date-picker format="d MMMM yyyy" [(value)]="picked" />`,
})
class Host {
  readonly day = DAY;
  readonly picked = signal<Date | null>(DAY);
}

describe('the language dates are written in', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => TestBed.resetTestingModule());

  const i18n = (locales: readonly string[]): ReturnType<typeof provideWrI18n> =>
    provideWrI18n({ defaultLocale: locales[0], availableLocales: locales, storageKey: null });

  const adapter = (): WrDateAdapter<Date> => TestBed.inject<WrDateAdapter<Date>>(WrDateAdapter);
  const locale = (): string => TestBed.runInInjectionContext(() => wrDateLocale())();

  it('is LOCALE_ID in an app without provideWrI18n()', () => {
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'de-DE' }] });
    expect(locale()).toBe('de-DE');
    expect(adapter().format(DAY, 'd MMMM yyyy')).toBe('12 November 2026');
    expect(adapter().format(new Date(2026, 2, 12), 'd MMMM yyyy')).toBe('12 März 2026');
  });

  it('is the interface language with provideWrI18n(), and follows use()', () => {
    TestBed.configureTestingModule({ providers: [i18n(['en', 'ru', 'de'])] });
    const dates = adapter();
    expect(locale()).toBe('en');
    expect(dates.format(DAY, 'd MMMM yyyy')).toBe('12 November 2026');
    expect(dates.format(DAY, 'mediumDate')).toBe('Nov 12, 2026');
    const english = dates.displayKey();

    TestBed.inject(WrI18n).use('ru');
    expect(locale()).toBe('ru');
    expect(dates.format(DAY, 'd MMMM yyyy')).toBe('12 ноября 2026');
    expect(dates.getMonthNames('long')[10]).toBe('ноябрь');
    expect(dates.getFirstDayOfWeek()).toBe(1);
    expect(dates.displayKey()).not.toBe(english);
    // The round trip holds in the language it switched to.
    expect(dates.parse(dates.format(DAY, 'mediumDate'), 'mediumDate')?.getDate()).toBe(12);
    expect(dates.parse('12 ноября 2026', 'd MMMM yyyy')?.getMonth()).toBe(10);

    TestBed.inject(WrI18n).use('de');
    expect(dates.format(new Date(2026, 2, 12), 'd MMMM yyyy')).toBe('12 März 2026');
    expect(dates.parse('12 ноября 2026', 'd MMMM yyyy')).toBeNull();
  });

  it('follows on the zoned adapter too', () => {
    TestBed.configureTestingModule({ providers: [i18n(['en', 'ru']), provideWr(withDates({ timeZone: '+05:30' }))] });
    const zoned = adapter().zoned();
    const instant = new Date(Date.UTC(2026, 10, 12, 8, 45));
    expect(zoned.format(instant, 'd MMMM, HH:mm')).toBe('12 November, 14:15');
    TestBed.inject(WrI18n).use('ru');
    expect(zoned.format(instant, 'd MMMM, HH:mm')).toBe('12 ноября, 14:15');
  });

  it('keeps a locale pinned by withDates({ locale }) through a switch', () => {
    TestBed.configureTestingModule({
      providers: [i18n(['en', 'ru']), provideWr(withDates({ locale: 'de-DE' }))],
    });
    TestBed.inject(WrI18n).use('ru');
    expect(locale()).toBe('de-DE');
    expect(adapter().format(new Date(2026, 2, 12), 'd MMMM yyyy')).toBe('12 März 2026');
  });

  it('holds LOCALE_ID while the interface language is not a locale tag', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: LOCALE_ID, useValue: 'de-DE' }, i18n(['en', 'en_US'])],
    });
    TestBed.inject(WrI18n).use('en_US');
    expect(locale()).toBe('de-DE');
    expect(() => adapter().format(DAY, 'mediumDate')).not.toThrow();
  });

  describe('on screen', () => {
    let fixture: ComponentFixture<Host>;
    const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

    beforeEach(() => {
      TestBed.configureTestingModule({ providers: [i18n(['en', 'ru'])] });
      fixture = TestBed.createComponent(Host);
      fixture.detectChanges();
    });

    it('renders the pipe, the calendar and the picker again after use()', async () => {
      expect(root().querySelector('p')!.textContent).toBe('12 November 2026');
      expect(root().querySelector('.wr-calendar__label')!.textContent).toContain('November');
      expect(root().querySelector<HTMLInputElement>('input.wr-input')!.value).toBe('12 November 2026');

      // No `detectChanges()`: the signal the adapter reads schedules the pass.
      TestBed.inject(WrI18n).use('ru');
      await fixture.whenStable();

      expect(root().querySelector('p')!.textContent).toBe('12 ноября 2026');
      expect(root().querySelector('.wr-calendar__label')!.textContent?.toLowerCase()).toContain('ноябрь');
      expect(root().querySelector('.wr-calendar__weekday')!.textContent?.toLowerCase()).toBe('пн');
      expect(root().querySelector<HTMLInputElement>('input.wr-input')!.value).toBe('12 ноября 2026');
      expect(fixture.componentInstance.picked()).toBe(DAY);
    });
  });
});
