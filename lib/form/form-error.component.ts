import { ChangeDetectionStrategy, Component, HostBinding, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'wr-form-error',
  exportAs: 'wrFormError',
  template: `<ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WrFormErrorComponent {
  @HostBinding('class') class = 'wr-form-error';
}
