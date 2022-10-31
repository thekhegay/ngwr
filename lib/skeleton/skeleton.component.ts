import { ChangeDetectionStrategy, Component, HostBinding, Input, ViewEncapsulation } from '@angular/core';

import { SafeAny } from '../_core';

@Component({
  selector: 'wr-skeleton',
  template: '<span>&nbsp;</span>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class WrSkeletonComponent {
  @Input() color: 'light' | 'dark' = 'dark';

  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'wr-skeleton': true,
      'wr-skeleton--light': this.color === 'light',
      'wr-skeleton--dark': this.color === 'dark'
    };
  }
}
