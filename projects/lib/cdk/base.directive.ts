import { DestroyRef, Directive, inject } from '@angular/core';

@Directive()
export abstract class WrAbstractBase {
  protected readonly destroyed$ = inject(DestroyRef);
}
