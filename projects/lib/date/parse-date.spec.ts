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
});
