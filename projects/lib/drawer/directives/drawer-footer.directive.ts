/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive, computed, input } from '@angular/core';

@Directive({
  selector: '[wrDrawerFooter]',
  host: { '[class]': 'classes()' },
})
export class WrDrawerFooterDirective {
  readonly align = input<'start' | 'center' | 'end'>('end');

  protected readonly classes = computed(() => `wr-drawer__footer wr-drawer__footer--${this.align()}`);
}
