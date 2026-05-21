/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive, inject } from '@angular/core';

import { WrDrawerComponent } from '../drawer.component';

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
export class WrDrawerCloseDirective {
  private readonly drawer = inject(WrDrawerComponent, { optional: true });

  protected close(): void {
    this.drawer?.open.set(false);
  }
}
