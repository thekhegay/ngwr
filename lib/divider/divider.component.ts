import { ChangeDetectionStrategy, Component, HostBinding, Input, ViewEncapsulation } from '@angular/core';

import { SafeAny, WrThemeColor } from '../_core';

@Component({
  selector: 'wr-divider',
  exportAs: 'wrDivider',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class WrDividerComponent {
  /**
   * Divider color
   *
   * @default 'light';
   */
  @Input() color: WrThemeColor = 'light';
  /**
   * Divider style
   *
   * @default 'solid';
   */
  @Input() type: 'solid' | 'dashed' | 'dotted' = 'solid';
  /**
   * Divider width
   *
   * @default 1px;
   */
  @Input() width: string = '1px';

  /** Set element classes **/
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
      'wr-divider--dotted': this.type === 'dotted'
    };
  }

  /** Set element style **/
  @HostBinding('style')
  get elStyles(): SafeAny {
    return {
      '--wr-divider-width': this.width
    };
  }
}
