/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive } from '@angular/core';

/**
 * Styles a dialog title row. Use on a heading inside an opened dialog.
 *
 * @example
 * ```html
 * <h2 wrDialogTitle>Confirm delete</h2>
 * ```
 */
@Directive({
  selector: '[wrDialogTitle]',
  host: { class: 'wr-dialog__title' },
})
export class WrDialogTitleDirective {}
