import { hasModifierKey } from '@angular/cdk/keycodes';
import { OverlayRef } from '@angular/cdk/overlay';
import { filter, Subject, take, takeUntil } from 'rxjs';

import { WrAbstractBase } from 'ngwr/core/abstract';
import { SafeAny } from 'ngwr/core/types';

import { WrDialogBase } from './dialog-base';
import { WrDialogConfig } from './dialog-config';

export class WrDialogRef<T = SafeAny, R = SafeAny> extends WrAbstractBase {
  readonly id?: string;
  result?: R;
  componentInstance: T | null = null;
  private closeTimeout?: number;
  readonly afterClosed: Subject<R | undefined> = new Subject<R | undefined>();
  readonly afterOpened: Subject<void> = new Subject();

  constructor(
    private readonly config: WrDialogConfig<T>,
    private readonly overlayRef: OverlayRef,
    public containerInstance: WrDialogBase
  ) {
    super();
    this.id = config.id || `wr__modal__${Date.now()}`;

    containerInstance.animationStateChanged
      .pipe(
        filter(event => event.phaseName === 'done' && event.toState === 'enter'),
        take(1)
      )
      .subscribe(() => {
        this.afterOpened.next();
        this.afterOpened.complete();
      });

    containerInstance.animationStateChanged
      .pipe(
        filter(event => event.phaseName === 'done' && event.toState === 'exit'),
        take(1)
      )
      .subscribe(() => {
        clearTimeout(this.closeTimeout);
        this._finishDialogClose();
      });

    containerInstance.containerClick.pipe(take(1), takeUntil(this.destroyed$)).subscribe(() => {
      this.close(undefined);
    });

    overlayRef.backdropClick().subscribe(() => this.close(undefined));

    overlayRef.keydownEvents().subscribe(event => {
      if (event.code === 'Escape' && !hasModifierKey(event)) {
        event.preventDefault();
        this.close(undefined);
      }
    });

    overlayRef.detachments().subscribe(() => {
      this.afterClosed.next(this.result);
      this.afterClosed.complete();
      this.componentInstance = null;
      this.overlayRef.dispose();
    });
  }

  close(result?: R): void {
    this.result = result;
    this.containerInstance.animationStateChanged
      .pipe(
        filter(event => event.phaseName === 'start'),
        take(1)
      )
      .subscribe(event => {
        this.overlayRef.detachBackdrop();
        // @ts-ignore
        this.closeTimeout = setTimeout(() => {
          this._finishDialogClose();
        }, event.totalTime + 100);
      });

    this.containerInstance.startExitAnimation();
  }

  _finishDialogClose(): void {
    this.overlayRef.dispose();
    this.destroyed$.next();
  }
}
