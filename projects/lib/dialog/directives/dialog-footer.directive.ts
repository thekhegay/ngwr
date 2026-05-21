/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive, computed, input } from '@angular/core';

/**
 * Footer row, typically holding action buttons.
 *
 * @example
 * ```html
 * <div wrDialogFooter align="end">
 *   <wr-btn wrDialogClose>Cancel</wr-btn>
 *   <wr-btn color="danger" (click)="confirm()">Delete</wr-btn>
 * </div>
 * ```
 */
@Directive({
  selector: '[wrDialogFooter]',
  host: { '[class]': 'classes()' },
})
export class WrDialogFooterDirective {
  /**
   * Horizontal alignment of the children.
   *
   * @default 'end'
   */
  readonly align = input<'start' | 'center' | 'end'>('end');

  protected readonly classes = computed(() => `wr-dialog__footer wr-dialog__footer--${this.align()}`);
}
