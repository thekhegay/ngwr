import { ChangeDetectionStrategy, Component, HostBinding, ViewEncapsulation } from '@angular/core';

@Component({
  standalone: true,
  selector: 'wr-spin',
  template: '<svg viewBox="0 0 50 50"><circle class="path" cx="25" cy="25" r="20" stroke-width="5" fill="none"></circle></svg>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WrSpinComponent {
  @HostBinding() class = 'wr-spin';
}
