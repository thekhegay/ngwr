import { LOCALE_ID, SecurityContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';

import { beforeEach, describe, expect, it } from 'vitest';

import { WrBytes } from './bytes';
import { WrMark } from './mark';
import { WrPlural } from './plural';
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
});
