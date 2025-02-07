/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, HostBinding, input, ViewEncapsulation } from '@angular/core';

import { WrSpinnerSize } from './spinner.types';

/**
 * NGWR spinner component.
 *
 * {@tutorial} [How to use wr-spinner]{@link http://ngwr.dev/docs/components/spinner
 */
@Component({
  selector: 'wr-spinner',
  template:
    '<svg viewBox="0 0 50 50"><circle class="path" cx="25" cy="25" r="20" stroke-width="5" fill="none"></circle></svg>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WrSpinnerComponent {
  size = input<WrSpinnerSize>('small');

  @HostBinding('class')
  get hostClasses(): Record<string, boolean> {
    return {
      'wr-spinner': true,
      'wr-spinner--small': this.size() === 'small',
      'wr-spinner--large': this.size() === 'large',
    };
  }
}
