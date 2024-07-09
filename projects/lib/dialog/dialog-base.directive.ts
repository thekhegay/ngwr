/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { AnimationEvent } from '@angular/animations';
import { OverlayRef } from '@angular/cdk/overlay';
import { BasePortalOutlet, CdkPortalOutlet, ComponentPortal, TemplatePortal } from '@angular/cdk/portal';
import {
  ChangeDetectorRef,
  ComponentRef,
  Directive,
  ElementRef,
  EmbeddedViewRef,
  EventEmitter,
  OnDestroy,
} from '@angular/core';

import { Subject } from 'rxjs';

import { WR_ANIMATION_FADE_CLASS_NAME_MAP, WR_ANIMATION_ZOOM_CLASS_NAME_MAP } from './dialog-animations';
import { WrDialogOptions } from './dialog-options';
import { WrDialogRef } from './dialog-ref';

@Directive({
  standalone: true,
})
export class WrDialogBaseDirective extends BasePortalOutlet implements OnDestroy {
  portalOutlet!: CdkPortalOutlet;
  dialogElementRef!: ElementRef<HTMLDivElement>;
  dialogRef!: WrDialogRef;

  containerClick = new EventEmitter<void>();
  animationStateChanged = new EventEmitter<AnimationEvent>();

  state: 'void' | 'enter' | 'exit' = 'enter';

  protected readonly destroyed$: Subject<void> = new Subject<void>();

  constructor(
    public cdr: ChangeDetectorRef,
    public options: WrDialogOptions,
    protected overlayRef: OverlayRef
  ) {
    super();
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  onContainerClick(e: MouseEvent): void {
    if (e.target === e.currentTarget || e.target === this.dialogElementRef.nativeElement) {
      this.containerClick.emit();
    }
  }

  attachComponentPortal<C>(portal: ComponentPortal<C>): ComponentRef<C> {
    return this.portalOutlet.attachComponentPortal(portal);
  }

  attachTemplatePortal<C>(portal: TemplatePortal<C>): EmbeddedViewRef<C> {
    return this.portalOutlet.attachTemplatePortal(portal);
  }

  private setEnterAnimationClass(): void {
    const dialogElement = this.dialogElementRef.nativeElement;
    const backdropElement = this.overlayRef.backdropElement;
    dialogElement.classList.add(WR_ANIMATION_ZOOM_CLASS_NAME_MAP.enter);
    dialogElement.classList.add(WR_ANIMATION_ZOOM_CLASS_NAME_MAP.enterActive);
    if (backdropElement) {
      backdropElement.classList.add(WR_ANIMATION_FADE_CLASS_NAME_MAP.enter);
      backdropElement.classList.add(WR_ANIMATION_FADE_CLASS_NAME_MAP.enterActive);
    }
  }

  private setExitAnimationClass(): void {
    const dialogElement = this.dialogElementRef.nativeElement;
    dialogElement.classList.add(WR_ANIMATION_ZOOM_CLASS_NAME_MAP.leave);
    dialogElement.classList.add(WR_ANIMATION_ZOOM_CLASS_NAME_MAP.leaveActive);
    this.setMaskExitAnimationClass();
  }

  private setMaskExitAnimationClass(): void {
    const backdropElement = this.overlayRef.backdropElement;
    if (backdropElement) {
      backdropElement.classList.add(WR_ANIMATION_FADE_CLASS_NAME_MAP.leave);
      backdropElement.classList.add(WR_ANIMATION_FADE_CLASS_NAME_MAP.leaveActive);
    }
  }

  private cleanAnimationClass(): void {
    const backdropElement = this.overlayRef.backdropElement;
    const dialogElement = this.dialogElementRef.nativeElement;
    if (backdropElement) {
      backdropElement.classList.remove(WR_ANIMATION_FADE_CLASS_NAME_MAP.enter);
      backdropElement.classList.remove(WR_ANIMATION_FADE_CLASS_NAME_MAP.enterActive);
    }
    dialogElement.classList.remove(WR_ANIMATION_ZOOM_CLASS_NAME_MAP.enter);
    dialogElement.classList.remove(WR_ANIMATION_ZOOM_CLASS_NAME_MAP.enterActive);
    dialogElement.classList.remove(WR_ANIMATION_ZOOM_CLASS_NAME_MAP.leave);
    dialogElement.classList.remove(WR_ANIMATION_ZOOM_CLASS_NAME_MAP.leaveActive);
  }

  onAnimationDone(event: AnimationEvent): void {
    this.cleanAnimationClass();
    this.animationStateChanged.emit(event);
  }

  onAnimationStart(event: AnimationEvent): void {
    if (event.toState === 'enter') {
      this.setEnterAnimationClass();
    } else if (event.toState === 'exit') {
      this.setExitAnimationClass();
    }
    this.animationStateChanged.emit(event);
  }

  startExitAnimation(): void {
    this.state = 'exit';
    this.cdr.markForCheck();
  }
}
