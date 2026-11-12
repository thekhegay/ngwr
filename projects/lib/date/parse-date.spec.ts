import { describe, expect, it } from 'vitest';

import { wrParseDate } from './parse-date';

/**
 * Local readings are compared with `new Date(y, m, d, …)`, which is local in any
 * zone, so nothing here depends on the runner's. Only the date-only case needs a
 * zone off UTC to tell a local reading from a UTC one, and the runner's is
 * `Asia/Almaty` (see `local-date.spec.ts`).
 */
describe('wrParseDate', () => {
  const time = (value: Parameters<typeof wrParseDate>[0]): number | undefined => wrParseDate(value)?.getTime();

  describe('the space form', () => {
    it('reads a date and a time split by a space as local time', () => {
      const parsed = wrParseDate('2026-03-01 14:30:00');
      expect(parsed).toBeInstanceOf(Date);
      expect(Number.isNaN(parsed?.getTime())).toBe(false);
      expect(parsed?.getTime()).toBe(new Date(2026, 2, 1, 14, 30, 0).getTime());
    });

    it('reads it without seconds', () => {
      expect(time('2026-03-01 14:30')).toBe(new Date(2026, 2, 1, 14, 30, 0).getTime());
    });

    it('reads a fraction of a second, cut to milliseconds', () => {
      expect(time('2026-03-01 14:30:05.5')).toBe(new Date(2026, 2, 1, 14, 30, 5, 500).getTime());
      expect(time('2026-03-01 14:30:05.123')).toBe(new Date(2026, 2, 1, 14, 30, 5, 123).getTime());
      expect(time('2026-03-01 14:30:05.123456')).toBe(new Date(2026, 2, 1, 14, 30, 5, 123).getTime());
    });

    it('reads a zone after the time, in each spelling', () => {
      const instant = Date.UTC(2026, 2, 1, 9, 30, 0);
      expect(time('2026-03-01 09:30:00Z')).toBe(instant);
      expect(time('2026-03-01 09:30:00z')).toBe(instant);
      expect(time('2026-03-01 14:30:00+05:00')).toBe(instant);
      expect(time('2026-03-01 14:30:00+0500')).toBe(instant);
      expect(time('2026-03-01 14:30:00+05')).toBe(instant);
      expect(time('2026-03-01 14:30+05:00')).toBe(instant);
      expect(time('2026-03-01 04:00:00.250-05:30')).toBe(instant + 250);
    });

    it('reads the same instant as the T form', () => {
      expect(time('2026-03-01 14:30:00')).toBe(new Date('2026-03-01T14:30:00').getTime());
    });

    it('gives null for a space form that names no date', () => {
      expect(wrParseDate('2026-13-45 14:30:00')).toBeNull();
      expect(wrParseDate('2026-03-01 25:61:00')).toBeNull();
    });
  });

  it('reads a date-only string as that day at local midnight', () => {
    expect(time('2026-03-01')).toBe(new Date(2026, 2, 1).getTime());
    expect(time('2026-01-01')).toBe(new Date(2026, 0, 1, 0, 0, 0, 0).getTime());
    expect(time('2026-03')).toBe(new Date(2026, 2, 1).getTime());
  });

  it('reads an ISO string with a zone as the instant it names', () => {
    expect(time('2026-03-01T09:30:00Z')).toBe(Date.UTC(2026, 2, 1, 9, 30, 0));
    expect(time('2026-03-01T14:30:00+05:00')).toBe(Date.UTC(2026, 2, 1, 9, 30, 0));
    expect(time('2026-03-01T09:30:00.250Z')).toBe(Date.UTC(2026, 2, 1, 9, 30, 0, 250));
  });

  it('reads an ISO string without a zone as local time', () => {
    expect(time('2026-03-01T14:30:00')).toBe(new Date(2026, 2, 1, 14, 30, 0).getTime());
  });

  it('ignores surrounding whitespace', () => {
    expect(time('  2026-03-01 14:30:00\n')).toBe(new Date(2026, 2, 1, 14, 30, 0).getTime());
    expect(time(' 2026-03-01 ')).toBe(new Date(2026, 2, 1).getTime());
  });

  it('returns a Date as the same object', () => {
    const date = new Date(2026, 2, 1, 14, 30);
    expect(wrParseDate(date)).toBe(date);
  });

  it('gives null for an Invalid Date', () => {
    expect(wrParseDate(new Date(Number.NaN))).toBeNull();
    expect(wrParseDate(new Date('nonsense'))).toBeNull();
  });

  it('reads a number as epoch milliseconds', () => {
    expect(time(0)).toBe(0);
    expect(time(1772343000000)).toBe(1772343000000);
    expect(time(-86400000)).toBe(-86400000);
  });

  it('gives null for a number that is no instant', () => {
    expect(wrParseDate(Number.NaN)).toBeNull();
    expect(wrParseDate(Number.POSITIVE_INFINITY)).toBeNull();
    expect(wrParseDate(Number.NEGATIVE_INFINITY)).toBeNull();
    expect(wrParseDate(8.64e15 + 1)).toBeNull();
  });

  it('gives null for nothing', () => {
    expect(wrParseDate(null)).toBeNull();
    expect(wrParseDate(undefined)).toBeNull();
    expect(wrParseDate('')).toBeNull();
    expect(wrParseDate('   ')).toBeNull();
  });

  it('gives null for a string that is no date, never an Invalid Date', () => {
    expect(wrParseDate('nonsense')).toBeNull();
    expect(wrParseDate('n/a')).toBeNull();
    expect(wrParseDate('2026-13-45')).toBeNull();
    expect(wrParseDate('2026-03-01T25:00:00')).toBeNull();
  });

  describe('epochUnit', () => {
    const AT = Date.UTC(2026, 10, 12, 8, 45, 0);

    it('reads a number as milliseconds unless told otherwise', () => {
      expect(time(AT)).toBe(AT);
      expect(wrParseDate(AT, {})?.getTime()).toBe(AT);
      expect(wrParseDate(AT, { epochUnit: 'ms' })?.getTime()).toBe(AT);
    });

    it('reads seconds and microseconds when named', () => {
      expect(wrParseDate(AT / 1000, { epochUnit: 's' })?.getTime()).toBe(AT);
      expect(wrParseDate(AT * 1000, { epochUnit: 'us' })?.getTime()).toBe(AT);
      // The microseconds a `Date` cannot hold are dropped.
      expect(wrParseDate(1794489310740123, { epochUnit: 'us' })?.getTime()).toBe(1794489310740);
    });

    it('decides by magnitude under auto', () => {
      expect(wrParseDate(AT / 1000, { epochUnit: 'auto' })?.getTime()).toBe(AT);
      expect(wrParseDate(AT, { epochUnit: 'auto' })?.getTime()).toBe(AT);
      expect(wrParseDate(AT * 1000, { epochUnit: 'auto' })?.getTime()).toBe(AT);
      expect(wrParseDate(1794489310740123, { epochUnit: 'auto' })?.getTime()).toBe(1794489310740);
      expect(wrParseDate(-AT, { epochUnit: 'auto' })?.getTime()).toBe(-AT);
    });

    it('draws the lines of auto at 1e10 and 1e13', () => {
      const auto = (value: number): string | undefined => wrParseDate(value, { epochUnit: 'auto' })?.toISOString();
      // The last second and the first millisecond: 20 November 2286 and 26 April 1970.
      expect(auto(1e10 - 1)).toBe('2286-11-20T17:46:39.000Z');
      expect(auto(1e10)).toBe('1970-04-26T17:46:40.000Z');
      // The last millisecond and the first microsecond: the same two days.
      expect(auto(1e13 - 1)).toBe('2286-11-20T17:46:39.999Z');
      expect(auto(1e13)).toBe('1970-04-26T17:46:40.000Z');
      expect(auto(0)).toBe('1970-01-01T00:00:00.000Z');
    });

    it('gives null for a number that is no date in the unit', () => {
      expect(wrParseDate(Number.NaN, { epochUnit: 'auto' })).toBeNull();
      expect(wrParseDate(8.64e15, { epochUnit: 's' })).toBeNull();
    });

    it('leaves a Date and a string alone', () => {
      const date = new Date(AT);
      expect(wrParseDate(date, { epochUnit: 's' })).toBe(date);
      expect(wrParseDate('2026-11-12T08:45:00Z', { epochUnit: 's' })?.getTime()).toBe(AT);
    });
  });

  describe('zonelessIn', () => {
    const UTC_1345 = Date.UTC(2026, 10, 12, 13, 45, 0);
    const HOUR = 3_600_000;

    it('reads a zoneless date-time in the browser zone by default, as before', () => {
      const local = new Date(2026, 10, 12, 13, 45, 0).getTime();
      expect(time('2026-11-12 13:45:00')).toBe(local);
      expect(wrParseDate('2026-11-12 13:45:00', { zonelessIn: 'browser', timeZone: '+09:00' })?.getTime()).toBe(local);
    });

    it('reads it as UTC', () => {
      expect(wrParseDate('2026-11-12 13:45:00', { zonelessIn: 'utc' })?.getTime()).toBe(UTC_1345);
      expect(wrParseDate('2026-11-12T13:45', { zonelessIn: 'utc' })?.getTime()).toBe(UTC_1345);
      expect(wrParseDate('2026-11-12 13:45:00.123456', { zonelessIn: 'utc' })?.getTime()).toBe(UTC_1345 + 123);
    });

    it('reads it as a wall clock of the display zone, an offset or a name', () => {
      const read = (timeZone: string): number | undefined =>
        wrParseDate('2026-11-12 13:45:00', { zonelessIn: 'display', timeZone })?.getTime();
      expect(read('+0500')).toBe(UTC_1345 - 5 * HOUR);
      expect(read('-03:30')).toBe(UTC_1345 + 3.5 * HOUR);
      expect(read('Asia/Tokyo')).toBe(UTC_1345 - 9 * HOUR);
      expect(read('America/New_York')).toBe(UTC_1345 + 5 * HOUR);
      expect(
        wrParseDate('2026-07-12T13:45:00', { zonelessIn: 'display', timeZone: 'America/New_York' })?.getTime()
      ).toBe(Date.UTC(2026, 6, 12, 17, 45, 0));
    });

    it('falls back to the browser zone when display has no zone', () => {
      const local = new Date(2026, 10, 12, 13, 45, 0).getTime();
      expect(wrParseDate('2026-11-12 13:45:00', { zonelessIn: 'display' })?.getTime()).toBe(local);
      expect(wrParseDate('2026-11-12 13:45:00', { zonelessIn: 'display', timeZone: null })?.getTime()).toBe(local);
    });

    it('does not touch a string that names its zone', () => {
      for (const zonelessIn of ['display', 'utc'] as const) {
        const options = { zonelessIn, timeZone: '+09:00' };
        expect(wrParseDate('2026-11-12 13:45:00Z', options)?.getTime()).toBe(UTC_1345);
        expect(wrParseDate('2026-11-12 13:45:00+05', options)?.getTime()).toBe(UTC_1345 - 5 * HOUR);
        expect(wrParseDate('2026-11-12T13:45:00+05:00', options)?.getTime()).toBe(UTC_1345 - 5 * HOUR);
      }
    });

    it('keeps a date-only string a local day', () => {
      for (const zonelessIn of ['display', 'utc'] as const) {
        const day = wrParseDate('2026-11-12', { zonelessIn, timeZone: '-11:00' });
        expect(day?.getTime()).toBe(new Date(2026, 10, 12).getTime());
      }
    });

    it('refuses a time no calendar has', () => {
      for (const zonelessIn of ['display', 'utc'] as const) {
        expect(wrParseDate('2026-02-30 10:00:00', { zonelessIn, timeZone: '+05:00' })).toBeNull();
        expect(wrParseDate('2026-11-12 25:00:00', { zonelessIn, timeZone: '+05:00' })).toBeNull();
        expect(wrParseDate('2026-11-12 10:61', { zonelessIn, timeZone: '+05:00' })).toBeNull();
      }
    });
  });
});
