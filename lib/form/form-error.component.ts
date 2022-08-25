import { ChangeDetectionStrategy, Component, HostBinding, ViewEncapsulation } from '@angular/core';
import { stylePrefix } from '../_core';

@Component({
  selector: 'wr-form-error',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `<ng-content></ng-content>`
})
export class WrFormErrorComponent {
  @HostBinding('class') class = `${stylePrefix}-form-error`;
}
