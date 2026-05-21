/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DialogRef } from '@angular/cdk/dialog';
import { Directive, inject, input } from '@angular/core';

/**
 * Closes the dialog when the host element is clicked.
 *
 * Optionally passes a `[wrDialogClose]` value as the close result.
 *
 * @example
 * ```html
 * <wr-btn wrDialogClose>Cancel</wr-btn>
 * <wr-btn color="primary" [wrDialogClose]="true">Confirm</wr-btn>
 * ```
 */
@Directive({
  selector: '[wrDialogClose]',
  host: { '(click)': 'onClick()' },
})
export class WrDialogCloseDirective<R = unknown> {
  /**
   * Value to pass to `close()`. When unset, the dialog closes with
   * `undefined`.
   */
  readonly result = input<R | undefined>(undefined, { alias: 'wrDialogClose' });

  private readonly ref = inject<DialogRef<R>>(DialogRef, { optional: true });

  protected onClick(): void {
    this.ref?.close(this.result());
  }
}
