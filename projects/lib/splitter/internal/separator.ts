/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Where a key sends a focusable `role="separator"`: one step toward the low
 * (`-1`) or the high (`1`) end of its axis, or straight to a bound.
 *
 * @internal
 */
export type WrSeparatorKeyMove = -1 | 1 | 'min' | 'max';

/**
 * Reads a `keydown` on a separator. `axis` is the one the separator MOVES
 * along: `inline` for a vertical separator, `block` for a horizontal one.
 *
 * Arrows follow the VISUAL axis (WAI-ARIA APG). Under `dir="rtl"` the inline
 * axis starts on the right, so the visual right is its low end and ArrowRight
 * answers `-1`: otherwise the separator walks away from the key being pressed.
 * The block axis is unaffected by `dir`. Home and End are semantic (first and
 * last, not left and right), so they never mirror. The arrows of the other axis
 * and every other key answer `null`, and the caller leaves the event alone.
 *
 * @internal
 */
export function wrSeparatorKeyMove(
  event: KeyboardEvent,
  axis: 'inline' | 'block',
  rtl: boolean
): WrSeparatorKeyMove | null {
  if (event.key === 'Home') return 'min';
  if (event.key === 'End') return 'max';
  if (axis === 'inline') {
    const forward = rtl ? -1 : 1;
    if (event.key === 'ArrowLeft') return -forward as -1 | 1;
    if (event.key === 'ArrowRight') return forward;
    return null;
  }
  if (event.key === 'ArrowUp') return -1;
  if (event.key === 'ArrowDown') return 1;
  return null;
}

/**
 * Starts a drag from a `pointerdown` on a separator, and answers whether it did.
 *
 * Only the primary button of the primary pointer drags: holding the right
 * button over the separator and moving used to resize, and the same guard keeps
 * a second finger from taking over a drag in progress. The pointer is captured
 * so the drag survives leaving the separator, an iframe and a canvas included.
 * `preventDefault` also suppresses the press's default focus, so the separator
 * is focused by hand: without it the arrows do nothing after a mouse drag until
 * the user finds the separator again with Tab.
 *
 * @internal
 */
export function wrBeginSeparatorDrag(event: PointerEvent): boolean {
  if (event.button !== 0 || !event.isPrimary) return false;
  event.preventDefault();
  const separator = event.currentTarget as HTMLElement;
  separator.setPointerCapture(event.pointerId);
  separator.focus();
  return true;
}

/**
 * Ends the drag {@link wrBeginSeparatorDrag} started, from the `pointerup` or
 * `pointercancel` that closes it.
 *
 * @internal
 */
export function wrEndSeparatorDrag(event: PointerEvent): void {
  (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
}
