import { ChangeDetectionStrategy, Component, HostBinding, ViewEncapsulation } from '@angular/core';
import { stylePrefix } from '../_core';

@Component({
  selector: 'wr-divider',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class WrDividerComponent {
  @HostBinding('class') class = `${stylePrefix}-divider`;
}
