/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, HostBinding, ViewEncapsulation } from '@angular/core';

/**
 * NGWR form error component.
 *
 * {@tutorial} [How to use wr-alert]{@link http://ngwr.dev/docs/components/form}
 */
@Component({
  standalone: true,
  selector: 'wr-form-error',
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WrFormErrorComponent {
  @HostBinding() class = 'wr-form-error';
}
