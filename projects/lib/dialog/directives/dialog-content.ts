/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive } from '@angular/core';

/**
 * Styles the scrollable body section of a dialog.
 *
 * @example
 * ```html
 * <div wrDialogContent>…body…</div>
 * ```
 */
@Directive({
  selector: '[wrDialogContent]',
  host: { class: 'wr-dialog__content' },
})
export class WrDialogContent {}
