/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive, computed, input } from '@angular/core';

/**
 * Marks the action row pinned to the bottom of the drawer. Adds the
 * `wr-drawer__footer` class plus an alignment modifier so action buttons
 * can sit at the start, center, or end of the row.
 *
 * @example
 * ```html
 * <div wrDrawerFooter align="end">
 *   <wr-btn wrDrawerClose>Cancel</wr-btn>
 *   <wr-btn color="primary" (click)="save()">Save</wr-btn>
 * </div>
 * ```
 */
@Directive({
  selector: '[wrDrawerFooter]',
  host: { '[class]': 'classes()' },
})
export class WrDrawerFooterDirective {
  /** Horizontal alignment of footer content. @default 'end' */
  readonly align = input<'start' | 'center' | 'end'>('end');

  protected readonly classes = computed(() => `wr-drawer__footer wr-drawer__footer--${this.align()}`);
}
