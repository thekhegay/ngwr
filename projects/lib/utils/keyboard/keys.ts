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
} as const;

export type WrKey = (typeof KEYS)[keyof typeof KEYS];
