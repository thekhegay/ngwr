import { describe, expect, it } from 'vitest';

import { toLocalDate } from './local-date';

/**
 * The one reading `wrDate` and `WrValidators.minDate` / `maxDate` share. Each kept a
 * private copy until v15; the pipe and validator specs pin the consequences, and this
 * pins the helper itself. The runner's zone is `Asia/Almaty` (UTC+5), so a UTC
 * reading of a date-only string lands at 05:00 and is visible here.
 */
describe('toLocalDate', () => {
  const parts = (d: Date): number[] => [d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()];

  it('reads a date-only string as that day at local midnight', () => {
    expect(parts(toLocalDate('2026-01-01'))).toEqual([2026, 0, 1, 0, 0]);
    expect(parts(toLocalDate('2026-03'))).toEqual([2026, 2, 1, 0, 0]);
    expect(parts(toLocalDate('2026'))).toEqual([2026, 0, 1, 0, 0]);
  });

  it('leaves every other string and a timestamp to the engine', () => {
    const withTime = '2026-01-01T09:30';
    expect(toLocalDate(withTime).getTime()).toBe(new Date(withTime).getTime());
    const utc = '2026-01-01T00:00:00Z';
    expect(toLocalDate(utc).getTime()).toBe(new Date(utc).getTime());
    expect(toLocalDate(0).getTime()).toBe(0);
  });

  it('keeps an invalid date invalid rather than inventing a day', () => {
    expect(Number.isNaN(toLocalDate('2026-13-45').getTime())).toBe(true);
    expect(Number.isNaN(toLocalDate('nonsense').getTime())).toBe(true);
  });

  it('keeps a year under 100 where it was written', () => {
    // The `Date` constructor would map 25 onto 1925; `setFullYear` does not.
    expect(toLocalDate('0025-08-11').getFullYear()).toBe(25);
  });
});
