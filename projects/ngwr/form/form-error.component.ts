import { ChangeDetectionStrategy, Component, HostBinding, OnDestroy, ViewEncapsulation } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'wr-form-error',
  exportAs: 'wrFormError',
  preserveWhitespaces: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `<ng-content></ng-content>`
})
export class WalrusFormErrorComponent implements OnDestroy {
  @HostBinding() class = 'wr-form-error';
  private destroy$ = new Subject();

  ngOnDestroy(): void {
    this.destroy$.next(null);
    this.destroy$.complete();
  }
}
