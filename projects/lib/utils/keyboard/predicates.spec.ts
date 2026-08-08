import { describe, expect, it } from 'vitest';

import { hasModifier, isPrintableKey } from './predicates';

const key = (init: Partial<KeyboardEvent> & { key: string }): KeyboardEvent => new KeyboardEvent('keydown', init);

describe('hasModifier', () => {
  it('is false for a bare key', () => {
    expect(hasModifier(key({ key: 'a' }))).toBe(false);
  });

  it('counts shift as a modifier', () => {
    // Deliberate: a component that wants "plain Enter" has to treat Shift+Enter
    // as something else, so Shift belongs in this predicate.
    expect(hasModifier(key({ key: 'Enter', shiftKey: true }))).toBe(true);
  });

  it('counts ctrl, alt and meta', () => {
    expect(hasModifier(key({ key: 'a', ctrlKey: true }))).toBe(true);
    expect(hasModifier(key({ key: 'a', altKey: true }))).toBe(true);
    expect(hasModifier(key({ key: 'a', metaKey: true }))).toBe(true);
  });
});

describe('isPrintableKey', () => {
  it('accepts a single character', () => {
    expect(isPrintableKey(key({ key: 'a' }))).toBe(true);
    expect(isPrintableKey(key({ key: ' ' }))).toBe(true);
  });

  it('accepts a shifted character — that is how you type an uppercase letter', () => {
    expect(isPrintableKey(key({ key: 'A', shiftKey: true }))).toBe(true);
  });

  it('rejects named keys and command chords', () => {
    expect(isPrintableKey(key({ key: 'Enter' }))).toBe(false);
    expect(isPrintableKey(key({ key: 'ArrowDown' }))).toBe(false);
    expect(isPrintableKey(key({ key: 'a', ctrlKey: true }))).toBe(false);
    expect(isPrintableKey(key({ key: 'a', metaKey: true }))).toBe(false);
  });
});
