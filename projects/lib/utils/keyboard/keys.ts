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
export const WR_KEYS = {
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

export type WrKey = (typeof WR_KEYS)[keyof typeof WR_KEYS];

/**
 * What each key in {@link WR_KEYS} is called on a PC keycap, for a shortcut hint
 * or a cheat sheet: `Esc`, `Enter`, `Ctrl`, an arrow as its glyph. English, the
 * way the keys are printed: `wr-kbd` reads the words from the i18n catalog
 * instead. `wrFormatChord` in `ngwr/hotkey` prints a whole chord from these and
 * swaps in Apple's glyphs (`⌘`, `⇧`, `↩`) on macOS.
 */
export const WR_KEY_LABELS: Readonly<Record<WrKey, string>> = {
  [WR_KEYS.ENTER]: 'Enter',
  [WR_KEYS.ESCAPE]: 'Esc',
  [WR_KEYS.TAB]: 'Tab',
  [WR_KEYS.SPACE]: 'Space',
  [WR_KEYS.BACKSPACE]: 'Backspace',
  [WR_KEYS.DELETE]: 'Delete',
  [WR_KEYS.ARROW_UP]: '↑',
  [WR_KEYS.ARROW_DOWN]: '↓',
  [WR_KEYS.ARROW_LEFT]: '←',
  [WR_KEYS.ARROW_RIGHT]: '→',
  [WR_KEYS.HOME]: 'Home',
  [WR_KEYS.END]: 'End',
  [WR_KEYS.PAGE_UP]: 'Page Up',
  [WR_KEYS.PAGE_DOWN]: 'Page Down',
  [WR_KEYS.CONTROL]: 'Ctrl',
  [WR_KEYS.SHIFT]: 'Shift',
  [WR_KEYS.ALT]: 'Alt',
  [WR_KEYS.META]: 'Win',
};
