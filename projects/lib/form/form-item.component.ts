/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input,
  ViewEncapsulation,
} from '@angular/core';

import { SafeAny } from 'ngwr/cdk/types';

/**
 * NGWR form item component.
 *
 * {@tutorial} [How to use wr-alert]{@link http://ngwr.dev/docs/components/form}
 */
@Component({
  standalone: true,
  selector: 'wr-form-item',
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WrFormItemComponent {
  @Input({ transform: booleanAttribute }) hasError = false;

  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'wr-form-item': true,
      'wr-form-item--has-error': this.hasError,
    };
  }
}
