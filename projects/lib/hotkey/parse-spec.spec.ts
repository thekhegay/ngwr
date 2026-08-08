import { describe, expect, it } from 'vitest';

import { matchesHotkey, parseHotkeySpec } from './parse-spec';

const press = (key: string, mods: Partial<KeyboardEventInit> = {}): KeyboardEvent =>
  new KeyboardEvent('keydown', { key, ...mods });

describe('parseHotkeySpec', () => {
  it('reads a bare key', () => {
    expect(parseHotkeySpec('k')).toEqual({ ctrl: false, alt: false, shift: false, meta: false, key: 'k' });
  });

  it('reads modifiers in any order, with the spellings people actually type', () => {
    const expected = { ctrl: true, alt: true, shift: true, meta: true, key: 'k' };
    expect(parseHotkeySpec('ctrl+alt+shift+meta+k')).toEqual(expected);
    expect(parseHotkeySpec('k+meta+shift+alt+ctrl')).toEqual(expected);
    expect(parseHotkeySpec('control+option+shift+cmd+k')).toEqual(expected);
    expect(parseHotkeySpec('CTRL + ALT + SHIFT + SUPER + K')).toEqual(expected);
  });

  it('resolves `mod` per platform — the whole reason the token exists', () => {
    expect(parseHotkeySpec('mod+s', false)).toMatchObject({ ctrl: true, meta: false });
    expect(parseHotkeySpec('mod+s', true)).toMatchObject({ ctrl: false, meta: true });
  });

  it('normalizes key aliases to what KeyboardEvent.key actually reports', () => {
    expect(parseHotkeySpec('esc').key).toBe('escape');
    expect(parseHotkeySpec('space').key).toBe(' ');
    expect(parseHotkeySpec('spacebar').key).toBe(' ');
    expect(parseHotkeySpec('return').key).toBe('enter');
    expect(parseHotkeySpec('up').key).toBe('arrowup');
    expect(parseHotkeySpec('del').key).toBe('delete');
  });

  it('keeps the LAST non-modifier token when a spec names several', () => {
    // Not a supported spec shape, but worth pinning: it does not silently
    // produce a chord, it produces the last key.
    expect(parseHotkeySpec('a+b').key).toBe('b');
  });
});

describe('matchesHotkey', () => {
  it('matches a bare key', () => {
    expect(matchesHotkey(press('k'), parseHotkeySpec('k'))).toBe(true);
  });

  it('lowercases the event key, which is what keeps a hotkey alive under CapsLock', () => {
    // With CapsLock on, the K key reports `key: 'K'` and `shiftKey: false` —
    // comparing raw would silently break every letter hotkey for those users.
    expect(matchesHotkey(press('K'), parseHotkeySpec('k'))).toBe(true);
    expect(matchesHotkey(press('K', { shiftKey: true }), parseHotkeySpec('shift+k'))).toBe(true);
    // Shift is still part of the chord, so it cannot be ignored either way.
    expect(matchesHotkey(press('K', { shiftKey: true }), parseHotkeySpec('k'))).toBe(false);
  });

  it('requires the modifier set to match EXACTLY', () => {
    const parsed = parseHotkeySpec('ctrl+k');
    expect(matchesHotkey(press('k', { ctrlKey: true }), parsed)).toBe(true);
    // An extra modifier is a different chord — otherwise Ctrl+Shift+K would
    // fire every Ctrl+K handler on the page.
    expect(matchesHotkey(press('k', { ctrlKey: true, shiftKey: true }), parsed)).toBe(false);
    expect(matchesHotkey(press('k'), parsed)).toBe(false);
  });

  it('does not treat cmd and ctrl as interchangeable', () => {
    expect(matchesHotkey(press('k', { metaKey: true }), parseHotkeySpec('ctrl+k'))).toBe(false);
    expect(matchesHotkey(press('k', { ctrlKey: true }), parseHotkeySpec('cmd+k'))).toBe(false);
  });

  it('matches `mod` against whichever key the platform resolved it to', () => {
    expect(matchesHotkey(press('s', { ctrlKey: true }), parseHotkeySpec('mod+s', false))).toBe(true);
    expect(matchesHotkey(press('s', { metaKey: true }), parseHotkeySpec('mod+s', true))).toBe(true);
    expect(matchesHotkey(press('s', { metaKey: true }), parseHotkeySpec('mod+s', false))).toBe(false);
  });

  it('matches the aliased keys', () => {
    expect(matchesHotkey(press('Escape'), parseHotkeySpec('esc'))).toBe(true);
    expect(matchesHotkey(press(' '), parseHotkeySpec('space'))).toBe(true);
    expect(matchesHotkey(press('ArrowUp'), parseHotkeySpec('up'))).toBe(true);
  });
});
