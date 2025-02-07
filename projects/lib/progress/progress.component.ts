/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input,
  numberAttribute,
  ViewEncapsulation,
} from '@angular/core';

import { SafeAny, WrThemeColor } from 'ngwr/cdk/types';

@Component({
  selector: 'wr-progress',
  templateUrl: './progress.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WrProgressComponent {
  @Input() color: WrThemeColor | null = null;
  @Input({ transform: numberAttribute }) percent = 0;

  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'wr-progress': true,
      'wr-progress--color-primary': this.color === 'primary',
      'wr-progress--color-secondary': this.color === 'secondary',
      'wr-progress--color-success': this.color === 'success',
      'wr-progress--color-warning': this.color === 'warning',
      'wr-progress--color-danger': this.color === 'danger',
      'wr-progress--color-light': this.color === 'light',
      'wr-progress--color-medium': this.color === 'medium',
      'wr-progress--color-dark': this.color === 'dark',
    };
  }
}
