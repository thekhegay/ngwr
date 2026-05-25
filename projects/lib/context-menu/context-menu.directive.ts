/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { DestroyRef, Directive, ElementRef, ViewContainerRef, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { WR_OVERLAY } from 'ngwr/overlay';

import type { WrContextMenuComponent } from './context-menu.component';

/**
 * Attach to any element to show a `<wr-context-menu>` at the pointer
 * position when the user right-clicks (or sends a `contextmenu` event by
 * any means — long-press on touch, Shift+F10, etc.). The native browser
 * menu is suppressed for the host element.
 *
 * @example
 * ```html
 * <div [wrContextMenu]="menu">Right-click me</div>
 * <wr-context-menu #menu>
 *   <wr-context-menu-item (click)="copy()">Copy</wr-context-menu-item>
 *   <wr-context-menu-item (click)="remove()">Delete</wr-context-menu-item>
 * </wr-context-menu>
 * ```
 *
 * @see https://ngwr.dev/docs/components/context-menu
 */
@Directive({
  selector: '[wrContextMenu]',
  host: {
    '(contextmenu)': 'onContextMenu($event)',
  },
})
export class WrContextMenuDirective {
  /** Menu to open. Pass a `<wr-context-menu>` template reference. */
  readonly menu = input.required<WrContextMenuComponent>({ alias: 'wrContextMenu' });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlay = inject(WR_OVERLAY);
  private readonly vcr = inject(ViewContainerRef);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly destroyRef = inject(DestroyRef);

  private readonly isOpen = signal(false);
  private overlayRef: OverlayRef | null = null;
  private pointer: { x: number; y: number } = { x: 0, y: 0 };

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.openOverlay();
      } else {
        this.closeOverlay();
      }
    });
  }

  /** @internal */
  protected onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    this.pointer = { x: event.clientX, y: event.clientY };
    // Re-open at the new position even if it was already open.
    if (this.isOpen()) {
      this.closeOverlay();
    }
    this.isOpen.set(true);
  }

  /** Close the menu. */
  close(): void {
    this.isOpen.set(false);
  }

  // ──────── Overlay ────────

  private openOverlay(): void {
    if (this.overlayRef) return;

    const positionStrategy = this.overlay.position().global().left(`${this.pointer.x}px`).top(`${this.pointer.y}px`);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.scrollStrategies.close(),
      panelClass: ['wr-context-menu-overlay'],
    });

    const portal = new TemplatePortal(this.menu().contentTpl(), this.vcr);
    this.overlayRef.attach(portal);

    this.overlayRef
      .outsidePointerEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.isOpen.set(false));

    this.overlayRef
      .keydownEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          this.isOpen.set(false);
          this.host.nativeElement.focus();
        }
      });
  }

  private closeOverlay(): void {
    if (!this.overlayRef) return;
    this.overlayRef.dispose();
    this.overlayRef = null;
  }
}
