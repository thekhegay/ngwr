import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input,
  ViewEncapsulation,
} from '@angular/core';

import { SafeAny, WrThemeColor } from 'ngwr/cdk/types';

@Component({
  standalone: true,
  selector: 'wr-skeleton',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WrSkeletonComponent {
  @Input() color: WrThemeColor = 'dark';
  @Input({ transform: booleanAttribute }) animated = true;

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
