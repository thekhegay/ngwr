import {
  ComponentType,
  GlobalPositionStrategy,
  Overlay,
  OverlayConfig,
  OverlayRef,
  PositionStrategy,
} from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Injectable, Injector, OnDestroy, Optional, SkipSelf } from '@angular/core';
import { Subject } from 'rxjs';

import { SafeAny } from 'ngwr/core/types';

import { WrDialogBase } from './dialog-base';
import { WrDialogConfig } from './dialog-config';
import { WrDialogContainer } from './dialog-container';
import { WrDialogRef } from './dialog-ref';
import { WR_DIALOG_DATA } from './dialog-tokens';

@Injectable()
export class WrDialogService implements OnDestroy {
  private openedDialogsAtThisLevel: WrDialogRef[] = [];
  private readonly afterAllClosedAtThisLevel = new Subject<void>();

  get openedDialogs(): WrDialogRef[] {
    return this.parentModal ? this.parentModal.openedDialogs : this.openedDialogsAtThisLevel;
  }

  get _afterAllClosed(): Subject<void> {
    const parent = this.parentModal;
    return parent ? parent._afterAllClosed : this.afterAllClosedAtThisLevel;
  }

  constructor(
    private readonly overlay: Overlay,
    private readonly injector: Injector,
    @Optional() @SkipSelf() private parentModal: WrDialogService
  ) {}

  ngOnDestroy(): void {
    this.closeModals(this.openedDialogsAtThisLevel);
    this.afterAllClosedAtThisLevel.complete();
  }

  open<T = SafeAny, R = SafeAny>(config: WrDialogConfig<T>): WrDialogRef<T, R> {
    const _config = config || new WrDialogConfig<SafeAny>();
    const positionStrategy = _config?.positionStrategy || this._defaultPositionStrategy();
    const overlayRef = this._createOverlay(positionStrategy);
    const dialogContainer = this._attachDialogContainer(overlayRef, _config);
    const dialogRef = this._attachDialogContent<T, R>(dialogContainer, overlayRef, _config);
    dialogContainer.dialogRef = dialogRef;
    this.openedDialogs.push(dialogRef);
    dialogRef.afterClosed.subscribe(() => this.removeOpenModal(dialogRef));
    return dialogRef;
  }

  private removeOpenModal(dialogRef: WrDialogRef): void {
    const index = this.openedDialogs.indexOf(dialogRef);
    if (index > -1) {
      this.openedDialogs.splice(index, 1);

      if (!this.openedDialogs.length) {
        this._afterAllClosed.next();
      }
    }
  }

  private closeModals(dialogs: WrDialogRef[]): void {
    let i = dialogs.length;
    while (i--) {
      dialogs[i].close();
      if (!this.openedDialogs.length) {
        this._afterAllClosed.next();
      }
    }
  }

  private _defaultPositionStrategy(): GlobalPositionStrategy {
    return this.overlay.position().global().centerHorizontally().centerVertically();
  }

  private _createOverlay(positionStrategy: PositionStrategy): OverlayRef {
    const overlayConfig = new OverlayConfig({
      positionStrategy,
      hasBackdrop: true,
      backdropClass: 'wr-backdrop',
      scrollStrategy: this.overlay.scrollStrategies.block(),
      disposeOnNavigation: true,
    });
    return this.overlay.create(overlayConfig);
  }

  private _attachDialogContainer(overlayRef: OverlayRef, config: WrDialogConfig): WrDialogBase {
    const userInjector = config && config.viewContainerRef && config.viewContainerRef?.injector;
    const injector = Injector.create({
      parent: userInjector || this.injector,
      providers: [
        { provide: OverlayRef, useValue: overlayRef },
        { provide: WrDialogConfig, useValue: config },
      ],
    });

    const containerPortal = new ComponentPortal<WrDialogBase>(WrDialogContainer, config.viewContainerRef, injector);
    const containerRef = overlayRef.attach<WrDialogBase>(containerPortal);
    return containerRef.instance;
  }

  private _attachDialogContent<T, R>(
    dialogContainer: WrDialogBase,
    overlayRef: OverlayRef,
    config: WrDialogConfig<T>
  ): WrDialogRef<T, R> {
    const dialogRef = new WrDialogRef<T, R>(config, overlayRef, dialogContainer);

    const userInjector = config && config.viewContainerRef && config.viewContainerRef?.injector;
    const injector = Injector.create({
      parent: userInjector || this.injector,
      providers: [
        { provide: WrDialogRef, useValue: dialogRef },
        { provide: WR_DIALOG_DATA, useValue: config.data },
      ],
    });

    const contentRef = dialogContainer.attachComponentPortal<T>(
      new ComponentPortal(config.component as ComponentType<T>, config.viewContainerRef, injector)
    );
    dialogRef.componentInstance = contentRef.instance;
    return dialogRef;
  }
}
