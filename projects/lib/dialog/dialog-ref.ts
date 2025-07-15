/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { hasModifierKey } from '@angular/cdk/keycodes';
import { OverlayRef } from '@angular/cdk/overlay';
import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { filter, Subject, take } from 'rxjs';

import { SafeAny } from 'ngwr/cdk/types';
import { generateRandomId } from 'ngwr/cdk/utils';

import { WrDialogBaseDirective } from './dialog-base.directive';
import { WrDialogOptions } from './dialog-options';

export class WrDialogRef<C = SafeAny, R = SafeAny> {
  readonly id?: string;

  componentInstance: C | null = null;
  result?: R;

  readonly afterOpened: Subject<void> = new Subject<void>();
  readonly afterClosed: Subject<R | undefined> = new Subject<R | undefined>();

  private closeTimeout?: ReturnType<typeof setTimeout>;

  private readonly destroyRef$ = inject(DestroyRef);

  constructor(
    private overlayRef: OverlayRef,
    private options: WrDialogOptions,
    public baseInstance: WrDialogBaseDirective
  ) {
    this.id = options.id || `wr__modal__${generateRandomId()}`;

    baseInstance.animationStateChanged
      .pipe(
        filter(evt => evt.phaseName === 'done' && evt.toState === 'enter'),
        take(1)
      )
      .subscribe(() => {
        this.afterOpened.next();
        this.afterOpened.complete();
      });

    baseInstance.animationStateChanged
      .pipe(
        filter(evt => evt.phaseName === 'done' && evt.toState === 'exit'),
        take(1)
      )
      .subscribe(() => {
        clearTimeout(this.closeTimeout);
        this._finishDialogClose();
      });

    baseInstance.containerClick.pipe(takeUntilDestroyed(this.destroyRef$)).subscribe(() => {
      this.close();
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
    this.baseInstance.animationStateChanged
      .pipe(
        filter(event => event.phaseName === 'start'),
        take(1)
      )
      .subscribe(event => {
        this.overlayRef.detachBackdrop();
        this.closeTimeout = setTimeout(() => {
          this._finishDialogClose();
        }, event.totalTime + 100);
      });

    this.baseInstance.startExitAnimation();
  }

  private _finishDialogClose(): void {
    this.overlayRef.dispose();
  }
}
