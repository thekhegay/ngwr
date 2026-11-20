import { afterEach, describe, expect, it, vi } from 'vitest';

import { wrFromDay, wrToDay, wrToday } from './day';

/**
 * The runner's zone is `Asia/Almaty` (UTC+5), where a UTC reading of a local
 * midnight is the day before. The far zones are reached by setting `TZ`, which
 * Node reads again on the next `Date` call.
 */
describe('day strings', () => {
  const runnerZone = process.env['TZ'];

  function inZone(zone: string): void {
    process.env['TZ'] = zone;
  }

  afterEach(() => {
    if (runnerZone === undefined) delete process.env['TZ'];
    else process.env['TZ'] = runnerZone;
    vi.useRealTimers();
  });

  const parts = (d: Date | null): number[] | null =>
    d === null ? null : [d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()];

  describe('wrToDay', () => {
    it('writes the local day, zero-padded', () => {
      expect(wrToDay(new Date(2026, 2, 1, 14, 30))).toBe('2026-03-01');
      expect(wrToDay(new Date(2026, 11, 31, 23, 59, 59, 999))).toBe('2026-12-31');
    });

    it('keeps the day at local midnight, where the UTC day is still yesterday', () => {
      const midnight = new Date(2026, 2, 1);
      expect(midnight.toISOString().slice(0, 10)).toBe('2026-02-28');
      expect(wrToDay(midnight)).toBe('2026-03-01');
    });

    it.each([
      ['Pacific/Kiritimati', '+14'],
      ['Etc/GMT+12', '-12'],
      ['America/New_York', '-5'],
      ['Asia/Kathmandu', '+5:45'],
    ])('reads the local day in %s (UTC%s) at both ends of it', zone => {
      inZone(zone);
      expect(wrToDay(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
      expect(wrToDay(new Date(2026, 0, 1, 23, 59))).toBe('2026-01-01');
      expect(wrToDay(new Date(2025, 11, 31, 23, 59))).toBe('2025-12-31');
    });

    it('pads a year under 1000', () => {
      const early = new Date(0);
      early.setFullYear(25, 7, 11);
      expect(wrToDay(early)).toBe('0025-08-11');
    });

    it('gives an empty string for what has no YYYY-MM-DD form', () => {
      expect(wrToDay(new Date(NaN))).toBe('');
      expect(wrToDay(new Date(12000, 0, 1))).toBe('');
      expect(wrToDay(new Date(-1, 0, 1))).toBe('');
      expect(wrToDay('2026-03-01' as unknown as Date)).toBe('');
    });
  });

  describe('wrToday', () => {
    it('is the local day of now', () => {
      vi.useFakeTimers();
      // 20:30 UTC on 28 February is 01:30 on 1 March in Almaty.
      vi.setSystemTime(new Date('2026-02-28T20:30:00Z'));
      expect(wrToday()).toBe('2026-03-01');
    });

    it('follows the zone, not UTC', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-01T11:00:00Z'));
      inZone('Pacific/Kiritimati');
      expect(wrToday()).toBe('2026-03-02');
      inZone('Etc/GMT+12');
      expect(wrToday()).toBe('2026-02-28');
    });
  });

  describe('wrFromDay', () => {
    it('reads a day as its local midnight', () => {
      expect(parts(wrFromDay('2026-03-01'))).toEqual([2026, 2, 1, 0, 0]);
      expect(parts(wrFromDay('2024-02-29'))).toEqual([2024, 1, 29, 0, 0]);
    });

    it.each(['Pacific/Kiritimati', 'Etc/GMT+12', 'America/New_York'])('reads local midnight in %s', zone => {
      inZone(zone);
      expect(parts(wrFromDay('2026-01-01'))).toEqual([2026, 0, 1, 0, 0]);
      expect(wrToDay(wrFromDay('2026-01-01')!)).toBe('2026-01-01');
    });

    it('round-trips the days a clock changes on', () => {
      inZone('America/New_York');
      for (const day of ['2026-03-08', '2026-11-01']) expect(wrToDay(wrFromDay(day)!)).toBe(day);
      // Cuba moves its clocks at midnight, so 8 March 2026 has no 00:00 there.
      inZone('America/Havana');
      const skipped = wrFromDay('2026-03-08')!;
      expect(wrToDay(skipped)).toBe('2026-03-08');
      expect(skipped.getHours()).toBe(1);
    });

    it('round-trips every day of a year', () => {
      const cursor = new Date(2026, 0, 1);
      while (cursor.getFullYear() === 2026) {
        const day = wrToDay(cursor);
        expect(wrToDay(wrFromDay(day)!)).toBe(day);
        cursor.setDate(cursor.getDate() + 1);
      }
    });

    it('keeps a year under 100 where it was written', () => {
      expect(wrFromDay('0025-08-11')?.getFullYear()).toBe(25);
    });

    it.each([
      '2026-02-30',
      '2026-02-29',
      '2026-13-01',
      '2026-00-10',
      '2026-04-31',
      '2026-01-00',
      '2026-3-1',
      '2026-03',
      '2026',
      '2026-03-01T00:00',
      '2026-03-01T00:00:00Z',
      '2026-03-01 ',
      ' 2026-03-01',
      '01.03.2026',
      '2026/03/01',
      '20260301',
      'today',
      '',
    ])('refuses %j', value => {
      expect(wrFromDay(value)).toBeNull();
    });

    it('refuses what is not a string', () => {
      expect(wrFromDay(null)).toBeNull();
      expect(wrFromDay(undefined)).toBeNull();
      expect(wrFromDay(20260301 as unknown as string)).toBeNull();
      expect(wrFromDay(new Date() as unknown as string)).toBeNull();
    });
  });
});
