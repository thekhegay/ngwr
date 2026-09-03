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

/**
 * True while an input method is composing — the key belongs to the IME, not to
 * your handler. **Return early on it in every `keydown` handler that reads
 * Enter, Escape or an arrow on, or above, a field that accepts typed text.**
 *
 * A Japanese or Chinese user reaches every character through a conversion. From
 * `compositionstart` until `compositionend` a candidate window is open, and
 * those keys are how it is driven: Enter accepts the candidate, Escape cancels
 * the conversion back to kana, the arrows walk the candidate list. A component
 * that acts on them anyway takes the key away from the IME mid-word — the
 * overlay closes instead of the candidate window, and the half-composed reading
 * the user was still choosing between is gone with it.
 *
 * Both halves of the test are needed. `isComposing` is the standard flag, but
 * Safari fires `compositionend` *before* the `keydown` of the Enter that commits
 * a candidate, so that one arrives with `isComposing === false` and only the
 * legacy `keyCode` of `229` — the sentinel every engine sets on a key it handed
 * to the input method — to say where it came from.
 *
 * `keydown` is the whole scope. It does NOT answer "is a composition in
 * progress" for an `input` or `blur` handler: on the committing keystroke the
 * two disagree by design. A component that needs the state *between* events
 * tracks it with the `compositionstart` / `compositionend` pair instead.
 *
 * ```ts
 * protected onKeydown(event: KeyboardEvent): void {
 *   if (isComposing(event)) return;
 *   // …
 * }
 * ```
 */
export function isComposing(event: KeyboardEvent): boolean {
  // `keyCode` is deprecated and stays anyway: it is the only signal Safari
  // leaves on the committing keystroke. See the doc comment above.
  return event.isComposing || event.keyCode === 229;
}
