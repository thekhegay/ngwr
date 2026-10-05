/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Is `el` rendered? A layout test, not a style one: `getClientRects()` is empty
 * for `display: none` on the element OR on any ancestor, and non-empty for
 * everything that has a box — `position: fixed` included.
 *
 * It used to be `offsetParent !== null`, which is almost the same test and
 * wrong in one direction that matters here: a `position: fixed` element has no
 * offset parent at all, so every control inside a fixed panel — the one shape a
 * focus trap is most often wrapped around — was dropped as if it were hidden.
 *
 * `visibility: hidden` keeps its box, so it needs its own read. It is checked
 * second because it is the expensive one, and `getClientRects()` already
 * rejects the common case.
 */
function isRendered(el: HTMLElement): boolean {
  if (el.getClientRects().length === 0) return false;
  return el.ownerDocument.defaultView?.getComputedStyle(el).visibility !== 'hidden';
}

/**
 * Return every focusable descendant of `root`, in DOM ORDER — not in tab order.
 * A positive `tabindex` is not reordered, because a trap that honoured it would
 * disagree with the browser about what Tab does for everything outside the trap;
 * APG says not to use positive values at all.
 *
 * Elements with no box are dropped (see `isRendered`), except the one that
 * currently has focus: a trap must still be able to find where it is standing,
 * and an element can be focused and then hidden by the same interaction.
 */
export function getFocusableElements(root: HTMLElement): readonly HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    el => isRendered(el) || el === document.activeElement
  );
}

/**
 * Trap Tab navigation inside `root` for a keyboard event — call from a
 * `keydown` handler. Cycles focus from first ↔ last focusable element.
 * Returns `true` when focus was redirected (event was handled).
 */
export function trapFocus(root: HTMLElement, event: KeyboardEvent): boolean {
  if (event.key !== 'Tab') return false;
  const focusable = getFocusableElements(root);
  if (focusable.length === 0) return false;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement as HTMLElement | null;

  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
    return true;
  }
  if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
    return true;
  }
  return false;
}
