/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrHotkeySpec } from './types';

/** Map of user-friendly aliases to canonical `KeyboardEvent.key` strings. */
const KEY_ALIASES: Readonly<Record<string, string>> = {
  esc: 'escape',
  space: ' ',
  spacebar: ' ',
  enter: 'enter',
  return: 'enter',
  up: 'arrowup',
  down: 'arrowdown',
  left: 'arrowleft',
  right: 'arrowright',
  del: 'delete',
};

/** What the US layout prints on each punctuation key, by `KeyboardEvent.code`. */
const PUNCTUATION_CODES: Readonly<Record<string, string>> = {
  Backquote: '`',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
};

/** The key a spec names for a physical key, read off the US layout, or `null`. */
function physicalKey(code: string): string | null {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
  if (/^Digit\d$/.test(code)) return code.slice(5);
  return PUNCTUATION_CODES[code] ?? null;
}

/** One letter of a script other than Latin: what a Russian, Greek or Hebrew layout types. */
function isNonLatinLetter(key: string): boolean {
  return /^\p{L}$/u.test(key) && !/^\p{Script=Latin}$/u.test(key);
}

/** Normalised representation of a hotkey spec — easy to match against an event. */
interface WrParsedHotkey {
  readonly ctrl: boolean;
  readonly alt: boolean;
  readonly shift: boolean;
  readonly meta: boolean;
  /** Lowercased `KeyboardEvent.key` value the spec matches. */
  readonly key: string;
}

/**
 * Parse a hotkey spec like `'mod+shift+k'` into a normalised structure.
 *
 * @param spec - the spec to parse
 * @param isMac - when true, `mod` resolves to `meta` (Cmd); otherwise `ctrl`
 */
function parseHotkeySpec(spec: WrHotkeySpec, isMac = false): WrParsedHotkey {
  const tokens = spec
    .split('+')
    .map(t => t.trim().toLowerCase())
    .filter(Boolean);

  let ctrl = false;
  let alt = false;
  let shift = false;
  let meta = false;
  let key = '';

  for (const token of tokens) {
    switch (token) {
      case 'ctrl':
      case 'control':
        ctrl = true;
        break;
      case 'alt':
      case 'option':
        alt = true;
        break;
      case 'shift':
        shift = true;
        break;
      case 'cmd':
      case 'command':
      case 'meta':
      case 'super':
      case 'win':
        meta = true;
        break;
      case 'mod':
        if (isMac) meta = true;
        else ctrl = true;
        break;
      default:
        key = KEY_ALIASES[token] ?? token;
        break;
    }
  }

  return { ctrl, alt, shift, meta, key };
}

/**
 * Does `event` satisfy the parsed hotkey?
 *
 * The typed character decides, and the physical key only stands in when that
 * character is a letter of a non-Latin script. On a Russian layout the key
 * labelled K types `л`, so `mod+k` used to be dead for anyone who had not
 * switched to English; the same goes for Greek, Hebrew or Arabic. A Latin
 * layout never falls back, not even on a letter outside ASCII: on Dvorak the key
 * labelled K types `t`, and Turkish `ı` or German `ß` are keys of their own.
 * Nor does a chord holding Alt, since macOS Option and Windows AltGr type a
 * symbol on purpose, `€` on AltGr+E among them.
 */
function matchesHotkey(event: KeyboardEvent, parsed: WrParsedHotkey): boolean {
  if (event.ctrlKey !== parsed.ctrl) return false;
  if (event.altKey !== parsed.alt) return false;
  if (event.shiftKey !== parsed.shift) return false;
  if (event.metaKey !== parsed.meta) return false;
  if (event.key.toLowerCase() === parsed.key) return true;
  return !event.altKey && isNonLatinLetter(event.key) && physicalKey(event.code) === parsed.key;
}

export { parseHotkeySpec, matchesHotkey };
export type { WrParsedHotkey };
