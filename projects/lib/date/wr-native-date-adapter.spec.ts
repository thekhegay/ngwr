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

  /**
   * The blocker this suite exists to keep closed: a named format has to READ BACK what
   * it PRINTED. It used to delegate to `new Date(raw)`, which understands only
   * Anglo-American forms — `new Date('15.3.2026')` and `new Date('14:30')` are both
   * `Invalid Date`, and `new Date('1')` is 1 January 2001 — so retyping a de-DE date
   * committed 2001 on the first keystroke, and `mode="time"` collapsed to midnight in
   * every locale including en-US.
   */
  describe('named formats round-trip', () => {
    const named = ['shortDate', 'mediumDate', 'longDate', 'shortDateTime', 'mediumDateTime'] as const;
    // Every shape the fix has to survive: field order, a declining month name, a
    // 12-hour clock, a non-Latin numbering system with bidi marks in its separators,
    // and a locale that writes the year first.
    const locales = ['en-US', 'en-GB', 'de-DE', 'fi-FI', 'ru-RU', 'ja-JP', 'ar-SA', 'fr-FR', 'cs-CZ'];

    const adapterFor = (locale: string): WrNativeDateAdapter => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideWrDateAdapter({ locale })] });
      return TestBed.inject(WrDateAdapter) as WrNativeDateAdapter;
    };

    for (const locale of locales) {
      it(`reads back every named format it wrote in ${locale}`, () => {
        const local = adapterFor(locale);
        const source = at(2026, 2, 15, 14, 30);

        for (const key of named) {
          const printed = local.format(source, key);
          const parsed = local.parse(printed, key);

          expect(parsed, `${locale} ${key} printed ${printed}`).not.toBeNull();
          expect(
            [parsed!.getFullYear(), parsed!.getMonth(), parsed!.getDate()],
            `${locale} ${key} printed ${printed}`
          ).toEqual([2026, 2, 15]);
          if (key.endsWith('DateTime')) {
            expect([parsed!.getHours(), parsed!.getMinutes()], `${locale} ${key}`).toEqual([14, 30]);
          }
        }
      });

      it(`reads back the time it wrote in ${locale}`, () => {
        const local = adapterFor(locale);
        const printed = local.format(at(2026, 2, 15, 14, 30), 'time');
        const parsed = local.parse(printed, 'time');

        expect(parsed, `${locale} printed ${printed}`).not.toBeNull();
        expect([parsed!.getHours(), parsed!.getMinutes()], `${locale} printed ${printed}`).toEqual([14, 30]);
      });
    }

    it('does not commit a partial value on the way to a whole one', () => {
      // The defect was not that `15.3.2026` failed — it is that `1` SUCCEEDED, as the
      // year 2001, and the picker committed it. Every prefix must refuse.
      const de = adapterFor('de-DE');
      const whole = de.format(at(2026, 2, 15), 'shortDate');
      expect(whole).toBe('15.3.2026');

      for (const prefix of ['1', '15', '15.', '15.3', '15.3.', '15.3.2', '15.3.202']) {
        expect(de.parse(prefix, 'shortDate'), `prefix ${prefix}`).toBeNull();
      }
      expect(de.parse(whole, 'shortDate')).not.toBeNull();

      // One prefix does parse, and it is the one that is genuinely a date: a two-digit
      // year is a year — `1/5/25` cleaning up to 2025 is documented picker behaviour —
      // so `15.3.20` reads as 2020 on the way past and the next keystroke replaces it.
      // What can no longer happen is the FIRST keystroke committing a year.
      expect(de.parse('15.3.20', 'shortDate')!.getFullYear()).toBe(2020);
    });

    it('refuses a string in another locale rather than guessing at it', () => {
      const de = adapterFor('de-DE');
      // Unambiguously American, and read in a d.M.y locale: refusing leaves the
      // committed value alone, which is the contract. Silently reading it as
      // 3 January would be the worse answer.
      expect(de.parse('3/15/2026', 'shortDate')).toBeNull();
      expect(de.parse('nonsense', 'shortDate')).toBeNull();
      expect(de.parse('15.13.2026', 'shortDate')).toBeNull();
      expect(de.parse('30.2.2026', 'shortDate')).toBeNull();
    });

    it('reads a twelve-hour clock back with its own day period', () => {
      const us = adapterFor('en-US');
      expect(us.parse(us.format(at(2026, 2, 15, 2, 30), 'time'), 'time')!.getHours()).toBe(2);
      expect(us.parse(us.format(at(2026, 2, 15, 14, 30), 'time'), 'time')!.getHours()).toBe(14);
      expect(us.parse(us.format(at(2026, 2, 15, 0, 5), 'time'), 'time')!.getHours()).toBe(0);
      expect(us.parse(us.format(at(2026, 2, 15, 12, 5), 'time'), 'time')!.getHours()).toBe(12);
      // ICU writes a NARROW NO-BREAK SPACE before `PM`; a keyboard writes a plain one,
      // and typing it must not be the difference between a date and midnight.
      expect(us.parse('02:30 PM', 'time')!.getHours()).toBe(14);
      expect(us.parse('2:30 pm', 'time')!.getHours()).toBe(14);
    });

    it('reads its own non-Latin digits, and ASCII ones typed on a Latin keyboard', () => {
      const ar = adapterFor('ar-SA');
      const printed = ar.format(at(2026, 2, 15), 'shortDate');
      // Arabic-Indic digits, and U+200F around the separators.
      expect(printed).toMatch(/[\u0660-\u0669]/);

      const parsed = ar.parse(printed, 'shortDate');
      expect(parsed).not.toBeNull();
      expect([parsed!.getFullYear(), parsed!.getMonth(), parsed!.getDate()]).toEqual([2026, 2, 15]);

      // Same string with every bidi mark removed — what lands in the field after a
      // select-all and retype.
      const typed = printed.replace(/[\u200e\u200f\u061c]/g, '');
      expect(ar.parse(typed, 'shortDate')!.getDate()).toBe(15);
    });

    it('keeps a locale on its own calendar out of a Gregorian field', () => {
      // `fa-IR` resolves to the Persian calendar and `th-TH` to the Buddhist one, so the
      // field printed a year the Gregorian grid beside it could never show — and nothing
      // could read it back into the `Date` it came from. Every `Intl` call now pins
      // `gregory`, which is what the rest of this class computes in.
      for (const locale of ['fa-IR', 'th-TH']) {
        const local = adapterFor(locale);
        const printed = local.format(at(2026, 2, 15), 'shortDate');
        const parsed = local.parse(printed, 'shortDate');

        expect(parsed, `${locale} printed ${printed}`).not.toBeNull();
        expect([parsed!.getFullYear(), parsed!.getMonth(), parsed!.getDate()]).toEqual([2026, 2, 15]);
      }
    });

    it('fills a time-only format from today, not from New Year', () => {
      // `time` carries no date. Defaulting to 1 January made reading a clock move the
      // model back to New Year's Day as a side effect.
      const us = adapterFor('en-US');
      const parsed = us.parse('02:30 PM', 'time')!;
      const today = new Date();

      expect([parsed.getFullYear(), parsed.getMonth(), parsed.getDate()]).toEqual([
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      ]);
    });

    it('reads a two-digit year as this century, and a padded one as itself', () => {
      const us = adapterFor('en-US');
      expect(us.parse('1/5/25', 'shortDate')!.getFullYear()).toBe(2025);
      expect(us.parse('1/5/2025', 'shortDate')!.getFullYear()).toBe(2025);
      // A year under 100 written in full: the native constructor maps it onto 1900 + year
      // unless it is written back explicitly.
      expect(us.parse('1/5/0025', 'shortDate')!.getFullYear()).toBe(25);
    });
  });

  /**
   * `MMMM` beside a day number takes the form the language uses THERE, which in a case
   * language is not the nominative one a calendar heading wants.
   */
  describe('the month token declines beside a day', () => {
    const adapterFor = (locale: string): WrNativeDateAdapter => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideWrDateAdapter({ locale })] });
      return TestBed.inject(WrDateAdapter) as WrNativeDateAdapter;
    };

    it('writes the genitive in Russian and the partitive in Finnish', () => {
      expect(adapterFor('ru-RU').format(at(2026, 2, 15), 'dd MMMM yyyy')).toBe('15 марта 2026');
      expect(adapterFor('fi-FI').format(at(2026, 2, 15), 'dd MMMM yyyy')).toBe('15 maaliskuuta 2026');
    });

    it('keeps the nominative where no day is written', () => {
      // A month-and-year heading is exactly the standalone position, and
      // `getMonthNames` — what the calendar heading reads — is untouched.
      expect(adapterFor('ru-RU').format(at(2026, 2, 15), 'MMMM yyyy')).toBe('март 2026');
      expect(adapterFor('ru-RU').getMonthNames('long')[2]).toBe('март');
    });

    it('keeps the name where the locale would write a number instead', () => {
      // `{ day, month: 'long' }` gives ja the bare `3` with `月` as a separate literal,
      // and fi the bare `3` for its abbreviation. Taking that would render `15 3 2026`.
      expect(adapterFor('ja-JP').format(at(2026, 2, 15), 'dd MMMM yyyy')).toBe('15 3月 2026');
      expect(adapterFor('fi-FI').format(at(2026, 2, 15), 'dd MMM yyyy')).toBe('15 maalis 2026');
    });

    it('reads both forms back', () => {
      const ru = adapterFor('ru-RU');
      expect(ru.parse('15 марта 2026', 'dd MMMM yyyy')!.getMonth()).toBe(2);
      expect(ru.parse('15 март 2026', 'dd MMMM yyyy')!.getMonth()).toBe(2);
      expect(ru.parse('15 Frobuary 2026', 'dd MMMM yyyy')).toBeNull();
    });
  });

  describe('the meridiem token and non-Latin digits', () => {
    const adapterFor = (locale: string): WrNativeDateAdapter => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideWrDateAdapter({ locale })] });
      return TestBed.inject(WrDateAdapter) as WrNativeDateAdapter;
    };

    it('writes the marker the locale uses, not a hard-coded English one', () => {
      // `a` used to return a lowercase `pm` byte for byte in every locale — the one token
      // in the pattern language that could not be localised at all.
      expect(adapterFor('en-US').format(at(2026, 2, 15, 14, 30), 'hh:mm a')).toBe('02:30 PM');
      expect(adapterFor('ar-SA').format(at(2026, 2, 15, 14, 30), 'hh:mm a')).toBe('02:30 \u0645');
      expect(adapterFor('ja-JP').format(at(2026, 2, 15, 9, 30), 'hh:mm a')).toBe('09:30 \u5348\u524d');
    });

    it('reads its own marker back, and the English one either way', () => {
      const ar = adapterFor('ar-SA');
      expect(ar.parse('02:30 \u0645', 'hh:mm a')!.getHours()).toBe(14);
      expect(ar.parse('02:30 \u0635', 'hh:mm a')!.getHours()).toBe(2);
      // The ASCII pair stays readable everywhere: it is what older stored strings hold.
      expect(ar.parse('02:30 pm', 'hh:mm a')!.getHours()).toBe(14);
    });

    it('accepts a token pattern typed in the locale digits', () => {
      // The token formatter WRITES ASCII, so the round trip never needed this — but an
      // Arabic keyboard sends `١٥.٠٣.٢٠٢٦`, and `\\d` refused it with no feedback.
      const ar = adapterFor('ar-SA');
      const typed = ar.parse('\u0661\u0665.\u0660\u0663.\u0662\u0660\u0662\u0666', 'dd.MM.yyyy');

      expect(typed).not.toBeNull();
      expect([typed!.getFullYear(), typed!.getMonth(), typed!.getDate()]).toEqual([2026, 2, 15]);
      // ASCII on the same field still works — one keyboard does not exclude the other.
      expect(ar.parse('15.03.2026', 'dd.MM.yyyy')!.getDate()).toBe(15);
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
