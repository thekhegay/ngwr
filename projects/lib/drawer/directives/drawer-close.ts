/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive, inject } from '@angular/core';

import { WrDrawer } from '../drawer';

/**
 * Closes the parent drawer on click. Attach to any clickable element.
 *
 * @example
 * ```html
 * <wr-btn wrDrawerClose>Close</wr-btn>
 * ```
 */
@Directive({
  selector: '[wrDrawerClose]',
  host: { '(click)': 'close()' },
})
export class WrDrawerClose {
  private readonly drawer = inject(WrDrawer, { optional: true });

  protected close(): void {
    this.drawer?.open.set(false);
  }
}
