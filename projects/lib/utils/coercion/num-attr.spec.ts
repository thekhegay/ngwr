import { describe, expect, it } from 'vitest';

import { wrNumAttr } from './num-attr';

describe('wrNumAttr', () => {
  it('parses a numeric string', () => {
    expect(wrNumAttr(0)('42')).toBe(42);
  });

  it('falls back on anything unparsable', () => {
    expect(wrNumAttr(7)('nope')).toBe(7);
    expect(wrNumAttr(7)(null)).toBe(7);
    expect(wrNumAttr(7)(undefined)).toBe(7);
  });
});
