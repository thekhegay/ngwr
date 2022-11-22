import { AnimationEvent } from '@angular/animations';
import { OverlayRef } from '@angular/cdk/overlay';
import { CdkPortalOutlet } from '@angular/cdk/portal';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';

import { SafeAny } from 'ngwr/core/types';

import { wrDialogAnimations } from './dialog-animations';
import { WrDialogBase } from './dialog-base';
import { WrDialogConfig } from './dialog-config';

@Component({
  selector: 'wr-dialog-container',
  exportAs: 'wrDialogContainer',
  templateUrl: './dialog-container.html',
  animations: [wrDialogAnimations.dialogContainer],
  encapsulation: ViewEncapsulation.None,
})
export class WrDialogContainer extends WrDialogBase {
  @ViewChild(CdkPortalOutlet, { static: true }) override portalOutlet!: CdkPortalOutlet;
  @ViewChild('dialogElement', { static: true }) override dialogElementRef!: ElementRef<HTMLDivElement>;

  @HostBinding('@dialogContainer') override state: 'void' | 'enter' | 'exit' = 'enter';
  @HostListener('@dialogContainer.start', ['$event'])
  override onAnimationStart(event: AnimationEvent): void {
    super.onAnimationStart(event);
  }
  @HostListener('@dialogContainer.done', ['$event'])
  override onAnimationDone(event: AnimationEvent): void {
    super.onAnimationDone(event);
  }

  @HostListener('click', ['$event'])
  override onContainerClick(e: MouseEvent): void {
    super.onContainerClick(e);
  }

  /** Set element classes */
  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'wr-dialog': true,
    };
  }

  constructor(cdr: ChangeDetectorRef, public override config: WrDialogConfig, overlayRef: OverlayRef) {
    super(cdr, config, overlayRef);
  }
}
