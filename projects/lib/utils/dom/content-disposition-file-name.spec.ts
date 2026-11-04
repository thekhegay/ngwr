/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { describe, expect, it } from 'vitest';

import { wrContentDispositionFileName } from './content-disposition-file-name';

describe('wrContentDispositionFileName', () => {
  it('reads a quoted and an unquoted filename', () => {
    expect(wrContentDispositionFileName('attachment; filename="report.csv"')).toBe('report.csv');
    expect(wrContentDispositionFileName('attachment; filename=report.csv')).toBe('report.csv');
    expect(wrContentDispositionFileName('inline; filename = "spaced.txt" ; size=4')).toBe('spaced.txt');
  });

  it('keeps spaces and semicolons inside quotes, and unescapes a quoted quote', () => {
    expect(wrContentDispositionFileName('attachment; filename="a b; c.txt"')).toBe('a b; c.txt');
    expect(wrContentDispositionFileName('attachment; filename="say \\"hi\\".txt"')).toBe('say "hi".txt');
  });

  it('matches parameter names case-insensitively', () => {
    expect(wrContentDispositionFileName('Attachment; FILENAME="Upper.csv"')).toBe('Upper.csv');
    expect(wrContentDispositionFileName("attachment; FileName*=utf-8''%C3%9Cber.csv")).toBe('Über.csv');
  });

  it('percent-decodes filename* and prefers it over filename', () => {
    expect(wrContentDispositionFileName("attachment; filename*=UTF-8''%E2%82%AC%20rates.csv")).toBe('€ rates.csv');
    expect(wrContentDispositionFileName('attachment; filename="fallback.csv"; filename*=UTF-8\'\'%E2%82%AC.csv')).toBe(
      '€.csv'
    );
    expect(wrContentDispositionFileName('attachment; filename*=UTF-8\'en\'plain.csv; filename="other.csv"')).toBe(
      'plain.csv'
    );
  });

  it('decodes an ISO-8859-1 filename* byte by byte', () => {
    expect(wrContentDispositionFileName("attachment; filename*=iso-8859-1''caf%E9.txt")).toBe('café.txt');
  });

  it('falls back to filename when filename* cannot be decoded, and to null when there is none', () => {
    expect(wrContentDispositionFileName('attachment; filename*=UTF-8\'\'%E2%82; filename="safe.csv"')).toBe('safe.csv');
    expect(wrContentDispositionFileName("attachment; filename*=UTF-8''%ZZ.csv")).toBeNull();
    expect(wrContentDispositionFileName('attachment; filename*=no-encoding-here.csv')).toBeNull();
    expect(wrContentDispositionFileName("attachment; filename*=x-unknown''a.csv; filename=b.csv")).toBe('b.csv');
  });

  it('returns null for a header with no file name', () => {
    expect(wrContentDispositionFileName(null)).toBeNull();
    expect(wrContentDispositionFileName(undefined)).toBeNull();
    expect(wrContentDispositionFileName('')).toBeNull();
    expect(wrContentDispositionFileName('inline')).toBeNull();
    expect(wrContentDispositionFileName('attachment; filename=')).toBeNull();
    expect(wrContentDispositionFileName('attachment; filename=""')).toBeNull();
    expect(wrContentDispositionFileName('attachment; myfilename=x.csv')).toBeNull();
  });
});
