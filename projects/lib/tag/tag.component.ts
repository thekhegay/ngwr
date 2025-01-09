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

import { SafeAny, WrThemeColor } from 'ngwr/cdk/types';
import { WrIconComponent, wrIconName } from 'ngwr/icon';
import { WrSpinnerModule } from 'ngwr/spinner';

@Component({
  selector: 'wr-tag',
  templateUrl: './tag.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [WrIconComponent, WrSpinnerModule],
})
export class WrTagComponent {
  @Input() color: WrThemeColor = 'primary';
  @Input() icon: wrIconName | null = null;
  @Input() iconPosition: 'start' | 'end' = 'start';
  @Input({ transform: booleanAttribute }) outlined = false;
  @Input({ transform: booleanAttribute }) rounded = false;
  @Input({ transform: booleanAttribute }) transparent = false;
  @Input({ transform: booleanAttribute }) hoverable = false;
  @Input({ transform: booleanAttribute }) loading = false;

  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'wr-tag': true,
      'wr-tag--color-primary': this.color === 'primary',
      'wr-tag--color-secondary': this.color === 'secondary',
      'wr-tag--color-success': this.color === 'success',
      'wr-tag--color-warning': this.color === 'warning',
      'wr-tag--color-danger': this.color === 'danger',
      'wr-tag--color-light': this.color === 'light',
      'wr-tag--color-medium': this.color === 'medium',
      'wr-tag--color-dark': this.color === 'dark',
      'wr-tag--icon-start': (this.icon || this.loading) && this.iconPosition === 'start',
      'wr-tag--icon-end': (this.icon || this.loading) && this.iconPosition === 'end',
      'wr-tag--loading': this.loading,
      'wr-tag--rounded': this.rounded,
      'wr-tag--outlined': this.outlined,
      'wr-tag--transparent': this.transparent,
      'wr-tag--hoverable': this.hoverable,
    };
  }
}
