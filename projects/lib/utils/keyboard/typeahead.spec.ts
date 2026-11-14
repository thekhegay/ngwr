import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { wrTypeahead } from './typeahead';

const key = (k: string, init: KeyboardEventInit = {}): KeyboardEvent =>
  new KeyboardEvent('keydown', { key: k, ...init });

const FRUIT = ['Apple', 'Banana', 'Blueberry', 'Cherry', 'Blackcurrant'];

describe('wrTypeahead', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['Date', 'setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'],
    });
    vi.setSystemTime(10_000);
  });
  afterEach(() => vi.useRealTimers());

  it('moves to the next row that starts with the letter, after the current one', () => {
    const typeahead = wrTypeahead();
    expect(typeahead.handleKey(key('b'), FRUIT, 0)).toBe(1);
  });

  it('cycles through the rows of one letter when it is repeated, and wraps', () => {
    const typeahead = wrTypeahead();
    expect(typeahead.handleKey(key('b'), FRUIT, 0)).toBe(1);
    expect(typeahead.handleKey(key('b'), FRUIT, 1)).toBe(2);
    expect(typeahead.handleKey(key('b'), FRUIT, 2)).toBe(4);
    expect(typeahead.handleKey(key('b'), FRUIT, 4)).toBe(1);
  });

  it('spells a longer run, and keeps the row that already matches it', () => {
    const typeahead = wrTypeahead();
    expect(typeahead.handleKey(key('b'), FRUIT, 0)).toBe(1);
    // "bl" leaves Banana for the next match.
    expect(typeahead.handleKey(key('l'), FRUIT, 1)).toBe(2);
    // "blu" still matches Blueberry, so the cursor stays.
    expect(typeahead.handleKey(key('u'), FRUIT, 2)).toBe(2);
  });

  it('starts a new run after the pause', () => {
    const typeahead = wrTypeahead();
    expect(typeahead.handleKey(key('b'), FRUIT, 0)).toBe(1);
    vi.advanceTimersByTime(500);
    expect(typeahead.active).toBe(true);
    // Inside the pause this is "bc", which nothing starts with.
    expect(typeahead.handleKey(key('c'), FRUIT, 1)).toBe(-1);

    vi.advanceTimersByTime(501);
    expect(typeahead.active).toBe(false);
    expect(typeahead.handleKey(key('c'), FRUIT, 1)).toBe(3);
  });

  it('takes the pause from resetMs', () => {
    const typeahead = wrTypeahead({ resetMs: 100 });
    typeahead.handleKey(key('b'), FRUIT, 0);
    vi.advanceTimersByTime(101);
    expect(typeahead.handleKey(key('c'), FRUIT, 1)).toBe(3);
  });

  it('answers -1 for a key it took that matches nothing', () => {
    expect(wrTypeahead().handleKey(key('z'), FRUIT, 0)).toBe(-1);
  });

  it('wraps past the end', () => {
    expect(wrTypeahead().handleKey(key('a'), FRUIT, 3)).toBe(0);
  });

  it('starts at the first row when there is no current row', () => {
    expect(wrTypeahead().handleKey(key('a'), FRUIT, -1)).toBe(0);
  });

  it('skips a disabled row', () => {
    const items = [
      { label: 'Apple' },
      { label: 'Banana', disabled: true },
      { label: 'Blueberry' },
      { label: 'Blackcurrant', disabled: true },
    ];
    const typeahead = wrTypeahead();
    expect(typeahead.handleKey(key('b'), items, 0)).toBe(2);
    // The only enabled "b" row is the current one.
    expect(typeahead.handleKey(key('b'), items, 2)).toBe(2);
  });

  it('leaves a key with Ctrl, Meta or Alt alone, and takes one with Shift', () => {
    const typeahead = wrTypeahead();
    expect(typeahead.handleKey(key('b', { ctrlKey: true }), FRUIT, 0)).toBeNull();
    expect(typeahead.handleKey(key('b', { metaKey: true }), FRUIT, 0)).toBeNull();
    expect(typeahead.handleKey(key('b', { altKey: true }), FRUIT, 0)).toBeNull();
    expect(typeahead.active).toBe(false);
    expect(typeahead.handleKey(key('C', { shiftKey: true }), FRUIT, 0)).toBe(3);
  });

  it('leaves a named key alone', () => {
    const typeahead = wrTypeahead();
    expect(typeahead.handleKey(key('Enter'), FRUIT, 0)).toBeNull();
    expect(typeahead.handleKey(key('ArrowDown'), FRUIT, 0)).toBeNull();
    expect(typeahead.handleKey(key('Backspace'), FRUIT, 0)).toBeNull();
  });

  it('leaves a key of an IME composition alone', () => {
    const typeahead = wrTypeahead();
    expect(typeahead.handleKey(key('b', { isComposing: true }), FRUIT, 0)).toBeNull();
    expect(typeahead.handleKey(key('b', { keyCode: 229 }), FRUIT, 0)).toBeNull();
    expect(typeahead.active).toBe(false);
  });

  it('leaves a key typed in a text field alone', () => {
    const typeahead = wrTypeahead();
    const input = document.createElement('input');
    document.body.append(input);
    const event = key('b', { bubbles: true });
    input.dispatchEvent(event);
    expect(typeahead.handleKey(event, FRUIT, 0)).toBeNull();
    input.remove();
  });

  it('takes Space only inside a run', () => {
    const items = ['Open', 'New file', 'New window'];
    const typeahead = wrTypeahead();
    expect(typeahead.handleKey(key(' '), items, 0)).toBeNull();

    expect(typeahead.handleKey(key('n'), items, 0)).toBe(1);
    typeahead.handleKey(key('e'), items, 1);
    typeahead.handleKey(key('w'), items, 1);
    expect(typeahead.handleKey(key(' '), items, 1)).toBe(1);
    expect(typeahead.handleKey(key('w'), items, 1)).toBe(2);

    // The run is over, so Space is the caller's again.
    vi.advanceTimersByTime(501);
    expect(typeahead.handleKey(key(' '), items, 2)).toBeNull();
  });

  it('ignores case, in the language it was given', () => {
    expect(wrTypeahead().handleKey(key('B', { shiftKey: true }), ['apple', 'banana'], 0)).toBe(1);
    expect(wrTypeahead().handleKey(key('b'), ['APPLE', 'BANANA'], 0)).toBe(1);

    // Turkish lowercases `I` to the dotless `ı`, and `İ` to `i`.
    const items = ['Ankara', 'Isparta', 'İzmir'];
    expect(wrTypeahead({ locale: 'tr' }).handleKey(key('i'), items, 0)).toBe(2);
    expect(wrTypeahead({ locale: () => 'tr' }).handleKey(key('ı'), items, 0)).toBe(1);
    expect(wrTypeahead({ locale: 'en' }).handleKey(key('i'), items, 0)).toBe(1);
  });

  it('falls back to the browser locale on a tag the engine does not know', () => {
    expect(wrTypeahead({ locale: 'not a tag' }).handleKey(key('b'), FRUIT, 0)).toBe(1);
  });

  it('trims the label', () => {
    expect(wrTypeahead().handleKey(key('b'), ['Apple', '  Banana  '], 0)).toBe(1);
  });

  it('type and find split the key from the search', () => {
    const typeahead = wrTypeahead();
    expect(typeahead.type(key('c'))).toBe(true);
    expect(typeahead.find(FRUIT, 0)).toBe(3);
    typeahead.reset();
    expect(typeahead.active).toBe(false);
    expect(typeahead.find(FRUIT, 0)).toBe(-1);
  });
});
