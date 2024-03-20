import { Directive, OnDestroy } from '@angular/core';

import { Subject } from 'rxjs';

/**
 * @deprecated use WrAbstractBase from 'ngwr/cdk' instead
 * will be removed in 4.1.0
 */
@Directive()
export abstract class WrAbstractBase implements OnDestroy {
  protected readonly destroyed$: Subject<void> = new Subject<void>();

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }
}
