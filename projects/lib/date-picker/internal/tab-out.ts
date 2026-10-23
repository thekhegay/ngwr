/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { getFocusableElements } from 'ngwr/utils';

/**
 * Whether a keydown is a Tab that takes focus out past either end of an open,
 * non-modal popup.
 *
 * The popup lives in the overlay container at the end of `<body>`, so the
 * browser's own Tab out of its last stop went to `<body>` — the top of the page —
 * and Shift+Tab out of its first stop to the page's last control, with the popup
 * still standing. The caller focuses its trigger synchronously and does NOT
 * `preventDefault`, so the browser's Tab carries on from the trigger to its real
 * neighbour, then closes the popup — the same move `wr-dropdown` makes for its
 * menu. A Tab between two stops inside the popup is left alone.
 *
 * @internal
 */
export function tabLeavesPane(pane: HTMLElement, event: KeyboardEvent): boolean {
  if (event.key !== 'Tab' || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return false;
  const active = pane.ownerDocument.activeElement;
  if (!active || !pane.contains(active)) return false;
  const all = getFocusableElements(pane);
  const at = all.indexOf(active as HTMLElement);
  if (at < 0) return false;
  const beyond = event.shiftKey ? all.slice(0, at) : all.slice(at + 1);
  // Tab stops, not every focusable element: a calendar's other days are buttons with
  // `tabindex="-1"`, focusable and never reached by Tab.
  return !beyond.some(el => el.tabIndex >= 0);
}
