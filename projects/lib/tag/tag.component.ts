import { booleanAttribute, ChangeDetectionStrategy, Component, HostBinding, Input, ViewEncapsulation } from '@angular/core';

import { WrIconComponent, wrIconName } from 'ngwr/icon';
import { WrSpinComponent } from 'ngwr/spin';
import { SafeAny, WrThemeColor } from 'ngwr/types';

@Component({
  standalone: true,
  selector: 'wr-tag',
  templateUrl: 'tag.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [WrIconComponent, WrSpinComponent],
})
export class WrTagComponent {
  @Input() color: WrThemeColor = 'primary';
  @Input() icon: wrIconName | null = null;
  @Input() iconPosition: 'start' | 'end' = 'start';
  @Input({ transform: booleanAttribute }) outlined: boolean = false;
  @Input({ transform: booleanAttribute }) rounded: boolean = false;
  @Input({ transform: booleanAttribute }) transparent: boolean = false;
  @Input({ transform: booleanAttribute }) hoverable: boolean = false;
  @Input({ transform: booleanAttribute }) loading: boolean = false;

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
