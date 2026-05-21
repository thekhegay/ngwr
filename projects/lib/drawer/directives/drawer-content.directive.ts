/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive } from '@angular/core';

/**
 * Marks the scrollable body of the drawer. Applies the `wr-drawer__content`
 * class so the panel's flex layout can stretch it between the title and the
 * footer.
 */
@Directive({
  selector: '[wrDrawerContent]',
  host: { class: 'wr-drawer__content' },
})
export class WrDrawerContentDirective {}
