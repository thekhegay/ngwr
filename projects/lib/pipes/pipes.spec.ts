import { SecurityContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';

import { describe, expect, it } from 'vitest';

import { WrBytes } from './bytes';
import { WrMark } from './mark';
import { WrPlural } from './plural';
import { WrRange } from './range';
import { WrTruncate } from './truncate';

describe('wrBytes', () => {
  const pipe = new WrBytes();

  it('picks the unit by magnitude', () => {
    expect(pipe.transform(512)).toBe('512 B');
    expect(pipe.transform(1024)).toBe('1.0 KB');
    expect(pipe.transform(1024 ** 2)).toBe('1.0 MB');
    expect(pipe.transform(1024 ** 3)).toBe('1.0 GB');
  });

  it('never shows a fraction of a byte', () => {
    // 1.5 bytes is not a thing; the decimals argument only applies from KB up.
    expect(pipe.transform(1536, 2)).toBe('1.50 KB');
    expect(pipe.transform(999, 2)).toBe('999 B');
  });

  it('caps at the largest unit it knows', () => {
    expect(pipe.transform(1024 ** 7)).toMatch(/PB$/);
  });

  it('returns an empty string for nothing, and 0 B for non-positive', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
    expect(pipe.transform(0)).toBe('0 B');
    expect(pipe.transform(-5)).toBe('0 B');
    expect(pipe.transform('nonsense')).toBe('0 B');
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

  it('returns the text unchanged with no query', () => {
    expect(html('abc', '')).toBe('abc');
    expect(html('abc', null)).toBe('abc');
    expect(html(null, 'a')).toBe('');
  });
});
