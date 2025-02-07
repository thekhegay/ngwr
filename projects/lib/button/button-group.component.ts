/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, HostBinding, ViewEncapsulation } from '@angular/core';

import { SafeAny } from 'ngwr/cdk/types';

/**
 * NGWR button group.
 *
 * {@tutorial} [How to use wr-btn-group]{@link http://ngwr.dev/docs/components/button-group}
 */
@Component({
  selector: 'wr-btn-group',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WrButtonGroupComponent {
  @HostBinding('class')
  get classes(): SafeAny {
    return {
      'wr-btn-group': true,
    };
  }
}
