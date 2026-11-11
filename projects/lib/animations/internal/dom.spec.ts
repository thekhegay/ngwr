import { describe, expect, it } from 'vitest';

import { FOCUSABLE, optionalSelector, roundTo } from './dom';

describe('dom helpers', () => {
  describe('FOCUSABLE', () => {
    it('matches what a keyboard reaches and nothing else', () => {
      const root = document.createElement('div');
      root.innerHTML = `<a href="#">a</a><a>b</a><button>c</button><span tabindex="0">d</span><span>e</span>`;
      const matched = Array.from(root.querySelectorAll(FOCUSABLE)).map(el => el.textContent);
      expect(matched).toEqual(['a', 'c', 'd']);
    });
  });

  describe('optionalSelector', () => {
    it('reads a bare attribute and a blank as the host, a selector as itself', () => {
      expect(optionalSelector('')).toBeNull();
      expect(optionalSelector('  ')).toBeNull();
      expect(optionalSelector(null)).toBeNull();
      expect(optionalSelector(undefined)).toBeNull();
      expect(optionalSelector(0)).toBeNull();
      expect(optionalSelector('.wr-result__title')).toBe('.wr-result__title');
    });
  });

  describe('roundTo', () => {
    it('rounds to the given decimals', () => {
      expect(roundTo(12.3456, 2)).toBe(12.35);
      expect(roundTo(0.00049, 4)).toBe(0.0005);
      expect(roundTo(-1.005, 0)).toBe(-1);
    });
  });
});
