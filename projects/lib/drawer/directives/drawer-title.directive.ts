/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive } from '@angular/core';

@Directive({
  selector: '[wrDrawerTitle]',
  host: { class: 'wr-drawer__title' },
})
export class WrDrawerTitleDirective {}
