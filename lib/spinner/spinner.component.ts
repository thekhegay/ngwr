import { ChangeDetectionStrategy, Component, HostBinding, ViewEncapsulation } from '@angular/core';
import { stylePrefix } from '../_core';

@Component({
  selector: 'wr-spin',
  template: '<svg viewBox="0 0 50 50"><circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle></svg>',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WrSpinnerComponent {
  @HostBinding('class') class = `${stylePrefix}-spin`;
}
