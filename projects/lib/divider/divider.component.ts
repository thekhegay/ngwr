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
  standalone: true,
  selector: 'wr-divider',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WrDividerComponent {
  @Input() color: WrThemeColor | null = null;
  @Input() type: 'solid' | 'dashed' | 'dotted' = 'solid';
  @Input({ transform: numberAttribute }) width = 1;

  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'wr-divider': true,
      'wr-divider--primary': this.color === 'primary',
      'wr-divider--secondary': this.color === 'secondary',
      'wr-divider--success': this.color === 'success',
      'wr-divider--warning': this.color === 'warning',
      'wr-divider--danger': this.color === 'danger',
      'wr-divider--light': this.color === 'light',
      'wr-divider--medium': this.color === 'medium',
      'wr-divider--dark': this.color === 'dark',
      'wr-divider--solid': this.type === 'solid',
      'wr-divider--dashed': this.type === 'dashed',
      'wr-divider--dotted': this.type === 'dotted',
    };
  }

  @HostBinding('style')
  get elStyles(): SafeAny {
    return {
      '--wr-divider-width': `${this.width}px`,
    };
  }

  @HostBinding('role') role = 'separator';
}
