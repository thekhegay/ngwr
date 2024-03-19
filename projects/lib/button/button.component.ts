/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { booleanAttribute, ChangeDetectionStrategy, Component, HostBinding, Input, ViewEncapsulation } from '@angular/core';

import { WrIconModule, wrIconName } from 'ngwr/icon';
import { WrSpinnerModule } from 'ngwr/spinner';
import { SafeAny, WrThemeColor } from 'ngwr/types';

/**
 * NGWR button component.
 * Trigger an operation or perform an action.
 *
 * {@tutorial} [How to use wr-btn]{@link http://ngwr.dev/docs/components/button}
 */
@Component({
  standalone: true,
  selector: 'wr-btn, button[wr-btn], a[wr-btn]',
  templateUrl: 'button.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [WrIconModule, WrSpinnerModule],
})
export class WrButtonComponent {
  @Input() color?: WrThemeColor | null;
  @Input() size: 'default' | 'small' = 'default';
  @Input() icon: wrIconName | null = null;
  @Input() iconPosition: 'start' | 'end' = 'start';
  @Input({ transform: booleanAttribute }) disabled: boolean = false;
  @Input({ transform: booleanAttribute }) outlined: boolean = false;
  @Input({ transform: booleanAttribute }) rounded: boolean = false;
  @Input({ transform: booleanAttribute }) block: boolean = false;
  @Input({ transform: booleanAttribute }) loading: boolean = false;
  @Input({ transform: booleanAttribute }) isDisabledWhenLoading: boolean = true;

  /** @deprecated use block instead  */
  @Input({ transform: booleanAttribute }) fullWidth: boolean = false;
  /** @deprecated use block instead  */
  @Input({ transform: booleanAttribute }) fullwidth: boolean = false;

  @HostBinding('attr.disabled')
  get nativeDisabled(): '' | null {
    return this.disabled ? '' : null;
  }

  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'wr-btn': true,
      'wr-btn--color-primary': this.color === 'primary',
      'wr-btn--color-secondary': this.color === 'secondary',
      'wr-btn--color-success': this.color === 'success',
      'wr-btn--color-warning': this.color === 'warning',
      'wr-btn--color-danger': this.color === 'danger',
      'wr-btn--color-light': this.color === 'light',
      'wr-btn--color-medium': this.color === 'medium',
      'wr-btn--color-dark': this.color === 'dark',
      'wr-btn--small': this.size === 'small',
      'wr-btn--block': this.block,
      'wr-btn--rounded': this.rounded,
      'wr-btn--icon': this.icon,
      'wr-btn--icon-start': this.icon && this.iconPosition === 'start',
      'wr-btn--icon-end': this.icon && this.iconPosition === 'end',
      'wr-btn--outlined': this.outlined,
      'wr-btn--loading': this.loading,
      'wr-btn--loading--disabled': this.loading && this.isDisabledWhenLoading,
    };
  }
}
