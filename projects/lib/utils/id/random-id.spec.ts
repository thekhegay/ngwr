import { describe, expect, it } from 'vitest';

import { randomId } from './random-id';

describe('randomId', () => {
  it('prefixes and defaults to 12 characters', () => {
    const id = randomId();
    expect(id).toMatch(/^wr-[a-z0-9]{12}$/);
  });

  it('takes a custom prefix and length', () => {
    expect(randomId('opt', 6)).toMatch(/^opt-[a-z0-9]{6}$/);
  });

  it('clamps the length into 4..64', () => {
    expect(randomId('x', 1).slice(2)).toHaveLength(4);
    expect(randomId('x', 999).slice(2)).toHaveLength(64);
  });

  it('is selector-safe because the PREFIX leads, not the random part', () => {
    // The random segment can start with a digit — `#9abc` would be a valid id
    // attribute but an invalid CSS selector. The prefix is what keeps these
    // usable in `querySelector`, and they end up in `aria-controls` /
    // `aria-labelledby`, so that matters.
    for (let i = 0; i < 200; i++) {
      const id = randomId();
      expect(id).toMatch(/^[a-z]/);
      expect(() => document.querySelector(`#${id}`)).not.toThrow();
    }
  });

  it('does not repeat across a large batch', () => {
    const ids = new Set(Array.from({ length: 5000 }, () => randomId()));
    expect(ids.size).toBe(5000);
  });

  it('accepts an injected source of randomness', () => {
    const zeros = (n: number): Uint8Array => new Uint8Array(n);
    expect(randomId('t', 5, zeros)).toBe('t-aaaaa');
  });
});
