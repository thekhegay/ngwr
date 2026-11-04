/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Canonical `KeyboardEvent.key` values for your own `keydown` handlers.
 *
 * The spec spellings are easy to get wrong — arrows are `ArrowUp`, space is a
 * literal `' '` — and a typo like `'Esacpe'` never matches and never errors.
 * These give you autocomplete and the {@link WrKey} union to match against.
 */
export const KEYS = {
  ENTER: 'Enter',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  SPACE: ' ',
  BACKSPACE: 'Backspace',
  DELETE: 'Delete',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
  CONTROL: 'Control',
  SHIFT: 'Shift',
  ALT: 'Alt',
  META: 'Meta',
} as const;

export type WrKey = (typeof KEYS)[keyof typeof KEYS];

/**
 * What each key in {@link KEYS} is called on a PC keycap, for a shortcut hint
 * or a cheat sheet: `Esc`, `Enter`, `Ctrl`, an arrow as its glyph. English, the
 * way the keys are printed: `wr-kbd` reads the words from the i18n catalog
 * instead. `wrFormatChord` in `ngwr/hotkey` prints a whole chord from these and
 * swaps in Apple's glyphs (`⌘`, `⇧`, `↩`) on macOS.
 */
export const KEY_LABELS: Readonly<Record<WrKey, string>> = {
  [KEYS.ENTER]: 'Enter',
  [KEYS.ESCAPE]: 'Esc',
  [KEYS.TAB]: 'Tab',
  [KEYS.SPACE]: 'Space',
  [KEYS.BACKSPACE]: 'Backspace',
  [KEYS.DELETE]: 'Delete',
  [KEYS.ARROW_UP]: '↑',
  [KEYS.ARROW_DOWN]: '↓',
  [KEYS.ARROW_LEFT]: '←',
  [KEYS.ARROW_RIGHT]: '→',
  [KEYS.HOME]: 'Home',
  [KEYS.END]: 'End',
  [KEYS.PAGE_UP]: 'Page Up',
  [KEYS.PAGE_DOWN]: 'Page Down',
  [KEYS.CONTROL]: 'Ctrl',
  [KEYS.SHIFT]: 'Shift',
  [KEYS.ALT]: 'Alt',
  [KEYS.META]: 'Win',
};
