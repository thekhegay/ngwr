import { describe, expect, it } from 'vitest';

import { isDefined } from './is-defined';
import { isNonEmptyArray } from './is-non-empty-array';

describe('isDefined', () => {
  it('rejects only null and undefined', () => {
    expect(isDefined(null)).toBe(false);
    expect(isDefined(undefined)).toBe(false);
  });

  it('accepts every other falsy value', () => {
    expect(isDefined(0)).toBe(true);
    expect(isDefined('')).toBe(true);
    expect(isDefined(false)).toBe(true);
    expect(isDefined(Number.NaN)).toBe(true);
  });
});

describe('isNonEmptyArray', () => {
  it('accepts an array with at least one item', () => {
    expect(isNonEmptyArray([1])).toBe(true);
  });

  it('rejects an empty array and non-arrays', () => {
    expect(isNonEmptyArray([])).toBe(false);
    expect(isNonEmptyArray(null)).toBe(false);
    expect(isNonEmptyArray(undefined)).toBe(false);
  });
});
