import { BooleanInput } from '@angular/cdk/coercion';
import { ChangeDetectionStrategy, Component, HostBinding, Input, ViewEncapsulation } from '@angular/core';

import { WrThemeColor } from 'ngwr/core/color';
import { InputBoolean } from 'ngwr/core/decorators';
import { SafeAny } from 'ngwr/core/types';
import { wrIconName } from 'ngwr/icon';

@Component({
  selector: 'wr-tag',
  exportAs: 'wrTag',
  templateUrl: './tag.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WrTag {
  @Input() color: WrThemeColor | string = 'primary';
  @Input() icon: wrIconName | null = null;
  @Input() iconPosition: 'start' | 'end' = 'start';
  @Input() @InputBoolean() outlined: BooleanInput = false;
  @Input() @InputBoolean() rounded: BooleanInput = false;
  @Input() @InputBoolean() transparent: BooleanInput = false;
  @Input() @InputBoolean() hoverable: BooleanInput = false;
  @Input() @InputBoolean() loading: BooleanInput = false;

  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'wr-tag': true,
      'wr-tag--primary': this.color === 'primary',
      'wr-tag--secondary': this.color === 'secondary',
      'wr-tag--success': this.color === 'success',
      'wr-tag--warning': this.color === 'warning',
      'wr-tag--danger': this.color === 'danger',
      'wr-tag--light': this.color === 'light',
      'wr-tag--medium': this.color === 'medium',
      'wr-tag--dark': this.color === 'dark',
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
