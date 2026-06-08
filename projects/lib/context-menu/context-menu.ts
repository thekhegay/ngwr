/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { DestroyRef, Directive, ElementRef, ViewContainerRef, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { WR_OVERLAY } from 'ngwr/overlay';

import type { WrContextMenuPanel } from './context-menu-panel';

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
export class WrContextMenu {
  /** Menu to open. Pass a `<wr-context-menu>` template reference. */
  readonly menu = input.required<WrContextMenuPanel>({ alias: 'wrContextMenu' });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlay = inject(WR_OVERLAY);
  private readonly vcr = inject(ViewContainerRef);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly destroyRef = inject(DestroyRef);

  private overlayRef: OverlayRef | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.closeOverlay());
  }

  /** @internal Right-click handler — opens at the pointer (or re-positions if already open). */
  protected onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    // Re-open at the new position even if it was already open.
    this.closeOverlay();
    this.openOverlay(event.clientX, event.clientY);
  }

  /** Close the menu. */
  close(): void {
    this.closeOverlay();
  }

  // ──────── Overlay ────────

  private openOverlay(x: number, y: number): void {
    // GlobalPositionStrategy uses margins, which led to flaky positioning
    // (`position: static` inline overridden by our `!important`, etc.).
    // Use it just to create the overlay, then write the coords directly to
    // the pane element via `top`/`left` so the menu sits exactly where the
    // user clicked and never moves until we close it.
    this.overlayRef = this.overlay.create({
      positionStrategy: this.overlay.position().global(),
      // `noop` so scroll doesn't dismiss the menu. With absolute coords
      // pinned to viewport (`position: fixed` in the panel CSS), the menu
      // visually stays put as the page scrolls underneath.
      scrollStrategy: this.scrollStrategies.noop(),
      panelClass: ['wr-context-menu-overlay'],
    });

    const portal = new TemplatePortal(this.menu().contentTpl(), this.vcr);
    this.overlayRef.attach(portal);

    // Write coords straight onto the pane. `position: fixed !important` in
    // the panel CSS pins to the viewport so scroll doesn't move the menu.
    const pane = this.overlayRef.overlayElement;
    pane.style.top = `${y}px`;
    pane.style.left = `${x}px`;
    pane.style.right = 'auto';
    pane.style.bottom = 'auto';
    pane.style.margin = '0';

    // The right-click that opens the menu still has `mouseup` + `auxclick`
    // events pending. CDK's `outsidePointerEvents()` listens to pointerdown
    // / auxclick and would fire on those — closing the menu the instant
    // the user lifts their finger. Two-part guard:
    //   1. Track the open timestamp.
    //   2. Ignore any outside events that arrive within a short window
    //      after the open (long enough to cover the original mouseup +
    //      auxclick, short enough that a deliberate second click is
    //      still respected).
    const openedAt = performance.now();
    const ref = this.overlayRef;
    ref
      .outsidePointerEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (performance.now() - openedAt < 200) return;
        this.closeOverlay();
      });

    this.overlayRef
      .keydownEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          this.closeOverlay();
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
