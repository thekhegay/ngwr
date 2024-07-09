/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { AnimationEvent } from '@angular/animations';
import { OverlayRef } from '@angular/cdk/overlay';
import { CdkPortalOutlet } from '@angular/cdk/portal';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';

import { SafeAny } from 'ngwr/cdk/types';

import { wrDialogAnimations } from './dialog-animations';
import { WrDialogBaseDirective } from './dialog-base.directive';
import { WrDialogOptions } from './dialog-options';

@Component({
  standalone: true,
  selector: 'wr-dialog',
  templateUrl: './dialog.component.html',
  animations: [wrDialogAnimations.dialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [CdkPortalOutlet],
})
export class WrDialogComponent extends WrDialogBaseDirective {
  @ViewChild(CdkPortalOutlet, { static: true }) override portalOutlet!: CdkPortalOutlet;
  @ViewChild('dialogElement', { static: true }) override dialogElementRef!: ElementRef<HTMLDivElement>;

  @HostBinding('@dialogComponent') override state: 'void' | 'enter' | 'exit' = 'enter';
  @HostListener('@dialogComponent.start', ['$event'])
  override onAnimationStart(event: AnimationEvent): void {
    super.onAnimationStart(event);
  }
  @HostListener('@dialogComponent.done', ['$event'])
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

  constructor(
    cdr: ChangeDetectorRef,
    public override options: WrDialogOptions,
    overlayRef: OverlayRef
  ) {
    super(cdr, options, overlayRef);
  }
}
