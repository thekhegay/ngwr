import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { wrAddDays, wrAddMonths, wrFromDay, wrToDay, wrToday } from './day';

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

  // East of UTC unless a test says otherwise, so the local-midnight case reads
  // the same on any runner.
  beforeEach(() => inZone('Asia/Almaty'));

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

  describe('with a time zone', () => {
    it('reads the day on the wall clock of a fixed offset', () => {
      const instant = new Date('2026-03-01T22:00:00Z');
      expect(wrToDay(instant, '+05:00')).toBe('2026-03-02');
      expect(wrToDay(instant, '-03')).toBe('2026-03-01');
      expect(wrToDay(new Date('2026-03-01T18:59:59Z'), '+0500')).toBe('2026-03-01');
      expect(wrToDay(new Date('2026-03-01T19:00:00Z'), '+0500')).toBe('2026-03-02');
    });

    it('reads the day in an IANA zone around a daylight-saving change', () => {
      // New York springs forward on 8 March 2026 at 02:00 local.
      expect(wrToDay(new Date('2026-03-08T04:59:59Z'), 'America/New_York')).toBe('2026-03-07');
      expect(wrToDay(new Date('2026-03-08T05:00:00Z'), 'America/New_York')).toBe('2026-03-08');
      expect(wrToDay(new Date('2026-03-09T03:59:59Z'), 'America/New_York')).toBe('2026-03-08');
      expect(wrToDay(new Date('2026-03-09T04:00:00Z'), 'America/New_York')).toBe('2026-03-09');
    });

    it('falls back to the browser zone for an unknown zone and keeps the empty cases', () => {
      const instant = new Date(2026, 2, 1, 0, 30);
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      expect(wrToDay(instant, 'Mars/Olympus')).toBe('2026-03-01');
      expect(wrToDay(instant, '')).toBe('2026-03-01');
      expect(wrToDay(instant, undefined)).toBe('2026-03-01');
      expect(wrToDay(new Date(NaN), 'Asia/Almaty')).toBe('');
    });

    it('reads today in the zone', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-01T22:00:00Z'));
      expect(wrToday('+05:00')).toBe('2026-03-02');
      expect(wrToday('America/New_York')).toBe('2026-03-01');
      expect(wrToday()).toBe(wrToDay(new Date()));
    });

    it('gives the instant of the day midnight in the zone', () => {
      expect(wrFromDay('2026-03-01', '+05:00')?.toISOString()).toBe('2026-02-28T19:00:00.000Z');
      expect(wrFromDay('2026-03-01', '-0330')?.toISOString()).toBe('2026-03-01T03:30:00.000Z');
    });

    it('takes the offset of the day itself in a zone with daylight saving', () => {
      expect(wrFromDay('2026-03-08', 'America/New_York')?.toISOString()).toBe('2026-03-08T05:00:00.000Z');
      expect(wrFromDay('2026-03-09', 'America/New_York')?.toISOString()).toBe('2026-03-09T04:00:00.000Z');
      expect(wrFromDay('2026-11-01', 'America/New_York')?.toISOString()).toBe('2026-11-01T04:00:00.000Z');
      expect(wrFromDay('2026-11-02', 'America/New_York')?.toISOString()).toBe('2026-11-02T05:00:00.000Z');
    });

    it('still refuses what is not a day, and ignores an absent zone', () => {
      expect(wrFromDay('2026-02-30', 'Asia/Almaty')).toBeNull();
      expect(wrFromDay(null, 'Asia/Almaty')).toBeNull();
      expect(wrFromDay('2026-03-01', undefined)).toEqual(new Date(2026, 2, 1));
    });

    it('round-trips a day through the zone', () => {
      for (const zone of ['Asia/Almaty', 'America/New_York', 'Pacific/Kiritimati', '+05:45']) {
        const instant = wrFromDay('2026-03-08', zone)!;
        expect(wrToDay(instant, zone)).toBe('2026-03-08');
        expect(wrToDay(new Date(instant.getTime() - 1), zone)).toBe('2026-03-07');
      }
    });

    it('builds an end-exclusive range with the day after the last', () => {
      const zone = 'America/New_York';
      expect(wrFromDay(wrAddDays('2026-03-31', 1), zone)?.toISOString()).toBe('2026-04-01T04:00:00.000Z');
      expect(wrFromDay(wrAddDays('2026-03-07', 1), zone)?.toISOString()).toBe('2026-03-08T05:00:00.000Z');
    });

    it('keeps year 0000 and refuses a year before it in a named zone', () => {
      expect(wrToDay(new Date('0000-01-01T00:00:00Z'), 'UTC')).toBe('0000-01-01');
      expect(wrToDay(new Date('-000001-12-31T00:00:00Z'), 'UTC')).toBe('');
    });

    it('refuses a day the zone skipped, and keeps one whose midnight it skipped', () => {
      // Samoa crossed the date line: 29 December 2011 was followed by the 31st.
      expect(wrFromDay('2011-12-30', 'Pacific/Apia')).toBeNull();
      // Chile's clocks went from 00:00 to 01:00 on 8 September 2024.
      expect(wrFromDay('2024-09-08', 'America/Santiago')?.toISOString()).toBe('2024-09-08T04:00:00.000Z');
    });
  });

  describe('wrAddDays', () => {
    it.each([
      ['2026-02-28', 1, '2026-03-01'],
      ['2028-02-28', 1, '2028-02-29'],
      ['2028-02-29', 1, '2028-03-01'],
      ['2026-12-31', 1, '2027-01-01'],
      ['2026-01-01', -1, '2025-12-31'],
      ['2026-03-08', 0, '2026-03-08'],
      ['2026-03-01', 366, '2027-03-02'],
      ['2026-03-01', 1.9, '2026-03-02'],
    ])('%s plus %d is %s', (day, n, expected) => {
      expect(wrAddDays(day, n)).toBe(expected);
    });

    it('does not depend on the machine zone, so a daylight-saving change moves nothing', () => {
      inZone('America/New_York');
      expect(wrAddDays('2026-03-07', 1)).toBe('2026-03-08');
      expect(wrAddDays('2026-03-08', 1)).toBe('2026-03-09');
      expect(wrAddDays('2026-11-01', 1)).toBe('2026-11-02');
      expect(wrAddDays('2026-11-01', -1)).toBe('2026-10-31');
    });

    it('gives an empty string for invalid input and results out of range', () => {
      expect(wrAddDays('2026-02-30', 1)).toBe('');
      expect(wrAddDays('2026-3-1', 1)).toBe('');
      expect(wrAddDays('', 1)).toBe('');
      expect(wrAddDays(null as unknown as string, 1)).toBe('');
      expect(wrAddDays('2026-03-01', NaN)).toBe('');
      expect(wrAddDays('2026-03-01', Infinity)).toBe('');
      expect(wrAddDays('9999-12-31', 1)).toBe('');
      expect(wrAddDays('0000-01-01', -1)).toBe('');
    });
  });

  describe('wrAddMonths', () => {
    it.each([
      ['2026-01-31', 1, '2026-02-28'],
      ['2028-01-31', 1, '2028-02-29'],
      ['2026-03-31', 1, '2026-04-30'],
      ['2026-03-15', -3, '2025-12-15'],
      ['2026-12-15', 1, '2027-01-15'],
      ['2026-01-15', -1, '2025-12-15'],
      ['2026-03-31', -1, '2026-02-28'],
      ['2026-01-31', 12, '2027-01-31'],
      ['2028-02-29', 12, '2029-02-28'],
      ['2026-05-10', 0, '2026-05-10'],
      ['2026-01-31', -13, '2024-12-31'],
    ])('%s plus %d months is %s', (day, n, expected) => {
      expect(wrAddMonths(day, n)).toBe(expected);
    });

    it('gives an empty string for invalid input and results out of range', () => {
      expect(wrAddMonths('2026-02-30', 1)).toBe('');
      expect(wrAddMonths('nope', 1)).toBe('');
      expect(wrAddMonths('2026-03-01', NaN)).toBe('');
      expect(wrAddMonths('9999-12-01', 1)).toBe('');
      expect(wrAddMonths('0000-01-01', -1)).toBe('');
    });
  });
});
