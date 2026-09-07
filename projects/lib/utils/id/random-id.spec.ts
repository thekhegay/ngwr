import { afterEach, describe, expect, it, vi } from 'vitest';

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

  /**
   * The branch every browser and every supported Node skips, and the reason it
   * is here rather than left uncovered: the ids reach `id`, `for` and
   * `aria-controls`, so a runtime without WebCrypto has to get an id that is
   * still selector-safe and still unique — not an exception, and not a string
   * of `undefined`s from indexing an empty array.
   */
  describe('on a runtime with no WebCrypto', () => {
    const real = globalThis.crypto;
    afterEach(() => Object.defineProperty(globalThis, 'crypto', { value: real, configurable: true }));

    const withoutCrypto = (): void => {
      Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
    };

    it('still produces a well-formed id', () => {
      withoutCrypto();
      expect(randomId()).toMatch(/^wr-[a-z0-9]{12}$/);
      expect(randomId('opt', 6)).toMatch(/^opt-[a-z0-9]{6}$/);
    });

    it('is still unique enough to name elements on one page', () => {
      withoutCrypto();
      const ids = new Set(Array.from({ length: 5000 }, () => randomId()));
      expect(ids.size).toBe(5000);
    });

    it('takes the fallback when crypto exists but cannot generate', () => {
      // A partial polyfill — `crypto` present, `getRandomValues` absent — is the
      // shape that would throw rather than fall back if the guard only checked
      // for the object.
      Object.defineProperty(globalThis, 'crypto', { value: {}, configurable: true });
      expect(randomId()).toMatch(/^wr-[a-z0-9]{12}$/);
    });

    it('does not silently keep using it once it is back', () => {
      withoutCrypto();
      randomId();
      Object.defineProperty(globalThis, 'crypto', { value: real, configurable: true });
      const spy = vi.spyOn(real, 'getRandomValues');
      randomId();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
