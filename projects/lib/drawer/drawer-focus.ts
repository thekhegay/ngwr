/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { OverlayRef } from '@angular/cdk/overlay';

/**
 * Whether focus is inside the drawer's panel. Shared by the non-modal Escape
 * gate and the close path, in `<wr-drawer>` and in `WrDrawerRef`.
 *
 * @internal
 */
export function drawerHasFocus(overlayRef: OverlayRef | null): boolean {
  const active = typeof document === 'undefined' ? null : document.activeElement;
  return !!active && !!overlayRef?.overlayElement?.contains(active);
}

/**
 * Whether nothing has focus any more — `<body>` or nothing at all. A non-modal
 * drawer takes Escape, and returns focus to its opener on close, only from
 * inside itself or from here: a click on the panel's own text focuses nothing
 * and lands focus here, while a reader who has clicked or tabbed on into the
 * page is left where they are.
 *
 * @internal
 */
export function focusIsLost(): boolean {
  if (typeof document === 'undefined') return false;
  const active = document.activeElement;
  return !active || active === document.body;
}
