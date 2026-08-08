import { describe, expect, it } from 'vitest';

import { numAttr } from './num-attr';

describe('numAttr', () => {
  it('parses a numeric string', () => {
    expect(numAttr(0)('42')).toBe(42);
  });

  it('falls back on anything unparsable', () => {
    expect(numAttr(7)('nope')).toBe(7);
    expect(numAttr(7)(null)).toBe(7);
    expect(numAttr(7)(undefined)).toBe(7);
  });
});
