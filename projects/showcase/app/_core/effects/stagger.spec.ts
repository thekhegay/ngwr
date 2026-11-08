import { afterEach, describe, expect, it, vi } from 'vitest';

import { SPACES, graphemes, optionalMs, staggerGap } from './stagger';

describe('stagger helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('graphemes', () => {
    it('keeps an accented letter and an emoji with its modifier whole', () => {
      expect(graphemes('Héllo 👋🏽')).toEqual(['H', 'é', 'l', 'l', 'o', ' ', '👋🏽']);
    });

    it('keeps a surrogate pair whole without Intl.Segmenter', () => {
      vi.stubGlobal('Intl', {});
      expect(graphemes('a👋b')).toEqual(['a', '👋', 'b']);
    });
  });

  describe('SPACES', () => {
    it('splits on breaking spaces and keeps them, not on a no-break space', () => {
      expect('a b c'.split(SPACES)).toEqual(['a', ' ', 'b c']);
    });
  });

  describe('staggerGap', () => {
    it('takes the mode default', () => {
      expect(staggerGap('letters', 10)).toBe(28);
      expect(staggerGap('words', 10)).toBe(70);
    });

    it('takes a gap of its own, never below zero', () => {
      expect(staggerGap('letters', 10, 50)).toBe(50);
      expect(staggerGap('letters', 10, -5)).toBe(0);
    });

    it('shrinks the gap so the last piece starts by 1.2 s', () => {
      expect(staggerGap('words', 31)).toBe(40);
      expect(staggerGap('letters', 61)).toBe(20);
      expect(staggerGap('letters', 1)).toBe(28);
    });
  });

  describe('optionalMs', () => {
    it('reads an empty attribute as unset and a string as a number', () => {
      expect(optionalMs(null)).toBeNull();
      expect(optionalMs(undefined)).toBeNull();
      expect(optionalMs('')).toBeNull();
      expect(optionalMs('40')).toBe(40);
      expect(optionalMs(12)).toBe(12);
    });
  });
});
