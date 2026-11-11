import { describe, expect, it } from 'vitest';

import { wrHasModifier, wrIsComposing, wrIsPrintableKey } from './predicates';

const key = (init: Partial<KeyboardEvent> & { key: string }): KeyboardEvent => new KeyboardEvent('keydown', init);

describe('wrHasModifier', () => {
  it('is false for a bare key', () => {
    expect(wrHasModifier(key({ key: 'a' }))).toBe(false);
  });

  it('counts shift as a modifier', () => {
    // Deliberate: a component that wants "plain Enter" has to treat Shift+Enter
    // as something else, so Shift belongs in this predicate.
    expect(wrHasModifier(key({ key: 'Enter', shiftKey: true }))).toBe(true);
  });

  it('counts ctrl, alt and meta', () => {
    expect(wrHasModifier(key({ key: 'a', ctrlKey: true }))).toBe(true);
    expect(wrHasModifier(key({ key: 'a', altKey: true }))).toBe(true);
    expect(wrHasModifier(key({ key: 'a', metaKey: true }))).toBe(true);
  });
});

describe('wrIsPrintableKey', () => {
  it('accepts a single character', () => {
    expect(wrIsPrintableKey(key({ key: 'a' }))).toBe(true);
    expect(wrIsPrintableKey(key({ key: ' ' }))).toBe(true);
  });

  it('accepts a shifted character — that is how you type an uppercase letter', () => {
    expect(wrIsPrintableKey(key({ key: 'A', shiftKey: true }))).toBe(true);
  });

  it('rejects named keys and command chords', () => {
    expect(wrIsPrintableKey(key({ key: 'Enter' }))).toBe(false);
    expect(wrIsPrintableKey(key({ key: 'ArrowDown' }))).toBe(false);
    expect(wrIsPrintableKey(key({ key: 'a', ctrlKey: true }))).toBe(false);
    expect(wrIsPrintableKey(key({ key: 'a', metaKey: true }))).toBe(false);
  });
});

describe('wrIsComposing', () => {
  // jsdom runs no input method: every event below is hand-built to carry the
  // flags a real IME would set. This tests the GUARD, not an IME — nothing here
  // says the library behaves correctly under kotoeri or Pinyin, only that a
  // keydown wearing those flags is recognised as the IME's.

  it('is false for an ordinary key', () => {
    expect(wrIsComposing(key({ key: 'Enter' }))).toBe(false);
    expect(wrIsComposing(key({ key: 'Escape' }))).toBe(false);
  });

  it('is true while a composition is open', () => {
    expect(wrIsComposing(key({ key: 'Enter', isComposing: true }))).toBe(true);
    expect(wrIsComposing(key({ key: 'ArrowDown', isComposing: true }))).toBe(true);
  });

  it("is true for Safari's committing keystroke, which reports keyCode 229 and nothing else", () => {
    // Safari fires `compositionend` BEFORE this keydown, so `isComposing` has
    // already gone false; 229 is all that is left to say the key was the IME's.
    expect(wrIsComposing(key({ key: 'Enter', keyCode: 229 }))).toBe(true);
  });
});
