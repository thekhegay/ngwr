import { Directive, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

@Directive()
export abstract class BaseComponent implements OnDestroy {
  protected readonly ngUnsubscribe: Subject<void> = new Subject<void>();
  private _isDestroyed: boolean = false;

  public get isDestroyed() {
    return this._isDestroyed;
  }

  public ngOnDestroy() {
    this._isDestroyed = true;
    this.ngUnsubscribe.next(undefined);
    this.ngUnsubscribe.complete();
  }
}
