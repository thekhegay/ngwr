/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrHotkeySpec } from './interfaces';

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

/** Does `event` satisfy the parsed hotkey? */
function matchesHotkey(event: KeyboardEvent, parsed: WrParsedHotkey): boolean {
  if (event.ctrlKey !== parsed.ctrl) return false;
  if (event.altKey !== parsed.alt) return false;
  if (event.shiftKey !== parsed.shift) return false;
  if (event.metaKey !== parsed.meta) return false;
  return event.key.toLowerCase() === parsed.key;
}

export { parseHotkeySpec, matchesHotkey };
export type { WrParsedHotkey };
