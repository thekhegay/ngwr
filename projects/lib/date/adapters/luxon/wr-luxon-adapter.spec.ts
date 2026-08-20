import { TestBed } from '@angular/core/testing';

import { DateTime } from 'luxon';
import { WrDateAdapter } from 'ngwr/date';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { provideWrLuxonAdapter } from './provide-wr-luxon-adapter';
import type { WrLuxonAdapter } from './wr-luxon-adapter';

/**
 * The luxon adapter has to satisfy the same 23-method contract as the native one — the
 * calendar, both pickers and the range panel compute with nothing else — while sitting on a
 * library whose conventions differ from ours in three places at once: `DateTime` is
 * immutable, its months are 1-12 where ours are 0-11, and its `weekday` is 1 (Mon) - 7 (Sun)
 * where ours is 0 (Sun) - 6 (Sat). Each of those is one `+ 1` away from shifting every
 * calendar in the app, so they are pinned against values built by luxon itself rather than
 * by the adapter — an off-by-one in `createDate` cannot cancel an off-by-one in `getMonth`
 * if the fixture never went through `createDate`.
 *
 * The luxon adapter is also the only one that can be asked a question the native spec had to
 * leave open: a `DateTime` carries its zone, so daylight saving and cross-zone comparison are
 * observable here whatever zone the runner happens to be in — as long as the fixtures name
 * their zones instead of relying on the default one, which they do.
 */
describe('WrLuxonAdapter', () => {
  let adapter: WrLuxonAdapter;

  /**
   * Fixtures built through luxon directly — note the month is 1-based here, luxon's way, so
   * these values are independent of anything the adapter does with months.
   */
  const luxonAt = (year: number, month: number, day: number, hour = 0, minute = 0, second = 0): DateTime =>
    DateTime.fromObject({ year, month, day, hour, minute, second });

  const adapterFor = (locale: string): WrLuxonAdapter => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrLuxonAdapter({ locale })] });
    // The token's generic defaults to `Date`; this adapter's is `DateTime`, so the cast has
    // to go through `unknown`.
    return TestBed.inject(WrDateAdapter) as unknown as WrLuxonAdapter;
  };

  const ymd = (date: DateTime): string => date.toFormat('yyyy-MM-dd');

  beforeEach(() => {
    adapter = adapterFor('en-GB');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('identity and accessors', () => {
    it('clones into a new instance, keeping the instant and the zone', () => {
      // `clone` rebuilds from millis, so dropping the `zone` option would silently move the
      // value into the runner's zone — and with it the calendar day it displays.
      const original = DateTime.fromISO('2025-08-11T13:45:05', { zone: 'America/New_York' });
      const copy = adapter.clone(original);

      expect(copy).not.toBe(original);
      expect(copy.toMillis()).toBe(original.toMillis());
      expect(copy.zoneName).toBe('America/New_York');
      expect(adapter.getDate(copy)).toBe(11);
    });

    it('takes a 0-based month and hands one back', () => {
      // Luxon counts months 1-12; the contract is 0-11. Both directions are checked against
      // a literal so a matching pair of off-by-ones cannot hide.
      expect(ymd(adapter.createDate(2025, 0, 1))).toBe('2025-01-01');
      expect(ymd(adapter.createDate(2025, 11, 31))).toBe('2025-12-31');
      expect(adapter.getMonth(luxonAt(2025, 1, 15))).toBe(0);
      expect(adapter.getMonth(luxonAt(2025, 12, 15))).toBe(11);
    });

    it('refuses to roll an impossible date forward', () => {
      // Native `Date` turns 30 February into 2 March and reports it valid; luxon marks it
      // invalid instead, and the adapter passes that through. Pinned because the pickers
      // decide whether to keep the typed text on `isValid`.
      expect(adapter.isValid(adapter.createDate(2025, 1, 30))).toBe(false);
      expect(adapter.isValid(adapter.createDate(2025, 12, 45))).toBe(false);
      expect(adapter.isValid(DateTime.fromISO('nonsense'))).toBe(false);
      expect(adapter.isValid(adapter.createDate(2024, 1, 29))).toBe(true);
    });

    it('reads every field back', () => {
      const d = luxonAt(2025, 8, 11, 13, 45, 5);
      expect([adapter.getYear(d), adapter.getMonth(d), adapter.getDate(d)]).toEqual([2025, 7, 11]);
      expect([adapter.getHours(d), adapter.getMinutes(d), adapter.getSeconds(d)]).toEqual([13, 45, 5]);
    });

    it('numbers the week from Sunday, not from Monday', () => {
      // Luxon's `weekday` is 1 (Mon) - 7 (Sun); ours is 0 (Sun) - 6 (Sat). Sunday is the one
      // that breaks if the `% 7` goes: it would come back as 7 and push a month grid a
      // column sideways.
      expect(adapter.getDayOfWeek(luxonAt(2025, 8, 10))).toBe(0); // Sunday
      expect(adapter.getDayOfWeek(luxonAt(2025, 8, 11))).toBe(1); // Monday
      expect(adapter.getDayOfWeek(luxonAt(2025, 8, 16))).toBe(6); // Saturday
    });

    it('knows how long each month is, leap years included', () => {
      expect(adapter.getDaysInMonth(luxonAt(2025, 2, 1))).toBe(28);
      expect(adapter.getDaysInMonth(luxonAt(2024, 2, 1))).toBe(29);
      expect(adapter.getDaysInMonth(luxonAt(2025, 4, 1))).toBe(30);
      expect(adapter.getDaysInMonth(luxonAt(2025, 12, 1))).toBe(31);
    });

    it('still returns a number of days for an invalid date', () => {
      // `DateTime#daysInMonth` is `undefined` on an invalid value. Without the fallback the
      // calendar would size its grid from `undefined` and render NaN cells rather than
      // simply showing nothing useful.
      expect(adapter.getDaysInMonth(adapter.createDate(2025, 12, 45))).toBe(30);
    });

    it('reports now', () => {
      const now = adapter.today();
      expect(adapter.isValid(now)).toBe(true);
      expect(Math.abs(now.toMillis() - Date.now())).toBeLessThan(5_000);
    });

    it('attaches the configured locale to every value it constructs', () => {
      // Every `DateTime` the adapter constructs gets `locale` attached, and it has to: a
      // consumer that calls `.toLocaleString()` / `.toFormat('LLLL')` on a value the adapter
      // returned would otherwise get luxon's own default (the runner's, `en-US`) rather than
      // the locale the app configured. `format` re-applies it on the way out, so nothing else
      // in this file notices when the option is dropped at construction.
      const ru = adapterFor('ru-RU');
      const foreign = DateTime.fromISO('2025-08-11T13:45', { locale: 'en-US' });

      expect(ru.today().locale).toBe('ru-RU');
      expect(ru.createDate(2025, 7, 11).locale).toBe('ru-RU');
      expect(ru.clone(foreign).locale).toBe('ru-RU');
      expect(ru.createDate(2025, 7, 11).toFormat('LLLL')).toBe('август');
    });
  });

  describe('immutability', () => {
    it('leaves the value it was handed untouched and returns a new one', () => {
      // `DateTime` is immutable, so this is luxon doing the work — but only as long as every
      // method actually derives a value. Returning the argument (the tempting shortcut for
      // `clone`, or for an amount of 0) is what this catches.
      const original = luxonAt(2025, 8, 11, 13, 45, 5);
      const before = original.toISO();

      const derived = [
        adapter.addDays(original, 1),
        adapter.addMonths(original, 1),
        adapter.addYears(original, 1),
        adapter.setTime(original, 0, 0, 0),
        adapter.clone(original),
      ];

      for (const value of derived) expect(value).not.toBe(original);
      expect(original.toISO()).toBe(before);
      expect([original.hour, original.minute, original.second]).toEqual([13, 45, 5]);
    });
  });

  describe('arithmetic', () => {
    it('adds days across a month and a year boundary', () => {
      expect(ymd(adapter.addDays(luxonAt(2025, 1, 31), 1))).toBe('2025-02-01');
      expect(ymd(adapter.addDays(luxonAt(2025, 12, 31), 1))).toBe('2026-01-01');
      expect(ymd(adapter.addDays(luxonAt(2025, 1, 1), -1))).toBe('2024-12-31');
    });

    it('moves a calendar day, not 24 hours, across a daylight-saving change', () => {
      // The native adapter's spec could not test this: its dates have no zone of their own,
      // and the runner sits in one without DST. A `DateTime` carries its zone, so here the
      // 23-hour day is real. Millisecond arithmetic would report 10:30 on the far side of
      // the spring change and 08:30 on the far side of the autumn one — a month grid built
      // that way repeats a day and loses one.
      const spring = DateTime.fromISO('2025-03-29T09:30', { zone: 'Europe/London' });
      const springNext = adapter.addDays(spring, 1);
      expect(springNext.toFormat('yyyy-MM-dd HH:mm')).toBe('2025-03-30 09:30');
      expect(springNext.toMillis() - spring.toMillis()).toBe(23 * 3_600_000);

      const autumn = DateTime.fromISO('2025-10-25T09:30', { zone: 'Europe/London' });
      expect(adapter.addDays(autumn, 1).toFormat('yyyy-MM-dd HH:mm')).toBe('2025-10-26 09:30');
    });

    it('walks a whole year one day at a time and lands where it started', () => {
      let cursor = luxonAt(2025, 1, 1, 12);
      for (let i = 0; i < 365; i += 1) cursor = adapter.addDays(cursor, 1);

      expect(ymd(cursor)).toBe('2026-01-01');
      expect(adapter.getHours(cursor)).toBe(12);
    });

    it('clamps the day when a month is too short for it', () => {
      expect(ymd(adapter.addMonths(luxonAt(2025, 1, 31), 1))).toBe('2025-02-28');
      expect(ymd(adapter.addMonths(luxonAt(2024, 1, 31), 1))).toBe('2024-02-29');
      expect(ymd(adapter.addMonths(luxonAt(2025, 3, 31), -1))).toBe('2025-02-28');
    });

    it('adds years, and clamps 29 February instead of rolling it', () => {
      expect(ymd(adapter.addYears(luxonAt(2025, 8, 11), 3))).toBe('2028-08-11');
      // The native adapter's `setFullYear` lands on 1 March here. Luxon clamps to the 28th.
      // The two adapters genuinely differ; pinned so a change is a decision rather than a
      // dependency bump.
      expect(ymd(adapter.addYears(luxonAt(2024, 2, 29), 1))).toBe('2025-02-28');
    });

    it('sets the time and clears the milliseconds', () => {
      const withMs = DateTime.fromObject({
        year: 2025,
        month: 8,
        day: 11,
        hour: 1,
        minute: 2,
        second: 3,
        millisecond: 456,
      });
      const set = adapter.setTime(withMs, 22, 15, 9);

      expect([adapter.getHours(set), adapter.getMinutes(set), adapter.getSeconds(set)]).toEqual([22, 15, 9]);
      // Left in place, a stray 456 ms makes two "equal" times compare unequal.
      expect(set.millisecond).toBe(0);
      expect(ymd(set)).toBe('2025-08-11');
    });
  });

  describe('comparison', () => {
    it('compares by calendar day, ignoring the clock', () => {
      expect(adapter.isSameDay(luxonAt(2025, 8, 11, 0, 0), luxonAt(2025, 8, 11, 23, 59))).toBe(true);
      expect(adapter.isSameDay(luxonAt(2025, 8, 11), luxonAt(2025, 8, 12))).toBe(false);
      expect(adapter.compareDate(luxonAt(2025, 8, 11, 23), luxonAt(2025, 8, 11, 1))).toBe(0);
    });

    it('orders by year, then month, then day', () => {
      expect(adapter.compareDate(luxonAt(2024, 12, 31), luxonAt(2025, 1, 1))).toBeLessThan(0);
      expect(adapter.compareDate(luxonAt(2025, 6, 1), luxonAt(2025, 5, 30))).toBeGreaterThan(0);
    });

    it('treats a range as inclusive of both ends', () => {
      const start = luxonAt(2025, 8, 1);
      const end = luxonAt(2025, 8, 31);
      expect(adapter.isWithinRange(start, start, end)).toBe(true);
      expect(adapter.isWithinRange(end, start, end)).toBe(true);
      expect(adapter.isWithinRange(luxonAt(2025, 7, 31), start, end)).toBe(false);
    });

    it('matches months across different days', () => {
      expect(adapter.isSameMonth(luxonAt(2025, 8, 1), luxonAt(2025, 8, 31))).toBe(true);
      expect(adapter.isSameMonth(luxonAt(2025, 8, 31), luxonAt(2024, 8, 31))).toBe(false);
    });
  });

  describe('values carrying different zones', () => {
    // This adapter exists for zone-aware apps, so its values will not all share one zone:
    // the grid is built with `createDate` in the app's zone while the selected value may
    // arrive as `DateTime.utc()`. Both zones are named explicitly below so the cases mean
    // the same thing whatever zone the runner sits in.
    const kyiv = (day: number): DateTime =>
      DateTime.fromISO(`2025-08-${String(day).padStart(2, '0')}T00:00`, { zone: 'Europe/Kyiv' });
    const utc = (day: number): DateTime =>
      DateTime.fromISO(`2025-08-${String(day).padStart(2, '0')}T00:00`, { zone: 'utc' });

    it('compares the day each value displays, not the instant its midnight falls on', () => {
      // Both values read "1 August" to a user; their midnights are three hours apart.
      // Ordering them by instant made `compareDate` contradict `isSameDay`.
      expect(adapter.isSameDay(kyiv(1), utc(1))).toBe(true);
      expect(adapter.compareDate(kyiv(1), utc(1))).toBe(0);
    });

    it('keeps both ends of a range whose bounds came in as UTC', () => {
      // The consequence of the above: `isWithinRange` is inclusive, so the first and last
      // day of the range must be in it. Ordering by instant excluded whichever end sat on
      // the wrong side of the offset.
      expect(adapter.isWithinRange(kyiv(1), utc(1), utc(31))).toBe(true);
      expect(adapter.isWithinRange(kyiv(31), utc(1), utc(31))).toBe(true);
      expect(adapter.isWithinRange(kyiv(15), utc(1), utc(31))).toBe(true);
      expect(
        adapter.isWithinRange(DateTime.fromISO('2025-07-31T00:00', { zone: 'Europe/Kyiv' }), utc(1), utc(31))
      ).toBe(false);
    });

    it('keeps two values on the same displayed day when that day has no clean midnight', () => {
      // The case that separates a field comparison from luxon's `hasSame`, which is the
      // tempting one-liner here. Cuba ends DST at 01:00 on 2 November 2025 by rewinding to
      // 00:00, so that date's midnight is ambiguous; `hasSame` re-expresses one side in the
      // other's zone and tests it against that day's bounds, and the ambiguous boundary makes
      // it answer false for two values a user reads as the same date. Comparing the displayed
      // fields cannot care.
      const havana = DateTime.fromISO('2025-11-02T00:30', { zone: 'America/Havana' });
      const noonUtc = DateTime.fromISO('2025-11-02T12:00', { zone: 'utc' });

      expect(adapter.isSameDay(noonUtc, havana)).toBe(true);
      expect(adapter.compareDate(noonUtc, havana)).toBe(0);
      expect(adapter.isWithinRange(havana, noonUtc, noonUtc)).toBe(true);
    });

    it('does not merge two calendar days that share an instant', () => {
      // The other direction: same moment, different dates on the wall. Comparing by
      // displayed fields has to keep them apart.
      const almaty = DateTime.fromISO('2025-08-11T02:00', { zone: 'Asia/Almaty' }); // 10 Aug 21:00 UTC
      const asUtc = almaty.setZone('utc');

      expect(adapter.isSameDay(almaty, asUtc)).toBe(false);
      expect(adapter.compareDate(almaty, asUtc)).toBeGreaterThan(0);
    });
  });

  describe('token formatting', () => {
    it('fills every token from the same date', () => {
      const d = luxonAt(2025, 8, 11, 13, 45, 5);
      expect(adapter.format(d, 'yyyy-MM-dd')).toBe('2025-08-11');
      expect(adapter.format(d, 'd/M/yy')).toBe('11/8/25');
      expect(adapter.format(d, 'HH:mm:ss')).toBe('13:45:05');
      expect(adapter.format(d, 'h:mm a')).toBe('1:45 pm');
      expect(adapter.format(d, 'dd MMM MMMM')).toBe('11 Aug August');
    });

    it('writes midnight and noon as twelve, not zero', () => {
      expect(adapter.format(luxonAt(2025, 8, 11, 0, 5), 'h:mm a')).toBe('12:05 am');
      expect(adapter.format(luxonAt(2025, 8, 11, 12, 5), 'h:mm a')).toBe('12:05 pm');
    });

    it('emits quoted text verbatim', () => {
      const d = luxonAt(2025, 8, 11, 9, 5);
      expect(adapter.format(d, "yyyy 'year'")).toBe('2025 year');
      expect(adapter.format(d, "d MMM 'at' HH:mm")).toBe('11 Aug at 09:05');
      // `''` is how a single quote is written.
      expect(adapter.format(d, "yyyy''")).toBe("2025'");
      // Our `MMMM` is luxon's standalone `LLLL`, so the pattern is rewritten on the way in —
      // and the rewrite must stop at a quote. It used to run over the whole string, which
      // turned the caller's literal into `LLLL`.
      expect(adapter.format(d, "MMMM 'MMMM'")).toBe('August MMMM');
    });

    it('formats in the adapter locale whatever locale the value carries', () => {
      // A consumer builds `DateTime`s with luxon's own default locale attached; the text in
      // the picker still has to follow the locale the app configured.
      const foreign = DateTime.fromISO('2025-08-11T13:45', { locale: 'ru-RU' });
      expect(adapter.format(foreign, 'MMMM')).toBe('August');
    });

    it('resolves the named formats through luxon macros', () => {
      // These six are what `<wr-date-picker>` writes into its input by default, so they are
      // pinned for one locale rather than described.
      const d = luxonAt(2025, 8, 11, 13, 45, 5);
      expect(adapter.format(d, 'shortDate')).toBe('11/08/2025');
      expect(adapter.format(d, 'mediumDate')).toBe('11 Aug 2025');
      expect(adapter.format(d, 'longDate')).toBe('11 August 2025');
      expect(adapter.format(d, 'time')).toBe('13:45');
      expect(adapter.format(d, 'shortDateTime')).toBe('11/08/2025, 13:45');
      expect(adapter.format(d, 'mediumDateTime')).toBe('11 Aug 2025, 13:45');
    });
  });

  describe('token parsing', () => {
    it('reads back what it wrote', () => {
      const parsed = adapter.parse('2025-08-11', 'yyyy-MM-dd');
      expect(parsed).not.toBeNull();
      expect(ymd(parsed!)).toBe('2025-08-11');
    });

    it('round-trips the default named format', () => {
      // What the picker does on every blur: format, then parse the text back. Luxon derives
      // its macro parser from ICU rather than from its own output, so the round trip is not
      // universal and this is pinned for one locale rather than described: `mediumDate`,
      // `longDate` and `mediumDateTime` written in ru-RU ("11 авг. 2025 г.") or ja-JP
      // ("2025年8月11日") come back unparsable from luxon itself, which is upstream behaviour
      // and not something the adapter can fix.
      const written = adapter.format(luxonAt(2025, 8, 11), 'shortDate');
      const back = adapter.parse(written, 'shortDate');

      expect(back).not.toBeNull();
      expect([adapter.getYear(back!), adapter.getMonth(back!), adapter.getDate(back!)]).toEqual([2025, 7, 11]);
    });

    it('round-trips a pattern with quoted text', () => {
      const written = adapter.format(luxonAt(2025, 8, 11, 9, 5), "d MMM 'at' HH:mm");
      expect(written).toBe('11 Aug at 09:05');

      const parsed = adapter.parse(written, "d MMM 'at' HH:mm");
      expect(parsed).not.toBeNull();
      expect([adapter.getMonth(parsed!), adapter.getDate(parsed!), adapter.getHours(parsed!)]).toEqual([7, 11, 9]);
    });

    it('reads a twelve-hour clock with its meridiem', () => {
      expect(adapter.getHours(adapter.parse('11/08/2025 1:45 pm', 'dd/MM/yyyy h:mm a')!)).toBe(13);
      expect(adapter.getHours(adapter.parse('11/08/2025 12:05 am', 'dd/MM/yyyy h:mm a')!)).toBe(0);
    });

    it('refuses a value that does not match the pattern', () => {
      expect(adapter.parse('11 August 2025', 'yyyy-MM-dd')).toBeNull();
      expect(adapter.parse('2025-08-11 and then some', 'yyyy-MM-dd')).toBeNull();
      expect(adapter.parse('', 'yyyy-MM-dd')).toBeNull();
      expect(adapter.parse('   ', 'yyyy-MM-dd')).toBeNull();
    });

    it('tolerates surrounding whitespace', () => {
      // Luxon itself rejects ` 2025-08-11 ` outright; the adapter trims before handing it
      // over, which is what makes a pasted value work — and what the other two adapters do,
      // so the same input cannot depend on which one an app registered.
      expect(ymd(adapter.parse('  2025-08-11  ', 'yyyy-MM-dd')!)).toBe('2025-08-11');
      expect(adapter.getHours(adapter.parse('\t2025-08-11 09:05\n', 'yyyy-MM-dd HH:mm')!)).toBe(9);
    });

    it('returns null rather than an invalid DateTime', () => {
      // Luxon does not throw on nonsense: it hands back a `DateTime` whose `isValid` is
      // false, and every accessor on that value answers `null`. A picker that stored one
      // would show an empty input it could not clear, so the adapter converts it to `null`
      // at the boundary.
      const cases: readonly (readonly [string, string])[] = [
        ['2025-13-01', 'yyyy-MM-dd'],
        ['2025-00-01', 'yyyy-MM-dd'],
        ['2025-02-30', 'yyyy-MM-dd'],
        ['2025-08-00', 'yyyy-MM-dd'],
        ['2025-08-11 25:00', 'yyyy-MM-dd HH:mm'],
        ['2025-08-11 12:60', 'yyyy-MM-dd HH:mm'],
      ];

      for (const [value, pattern] of cases) expect(adapter.parse(value, pattern)).toBeNull();
    });

    it('reads a month by name, in short and long form', () => {
      expect(adapter.getMonth(adapter.parse('11 Aug 2025', 'd MMM yyyy')!)).toBe(7);
      expect(adapter.getMonth(adapter.parse('11 August 2025', 'd MMMM yyyy')!)).toBe(7);
      expect(adapter.parse('11 Frobuary 2025', 'd MMMM yyyy')).toBeNull();
    });

    it('accepts the last day of a short month', () => {
      expect(ymd(adapter.parse('2024-02-29', 'yyyy-MM-dd')!)).toBe('2024-02-29');
      expect(adapter.parse('2025-02-29', 'yyyy-MM-dd')).toBeNull();
    });
  });

  describe('locale information', () => {
    it('starts the week where the locale does', () => {
      // en-GB starts on Monday; the contract counts Sunday as 0. `Intl` reports Sunday as 7,
      // so the `% 7` is what keeps a Sunday-first locale from asking for column seven.
      expect(adapter.getFirstDayOfWeek()).toBe(1);
      expect(adapterFor('en-US').getFirstDayOfWeek()).toBe(0);
    });

    it('names the days from the first day of the week onwards', () => {
      // Luxon hands back Monday-first whatever the locale; the rotation below it is ours.
      const names = adapter.getDayOfWeekNames('short');
      expect(names.length).toBe(7);
      expect(names[0]).toBe('Mon');
      expect(names[6]).toBe('Sun');
    });

    it('rotates the day names for a Sunday-first locale', () => {
      const us = adapterFor('en-US');
      expect(us.getDayOfWeekNames('short')).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
      // Every name still appears exactly once — a rotation that drops or repeats one is the
      // failure mode of building the Sunday-first list by hand.
      expect(new Set(us.getDayOfWeekNames('long')).size).toBe(7);
    });

    it('names all twelve months, in each of the three styles', () => {
      const names = adapter.getMonthNames('long');
      expect(names.length).toBe(12);
      expect(names[0]).toBe('January');
      expect(names[11]).toBe('December');
      // The month dropdown asks for `short` and the year grid for `narrow`; a style that is
      // accepted and then ignored renders twelve full month names into a cell built for three
      // letters.
      expect(adapter.getMonthNames('short').slice(0, 2)).toEqual(['Jan', 'Feb']);
      expect(adapter.getMonthNames('narrow').slice(0, 2)).toEqual(['J', 'F']);
    });

    it('uses one word for a month in the grid and in the text', () => {
      // Russian inflects: "августа" is the form a date sentence takes, "август" the
      // standalone one. `MMMM` maps to luxon's standalone `LLLL` precisely so the month
      // written into the input matches the label in the month grid, which comes from
      // `getMonthNames`. Mapping it to luxon's `MMMM` instead would round-trip fine and
      // still show the user two different words.
      const ru = adapterFor('ru-RU');
      const august = ru.createDate(2025, 7, 11);

      expect(ru.format(august, 'MMMM')).toBe('август');
      expect(ru.getMonthNames('long')[ru.getMonth(august)]).toBe('август');
      expect(ru.getDayOfWeekNames('short')).toEqual(['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']);
    });

    it('falls back to the locale tag when the engine cannot answer', () => {
      // `Intl.Locale#getWeekInfo` only reached Safari in 17, so the fallback is live code for
      // real users — and unreachable in this runner, where Node answers the probe. Replacing
      // `Intl` with one whose `Locale` lacks the method is the scenario itself, not a stub
      // that bends the assertion: everything else on `Intl` is inherited untouched so luxon
      // keeps working.
      vi.stubGlobal('Intl', Object.assign(Object.create(Intl), { Locale: class {} }));

      expect(adapterFor('en-US').getFirstDayOfWeek()).toBe(0);
      expect(adapterFor('en-GB').getFirstDayOfWeek()).toBe(1);
      expect(adapterFor('ru-RU').getFirstDayOfWeek()).toBe(1);
    });
  });
});
