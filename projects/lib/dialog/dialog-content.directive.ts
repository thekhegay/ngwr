/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive, HostBinding } from '@angular/core';

@Directive({
  standalone: true,
  selector: `[wrDialogContent]`,
})
export class WrDialogContentDirective {
  @HostBinding() class = 'wr-dialog__content';
}
