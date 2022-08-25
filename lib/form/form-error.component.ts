import { ChangeDetectionStrategy, Component, HostBinding, OnDestroy, ViewEncapsulation } from '@angular/core';
import { Subject } from 'rxjs';
import { baseClass } from '../_core';

@Component({
  selector: 'wr-form-error',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `<ng-content></ng-content>`
})
export class WrFormErrorComponent implements OnDestroy {
  @HostBinding('class') class = `${baseClass}-form-error`;
  private destroy$: Subject<void> = new Subject<void>();

  ngOnDestroy(): void {
    this.destroy$.next(undefined);
    this.destroy$.complete();
  }
}
