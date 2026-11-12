import {
  EnvironmentInjector,
  InjectionToken,
  LOCALE_ID,
  createEnvironmentInjector,
  inject,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWr } from 'ngwr';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { withDates } from './with-dates';
import { WrDateAdapter } from './wr-date-adapter';

/**
 * Every expectation is written from a UTC instant and a zone named in the test,
 * so it holds whatever zone the runner is in. Where the offset of a named zone
 * is the thing under test, it is read from `Intl` rather than stated.
 */
const INSTANT = new Date(Date.UTC(2026, 10, 12, 8, 45, 30));

function adapters(
  timeZone?: string | (() => string | null | undefined),
  locale = 'en-US'
): { plain: WrDateAdapter<Date>; zoned: WrDateAdapter<Date> } {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: LOCALE_ID, useValue: locale }, provideWr(withDates(timeZone ? { timeZone } : {}))],
  });
  const plain = TestBed.inject<WrDateAdapter<Date>>(WrDateAdapter);
  return { plain, zoned: plain.zoned() };
}

/** The wall clock `Intl` itself reads for a named zone, as `yyyy-MM-dd HH:mm:ss`. */
function intlWall(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const read = (type: string): string => parts.find(part => part.type === type)!.value;
  return `${read('year')}-${read('month')}-${read('day')} ${read('hour')}:${read('minute')}:${read('second')}`;
}

describe('withDates({ timeZone })', () => {
  afterEach(() => vi.restoreAllMocks());

  it('is the adapter itself when no zone is set', () => {
    const { plain, zoned } = adapters();
    expect(zoned).toBe(plain);
  });

  it('prints an instant on the wall clock of an offset, whole hours and not', () => {
    expect(adapters('+05:00').zoned.format(INSTANT, 'yyyy-MM-dd HH:mm:ss')).toBe('2026-11-12 13:45:30');
    expect(adapters('+05:30').zoned.format(INSTANT, 'yyyy-MM-dd HH:mm:ss')).toBe('2026-11-12 14:15:30');
    expect(adapters('-09:30').zoned.format(INSTANT, 'yyyy-MM-dd HH:mm:ss')).toBe('2026-11-11 23:15:30');
    expect(adapters('+0530').zoned.format(INSTANT, 'HH:mm')).toBe('14:15');
    expect(adapters('+05').zoned.format(INSTANT, 'HH:mm')).toBe('13:45');
  });

  it('prints an instant on the wall clock of a named zone', () => {
    expect(adapters('Asia/Tokyo').zoned.format(INSTANT, 'yyyy-MM-dd HH:mm:ss')).toBe('2026-11-12 17:45:30');
    expect(adapters('Asia/Kolkata').zoned.format(INSTANT, 'yyyy-MM-dd HH:mm:ss')).toBe('2026-11-12 14:15:30');
    for (const zone of ['Asia/Almaty', 'America/New_York', 'Australia/Lord_Howe']) {
      expect(adapters(zone).zoned.format(INSTANT, 'yyyy-MM-dd HH:mm:ss')).toBe(intlWall(INSTANT, zone));
    }
  });

  it('prints the named formats in the zone too', () => {
    const { zoned } = adapters('+05:30');
    expect(zoned.format(INSTANT, 'time24h')).toBe('14:15');
    expect(zoned.format(INSTANT, 'shortDate')).toBe('11/12/2026');
    // 20:00 UTC is already the 13th at +05:30.
    expect(zoned.format(new Date(Date.UTC(2026, 10, 12, 20, 0)), 'mediumDate')).toBe('Nov 13, 2026');
    expect(adapters('Asia/Tokyo').zoned.format(INSTANT, 'time24hSeconds')).toBe('17:45:30');
  });

  it('reads every field on the zone wall clock', () => {
    const { zoned } = adapters('+05:30');
    const late = new Date(Date.UTC(2026, 11, 31, 19, 0, 5));
    expect([zoned.getYear(late), zoned.getMonth(late), zoned.getDate(late)]).toEqual([2027, 0, 1]);
    expect([zoned.getHours(late), zoned.getMinutes(late), zoned.getSeconds(late)]).toEqual([0, 30, 5]);
    // 1 January 2027 is a Friday.
    expect(zoned.getDayOfWeek(late)).toBe(5);
    expect(zoned.getDaysInMonth(late)).toBe(31);
  });

  it('builds and moves dates on the zone wall clock', () => {
    const { zoned } = adapters('+05:30');
    const midnight = zoned.createDate(2026, 10, 12);
    expect(midnight.getTime()).toBe(Date.UTC(2026, 10, 11, 18, 30));
    expect(zoned.setTime(midnight, 13, 45, 0).getTime()).toBe(Date.UTC(2026, 10, 12, 8, 15));
    expect(zoned.addDays(midnight, 20).getTime()).toBe(Date.UTC(2026, 11, 1, 18, 30));
    expect(zoned.addMonths(zoned.createDate(2026, 0, 31), 1).getTime()).toBe(Date.UTC(2026, 1, 27, 18, 30));
    expect(zoned.addYears(midnight, 1).getTime()).toBe(Date.UTC(2027, 10, 11, 18, 30));
    expect(zoned.isSameDay(midnight, new Date(Date.UTC(2026, 10, 12, 18, 29)))).toBe(true);
    expect(zoned.isSameDay(midnight, new Date(Date.UTC(2026, 10, 12, 18, 30)))).toBe(false);
    expect(zoned.compareDate(midnight, new Date(Date.UTC(2026, 10, 11, 18, 29)))).toBeGreaterThan(0);
  });

  it('keeps the wall clock across a daylight-saving change of the zone', () => {
    const { zoned } = adapters('America/New_York');
    // 7 March 2026, 12:00 in New York (UTC-5); the clocks go forward on the 8th.
    const before = new Date(Date.UTC(2026, 2, 7, 17, 0));
    const after = zoned.addDays(before, 2);
    expect(after.getTime()).toBe(Date.UTC(2026, 2, 9, 16, 0));
    expect(zoned.getHours(after)).toBe(12);
    expect(zoned.createDate(2026, 6, 1).getTime()).toBe(Date.UTC(2026, 6, 1, 4, 0));
  });

  it('reads back what it printed, as the same instant', () => {
    for (const zone of ['+05:30', 'Asia/Tokyo', 'America/New_York']) {
      const { zoned } = adapters(zone);
      const minute = new Date(Date.UTC(2026, 10, 12, 8, 45));
      for (const format of ['dd.MM.yyyy HH:mm', 'shortDateTime', 'shortDateTime24h']) {
        expect(zoned.parse(zoned.format(minute, format), format)?.getTime()).toBe(minute.getTime());
      }
    }
    expect(adapters('+05:30').zoned.parse('31.02.2026 10:00', 'dd.MM.yyyy HH:mm')).toBeNull();
  });

  it('leaves the adapter itself on the browser zone: a day has no zone', () => {
    const { plain, zoned } = adapters('+14:00');
    const day = new Date(2026, 10, 12);
    expect(plain.format(day, 'dd.MM.yyyy HH:mm')).toBe('12.11.2026 00:00');
    expect(plain.getDate(day)).toBe(12);
    expect(plain.createDate(2026, 10, 12).getTime()).toBe(day.getTime());
    expect(zoned.zoned()).toBe(zoned);
  });

  it('follows a function, and a signal is one', () => {
    const zone = signal<string | null>(null);
    const { plain, zoned } = adapters(zone);
    expect(zoned.format(INSTANT, 'yyyy-MM-dd HH:mm')).toBe(plain.format(INSTANT, 'yyyy-MM-dd HH:mm'));
    const browserKey = zoned.displayKey();

    zone.set('+05:30');
    expect(zoned.format(INSTANT, 'HH:mm')).toBe('14:15');
    expect(zoned.displayKey()).not.toBe(browserKey);

    zone.set('Asia/Tokyo');
    expect(zoned.format(INSTANT, 'HH:mm')).toBe('17:45');

    zone.set(null);
    expect(zoned.displayKey()).toBe(browserKey);
  });

  it('runs the function in an injection context', () => {
    const ZONE = new InjectionToken<string>('zone');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: ZONE, useValue: '+05:30' }, provideWr(withDates({ timeZone: () => inject(ZONE) }))],
    });
    expect(TestBed.inject<WrDateAdapter<Date>>(WrDateAdapter).zoned().format(INSTANT, 'HH:mm')).toBe('14:15');
  });

  it('falls back to the browser zone for a zone no engine knows, and warns once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { plain, zoned } = adapters('Mars/Olympus_Mons');
    const format = 'yyyy-MM-dd HH:mm:ss';

    expect(zoned.format(INSTANT, format)).toBe(plain.format(INSTANT, format));
    expect(zoned.format(INSTANT, 'shortDateTime')).toBe(plain.format(INSTANT, 'shortDateTime'));
    expect(zoned.getHours(INSTANT)).toBe(INSTANT.getHours());
    expect(zoned.createDate(2026, 10, 12).getTime()).toBe(new Date(2026, 10, 12).getTime());
    expect(zoned.parse('12.11.2026 13:45', 'dd.MM.yyyy HH:mm')?.getTime()).toBe(
      new Date(2026, 10, 12, 13, 45).getTime()
    );

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('Mars/Olympus_Mons');

    warn.mockClear();
    expect(adapters('+25:00').zoned.getHours(INSTANT)).toBe(INSTANT.getHours());
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('writes the month and the clock in the adapter locale', () => {
    const { zoned } = adapters('+05:00', 'ru-RU');
    expect(zoned.format(INSTANT, 'd MMMM yyyy, HH:mm')).toBe('12 ноября 2026, 13:45');
  });
});

describe('withDates({ timeZone }) as an offset', () => {
  // `'+0500'` is what Angular's `DatePipe` takes, so an app's config often holds that form.
  it.each([
    ['+0500', '13:45'],
    ['+05:00', '13:45'],
    ['+05', '13:45'],
    ['-0330', '05:15'],
    ['-03:30', '05:15'],
    ['+0000', '08:45'],
  ])('reads %s', (offset, wall) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(adapters(offset).zoned.format(INSTANT, 'HH:mm')).toBe(wall);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('withDates({ epochUnit, zonelessIn })', () => {
  const options = (dates: Parameters<typeof withDates>[0], route?: Parameters<typeof withDates>[0]): object => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWr(withDates(dates))] });
    if (!route) return TestBed.inject<WrDateAdapter<Date>>(WrDateAdapter).parseOptions();
    const child = createEnvironmentInjector([provideWr(withDates(route))], TestBed.inject(EnvironmentInjector));
    return child.get<WrDateAdapter<Date>>(WrDateAdapter).parseOptions();
  };

  it('reads milliseconds and the browser zone with nothing set', () => {
    expect(options({})).toEqual({ epochUnit: 'ms', zonelessIn: 'browser', timeZone: null });
  });

  it('hands the options and the zone to whoever parses for the adapter', () => {
    expect(options({ epochUnit: 'auto', zonelessIn: 'display', timeZone: '+0500' })).toEqual({
      epochUnit: 'auto',
      zonelessIn: 'display',
      timeZone: '+0500',
    });
    expect(options({ zonelessIn: 'utc' })).toEqual({ epochUnit: 'ms', zonelessIn: 'utc', timeZone: null });
  });

  it('follows a zone that is a signal', () => {
    const zone = signal<string | null>('+05:00');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWr(withDates({ timeZone: zone, zonelessIn: 'display' }))] });
    const adapter = TestBed.inject<WrDateAdapter<Date>>(WrDateAdapter);
    expect(adapter.parseOptions().timeZone).toBe('+05:00');
    zone.set('Asia/Tokyo');
    expect(adapter.parseOptions().timeZone).toBe('Asia/Tokyo');
  });

  it('keeps the app keys a route does not name', () => {
    expect(options({ epochUnit: 'us', zonelessIn: 'utc' }, { epochUnit: 's' })).toEqual({
      epochUnit: 's',
      zonelessIn: 'utc',
      timeZone: null,
    });
  });
});
