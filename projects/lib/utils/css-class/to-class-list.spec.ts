import { describe, expect, it } from 'vitest';

import { wrToClassList } from './to-class-list';

/**
 * The first case is the whole reason this function exists: `classList.add()`
 * throws on a token holding a space, and the CDK hands `panelClass` straight to
 * it. Everything else here is the shape a call site relies on when it spells a
 * conditional class inline.
 */
describe('wrToClassList', () => {
  it('splits a space-separated string into separate tokens', () => {
    expect(wrToClassList('p-4 rounded-xl')).toEqual(['p-4', 'rounded-xl']);
  });

  it('produces tokens a DOM element accepts, which the unsplit string is not', () => {
    const el = document.createElement('div');
    expect(() => el.classList.add('p-4 rounded-xl')).toThrow();
    expect(() => el.classList.add(...wrToClassList('p-4 rounded-xl'))).not.toThrow();
    expect(el.className).toBe('p-4 rounded-xl');
  });

  it('flattens arrays and splits the strings inside them', () => {
    expect(wrToClassList(['a', 'b c'], 'd')).toEqual(['a', 'b', 'c', 'd']);
  });

  it('drops nullish, empty and false values so a call site can inline a condition', () => {
    expect(wrToClassList('a', null, undefined, false, '', '   ', ['', 'b'])).toEqual(['a', 'b']);
  });

  it('keeps the first occurrence of a repeated token and nothing after it', () => {
    expect(wrToClassList('a b', 'b a c')).toEqual(['a', 'b', 'c']);
  });

  it('tolerates leading and trailing whitespace rather than emitting empty tokens', () => {
    expect(wrToClassList('  a  b  ')).toEqual(['a', 'b']);
  });

  it('answers an empty array when there is nothing to add', () => {
    expect(wrToClassList()).toEqual([]);
    expect(wrToClassList(null, undefined, false)).toEqual([]);
  });
});
