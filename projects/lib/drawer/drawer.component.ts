/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Overlay, type OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  TemplateRef,
  ViewContainerRef,
  ViewEncapsulation,
  effect,
  inject,
  input,
  model,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import type { WrDrawerPosition } from './types';

/**
 * Side panel that slides in from an edge of the viewport. Two-way binds
 * `open` and renders into a CDK overlay so it sits above page content.
 *
 * Compose the body with `<wrDrawerTitle>`, `<wrDrawerContent>`, and
 * `<wrDrawerFooter>` directives.
 *
 * @example
 * ```html
 * <wr-drawer [(open)]="settingsOpen" position="right" width="24rem">
 *   <h2 wrDrawerTitle>Settings</h2>
 *   <div wrDrawerContent>...</div>
 *   <div wrDrawerFooter>
 *     <wr-btn wrDrawerClose>Close</wr-btn>
 *   </div>
 * </wr-drawer>
 * ```
 *
 * @see https://ngwr.dev/docs/components/drawer
 */
@Component({
  selector: 'wr-drawer',
  templateUrl: './drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display:none' },
})
export class WrDrawerComponent {
  /** Two-way bindable open state. */
  readonly open = model<boolean>(false);

  /** Side the drawer slides in from. @default 'right' */
  readonly position = input<WrDrawerPosition>('right');

  /** Width when position is left/right. Any CSS length. @default '20rem' */
  readonly width = input<string>('20rem');

  /** Height when position is top/bottom. Any CSS length. @default '16rem' */
  readonly height = input<string>('16rem');

  /** Show the dimming backdrop. @default true */
  readonly hasBackdrop = input(true, { transform: coerceBooleanProperty });

  /** Close when the backdrop is clicked. @default true */
  readonly closeOnBackdropClick = input(true, { transform: coerceBooleanProperty });

  /** Close on Escape. @default true */
  readonly closeOnEscape = input(true, { transform: coerceBooleanProperty });

  protected readonly panelTpl = viewChild.required(TemplateRef);

  protected panelClass(): string {
    const pos = this.position();
    return `wr-drawer__panel--${pos}`;
  }

  private readonly overlay = inject(Overlay);
  private readonly vcr = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);

  private overlayRef: OverlayRef | null = null;

  constructor() {
    effect(() => {
      if (this.open()) {
        this.openOverlay();
      } else {
        this.closeOverlay();
      }
    });
    this.destroyRef.onDestroy(() => this.closeOverlay());
  }

  private openOverlay(): void {
    if (this.overlayRef) return;

    const pos = this.position();
    const isHorizontal = pos === 'left' || pos === 'right';

    const positionStrategy = this.overlay
      .position()
      .global()
      [pos === 'left' ? 'left' : pos === 'right' ? 'right' : 'centerHorizontally']();

    if (pos === 'top') positionStrategy.top();
    else if (pos === 'bottom') positionStrategy.bottom();
    else positionStrategy.centerVertically();

    this.overlayRef = this.overlay.create({
      positionStrategy,
      hasBackdrop: this.hasBackdrop(),
      backdropClass: 'wr-drawer-backdrop',
      panelClass: ['wr-drawer-overlay', `wr-drawer-overlay--${pos}`],
      scrollStrategy: this.overlay.scrollStrategies.block(),
      width: isHorizontal ? this.width() : '100vw',
      height: isHorizontal ? '100vh' : this.height(),
    });

    const portal = new TemplatePortal(this.panelTpl(), this.vcr);
    this.overlayRef.attach(portal);

    if (this.closeOnBackdropClick()) {
      this.overlayRef
        .backdropClick()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.open.set(false));
    }

    if (this.closeOnEscape()) {
      this.overlayRef
        .keydownEvents()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(event => {
          if (event.key === 'Escape') {
            event.preventDefault();
            this.open.set(false);
          }
        });
    }
  }

  private closeOverlay(): void {
    if (!this.overlayRef) return;
    this.overlayRef.dispose();
    this.overlayRef = null;
  }
}
