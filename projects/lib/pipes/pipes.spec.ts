import { LOCALE_ID, SecurityContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';

import { WrDateAdapter } from 'ngwr/date';
import { wrInitials } from 'ngwr/utils';
import { beforeEach, describe, expect, it } from 'vitest';

import { WrBytes, wrFormatBytes } from './bytes';
import { WrDate, wrFormatDate } from './date';
import { WrDuration, wrFormatDuration, wrSplitDuration } from './duration';
import { WrInitials } from './initials';
import { WrMark } from './mark';
import { WrNumber, wrFormatNumber } from './number';
import { WrPlural, wrFormatPlural } from './plural';
import { WrRange } from './range';
import { WrTruncate } from './truncate';

/**
 * `wrBytes` is the one formatting pipe here that used to ignore `LOCALE_ID`, so
 * half of what follows is about a locale other than English. It is constructed
 * inside an injection context for that reason — a bare `new WrBytes()` cannot
 * reach the token, which is itself the tell that the pipe now depends on one.
 */
describe('wrBytes', () => {
  // Reset first: the module is instantiated the moment one pipe is built, and a
  // second locale in the same test would otherwise be refused rather than
  // silently reusing the first — which is the more useful failure, but not the
  // one this file wants.
  const bytes = (locale: string): WrBytes => {
    TestBed.resetTestingModule();
    return TestBed.configureTestingModule({
      providers: [{ provide: LOCALE_ID, useValue: locale }],
    }).runInInjectionContext(() => new WrBytes());
  };

  let pipe: WrBytes;
  beforeEach(() => (pipe = bytes('en-US')));

  it('picks the unit by magnitude', () => {
    expect(pipe.transform(512)).toBe('512 B');
    expect(pipe.transform(1024)).toBe('1.0 kB');
    expect(pipe.transform(1024 ** 2)).toBe('1.0 MB');
    expect(pipe.transform(1024 ** 3)).toBe('1.0 GB');
  });

  it('never shows a fraction of a byte', () => {
    // 1.5 bytes is not a thing; the decimals argument only applies from kB up.
    expect(pipe.transform(1536, 2)).toBe('1.50 kB');
    expect(pipe.transform(999, 2)).toBe('999 B');
  });

  it('caps at the largest unit it knows', () => {
    expect(pipe.transform(1024 ** 7)).toMatch(/PB$/);
  });

  it('rounds a sub-byte value up to the smallest unit it knows', () => {
    // A fraction of a byte is still bytes: the unit index has a floor as well as
    // a cap, or `UNITS[-1]` reaches `Intl` as `undefined` and it throws.
    expect(pipe.transform(0.5)).toBe('1 B');
    expect(pipe.transform(0.9999)).toBe('1 B');
    expect(pipe.transform(0.001)).toBe('0 B');
    expect(pipe.transform('0.5')).toBe('1 B');
  });

  it('returns an empty string for nothing, and 0 B for non-positive', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
    expect(pipe.transform(0)).toBe('0 B');
    expect(pipe.transform(-5)).toBe('0 B');
    expect(pipe.transform('nonsense')).toBe('0 B');
  });

  it('writes the number the way the locale writes numbers', () => {
    // The half that was a plain bug rather than a translation gap: `toFixed`
    // writes a full stop in every language, so a German page read `1.2 kB`
    // beside its own `1,2` everywhere else.
    expect(bytes('de-DE').transform(1536)).toBe('1,5 kB');
    expect(bytes('fr-FR').transform(1536, 2)).toBe('1,50 ko');
  });

  it('takes the unit abbreviation from the locale, not from English', () => {
    expect(bytes('ru-RU').transform(1536)).toBe('1,5 кБ');
    expect(bytes('fr-FR').transform(512)).toBe('512 o');
  });

  it('leaves the number and unit in the order the locale puts them', () => {
    // Hebrew writes the unit first. Reassembling as `${n} ${unit}` would
    // straighten every such locale into English order without anyone noticing,
    // which is why the parts are rejoined rather than the string rebuilt.
    expect(bytes('he-IL').transform(512)).toBe('B 512');
  });

  it('is the same output as wrFormatBytes, in every locale', () => {
    for (const locale of ['en-US', 'de-DE', 'fr-FR', 'he-IL']) {
      const pipe = bytes(locale);
      for (const value of [0, 0.5, 512, 1536, 1234567, 1024 ** 7, -5, 'nonsense', null, '']) {
        expect(wrFormatBytes(value, locale)).toBe(pipe.transform(value));
        expect(wrFormatBytes(value, locale, 2)).toBe(pipe.transform(value, 2));
      }
    }
    expect(wrFormatBytes(1536, 'fr-FR', 2)).toBe('1,50 ko');
    expect(wrFormatBytes(null, 'en-US')).toBe('');
  });
});

describe('wrNumber', () => {
  let pipe: WrNumber;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'en-US' }] });
    pipe = TestBed.runInInjectionContext(() => new WrNumber());
  });

  it('formats a number with the locale grouping', () => {
    expect(pipe.transform(1234.5)).toBe('1,234.5');
    expect(pipe.transform(0.875, 'percent')).toBe('87.5%');
  });

  // Through `Number()`, this amount printed as 12,345,678,901,234,568.
  it('keeps every digit of a decimal string', () => {
    expect(pipe.transform('12345678901234567.89')).toBe('12,345,678,901,234,567.89');
    expect(pipe.transform(' 1.005 ', { maximumFractionDigits: 2 })).toBe('1.01');
    expect(pipe.transform('12345678901234567.89', 'currency', 'USD')).toBe('$12,345,678,901,234,567.89');
  });

  // ICU throws on an exponent of a billion or more, which `Number()` reads as 0.
  it('keeps the number for a string that is not a plain decimal', () => {
    expect(pipe.transform('1e-1000000000')).toBe('0');
    expect(pipe.transform('0x10')).toBe('16');
    expect(pipe.transform('1e-400', { notation: 'compact' })).toBe('0');
  });

  it('renders nothing for a value that is not a number', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform('')).toBe('');
    expect(pipe.transform('abc')).toBe('');
    expect(pipe.transform('1e400')).toBe('');
    expect(pipe.transform(Number.NaN)).toBe('');
  });

  it('is the same output as wrFormatNumber', () => {
    for (const value of [1234.5, 0.875, '12345678901234567.89', '1e-1000000000', '0x10', null, '', 'abc']) {
      expect(wrFormatNumber(value, 'en-US')).toBe(pipe.transform(value));
      expect(wrFormatNumber(value, 'en-US', 'percent')).toBe(pipe.transform(value, 'percent'));
      expect(wrFormatNumber(value, 'en-US', 'currency', 'EUR')).toBe(pipe.transform(value, 'currency', 'EUR'));
      expect(wrFormatNumber(value, 'en-US', { notation: 'compact' })).toBe(
        pipe.transform(value, { notation: 'compact' })
      );
    }
  });

  it('writes the function output in the locale it is given', () => {
    expect(wrFormatNumber(1234.5, 'de-DE')).toBe('1.234,5');
    expect(wrFormatNumber(19.99, 'de-DE', 'currency', 'EUR')).toBe('19,99\u00a0€');
    expect(wrFormatNumber(0.875, 'ru-RU', 'percent')).toBe('87,5\u00a0%');
  });
});

describe('wrTruncate', () => {
  const pipe = new WrTruncate();

  it('leaves a short string alone, ellipsis included', () => {
    expect(pipe.transform('short', 10)).toBe('short');
    expect(pipe.transform('exactly-10', 10)).toBe('exactly-10');
  });

  it('cuts and appends the ellipsis', () => {
    expect(pipe.transform('abcdefghij', 4)).toBe('abcd…');
    expect(pipe.transform('abcdefghij', 4, '...')).toBe('abcd...');
  });

  it('handles nothing and a zero length', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform('abc', 0)).toBe('…');
  });

  it('counts what a reader sees as one character, never half of one', () => {
    // Counted in UTF-16 units, the cut landed between the two halves of an
    // emoji and printed a lone surrogate, which renders as a replacement box.
    expect(pipe.transform(`a${'😀'.repeat(30)}`, 3)).toBe('a😀😀…');
    expect(pipe.transform('👨‍👩‍👧‍👦👨‍👩‍👧‍👦', 1)).toBe('👨‍👩‍👧‍👦…');
    expect(pipe.transform('e\u0301e\u0301e\u0301', 2)).toBe('e\u0301e\u0301…');
    // Longer than `length` in units, not in characters: nothing to cut.
    expect(pipe.transform('😀😀😀', 4)).toBe('😀😀😀');
  });
});

describe('wrInitials', () => {
  const pipe = (locale: string): WrInitials => {
    TestBed.resetTestingModule();
    return TestBed.configureTestingModule({
      providers: [{ provide: LOCALE_ID, useValue: locale }],
    }).runInInjectionContext(() => new WrInitials());
  };

  it('is the same output as wrInitials in LOCALE_ID', () => {
    const p = pipe('en-US');
    for (const value of ['Roman Khegay', 'madonna', '王小明', '👩🏽‍🚀 Valentina', '...', '', null, undefined]) {
      expect(p.transform(value)).toBe(wrInitials(value, 'en-US'));
    }
    expect(p.transform('ada lovelace')).toBe('AL');
  });

  it('upper-cases in the app locale', () => {
    expect(pipe('tr').transform('ismail')).toBe('İ');
    expect(pipe('en-US').transform('ismail')).toBe('I');
  });
});

/**
 * `wrDate` hands the adapter a `Date`, so what it decides is the INSTANT a
 * string stands for. A date-only string is a calendar day: read as UTC midnight
 * it is the evening before anywhere west of Greenwich, so the time it carries is
 * the assertion that holds in every zone but UTC itself.
 */
describe('wrDate', () => {
  const pipe = (): WrDate => {
    TestBed.resetTestingModule();
    return TestBed.configureTestingModule({
      providers: [{ provide: LOCALE_ID, useValue: 'en-US' }],
    }).runInInjectionContext(() => new WrDate());
  };

  it('reads a date-only string as local midnight, the way DatePipe does', () => {
    expect(pipe().transform('2026-01-01', 'yyyy-MM-dd HH:mm')).toBe('2026-01-01 00:00');
    expect(pipe().transform('2026-03', 'yyyy-MM-dd HH:mm')).toBe('2026-03-01 00:00');
  });

  it('leaves a string with a time, or a zone, to the engine', () => {
    expect(pipe().transform('2026-01-01T09:30', 'yyyy-MM-dd HH:mm')).toBe('2026-01-01 09:30');
    const instant = '2026-01-01T09:30:00Z';
    expect(pipe().transform(instant, 'HH:mm')).toBe(pipe().transform(new Date(instant), 'HH:mm'));
  });

  it('prints nothing for a date the engine refuses', () => {
    expect(pipe().transform('2026-13-01')).toBe('');
    expect(pipe().transform('')).toBe('');
  });

  it('is the same output as wrFormatDate over the same adapter', () => {
    // The adapter stands where the other functions take a locale: the output is
    // its own, and an app's adapter cannot be rebuilt from a locale string.
    const p = pipe();
    const adapter = TestBed.inject<WrDateAdapter<Date>>(WrDateAdapter);
    for (const value of ['2026-01-01', '2026-01-01T09:30', new Date(2026, 5, 12, 10, 51), 0, '2026-13-01', null, '']) {
      expect(wrFormatDate(value, adapter)).toBe(p.transform(value));
      expect(wrFormatDate(value, adapter, 'mediumDateTime')).toBe(p.transform(value, 'mediumDateTime'));
      expect(wrFormatDate(value, adapter, 'dd.MM.yyyy HH:mm')).toBe(p.transform(value, 'dd.MM.yyyy HH:mm'));
    }
    expect(wrFormatDate('2026-06-12', adapter, 'd MMMM yyyy')).toBe('12 June 2026');
  });

  it('formats through the adapter of another locale', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'de-DE' }] });
    const adapter = TestBed.inject<WrDateAdapter<Date>>(WrDateAdapter);
    expect(wrFormatDate('2026-06-12', adapter)).toBe('12.6.2026');
    expect(wrFormatDate('2026-06-12', adapter, 'd MMMM yyyy')).toBe('12 Juni 2026');
  });
});

describe('wrRange', () => {
  it('counts from zero', () => {
    expect(new WrRange().transform(4)).toEqual([0, 1, 2, 3]);
    expect(new WrRange().transform(0)).toEqual([]);
  });
});

describe('wrPlural', () => {
  const pipe = (): WrPlural => TestBed.runInInjectionContext(() => new WrPlural());

  it('picks the English category', () => {
    const forms = { one: 'item', other: 'items' };
    expect(pipe().transform(1, forms, { locale: 'en' })).toBe('1 item');
    expect(pipe().transform(2, forms, { locale: 'en' })).toBe('2 items');
    expect(pipe().transform(0, forms, { locale: 'en' })).toBe('0 items');
  });

  it('picks the Russian categories, which English has no equivalent for', () => {
    const forms = { one: 'файл', few: 'файла', many: 'файлов', other: 'файла' };
    expect(pipe().transform(1, forms, { locale: 'ru' })).toBe('1 файл');
    expect(pipe().transform(3, forms, { locale: 'ru' })).toBe('3 файла');
    expect(pipe().transform(5, forms, { locale: 'ru' })).toBe('5 файлов');
    expect(pipe().transform(21, forms, { locale: 'ru' })).toBe('21 файл');
  });

  it('falls back to `other` when the category is missing', () => {
    expect(pipe().transform(3, { other: 'things' }, { locale: 'ru' })).toBe('3 things');
  });

  it('can leave the number out', () => {
    expect(pipe().transform(5, { one: 'item', other: 'items' }, { locale: 'en', includeValue: false })).toBe('items');
  });

  it('returns an empty string for nothing and for non-finite input', () => {
    const forms = { one: 'a', other: 'b' };
    expect(pipe().transform(null, forms)).toBe('');
    expect(pipe().transform(undefined, forms)).toBe('');
    expect(pipe().transform(Number.NaN, forms)).toBe('');
  });

  it('is the same output as wrFormatPlural', () => {
    const forms = { one: 'файл', few: 'файла', many: 'файлов', other: 'файла' };
    for (const value of [0, 1, 3, 5, 21, 1000, null, Number.NaN]) {
      for (const locale of ['en', 'ru']) {
        expect(wrFormatPlural(value, locale, forms)).toBe(pipe().transform(value, forms, { locale }));
        expect(wrFormatPlural(value, 'en', forms, { locale })).toBe(pipe().transform(value, forms, { locale }));
        expect(wrFormatPlural(value, locale, forms, { includeValue: false })).toBe(
          pipe().transform(value, forms, { locale, includeValue: false })
        );
      }
    }
    expect(wrFormatPlural(1000, 'ru', forms)).toBe('1\u00a0000 файлов');
    expect(wrFormatPlural(1000, 'en', { one: 'file', other: 'files' })).toBe('1,000 files');
  });
});

/**
 * `wrDuration` is built on `Intl.NumberFormat` and `Intl.ListFormat` rather than
 * `Intl.DurationFormat`, which the browser floor does not have, so what the
 * specs pin is the assembly: which units show, how they carry, where the sign
 * goes, and that the words and digits are the locale's.
 */
describe('wrDuration', () => {
  const SECOND = 1000;
  const MINUTE = 60 * SECOND;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  const pipe = (locale = 'en-US'): WrDuration => {
    TestBed.resetTestingModule();
    return TestBed.configureTestingModule({
      providers: [{ provide: LOCALE_ID, useValue: locale }],
    }).runInInjectionContext(() => new WrDuration());
  };

  it('writes clock digits, with the hours only once there is one', () => {
    const p = pipe();
    expect(p.transform(HOUR + 30 * MINUTE)).toBe('1:30:00');
    expect(p.transform(5 * MINUTE + 7 * SECOND)).toBe('5:07');
    expect(p.transform(7 * SECOND)).toBe('0:07');
    expect(p.transform(HOUR + 5 * SECOND)).toBe('1:00:05');
  });

  it('carries the days into the hours in clock style, since a clock has no day digit', () => {
    expect(pipe().transform(2 * DAY + HOUR)).toBe('49:00:00');
  });

  it('writes every non-zero unit as a word in units style, days included', () => {
    const p = pipe();
    expect(p.transform(HOUR + 30 * MINUTE, 'units')).toBe('1 hr 30 min');
    expect(p.transform(HOUR + 30 * MINUTE + 7 * SECOND, 'units')).toBe('1 hr 30 min 7 sec');
    expect(p.transform(5 * MINUTE + 7 * SECOND, 'units')).toBe('5 min 7 sec');
    expect(p.transform(2 * DAY + HOUR, 'units')).toBe('2 days 1 hr');
    expect(p.transform(2 * HOUR, 'units')).toBe('2 hr');
  });

  it('floors to whole seconds in both styles', () => {
    const p = pipe();
    expect(p.transform(5 * MINUTE + 7 * SECOND + 999)).toBe('5:07');
    expect(p.transform(5 * MINUTE + 7 * SECOND + 999, 'units')).toBe('5 min 7 sec');
  });

  it('reads zero as 0:00 and 0 sec', () => {
    const p = pipe();
    expect(p.transform(0)).toBe('0:00');
    expect(p.transform(0, 'units')).toBe('0 sec');
    expect(p.transform(500, 'units')).toBe('0 sec');
  });

  it('puts the minus sign in front of a negative span, and none on one that floors to zero', () => {
    const p = pipe();
    expect(p.transform(-(5 * MINUTE + 7 * SECOND))).toBe('-5:07');
    expect(p.transform(-(HOUR + 30 * MINUTE), 'units')).toBe('-1 hr 30 min');
    expect(p.transform(-500)).toBe('0:00');
    expect(p.transform(-500, 'units')).toBe('0 sec');
  });

  it('renders nothing for nothing and for a value that is not a finite number', () => {
    const p = pipe();
    expect(p.transform(null)).toBe('');
    expect(p.transform(undefined)).toBe('');
    expect(p.transform('')).toBe('');
    expect(p.transform('abc')).toBe('');
    expect(p.transform(Number.NaN)).toBe('');
    expect(p.transform(Number.POSITIVE_INFINITY)).toBe('');
    expect(p.transform(' 307000 ')).toBe('5:07');
  });

  it('takes the words, the list joiner and the digits from the locale', () => {
    expect(pipe('fr-FR').transform(HOUR + 30 * MINUTE, 'units')).toBe('1\u202fh 30\u00a0min');
    expect(pipe('ru-RU').transform(HOUR + 30 * MINUTE + 7 * SECOND, 'units')).toBe('1 ч 30 мин 7 с');
    expect(pipe('de-DE').transform(HOUR + 30 * MINUTE, 'units')).toBe('1 Std., 30 Min.');
    // The locale's own numbering system, in the clock as well.
    expect(pipe('ar-EG').transform(5 * MINUTE + 7 * SECOND)).toBe('٥:٠٧');
  });

  it('is the same output as wrFormatDuration', () => {
    for (const locale of ['en-US', 'fr-FR', 'ar-EG']) {
      const p = pipe(locale);
      for (const value of [0, 7 * SECOND, 5 * MINUTE + 7 * SECOND, HOUR + 30 * MINUTE, 2 * DAY + HOUR, -HOUR, null]) {
        expect(wrFormatDuration(value, locale)).toBe(p.transform(value));
        expect(wrFormatDuration(value, locale, 'units')).toBe(p.transform(value, 'units'));
      }
    }
  });

  it('splits a span into the units asked for, carrying the rest into the largest', () => {
    // The half `wr-statistic-countdown` shares: its tokens pick the units.
    expect(wrSplitDuration(3 * DAY + HOUR, new Set(['hour', 'minute', 'second']))).toEqual({
      hour: 73,
      minute: 0,
      second: 0,
    });
    expect(wrSplitDuration(36 * HOUR + 3 * SECOND, new Set(['minute', 'second']))).toEqual({ minute: 2160, second: 3 });
    expect(wrSplitDuration(1500, new Set(['second', 'millisecond']))).toEqual({ second: 1, millisecond: 500 });
    expect(wrSplitDuration(1500, new Set(['second']))).toEqual({ second: 1 });
  });
});

describe('wrMark', () => {
  // The pipe returns a `SafeHtml`, whose `toString()` is a guard message rather
  // than the markup — run it back through the sanitizer to read what it built.
  const html = (value: string | null, query: string | null, caseSensitive = false): string => {
    const sanitizer = TestBed.inject(DomSanitizer);
    const result = TestBed.runInInjectionContext(() => new WrMark()).transform(value, query, caseSensitive);
    return sanitizer.sanitize(SecurityContext.HTML, result) ?? '';
  };

  it('wraps every match', () => {
    expect(html('one two one', 'one')).toBe('<mark>one</mark> two <mark>one</mark>');
  });

  it('is case-insensitive by default and exact on request', () => {
    expect(html('Foo foo', 'foo')).toBe('<mark>Foo</mark> <mark>foo</mark>');
    expect(html('Foo foo', 'foo', true)).toBe('Foo <mark>foo</mark>');
  });

  it('treats the query as text, not as a pattern', () => {
    // Without escaping, a query of `a.c` would match `abc` — and a query of `(`
    // would throw an invalid-regex error straight out of a search box.
    expect(html('abc a.c', 'a.c')).toBe('abc <mark>a.c</mark>');
    expect(() => html('a (b)', '(')).not.toThrow();
  });

  it('escapes the source text, so a match cannot smuggle in markup', () => {
    expect(html('<img src=x onerror=1>', 'img')).toBe('&lt;<mark>img</mark> src=x onerror=1&gt;');
  });

  it('matches the text the author wrote, not the entities the escape produced', () => {
    // The escape used to run first, so the query was matched against `&amp;` and
    // friends: `m` landed inside the entity, the `<mark>` cut it in half, and the
    // browser painted the entity's own letters — `Tom &amp; Jerry` on screen. The
    // mirror failure is a match that could never happen, since `<`, `>` and `"`
    // are gone from the escaped text before the pattern ever runs.
    expect(html('Tom & Jerry', 'm')).toBe('To<mark>m</mark> &amp; Jerry');
    expect(html('Tom & Jerry', '&')).toBe('Tom <mark>&amp;</mark> Jerry');
    expect(html('5 > 3', 'g')).toBe('5 &gt; 3');
    expect(html('a < b', '<')).toBe('a <mark>&lt;</mark> b');
  });

  it('returns the text unchanged with no query', () => {
    expect(html('abc', '')).toBe('abc');
    expect(html('abc', null)).toBe('abc');
    expect(html(null, 'a')).toBe('');
  });

  it('escapes with no query too, so the rendering cannot flip on a keystroke', () => {
    // The early return used to hand the raw string to `[innerHTML]`: with a
    // query typed, `<img src=x>` drew as text, and with the box cleared the same
    // value drew an element — whatever Angular's own sanitizer permits.
    expect(html('<img src=x onerror=1>', '')).toBe('&lt;img src=x onerror=1&gt;');
    expect(html('<b>bold</b>', null)).toBe('&lt;b&gt;bold&lt;/b&gt;');
  });
});
