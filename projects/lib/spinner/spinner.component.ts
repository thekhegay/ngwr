/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, HostBinding, ViewEncapsulation } from '@angular/core';

/**
 * NGWR spinner component.
 *
 * {@tutorial} [How to use wr-spinner]{@link http://ngwr.dev/docs/components/spinner
 */
@Component({
  standalone: true,
  selector: 'wr-spinner',
  template:
    '<svg viewBox="0 0 50 50"><circle class="path" cx="25" cy="25" r="20" stroke-width="5" fill="none"></circle></svg>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WrSpinnerComponent {
  @HostBinding() class = 'wr-spinner';
}
