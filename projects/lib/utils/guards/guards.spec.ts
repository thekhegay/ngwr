import { describe, expect, it } from 'vitest';

import { wrIsDefined } from './is-defined';
import { wrIsNonEmptyArray } from './is-non-empty-array';

describe('wrIsDefined', () => {
  it('rejects only null and undefined', () => {
    expect(wrIsDefined(null)).toBe(false);
    expect(wrIsDefined(undefined)).toBe(false);
  });

  it('accepts every other falsy value', () => {
    expect(wrIsDefined(0)).toBe(true);
    expect(wrIsDefined('')).toBe(true);
    expect(wrIsDefined(false)).toBe(true);
    expect(wrIsDefined(Number.NaN)).toBe(true);
  });
});

describe('wrIsNonEmptyArray', () => {
  it('accepts an array with at least one item', () => {
    expect(wrIsNonEmptyArray([1])).toBe(true);
  });

  it('rejects an empty array and non-arrays', () => {
    expect(wrIsNonEmptyArray([])).toBe(false);
    expect(wrIsNonEmptyArray(null)).toBe(false);
    expect(wrIsNonEmptyArray(undefined)).toBe(false);
  });
});
