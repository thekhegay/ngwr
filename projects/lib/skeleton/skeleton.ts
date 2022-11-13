import { BooleanInput } from '@angular/cdk/coercion';
import { Directive, HostBinding, Input } from '@angular/core';

import { WrThemeColor } from 'ngwr/core/color';
import { InputBoolean } from 'ngwr/core/decorators';
import { SafeAny } from 'ngwr/core/types';

@Directive({
  selector: 'wr-skeleton',
  exportAs: 'wrSkeleton',
})
export class WrSkeleton {
  @Input() color: WrThemeColor = 'dark';
  @Input() @InputBoolean() animated: BooleanInput = true;

  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'wr-skeleton': true,
      'wr-skeleton--animated': this.animated,
      'wr-skeleton--primary': this.color === 'primary',
      'wr-skeleton--secondary': this.color === 'secondary',
      'wr-skeleton--success': this.color === 'success',
      'wr-skeleton--warning': this.color === 'warning',
      'wr-skeleton--danger': this.color === 'danger',
      'wr-skeleton--light': this.color === 'light',
      'wr-skeleton--medium': this.color === 'medium',
      'wr-skeleton--dark': this.color === 'dark',
    };
  }
}
