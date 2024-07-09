/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  ComponentType,
  Overlay,
  OverlayConfig,
  OverlayRef,
  PositionStrategy,
  ScrollStrategy,
} from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { inject, Injectable, Injector } from '@angular/core';

import { Subject } from 'rxjs';

import { SafeAny } from 'ngwr/cdk/types';

import { WrDialogBaseDirective } from './dialog-base.directive';
import { WR_DIALOG_DATA } from './dialog-data.token';
import { WrDialogOptions } from './dialog-options';
import { WrDialogRef } from './dialog-ref';
import { WrDialogComponent } from './dialog.component';

/**
 * NGWR dialog service.
 *
 * {@tutorial} [How to use wr-dialog]{@link http://ngwr.dev/docs/components/dialog}
 */
@Injectable()
export class WrDialogService {
  private readonly overlay = inject(Overlay);
  private readonly injector = inject(Injector);
  private readonly parentModal = inject(WrDialogService, { optional: true, skipSelf: true });

  private openedDialogsAtThisLevel: WrDialogRef[] = [];
  private readonly afterAllClosedAtThisLevel = new Subject<void>();

  get openedDialogs(): WrDialogRef[] {
    return this.parentModal ? this.parentModal.openedDialogs : this.openedDialogsAtThisLevel;
  }

  get _afterAllClosed(): Subject<void> {
    const parent = this.parentModal;
    return parent ? parent._afterAllClosed : this.afterAllClosedAtThisLevel;
  }

  open<C = SafeAny, R = SafeAny>(options: WrDialogOptions<C>): WrDialogRef<C, R> {
    const _options = options || new WrDialogOptions<SafeAny>();

    const positionStrategy = _options?.positionStrategy || this._defaultPositionStrategy();
    const scrollStrategy = _options?.scrollStrategy || this._defaultScrollStrategy();
    const hasBackdrop = _options?.hasBackdrop || true;
    const backdropClass = _options?.backdropClass || 'wr-backdrop';

    const overlayRef = this._createOverlay(positionStrategy, scrollStrategy, hasBackdrop, backdropClass);
    const dialogContainer = this._attachDialogContainer(overlayRef, _options);
    const dialogRef = this._attachDialogContent<C, R>(dialogContainer, overlayRef, _options);

    dialogContainer.dialogRef = dialogRef;
    this.openedDialogsAtThisLevel.push(dialogRef);
    dialogRef.afterClosed.subscribe(() => this._removeOpenedModal(dialogRef));
    return dialogRef;
  }

  private _defaultPositionStrategy(): PositionStrategy {
    return this.overlay.position().global().centerVertically().centerHorizontally();
  }

  private _defaultScrollStrategy(): ScrollStrategy {
    return this.overlay.scrollStrategies.block();
  }

  private _createOverlay(
    positionStrategy: PositionStrategy,
    scrollStrategy: ScrollStrategy,
    hasBackdrop: boolean,
    backdropClass: string
  ): OverlayRef {
    const overlayConfig = new OverlayConfig({
      positionStrategy,
      hasBackdrop,
      backdropClass,
      scrollStrategy,
    });
    return this.overlay.create(overlayConfig);
  }

  private _attachDialogContainer(overlayRef: OverlayRef, options?: WrDialogOptions): WrDialogBaseDirective {
    const userInjector = options && options.viewContainerRef && options.viewContainerRef.injector;
    const injector = Injector.create({
      parent: userInjector || this.injector,
      providers: [
        { provide: OverlayRef, useValue: overlayRef },
        { provide: WrDialogOptions, useValue: options },
      ],
    });

    const containerPortal = new ComponentPortal(WrDialogComponent, options?.viewContainerRef, injector);
    const containerRef = overlayRef.attach(containerPortal);
    return containerRef.instance;
  }

  private _attachDialogContent<C, R>(
    container: WrDialogBaseDirective,
    overlayRef: OverlayRef,
    options: WrDialogOptions<C>
  ): WrDialogRef<C, R> {
    const dialogRef = new WrDialogRef(overlayRef, options, container);

    const userInjector = options && options.viewContainerRef && options.viewContainerRef?.injector;
    const injector = Injector.create({
      parent: userInjector || this.injector,
      providers: [
        { provide: WrDialogRef, useValue: dialogRef },
        { provide: WR_DIALOG_DATA, useValue: options?.data },
      ],
    });

    const contentRef = container.attachComponentPortal<C>(
      new ComponentPortal(options?.component as ComponentType<C>, options?.viewContainerRef, injector)
    );
    dialogRef.componentInstance = contentRef.instance;
    return dialogRef;
  }

  private _removeOpenedModal(dialogRef: WrDialogRef): void {
    const index = this.openedDialogs.indexOf(dialogRef);
    if (index > -1) {
      this.openedDialogs.splice(index, 1);

      if (!this.openedDialogs.length) {
        this._afterAllClosed.next();
      }
    }
  }
}
