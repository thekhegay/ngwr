/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { OverlayRef } from '@angular/cdk/overlay';

import { noop } from 'ngwr/utils';

/**
 * Keep an OPEN overlay positioned as its content changes size.
 *
 * The CDK positions a pane once, when it attaches, and again on scroll or
 * resize of the window. A panel whose content renders after that, or grows later
 * (a time row that appears, a calendar that gains a sixth week), is measured at
 * its first, smaller size: flipped above the origin at that height, it then
 * grows downward over the field it belongs to. This watches the pane with a
 * `ResizeObserver` and calls `updatePosition()` on every change, so the flip
 * decision always uses the size the panel has now.
 *
 * Call it once per `OverlayRef`, right after `attach(...)`. It ends itself when
 * the overlay detaches or is disposed. No-op where `ResizeObserver` does not
 * exist (SSR, old engines).
 *
 * @param overlayRef The overlay to keep in place.
 * @returns Stops observing. Idempotent, and unnecessary in the normal case.
 */
export function wrFollowSize(overlayRef: OverlayRef): () => void {
  if (typeof ResizeObserver === 'undefined') return noop;

  const observer = new ResizeObserver(() => overlayRef.updatePosition());
  observer.observe(overlayRef.overlayElement);

  const stop = (): void => {
    observer.disconnect();
    subscription.unsubscribe();
  };
  // Both handlers: a live ref arrives through `next`, a disposed one only completes.
  const subscription = overlayRef.detachments().subscribe({ next: stop, complete: stop });
  return stop;
}
