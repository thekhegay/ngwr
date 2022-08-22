import { ChangeDetectionStrategy, Component, HostBinding, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'wr-divider',
  exportAs: 'wrDivider',
  preserveWhitespaces: false,
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class WalrusDividerComponent {
  @HostBinding('class') classes = `wr-divider`;
}
