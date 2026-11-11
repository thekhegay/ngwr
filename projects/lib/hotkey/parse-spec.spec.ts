import { describe, expect, it } from 'vitest';

import { wrMatchesHotkey, wrParseHotkeySpec } from './parse-spec';

const press = (key: string, mods: Partial<KeyboardEventInit> = {}): KeyboardEvent =>
  new KeyboardEvent('keydown', { key, ...mods });

describe('wrParseHotkeySpec', () => {
  it('reads a bare key', () => {
    expect(wrParseHotkeySpec('k')).toEqual({ ctrl: false, alt: false, shift: false, meta: false, key: 'k' });
  });

  it('reads modifiers in any order, with the spellings people actually type', () => {
    const expected = { ctrl: true, alt: true, shift: true, meta: true, key: 'k' };
    expect(wrParseHotkeySpec('ctrl+alt+shift+meta+k')).toEqual(expected);
    expect(wrParseHotkeySpec('k+meta+shift+alt+ctrl')).toEqual(expected);
    expect(wrParseHotkeySpec('control+option+shift+cmd+k')).toEqual(expected);
    expect(wrParseHotkeySpec('CTRL + ALT + SHIFT + SUPER + K')).toEqual(expected);
  });

  it('resolves `mod` per platform — the whole reason the token exists', () => {
    expect(wrParseHotkeySpec('mod+s', false)).toMatchObject({ ctrl: true, meta: false });
    expect(wrParseHotkeySpec('mod+s', true)).toMatchObject({ ctrl: false, meta: true });
  });

  it('normalizes key aliases to what KeyboardEvent.key actually reports', () => {
    expect(wrParseHotkeySpec('esc').key).toBe('escape');
    expect(wrParseHotkeySpec('space').key).toBe(' ');
    expect(wrParseHotkeySpec('spacebar').key).toBe(' ');
    expect(wrParseHotkeySpec('return').key).toBe('enter');
    expect(wrParseHotkeySpec('up').key).toBe('arrowup');
    expect(wrParseHotkeySpec('del').key).toBe('delete');
  });

  it('keeps the LAST non-modifier token when a spec names several', () => {
    // Not a supported spec shape, but worth pinning: it does not silently
    // produce a chord, it produces the last key.
    expect(wrParseHotkeySpec('a+b').key).toBe('b');
  });
});

describe('wrMatchesHotkey', () => {
  it('matches a bare key', () => {
    expect(wrMatchesHotkey(press('k'), wrParseHotkeySpec('k'))).toBe(true);
  });

  it('lowercases the event key, which is what keeps a hotkey alive under CapsLock', () => {
    // With CapsLock on, the K key reports `key: 'K'` and `shiftKey: false` —
    // comparing raw would silently break every letter hotkey for those users.
    expect(wrMatchesHotkey(press('K'), wrParseHotkeySpec('k'))).toBe(true);
    expect(wrMatchesHotkey(press('K', { shiftKey: true }), wrParseHotkeySpec('shift+k'))).toBe(true);
    // Shift is still part of the chord, so it cannot be ignored either way.
    expect(wrMatchesHotkey(press('K', { shiftKey: true }), wrParseHotkeySpec('k'))).toBe(false);
  });

  it('requires the modifier set to match EXACTLY', () => {
    const parsed = wrParseHotkeySpec('ctrl+k');
    expect(wrMatchesHotkey(press('k', { ctrlKey: true }), parsed)).toBe(true);
    // An extra modifier is a different chord — otherwise Ctrl+Shift+K would
    // fire every Ctrl+K handler on the page.
    expect(wrMatchesHotkey(press('k', { ctrlKey: true, shiftKey: true }), parsed)).toBe(false);
    expect(wrMatchesHotkey(press('k'), parsed)).toBe(false);
  });

  it('does not treat cmd and ctrl as interchangeable', () => {
    expect(wrMatchesHotkey(press('k', { metaKey: true }), wrParseHotkeySpec('ctrl+k'))).toBe(false);
    expect(wrMatchesHotkey(press('k', { ctrlKey: true }), wrParseHotkeySpec('cmd+k'))).toBe(false);
  });

  it('matches `mod` against whichever key the platform resolved it to', () => {
    expect(wrMatchesHotkey(press('s', { ctrlKey: true }), wrParseHotkeySpec('mod+s', false))).toBe(true);
    expect(wrMatchesHotkey(press('s', { metaKey: true }), wrParseHotkeySpec('mod+s', true))).toBe(true);
    expect(wrMatchesHotkey(press('s', { metaKey: true }), wrParseHotkeySpec('mod+s', false))).toBe(false);
  });

  it('matches the aliased keys', () => {
    expect(wrMatchesHotkey(press('Escape'), wrParseHotkeySpec('esc'))).toBe(true);
    expect(wrMatchesHotkey(press(' '), wrParseHotkeySpec('space'))).toBe(true);
    expect(wrMatchesHotkey(press('ArrowUp'), wrParseHotkeySpec('up'))).toBe(true);
  });

  // On a Russian layout the key labelled K types `л`, so a letter shortcut was
  // dead until the user switched to English.
  it('falls back to the physical key when the layout types a non-Latin character', () => {
    expect(wrMatchesHotkey(press('л', { code: 'KeyK', ctrlKey: true }), wrParseHotkeySpec('mod+k'))).toBe(true);
    expect(wrMatchesHotkey(press('Л', { code: 'KeyK', shiftKey: true }), wrParseHotkeySpec('shift+k'))).toBe(true);
    expect(wrMatchesHotkey(press('х', { code: 'BracketLeft', ctrlKey: true }), wrParseHotkeySpec('ctrl+['))).toBe(true);
    expect(wrMatchesHotkey(press('л', { code: 'KeyK', ctrlKey: true }), wrParseHotkeySpec('mod+j'))).toBe(false);
    expect(wrMatchesHotkey(press('λ', { code: 'KeyL', metaKey: true }), wrParseHotkeySpec('cmd+l'))).toBe(true);
  });

  it('follows the letter, not the position, on a Latin layout', () => {
    // Dvorak: the key labelled K types `t`, and the key labelled V types `k`.
    expect(wrMatchesHotkey(press('t', { code: 'KeyK', ctrlKey: true }), wrParseHotkeySpec('mod+k'))).toBe(false);
    expect(wrMatchesHotkey(press('k', { code: 'KeyV', ctrlKey: true }), wrParseHotkeySpec('mod+k'))).toBe(true);
    // Latin letters outside ASCII are keys of their own: Turkish ı sits where
    // the US layout has I, and German ß where it has -.
    expect(wrMatchesHotkey(press('ı', { code: 'KeyI', ctrlKey: true }), wrParseHotkeySpec('ctrl+i'))).toBe(false);
    expect(wrMatchesHotkey(press('ß', { code: 'Minus', ctrlKey: true }), wrParseHotkeySpec('ctrl+-'))).toBe(false);
  });

  it('never falls back on a chord holding Alt, which types a symbol on purpose', () => {
    // Windows AltGr reports Ctrl and Alt together; macOS Option is Alt.
    expect(
      wrMatchesHotkey(press('€', { code: 'KeyE', ctrlKey: true, altKey: true }), wrParseHotkeySpec('ctrl+alt+e'))
    ).toBe(false);
    expect(wrMatchesHotkey(press('Ω', { code: 'KeyY', altKey: true }), wrParseHotkeySpec('alt+y'))).toBe(false);
    expect(
      wrMatchesHotkey(press('ś', { code: 'KeyS', ctrlKey: true, altKey: true }), wrParseHotkeySpec('ctrl+alt+s'))
    ).toBe(false);
  });

  it('does not guess when the event names no physical key', () => {
    expect(wrMatchesHotkey(press('л', { ctrlKey: true }), wrParseHotkeySpec('mod+k'))).toBe(false);
    expect(wrMatchesHotkey(press('Dead', { code: 'KeyE', altKey: true }), wrParseHotkeySpec('alt+e'))).toBe(false);
  });
});
