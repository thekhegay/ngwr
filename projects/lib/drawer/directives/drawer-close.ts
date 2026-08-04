/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive, inject, input } from '@angular/core';

import { WrDrawer } from '../drawer';
import type { WrDrawerRef } from '../drawer-ref';
import { WR_DRAWER_REF } from '../tokens';

/**
 * Closes the parent drawer on click. Attach to any clickable element.
 *
 * Works for both drawer flavours: inside `<wr-drawer>` it clears the
 * component's `open` model, and inside a `WrDrawerManager.open()` drawer it
 * closes the ref — optionally passing a `[wrDrawerClose]` value as the close
 * result (the component flavour has no result to carry, so the value is
 * ignored there).
 *
 * @example
 * ```html
 * <wr-btn wrDrawerClose>Close</wr-btn>
 * <wr-btn color="primary" [wrDrawerClose]="true">Save</wr-btn>
 * ```
 */
@Directive({
  selector: '[wrDrawerClose]',
  host: { '(click)': 'close()' },
})
export class WrDrawerClose<R = unknown> {
  /**
   * Value to pass to `close()` for service-opened drawers. When unset — or
   * used as a bare attribute — the drawer closes with `undefined`.
   */
  readonly result = input<R | undefined, R | undefined | ''>(undefined, {
    alias: 'wrDrawerClose',
    // A bare `wrDrawerClose` attribute arrives as the empty string; that means
    // "no result", not a result of `''`.
    transform: value => (value === '' ? undefined : value),
  });

  private readonly drawer = inject(WrDrawer, { optional: true });
  private readonly ref = inject<WrDrawerRef<unknown, R>>(WR_DRAWER_REF, { optional: true });

  protected close(): void {
    // Element injectors win, so a surrounding `<wr-drawer>` is the nearer
    // owner even when a service-opened drawer sits further up the tree.
    if (this.drawer) {
      this.drawer.open.set(false);
      return;
    }
    this.ref?.close(this.result());
  }
}
