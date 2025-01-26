/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DestroyRef, Directive, inject, OnDestroy } from '@angular/core';

import { Subject } from 'rxjs';

@Directive({
  standalone: true,
})
export abstract class WrAbstractBase implements OnDestroy {
  protected readonly destroyed$: Subject<void> = new Subject<void>(); // TODO Перейти на destroyRef$
  protected readonly destroyRef$ = inject(DestroyRef);

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }
}
