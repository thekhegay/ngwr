/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive, HostBinding, Input } from '@angular/core';

import { SafeAny } from 'ngwr/cdk/types';

@Directive({
  standalone: true,
  selector: '[wrDialogFooter]',
})
export class WrDialogFooterDirective {
  @Input() position: 'start' | 'center' | 'end' = 'end';

  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'wr-dialog__footer': true,
      'wr-dialog__footer--start': this.position === 'start',
      'wr-dialog__footer--center': this.position === 'center',
      'wr-dialog__footer--end': this.position === 'end',
    };
  }
}
