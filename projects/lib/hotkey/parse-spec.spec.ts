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

  // On a Russian layout the key labelled K types `л`, so a letter shortcut was
  // dead until the user switched to English.
  it('falls back to the physical key when the layout types a non-Latin character', () => {
    expect(matchesHotkey(press('л', { code: 'KeyK', ctrlKey: true }), parseHotkeySpec('mod+k'))).toBe(true);
    expect(matchesHotkey(press('Л', { code: 'KeyK', shiftKey: true }), parseHotkeySpec('shift+k'))).toBe(true);
    expect(matchesHotkey(press('х', { code: 'BracketLeft', ctrlKey: true }), parseHotkeySpec('ctrl+['))).toBe(true);
    expect(matchesHotkey(press('л', { code: 'KeyK', ctrlKey: true }), parseHotkeySpec('mod+j'))).toBe(false);
    expect(matchesHotkey(press('λ', { code: 'KeyL', metaKey: true }), parseHotkeySpec('cmd+l'))).toBe(true);
  });

  it('follows the letter, not the position, on a Latin layout', () => {
    // Dvorak: the key labelled K types `t`, and the key labelled V types `k`.
    expect(matchesHotkey(press('t', { code: 'KeyK', ctrlKey: true }), parseHotkeySpec('mod+k'))).toBe(false);
    expect(matchesHotkey(press('k', { code: 'KeyV', ctrlKey: true }), parseHotkeySpec('mod+k'))).toBe(true);
    // Latin letters outside ASCII are keys of their own: Turkish ı sits where
    // the US layout has I, and German ß where it has -.
    expect(matchesHotkey(press('ı', { code: 'KeyI', ctrlKey: true }), parseHotkeySpec('ctrl+i'))).toBe(false);
    expect(matchesHotkey(press('ß', { code: 'Minus', ctrlKey: true }), parseHotkeySpec('ctrl+-'))).toBe(false);
  });

  it('never falls back on a chord holding Alt, which types a symbol on purpose', () => {
    // Windows AltGr reports Ctrl and Alt together; macOS Option is Alt.
    expect(
      matchesHotkey(press('€', { code: 'KeyE', ctrlKey: true, altKey: true }), parseHotkeySpec('ctrl+alt+e'))
    ).toBe(false);
    expect(matchesHotkey(press('Ω', { code: 'KeyY', altKey: true }), parseHotkeySpec('alt+y'))).toBe(false);
    expect(
      matchesHotkey(press('ś', { code: 'KeyS', ctrlKey: true, altKey: true }), parseHotkeySpec('ctrl+alt+s'))
    ).toBe(false);
  });

  it('does not guess when the event names no physical key', () => {
    expect(matchesHotkey(press('л', { ctrlKey: true }), parseHotkeySpec('mod+k'))).toBe(false);
    expect(matchesHotkey(press('Dead', { code: 'KeyE', altKey: true }), parseHotkeySpec('alt+e'))).toBe(false);
  });
});
