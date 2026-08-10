import { TestBed } from '@angular/core/testing';

import { beforeEach, describe, expect, it } from 'vitest';

import { provideWrDateAdapter } from './provide-wr-date-adapter';
import { WrDateAdapter } from './wr-date-adapter';
import type { WrNativeDateAdapter } from './wr-native-date-adapter';

/**
 * This adapter is what every date component computes with — the calendar grid, both
 * pickers, the range panel — so a rounding error here is a wrong day everywhere at once.
 * The tests are exact rather than approximate for that reason.
 *
 * One hazard is NOT observable in this runner and is worth stating: `Asia/Almaty` has no
 * daylight saving, so millisecond arithmetic and calendar arithmetic agree on every date.
 * In a zone that does observe it they do not, which is why `addDays` moves the calendar
 * day rather than adding 86 400 000 ms — see the comment on the method.
 */
describe('WrNativeDateAdapter', () => {
  // `TestBed.inject` hands back the abstract type, whose generic defaults to `Date` for
  // the native adapter — named explicitly so every call below is checked against it.
  let adapter: WrNativeDateAdapter;

  const at = (y: number, m: number, d: number, h = 0, min = 0, s = 0): Date => new Date(y, m, d, h, min, s);
  const iso = (date: Date): string =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrDateAdapter({ locale: 'en-GB' })] });
    adapter = TestBed.inject(WrDateAdapter) as WrNativeDateAdapter;
  });

  describe('identity and accessors', () => {
    it('clones without aliasing', () => {
      const original = at(2025, 7, 11, 13, 45, 5);
      const copy = adapter.clone(original);

      expect(copy).not.toBe(original);
      expect(copy.getTime()).toBe(original.getTime());
    });

    it('builds a date from parts, including a two-digit year', () => {
      // The native constructor maps a year under 100 onto 1900 + year, so 25 would become
      // 1925 without the explicit `setFullYear`.
      expect(iso(adapter.createDate(2025, 1, 28))).toBe('2025-02-28');
      expect(adapter.getYear(adapter.createDate(25, 0, 1))).toBe(25);
    });

    it('rejects an invalid date object', () => {
      expect(adapter.isValid(new Date('nonsense'))).toBe(false);
      expect(adapter.isValid(at(2025, 0, 1))).toBe(true);
    });

    it('reads every field back', () => {
      const d = at(2025, 7, 11, 13, 45, 5);
      expect([adapter.getYear(d), adapter.getMonth(d), adapter.getDate(d)]).toEqual([2025, 7, 11]);
      expect([adapter.getHours(d), adapter.getMinutes(d), adapter.getSeconds(d)]).toEqual([13, 45, 5]);
      // 11 Aug 2025 is a Monday, and the adapter counts Sunday as 0.
      expect(adapter.getDayOfWeek(d)).toBe(1);
    });

    it('knows how long each month is, leap years included', () => {
      expect(adapter.getDaysInMonth(at(2025, 1, 1))).toBe(28);
      expect(adapter.getDaysInMonth(at(2024, 1, 1))).toBe(29);
      expect(adapter.getDaysInMonth(at(2025, 3, 1))).toBe(30);
      expect(adapter.getDaysInMonth(at(2025, 11, 1))).toBe(31);
    });
  });

  describe('arithmetic', () => {
    it('adds days across a month and a year boundary', () => {
      expect(iso(adapter.addDays(at(2025, 0, 31), 1))).toBe('2025-02-01');
      expect(iso(adapter.addDays(at(2025, 11, 31), 1))).toBe('2026-01-01');
      expect(iso(adapter.addDays(at(2025, 0, 1), -1))).toBe('2024-12-31');
    });

    it('keeps the time of day when it moves a day', () => {
      // A calendar day, not 24 hours: the wall clock has to come out unchanged.
      const moved = adapter.addDays(at(2025, 9, 26, 9, 30, 0), 1);
      expect([moved.getHours(), moved.getMinutes()]).toEqual([9, 30]);
      expect(iso(moved)).toBe('2025-10-27');
    });

    it('walks a whole year one day at a time and lands where it started', () => {
      let cursor = at(2025, 0, 1, 12, 0, 0);
      for (let i = 0; i < 365; i += 1) cursor = adapter.addDays(cursor, 1);

      expect(iso(cursor)).toBe('2026-01-01');
      expect(cursor.getHours()).toBe(12);
    });

    it('clamps the day when a month is too short for it', () => {
      expect(iso(adapter.addMonths(at(2025, 0, 31), 1))).toBe('2025-02-28');
      expect(iso(adapter.addMonths(at(2024, 0, 31), 1))).toBe('2024-02-29');
      expect(iso(adapter.addMonths(at(2025, 2, 31), -1))).toBe('2025-02-28');
    });

    it('adds years, and clamps 29 February', () => {
      expect(iso(adapter.addYears(at(2025, 7, 11), 3))).toBe('2028-08-11');
      // `setFullYear` on 29 Feb of a non-leap year rolls into 1 March, which is the native
      // behaviour this adapter inherits — pinned so a change is a decision.
      expect(iso(adapter.addYears(at(2024, 1, 29), 1))).toBe('2025-03-01');
    });

    it('sets the time and clears the milliseconds', () => {
      const withMs = new Date(2025, 7, 11, 1, 2, 3, 456);
      const set = adapter.setTime(withMs, 22, 15, 9);

      expect([set.getHours(), set.getMinutes(), set.getSeconds(), set.getMilliseconds()]).toEqual([22, 15, 9, 0]);
      expect(iso(set)).toBe('2025-08-11');
    });
  });

  describe('comparison', () => {
    it('compares by calendar day, ignoring the clock', () => {
      expect(adapter.isSameDay(at(2025, 7, 11, 0, 0), at(2025, 7, 11, 23, 59))).toBe(true);
      expect(adapter.isSameDay(at(2025, 7, 11), at(2025, 7, 12))).toBe(false);
      expect(adapter.compareDate(at(2025, 7, 11, 23, 0), at(2025, 7, 11, 1, 0))).toBe(0);
    });

    it('orders by year, then month, then day', () => {
      expect(adapter.compareDate(at(2024, 11, 31), at(2025, 0, 1))).toBeLessThan(0);
      expect(adapter.compareDate(at(2025, 5, 1), at(2025, 4, 30))).toBeGreaterThan(0);
    });

    it('treats a range as inclusive of both ends', () => {
      const start = at(2025, 7, 1);
      const end = at(2025, 7, 31);
      expect(adapter.isWithinRange(start, start, end)).toBe(true);
      expect(adapter.isWithinRange(end, start, end)).toBe(true);
      expect(adapter.isWithinRange(at(2025, 6, 31), start, end)).toBe(false);
    });

    it('matches months across different days', () => {
      expect(adapter.isSameMonth(at(2025, 7, 1), at(2025, 7, 31))).toBe(true);
      expect(adapter.isSameMonth(at(2025, 7, 31), at(2024, 7, 31))).toBe(false);
    });
  });

  describe('token formatting', () => {
    it('fills every token from the same date', () => {
      const d = at(2025, 7, 11, 13, 45, 5);
      expect(adapter.format(d, 'yyyy-MM-dd')).toBe('2025-08-11');
      expect(adapter.format(d, 'd/M/yy')).toBe('11/8/25');
      expect(adapter.format(d, 'HH:mm:ss')).toBe('13:45:05');
      expect(adapter.format(d, 'h:mm a')).toBe('1:45 pm');
    });

    it('writes midnight and noon as twelve, not zero', () => {
      expect(adapter.format(at(2025, 7, 11, 0, 5), 'h:mm a')).toBe('12:05 am');
      expect(adapter.format(at(2025, 7, 11, 12, 5), 'h:mm a')).toBe('12:05 pm');
    });

    it('emits quoted text verbatim, and reads the rest as tokens', () => {
      // The one-letter tokens match letters inside words — the `a` in "year" used to come
      // out as a meridiem — so literal text is quoted, the way `DatePipe` and LDML do it.
      expect(adapter.format(at(2025, 7, 11), "yyyy 'year'")).toBe('2025 year');
      expect(adapter.format(at(2025, 7, 11, 9, 5), "d MMM 'at' HH:mm")).toBe('11 Aug at 09:05');
      // `''` is how a single quote is written.
      expect(adapter.format(at(2025, 7, 11), "yyyy''")).toBe("2025'");
      // Unquoted, those letters ARE tokens — pinned so the trade-off is explicit.
      expect(adapter.format(at(2025, 7, 11), 'yyyy [year]')).toBe('2025 [yeamr]');
    });

    it('round-trips a pattern with quoted text', () => {
      // The quotes are in the PATTERN, not in the value: `'at'` means the literal `at`.
      const written = adapter.format(at(2025, 7, 11, 9, 5), "d MMM 'at' HH:mm");
      expect(written).toBe('11 Aug at 09:05');

      const parsed = adapter.parse(written, "d MMM 'at' HH:mm");
      expect(parsed).not.toBeNull();
      expect([parsed!.getMonth(), parsed!.getDate(), parsed!.getHours()]).toEqual([7, 11, 9]);
    });
  });

  describe('token parsing', () => {
    it('reads back what it wrote', () => {
      const parsed = adapter.parse('2025-08-11', 'yyyy-MM-dd');
      expect(parsed).not.toBeNull();
      expect(iso(parsed!)).toBe('2025-08-11');
    });

    it('reads a twelve-hour clock with its meridiem', () => {
      const parsed = adapter.parse('11/08/2025 1:45 pm', 'dd/MM/yyyy h:mm a');
      expect(parsed!.getHours()).toBe(13);

      const morning = adapter.parse('11/08/2025 12:05 am', 'dd/MM/yyyy h:mm a');
      expect(morning!.getHours()).toBe(0);
    });

    it('refuses a value that does not match the pattern', () => {
      expect(adapter.parse('11 August 2025', 'yyyy-MM-dd')).toBeNull();
      expect(adapter.parse('', 'yyyy-MM-dd')).toBeNull();
      expect(adapter.parse('   ', 'yyyy-MM-dd')).toBeNull();
    });

    it('refuses parts that are inside the pattern but outside the calendar', () => {
      // `new Date(2025, 12, 45)` does not fail — it rolls forward to 14 February 2026 —
      // and `isValid` is happy with the result, so a text field used to turn nonsense
      // into a confident wrong answer.
      expect(adapter.parse('2025-13-01', 'yyyy-MM-dd')).toBeNull();
      expect(adapter.parse('2025-00-01', 'yyyy-MM-dd')).toBeNull();
      expect(adapter.parse('2025-02-30', 'yyyy-MM-dd')).toBeNull();
      expect(adapter.parse('2025-08-00', 'yyyy-MM-dd')).toBeNull();
      expect(adapter.parse('2025-08-11 25:00', 'yyyy-MM-dd HH:mm')).toBeNull();
      expect(adapter.parse('2025-08-11 12:60', 'yyyy-MM-dd HH:mm')).toBeNull();
    });

    it('reads a month by name, in short and long form', () => {
      // `MMM` and `MMMM` had no case in the parser and fell through to a greedy `(.+)`,
      // so the month stayed January whatever the text said.
      expect(adapter.parse('11 Aug 2025', 'd MMM yyyy')!.getMonth()).toBe(7);
      expect(adapter.parse('11 August 2025', 'd MMMM yyyy')!.getMonth()).toBe(7);
      expect(adapter.parse('11 Frobuary 2025', 'd MMMM yyyy')).toBeNull();
    });

    it('accepts the last day of a short month', () => {
      expect(iso(adapter.parse('2024-02-29', 'yyyy-MM-dd')!)).toBe('2024-02-29');
      expect(adapter.parse('2025-02-29', 'yyyy-MM-dd')).toBeNull();
    });
  });

  describe('locale information', () => {
    it('starts the week where the locale does', () => {
      // en-GB starts on Monday; the adapter reports Sunday as 0.
      expect(adapter.getFirstDayOfWeek()).toBe(1);
    });

    it('names the days from the first day of the week onwards', () => {
      const names = adapter.getDayOfWeekNames('short');
      expect(names.length).toBe(7);
      expect(names[0]).toBe('Mon');
      expect(names[6]).toBe('Sun');
    });

    it('names all twelve months', () => {
      const names = adapter.getMonthNames('long');
      expect(names.length).toBe(12);
      expect(names[0]).toBe('January');
      expect(names[11]).toBe('December');
    });
  });

  describe('under a different locale', () => {
    it('follows the locale it was given', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideWrDateAdapter({ locale: 'en-US' })] });
      const us = TestBed.inject(WrDateAdapter) as WrNativeDateAdapter;

      expect(us.getFirstDayOfWeek()).toBe(0);
      expect(us.getDayOfWeekNames('short')[0]).toBe('Sun');
    });
  });
});
