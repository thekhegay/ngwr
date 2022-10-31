import { ChangeDetectionStrategy, Component, HostBinding, Input, ViewEncapsulation } from '@angular/core';

import { BooleanInput, InputBoolean, SafeAny, WrThemeColor } from '../_core';

@Component({
  selector: 'wr-tag',
  exportAs: 'wrTag',
  template: '<wr-spin *ngIf="loading"></wr-spin><ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class WrTagComponent {
  @Input() color: WrThemeColor | string = 'primary';
  @Input() @InputBoolean() loading: BooleanInput = false;
  @Input() @InputBoolean() rounded: BooleanInput = false;
  @Input() @InputBoolean() outlined: BooleanInput = false;
  @Input() @InputBoolean() transparent: BooleanInput = false;
  @Input() @InputBoolean() hoverable: BooleanInput = false;

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
      'wr-tag--loading': this.loading,
      'wr-tag--rounded': this.rounded,
      'wr-tag--outlined': this.outlined,
      'wr-tag--transparent': this.transparent,
      'wr-tag--hoverable': this.hoverable
    };
  }
}
