import { KEYS } from 'ngwr/utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { wrFormatChord, wrHotkeyPlatform } from './format-chord';

describe('wrFormatChord', () => {
  it('writes mod the way each platform does', () => {
    expect(wrFormatChord('mod+k', 'mac')).toBe('⌘K');
    expect(wrFormatChord('mod+k', 'other')).toBe('Ctrl+K');
    expect(wrFormatChord('mod+shift+k', 'mac')).toBe('⇧⌘K');
    expect(wrFormatChord('mod+shift+k', 'other')).toBe('Ctrl+Shift+K');
  });

  it('orders modifiers the way Apple writes them, whatever order the spec used', () => {
    expect(wrFormatChord('shift+cmd+alt+ctrl+k', 'mac')).toBe('⌃⌥⇧⌘K');
    expect(wrFormatChord('shift+alt+ctrl+k', 'other')).toBe('Ctrl+Alt+Shift+K');
    // An explicit `meta` is ⌘ on a Mac and the Windows key elsewhere, written first.
    expect(wrFormatChord('meta+ctrl+k', 'other')).toBe('Win+Ctrl+K');
  });

  it('labels a named key, as a glyph on a Mac where that is the convention', () => {
    expect(wrFormatChord('escape', 'other')).toBe('Esc');
    expect(wrFormatChord('esc', 'mac')).toBe('⎋');
    expect(wrFormatChord('mod+enter', 'other')).toBe('Ctrl+Enter');
    expect(wrFormatChord('mod+return', 'mac')).toBe('⌘↩');
    expect(wrFormatChord('mod+backspace', 'mac')).toBe('⌘⌫');
    expect(wrFormatChord('mod+del', 'other')).toBe('Ctrl+Delete');
    expect(wrFormatChord('shift+pageup', 'other')).toBe('Shift+Page Up');
    expect(wrFormatChord('shift+pagedown', 'mac')).toBe('⇧⇟');
    // Space has no glyph on either platform.
    expect(wrFormatChord('mod+space', 'mac')).toBe('⌘Space');
    expect(wrFormatChord('alt+space', 'other')).toBe('Alt+Space');
  });

  it('writes an arrow as its glyph everywhere', () => {
    expect(wrFormatChord('mod+up', 'mac')).toBe('⌘↑');
    expect(wrFormatChord('ctrl+arrowdown', 'other')).toBe('Ctrl+↓');
    expect(wrFormatChord('alt+left', 'other')).toBe('Alt+←');
    expect(wrFormatChord('shift+right', 'mac')).toBe('⇧→');
  });

  it('uppercases a letter and keeps punctuation and digits as they are', () => {
    expect(wrFormatChord('k', 'other')).toBe('K');
    expect(wrFormatChord('mod+/', 'mac')).toBe('⌘/');
    expect(wrFormatChord('mod+1', 'other')).toBe('Ctrl+1');
    expect(wrFormatChord('shift+?', 'other')).toBe('Shift+?');
  });

  it('passes a key it has no label for through as typed', () => {
    expect(wrFormatChord('mod+F5', 'other')).toBe('Ctrl+F5');
    expect(wrFormatChord('f5', 'mac')).toBe('f5');
    expect(wrFormatChord(' ctrl + Insert ', 'other')).toBe('Ctrl+Insert');
  });

  it('takes a translated word for a key, and never for a glyph', () => {
    const de = { [KEYS.CONTROL]: 'Strg', [KEYS.SHIFT]: 'Umschalt', [KEYS.ENTER]: 'Eingabe' };
    expect(wrFormatChord('mod+shift+enter', 'other', de)).toBe('Strg+Umschalt+Eingabe');
    expect(wrFormatChord('mod+shift+enter', 'mac', de)).toBe('⇧⌘↩');
    expect(wrFormatChord('mod+shift+k', 'mac', de)).toBe('⇧⌘K');
  });

  describe('the default platform', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('reads the user agent', () => {
      vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)' });
      expect(wrFormatChord('mod+k')).toBe('⌘K');
      vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' });
      expect(wrFormatChord('mod+k')).toBe('Ctrl+K');
    });

    it('is the Ctrl form where there is no navigator, which is the server', () => {
      vi.stubGlobal('navigator', undefined);
      expect(wrHotkeyPlatform()).toBe('other');
      expect(wrFormatChord('mod+k')).toBe('Ctrl+K');
    });

    it('answers for a user agent handed to it, the way WrHotkey asks', () => {
      expect(wrHotkeyPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('mac');
      expect(wrHotkeyPlatform('Mozilla/5.0 (X11; Linux x86_64)')).toBe('other');
      expect(wrHotkeyPlatform(null)).toBe('other');
    });
  });
});
