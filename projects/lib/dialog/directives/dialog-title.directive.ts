/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive, ElementRef, inject } from '@angular/core';

let uid = 0;

/**
 * Styles a dialog title row. Use on a heading inside an opened dialog.
 * Auto-assigns an `id` so the dialog panel can reference it via
 * `aria-labelledby`.
 *
 * @example
 * ```html
 * <h2 wrDialogTitle>Confirm delete</h2>
 * ```
 */
@Directive({
  selector: '[wrDialogTitle]',
  host: { class: 'wr-dialog__title', '[attr.id]': 'id' },
})
export class WrDialogTitleDirective {
  /** Generated id used for `aria-labelledby` wiring. */
  readonly id = `wr-dialog-title-${++uid}`;

  /** @internal */
  readonly elementRef = inject(ElementRef<HTMLElement>);
}
