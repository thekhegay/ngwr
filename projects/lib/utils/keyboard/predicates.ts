/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** True when any modifier key (Ctrl / Cmd / Alt / Shift / Meta) is held. */
export function hasModifier(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.altKey || event.metaKey || event.shiftKey;
}

/**
 * True when the key is a single printable character (letters, digits,
 * punctuation, etc.). Skips function keys, arrows, modifiers, and named
 * keys like `Backspace` or `Tab`.
 */
export function isPrintableKey(event: KeyboardEvent): boolean {
  return event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
}
