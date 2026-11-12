import { Component, LOCALE_ID, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { provideWr } from 'ngwr';
import { withDates } from 'ngwr/date';
import { WrI18n, provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrDateStamp } from './date-stamp';

/** An instant in UTC and a zone as an offset: nothing depends on the zone of the runner. */
const INSTANT = new Date(Date.UTC(2026, 10, 12, 8, 45, 30));

@Component({
  imports: [WrDateStamp],
  template: `<wr-date-stamp
    [value]="value()"
    [dateFormat]="dateFormat()"
    [timeFormat]="timeFormat()"
    [emptyLabel]="emptyLabel()"
  />`,
})
class Host {
  readonly value = signal<Date | string | number | null | undefined>(INSTANT);
  readonly dateFormat = signal('mediumDate');
  readonly timeFormat = signal('time');
  readonly emptyLabel = signal<string | null>(null);
}

describe('WrDateStamp', () => {
  const zone = signal<string | null>('+05:00');
  let fixture: ComponentFixture<Host>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector('wr-date-stamp')!;
  const time = (): HTMLTimeElement | null => host().querySelector('time');
  const line = (name: 'date' | 'time' | 'empty'): string | null =>
    host().querySelector(`.wr-date-stamp__${name}`)?.textContent ?? null;

  const setup = (providers: unknown[] = []): void => {
    zone.set('+05:00');
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru', 'en'], storageKey: null }),
        provideWr(withDates({ timeZone: zone })),
        ...(providers as never[]),
      ],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  };

  beforeEach(() => localStorage.clear());
  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('shows the date over the time, in the zone and the interface language', () => {
    setup();
    expect(host().classList.contains('wr-date-stamp')).toBe(true);
    expect(line('date')).toBe('12 нояб. 2026 г.');
    expect(line('time')).toBe('13:45');
    const lines = [...time()!.children].map(child => child.className);
    expect(lines).toEqual(['wr-date-stamp__date', 'wr-date-stamp__time']);
  });

  it('carries the instant in a valid datetime attribute, whatever the zone', () => {
    setup();
    expect(time()!.getAttribute('datetime')).toBe('2026-11-12T08:45:30.000Z');
    expect(new Date(time()!.dateTime).getTime()).toBe(INSTANT.getTime());
  });

  it('takes named keys and token strings for both lines', () => {
    setup();
    fixture.componentInstance.dateFormat.set('d MMM yyyy');
    fixture.componentInstance.timeFormat.set('time24hSeconds');
    fixture.detectChanges();
    expect(line('date')).toBe('12 нояб. 2026');
    expect(line('time')).toBe('13:45:30');
  });

  it('reads a string and epoch milliseconds as wrDate does', () => {
    setup();
    fixture.componentInstance.value.set('2026-11-12 08:45:30Z');
    fixture.detectChanges();
    expect(line('time')).toBe('13:45');

    fixture.componentInstance.value.set(INSTANT.getTime());
    fixture.detectChanges();
    expect(line('time')).toBe('13:45');
    expect(time()!.getAttribute('datetime')).toBe('2026-11-12T08:45:30.000Z');
  });

  it('follows the zone and the language at runtime', async () => {
    setup();
    zone.set('+05:30');
    await fixture.whenStable();
    expect(line('time')).toBe('14:15');

    // `use()` says once that numbers stay on LOCALE_ID.
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.inject(WrI18n).use('en');
    await fixture.whenStable();
    expect(line('date')).toBe('Nov 12, 2026');
    expect(line('time')).toBe('02:15 PM');
  });

  it('crosses midnight with the zone', () => {
    setup();
    fixture.componentInstance.value.set(new Date(Date.UTC(2026, 10, 12, 20, 0)));
    fixture.componentInstance.dateFormat.set('dd.MM.yyyy');
    fixture.detectChanges();
    expect(line('date')).toBe('13.11.2026');
    expect(line('time')).toBe('01:00');
  });

  it('shows a date-only string as that day, with no time line and no shift', () => {
    setup();
    zone.set('-12:00');
    fixture.componentInstance.value.set('2026-11-12');
    fixture.componentInstance.dateFormat.set('dd.MM.yyyy');
    fixture.detectChanges();
    expect(line('date')).toBe('12.11.2026');
    expect(line('time')).toBeNull();
    expect(time()!.getAttribute('datetime')).toBe('2026-11-12');
  });

  it.each([null, undefined, '', '   ', 'n/a', Number.NaN])('shows the placeholder for %s', empty => {
    setup();
    fixture.componentInstance.value.set(empty);
    fixture.detectChanges();
    expect(time()).toBeNull();
    expect(line('empty')).toBe('-');
    expect(host().classList.contains('wr-date-stamp--empty')).toBe(true);
  });

  it('takes the placeholder from emptyLabel, then from the catalog', async () => {
    setup([provideWrI18nStaticLoader({ ru: { copyValue: { empty: 'нет' } } })]);
    fixture.componentInstance.value.set(null);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(line('empty')).toBe('нет');

    fixture.componentInstance.emptyLabel.set('n/a');
    fixture.detectChanges();
    expect(line('empty')).toBe('n/a');
  });

  it('writes in LOCALE_ID and the browser zone with nothing configured', () => {
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'en-US' }] });
    fixture = TestBed.createComponent(Host);
    const local = new Date(2026, 10, 12, 13, 45);
    fixture.componentInstance.value.set(local);
    fixture.detectChanges();
    expect(line('date')).toBe('Nov 12, 2026');
    expect(line('time')).toBe('01:45 PM');
    expect(time()!.getAttribute('datetime')).toBe(local.toISOString());
  });
});
