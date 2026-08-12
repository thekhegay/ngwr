import { TestBed } from '@angular/core/testing';

import { setDefaultOptions } from 'date-fns';
import { enGB } from 'date-fns/locale/en-GB';
import { WrDateAdapter } from 'ngwr/date-adapter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { provideWrDateFnsAdapter } from './provide-wr-date-fns-adapter';
import { WrDateFnsAdapter } from './wr-date-fns-adapter';

/**
 * The date-fns adapter is a DROP-IN for the native one: the calendar, both pickers and the
 * range panel compute against `WrDateAdapter`, so swapping the provider must not move a day.
 * These tests therefore mirror `wr-native-date-adapter.spec.ts` case for case, and every
 * place the two adapters genuinely disagree is pinned with the reason — a silent divergence
 * is the whole failure mode this file exists to catch.
 *
 * Two hazards are NOT observable in this runner and are worth stating rather than faking:
 * `Asia/Almaty` has no daylight saving, so calendar math and millisecond math agree on every
 * date here; and date-fns formats/parses in the system time zone, so nothing below says
 * anything about a zone-crossing value.
 */
describe('WrDateFnsAdapter', () => {
  let adapter: WrDateFnsAdapter;

  const at = (y: number, m: number, d: number, h = 0, min = 0, s = 0): Date => new Date(y, m, d, h, min, s);
  const iso = (date: Date): string =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  /** A second adapter under a different locale, without disturbing the one under test. */
  const withLocale = (locale: string): WrDateFnsAdapter => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrDateFnsAdapter({ locale })] });
    return TestBed.inject(WrDateAdapter) as WrDateFnsAdapter;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrDateFnsAdapter({ locale: 'en-GB' })] });
    adapter = TestBed.inject(WrDateAdapter) as WrDateFnsAdapter;
  });

  afterEach(() => {
    // date-fns keeps its default options in module scope, and `setDefaultOptions({})` MERGES
    // rather than clears — only an explicit `undefined` removes a key. One test below sets a
    // locale, so the reset lives here where it cannot be skipped by a failing assertion.
    setDefaultOptions({ locale: undefined });
  });

  describe('registration', () => {
    it('answers the shared token, so components pick it up without knowing about date-fns', () => {
      // `provideWrDateFnsAdapter` delegates to `provideWrDateAdapter`, whose default is the
      // NATIVE adapter — forgetting to pass `adapter` through would leave every component on
      // the native implementation while the app believes it swapped.
      expect(adapter).toBeInstanceOf(WrDateFnsAdapter);
      expect(adapter).toBeInstanceOf(WrDateAdapter);
    });
  });

  describe('identity and accessors', () => {
    it('clones without aliasing', () => {
      const original = at(2025, 7, 11, 13, 45, 5);
      const copy = adapter.clone(original);

      expect(copy).not.toBe(original);
      expect(copy.getTime()).toBe(original.getTime());
    });

    it('builds a date from parts, including a two-digit year', () => {
      // `new Date(25, …)` means 1925; the explicit `setFullYear` is what keeps year 25 as 25.
      expect(iso(adapter.createDate(2025, 1, 28))).toBe('2025-02-28');
      expect(adapter.getYear(adapter.createDate(25, 0, 1))).toBe(25);
    });

    it('rolls out-of-range parts forward instead of refusing them', () => {
      // month 12 is "January of next year" and day 32 is "the first of the month after" —
      // `createDate` does NOT validate, exactly as the native adapter does not. Callers that
      // take digits from a user must go through `parse`, which DOES refuse (see below).
      expect(iso(adapter.createDate(2025, 12, 1))).toBe('2026-01-01');
      expect(iso(adapter.createDate(2025, 0, 32))).toBe('2025-02-01');
      expect(iso(adapter.createDate(2025, 1, 30))).toBe('2025-03-02');
    });

    it('rejects an invalid date object', () => {
      expect(adapter.isValid(new Date('nonsense'))).toBe(false);
      expect(adapter.isValid(at(2025, 0, 1))).toBe(true);
    });

    it('reads every field back', () => {
      const d = at(2025, 7, 11, 13, 45, 5);
      expect([adapter.getYear(d), adapter.getMonth(d), adapter.getDate(d)]).toEqual([2025, 7, 11]);
      expect([adapter.getHours(d), adapter.getMinutes(d), adapter.getSeconds(d)]).toEqual([13, 45, 5]);
      // 11 Aug 2025 is a Monday, and the adapter counts Sunday as 0 — date-fns's `getDay`
      // already uses that origin, so no shift is applied. Luxon's does not, hence its `% 7`.
      expect(adapter.getDayOfWeek(d)).toBe(1);
    });

    it('knows how long each month is, leap years included', () => {
      expect(adapter.getDaysInMonth(at(2025, 1, 1))).toBe(28);
      expect(adapter.getDaysInMonth(at(2024, 1, 1))).toBe(29);
      expect(adapter.getDaysInMonth(at(2000, 1, 1))).toBe(29); // divisible by 400 — still leap
      expect(adapter.getDaysInMonth(at(1900, 1, 1))).toBe(28); // divisible by 100 — not leap
      expect(adapter.getDaysInMonth(at(2025, 3, 1))).toBe(30);
      expect(adapter.getDaysInMonth(at(2025, 11, 1))).toBe(31);
    });

    it('reports NaN from every getter for an invalid date rather than throwing', () => {
      // A picker asks the adapter about whatever is in its text field. NaN propagates into a
      // blank cell; a throw takes the whole view down, and a plausible 0 would render 1 Jan
      // 1900 as if it were real.
      const bad = new Date('nonsense');

      expect(adapter.isValid(bad)).toBe(false);
      for (const n of [
        adapter.getYear(bad),
        adapter.getMonth(bad),
        adapter.getDate(bad),
        adapter.getDayOfWeek(bad),
        adapter.getDaysInMonth(bad),
        adapter.getHours(bad),
        adapter.getMinutes(bad),
        adapter.getSeconds(bad),
      ]) {
        expect(n).toBeNaN();
      }
      // Cloning and the math keep it invalid instead of inventing an epoch date.
      expect(adapter.isValid(adapter.clone(bad))).toBe(false);
      expect(adapter.isValid(adapter.addDays(bad, 1))).toBe(false);
      expect(adapter.isValid(adapter.setTime(bad, 1, 0, 0))).toBe(false);
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

    it('crosses the year in both directions when it adds months', () => {
      expect(iso(adapter.addMonths(at(2025, 11, 15), 1))).toBe('2026-01-15');
      expect(iso(adapter.addMonths(at(2025, 0, 15), -1))).toBe('2024-12-15');
      expect(iso(adapter.addMonths(at(2025, 5, 15), 12))).toBe('2026-06-15');
    });

    it('adds years, and CLAMPS 29 February instead of rolling into March', () => {
      expect(iso(adapter.addYears(at(2025, 7, 11), 3))).toBe('2028-08-11');
      // The one arithmetic result where this adapter and the native one differ: date-fns
      // routes `addYears` through `addMonths`, which clamps, while `Date.setFullYear` rolls
      // over — the native spec pins `2025-03-01` for this same input. Pinned on both sides so
      // the disagreement is a known, deliberate one rather than a surprise after a swap.
      expect(iso(adapter.addYears(at(2024, 1, 29), 1))).toBe('2025-02-28');
    });

    it('sets the time and clears the milliseconds', () => {
      const withMs = new Date(2025, 7, 11, 1, 2, 3, 456);
      const set = adapter.setTime(withMs, 22, 15, 9);

      expect([set.getHours(), set.getMinutes(), set.getSeconds(), set.getMilliseconds()]).toEqual([22, 15, 9, 0]);
      // The time picker writes a clock onto the day the user already chose — moving that day
      // would silently re-book an appointment.
      expect(iso(set)).toBe('2025-08-11');
      expect(iso(adapter.setTime(at(2025, 7, 11, 23, 59, 59), 0, 0, 0))).toBe('2025-08-11');
    });

    it('never mutates its argument', () => {
      // The contract on `WrDateAdapter` is explicit: every "mutating" method returns a NEW
      // value. `Date` is mutable, so an implementation written with `setDate` on the argument
      // would pass every assertion above and corrupt the caller's state.
      const original = at(2025, 0, 31, 8, 30, 15);
      const before = original.getTime();

      adapter.addDays(original, 5);
      adapter.addMonths(original, 5);
      adapter.addYears(original, 5);
      adapter.setTime(original, 0, 0, 0);
      adapter.clone(original).setFullYear(1999);

      expect(original.getTime()).toBe(before);
    });
  });

  describe('comparison', () => {
    it('compares by calendar day, ignoring the clock', () => {
      expect(adapter.isSameDay(at(2025, 7, 11, 0, 0), at(2025, 7, 11, 23, 59, 59))).toBe(true);
      expect(adapter.isSameDay(at(2025, 7, 11), at(2025, 7, 12))).toBe(false);
      expect(adapter.compareDate(at(2025, 7, 11, 23, 0), at(2025, 7, 11, 1, 0))).toBe(0);
    });

    it('separates one minute either side of midnight', () => {
      // The two values are 120 seconds apart — a comparison done on the raw timestamp would
      // call them the same day, and the range panel would then paint one cell for two days.
      const late = at(2025, 7, 11, 23, 59, 0);
      const early = at(2025, 7, 12, 0, 1, 0);

      expect(adapter.isSameDay(late, early)).toBe(false);
      expect(adapter.compareDate(late, early)).toBeLessThan(0);
      expect(adapter.compareDate(early, late)).toBeGreaterThan(0);
    });

    it('orders by year, then month, then day', () => {
      expect(adapter.compareDate(at(2024, 11, 31), at(2025, 0, 1))).toBeLessThan(0);
      expect(adapter.compareDate(at(2025, 5, 1), at(2025, 4, 30))).toBeGreaterThan(0);
      expect(adapter.compareDate(at(2025, 7, 11), at(2024, 7, 11))).toBeGreaterThan(0);
    });

    it('treats a range as inclusive of both ends', () => {
      const start = at(2025, 7, 1);
      const end = at(2025, 7, 31);
      expect(adapter.isWithinRange(start, start, end)).toBe(true);
      expect(adapter.isWithinRange(end, start, end)).toBe(true);
      expect(adapter.isWithinRange(at(2025, 7, 15, 23, 59), start, end)).toBe(true);
      expect(adapter.isWithinRange(at(2025, 6, 31), start, end)).toBe(false);
      expect(adapter.isWithinRange(at(2025, 8, 1), start, end)).toBe(false);
    });

    it('says no rather than throwing when a range bound is invalid', () => {
      // `compareAsc` on an invalid date is NaN, and every NaN comparison is false — which is
      // the answer a picker wants: no highlight, no crash.
      const bad = new Date('nonsense');
      expect(adapter.isWithinRange(at(2025, 7, 11), bad, at(2025, 7, 31))).toBe(false);
      expect(adapter.compareDate(bad, at(2025, 7, 11))).toBeNaN();
    });

    it('matches months across different days', () => {
      expect(adapter.isSameMonth(at(2025, 7, 1), at(2025, 7, 31, 23, 59))).toBe(true);
      // Same month number, different year — the trap a plain `getMonth()` comparison falls
      // into, and the calendar grid greys out "other month" cells with this.
      expect(adapter.isSameMonth(at(2025, 7, 31), at(2024, 7, 31))).toBe(false);
      expect(adapter.isSameMonth(at(2025, 7, 31), at(2025, 8, 1))).toBe(false);
    });
  });

  describe('named formats', () => {
    const d = at(2025, 7, 11, 13, 45, 5);

    it('maps every WrDateFormat key onto a date-fns long pattern', () => {
      // All six keys of the union, so a typo in NAMED_PATTERNS (`PP` where `PPP` belongs)
      // cannot hide: mediumDate and longDate would otherwise both look "reasonable".
      expect(adapter.format(d, 'shortDate')).toBe('08/11/2025');
      expect(adapter.format(d, 'mediumDate')).toBe('Aug 11, 2025');
      expect(adapter.format(d, 'longDate')).toBe('August 11th, 2025');
      expect(adapter.format(d, 'time')).toBe('1:45 PM');
      expect(adapter.format(d, 'shortDateTime')).toBe('08/11/2025 1:45 PM');
      expect(adapter.format(d, 'mediumDateTime')).toBe('Aug 11, 2025 1:45 PM');
    });

    it('KNOWN GAP: named formats ignore WR_DATE_LOCALE and always render en-US', () => {
      // Every expectation above was produced under `locale: 'en-GB'`, where a short date is
      // `11/08/2025` and there is no `11th`. date-fns resolves `P`/`PP`/`PPP`/`p` against a
      // date-fns `Locale` OBJECT, which the adapter never passes, so it silently falls back
      // to enUS — while `getMonthNames` / `getDayOfWeekNames` below DO honour the locale
      // through `Intl`. The luxon adapter forwards its locale; this one cannot without a new
      // provider option, because date-fns locales are separate modules and importing them all
      // would defeat tree-shaking.
      //
      // Pinned deliberately, not endorsed: the day the adapter learns to take a locale, this
      // case goes red and the change is a decision instead of an accident. The parsing side
      // of the same gap is the dangerous one — see 'reads a named format in US field order'.
      const gb = adapter.format(d, 'shortDate');
      const ru = withLocale('ru-RU').format(d, 'longDate');

      expect(gb).toBe('08/11/2025');
      expect(gb).not.toBe('11/08/2025');
      expect(ru).toBe('August 11th, 2025');
    });

    it("leaves date-fns's own default-locale hook working, which is the consumer's only lever", () => {
      // Because the adapter passes NO locale, date-fns falls back to its module-level default
      // — so `setDefaultOptions({ locale })` at bootstrap is what a consumer has today. This
      // case is the difference between "does not forward a locale" (recoverable) and
      // "hard-codes enUS" (not): passing an explicit locale in `format` would defeat the hook
      // and turn this red.
      setDefaultOptions({ locale: enGB });

      expect(adapter.format(d, 'shortDate')).toBe('11/08/2025');
      expect(iso(adapter.parse('11/08/2025', 'shortDate')!)).toBe('2025-08-11');
    });
  });

  describe('token formatting', () => {
    it('fills every token from the same date', () => {
      const d = at(2025, 7, 11, 13, 45, 5);
      expect(adapter.format(d, 'yyyy-MM-dd')).toBe('2025-08-11');
      expect(adapter.format(d, 'd/M/yy')).toBe('11/8/25');
      expect(adapter.format(d, 'HH:mm:ss')).toBe('13:45:05');
      expect(adapter.format(d, 'MMMM')).toBe('August');
      expect(adapter.format(d, 'MMM')).toBe('Aug');
    });

    it('writes the meridiem in UPPER case, where the native adapter writes lower', () => {
      // date-fns `a` is `AM`/`PM`; the native adapter's `a` is `am`/`pm`. A consumer who wants
      // the native casing has `aaa`, which is why both are pinned here rather than only the
      // one this adapter happens to produce.
      const d = at(2025, 7, 11, 13, 45, 5);
      expect(adapter.format(d, 'h:mm a')).toBe('1:45 PM');
      expect(adapter.format(d, 'h:mm aaa')).toBe('1:45 pm');
    });

    it('writes midnight and noon as twelve, not zero', () => {
      expect(adapter.format(at(2025, 7, 11, 0, 5), 'h:mm a')).toBe('12:05 AM');
      expect(adapter.format(at(2025, 7, 11, 12, 5), 'h:mm a')).toBe('12:05 PM');
      expect(adapter.format(at(2025, 7, 11, 0, 5), 'HH:mm')).toBe('00:05');
    });

    it('emits quoted text verbatim', () => {
      // Same escaping grammar as the native adapter and LDML — `'at'` is literal text, `''`
      // is one apostrophe — so a pattern written for one adapter reads the same in the other.
      expect(adapter.format(at(2025, 7, 11), "yyyy 'year'")).toBe('2025 year');
      expect(adapter.format(at(2025, 7, 11, 9, 5), "d MMM 'at' HH:mm")).toBe('11 Aug at 09:05');
      expect(adapter.format(at(2025, 7, 11), "yyyy''")).toBe("2025'");
    });

    it('THROWS on unquoted letters and on the protected tokens, where the native adapter guesses', () => {
      // The native adapter treats an unknown letter as literal text and turns `yyyy [year]`
      // into `2025 [yeamr]`; date-fns refuses the pattern outright. Neither is "the" contract,
      // so the difference is pinned: a consumer swapping adapters finds out at the first
      // render, and the message names the offending character.
      expect(() => adapter.format(at(2025, 7, 11), 'yyyy [year]')).toThrow(RangeError);
      // `YYYY` (week-numbering year) and `DD` (day of year) are the classic silent-wrong-date
      // tokens; date-fns rejects them with a "use yyyy/dd instead" error.
      expect(() => adapter.format(at(2025, 7, 11), 'YYYY-MM-DD')).toThrow(RangeError);
    });

    it('THROWS when handed an invalid date, where the native adapter prints NaN', () => {
      // Every in-library caller guards with `isValid` first (`wr-date-picker` and the `wrDate`
      // pipe both do). Pinned so that guard is understood as REQUIRED with this adapter, not
      // as defensive style.
      expect(() => adapter.format(new Date('nonsense'), 'yyyy-MM-dd')).toThrow(RangeError);
      expect(() => adapter.format(new Date('nonsense'), 'shortDate')).toThrow(RangeError);
    });
  });

  describe('token parsing', () => {
    it('reads back what it wrote', () => {
      const parsed = adapter.parse('2025-08-11', 'yyyy-MM-dd');
      expect(parsed).not.toBeNull();
      expect(iso(parsed!)).toBe('2025-08-11');
      // Midnight, not "now" — a value that carried the current clock would sort a date
      // typed today after the same date picked from the calendar.
      expect([parsed!.getHours(), parsed!.getMinutes(), parsed!.getSeconds()]).toEqual([0, 0, 0]);
    });

    it('round-trips a pattern with quoted text', () => {
      const written = adapter.format(at(2025, 7, 11, 9, 5), "d MMM 'at' HH:mm");
      expect(written).toBe('11 Aug at 09:05');

      const parsed = adapter.parse(written, "d MMM 'at' HH:mm");
      expect(parsed).not.toBeNull();
      expect([parsed!.getMonth(), parsed!.getDate(), parsed!.getHours()]).toEqual([7, 11, 9]);
      // No year token in the pattern, so it comes from the reference date — today — which is
      // what the native adapter does too.
      expect(parsed!.getFullYear()).toBe(new Date().getFullYear());
    });

    it('reads a twelve-hour clock with its meridiem, in either case', () => {
      expect(adapter.parse('11/08/2025 1:45 PM', 'dd/MM/yyyy h:mm a')!.getHours()).toBe(13);
      expect(adapter.parse('11/08/2025 1:45 pm', 'dd/MM/yyyy h:mm a')!.getHours()).toBe(13);
      // 12 am is hour 0, not 12 — the classic off-by-twelve.
      expect(adapter.parse('11/08/2025 12:05 AM', 'dd/MM/yyyy h:mm a')!.getHours()).toBe(0);
      expect(adapter.parse('11/08/2025 12:05 PM', 'dd/MM/yyyy h:mm a')!.getHours()).toBe(12);
    });

    it('returns null for garbage instead of an invalid date', () => {
      // The contract is `null`. An Invalid Date handed back here would pass `if (parsed)` in
      // every caller and then poison the model, the header and the highlighted cell at once.
      for (const value of ['nonsense', '!!!', '11 August 2025', 'yyyy-MM-dd']) {
        expect(adapter.parse(value, 'yyyy-MM-dd')).toBeNull();
      }
    });

    it('returns null for an empty or whitespace-only value', () => {
      expect(adapter.parse('', 'yyyy-MM-dd')).toBeNull();
      expect(adapter.parse('   ', 'yyyy-MM-dd')).toBeNull();
    });

    it('returns null for a partial value, and for one with trailing junk', () => {
      // Half-typed input is the normal state of a text field: `2025-08` must stay null until
      // the day arrives, or the picker jumps to a date the user never finished typing.
      expect(adapter.parse('2025-08', 'yyyy-MM-dd')).toBeNull();
      expect(adapter.parse('2025', 'yyyy-MM-dd')).toBeNull();
      expect(adapter.parse('2025-08-11 and more', 'yyyy-MM-dd')).toBeNull();
      expect(adapter.parse('11/08/2025', 'dd/MM/yyyy h:mm a')).toBeNull();
    });

    it('tolerates surrounding whitespace', () => {
      // date-fns itself rejects ` 2025-08-11 `; the adapter trims first, which is what makes
      // a pasted value work.
      expect(iso(adapter.parse('  2025-08-11  ', 'yyyy-MM-dd')!)).toBe('2025-08-11');
    });

    it('refuses parts that fit the pattern but not the calendar', () => {
      expect(adapter.parse('2025-13-01', 'yyyy-MM-dd')).toBeNull();
      expect(adapter.parse('2025-00-01', 'yyyy-MM-dd')).toBeNull();
      expect(adapter.parse('2025-02-30', 'yyyy-MM-dd')).toBeNull();
      expect(adapter.parse('2025-08-00', 'yyyy-MM-dd')).toBeNull();
      expect(adapter.parse('2025-08-32', 'yyyy-MM-dd')).toBeNull();
      expect(adapter.parse('2025-08-11 25:00', 'yyyy-MM-dd HH:mm')).toBeNull();
      expect(adapter.parse('2025-08-11 12:60', 'yyyy-MM-dd HH:mm')).toBeNull();
    });

    it('accepts the last day of a short month only in the years that have it', () => {
      expect(iso(adapter.parse('2024-02-29', 'yyyy-MM-dd')!)).toBe('2024-02-29');
      expect(adapter.parse('2025-02-29', 'yyyy-MM-dd')).toBeNull();
    });

    it('reads a month by name, in short and long form', () => {
      expect(adapter.parse('11 Aug 2025', 'd MMM yyyy')!.getMonth()).toBe(7);
      expect(adapter.parse('11 August 2025', 'd MMMM yyyy')!.getMonth()).toBe(7);
      expect(adapter.parse('11 Frobuary 2025', 'd MMMM yyyy')).toBeNull();
    });

    it('reads a named format in US field order, whatever the locale says', () => {
      // The sharp end of the locale gap pinned above. `wr-date-picker` defaults to
      // `'shortDate'`, so under `locale: 'en-GB'` this adapter WRITES 11 Aug as `08/11/2025`
      // and READS `11/08/2025` back as 8 November — self-consistent, but not what a UK user
      // typed. It stays a round-trip within the adapter, which is why nothing else catches it.
      const written = adapter.format(at(2025, 7, 11), 'shortDate');
      expect(iso(adapter.parse(written, 'shortDate')!)).toBe('2025-08-11');
      expect(iso(adapter.parse('11/08/2025', 'shortDate')!)).toBe('2025-11-08');
    });
  });

  describe('locale information', () => {
    it('starts the week where the locale does', () => {
      // en-GB starts on Monday; the adapter reports Sunday as 0. `Intl.Locale.getWeekInfo`
      // answers 1–7 with Sunday as 7, so the `% 7` is what makes Sunday come back as 0 —
      // dropping it turns a US calendar into a Saturday-first one.
      expect(adapter.getFirstDayOfWeek()).toBe(1);
      expect(withLocale('en-US').getFirstDayOfWeek()).toBe(0);
      expect(withLocale('ru-RU').getFirstDayOfWeek()).toBe(1);
    });

    it('names the days from the first day of the week onwards', () => {
      // The whole row, not just its head: a rotation that is off by one still starts on Mon
      // for `['Mon', 'Sun', 'Sat', …]`.
      expect(adapter.getDayOfWeekNames('short')).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
      expect(withLocale('en-US').getDayOfWeekNames('short')).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    });

    it('offers the three widths the calendar header uses', () => {
      expect(adapter.getDayOfWeekNames('narrow')).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
      expect(adapter.getDayOfWeekNames('long')[0]).toBe('Monday');
      expect(adapter.getDayOfWeekNames('long')).toHaveLength(7);
    });

    it('names all twelve months', () => {
      const names = adapter.getMonthNames('long');
      expect(names).toHaveLength(12);
      expect(names[0]).toBe('January');
      expect(names[11]).toBe('December');
      expect(adapter.getMonthNames('short')[7]).toBe('Aug');
    });

    it('follows a non-English locale for the names and the week start', () => {
      // Unlike `format`, these three go through `Intl`, so they DO answer in the locale —
      // which is exactly the inconsistency the KNOWN GAP case above describes.
      const ru = withLocale('ru-RU');

      expect(ru.getFirstDayOfWeek()).toBe(1);
      expect(ru.getDayOfWeekNames('short')).toEqual(['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']);
      expect(ru.getMonthNames('long')[0]).toBe('январь');
    });
  });
});
