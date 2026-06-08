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
    // Use page coords (document-relative) so the menu anchors to the
    // zone it was opened over — scrolling the page carries the menu
    // along with the content, matching native + PrimeNG behavior.
    this.closeOverlay();
    this.openOverlay(event.pageX, event.pageY);
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

    // Position model: the pane uses `position: fixed` (panel CSS) but we
    // want the menu to anchor to the DOCUMENT — when the user scrolls,
    // the menu should travel with the content it was opened over (native
    // browser + PrimeNG behavior). Strategy:
    //
    //   - Record the page coords (pageX/pageY = document-relative).
    //   - Each frame the user scrolls, set top/left to (pageX/Y minus the
    //     current scroll offset). At scroll 0 this matches clientX/Y; as
    //     scroll grows the menu shifts up/left visually, which is exactly
    //     what `position: absolute` inside an un-fixed container would do
    //     naturally — we just have to emulate it manually because CDK's
    //     overlay container is `position: fixed`.
    const pane = this.overlayRef.overlayElement;
    pane.style.right = 'auto';
    pane.style.bottom = 'auto';
    pane.style.margin = '0';

    const sync = (): void => {
      pane.style.top = `${y - window.scrollY}px`;
      pane.style.left = `${x - window.scrollX}px`;
    };
    sync();
    // Capture-phase listener on document catches scroll events from ANY
    // ancestor (window, html, body, custom scroll containers), so the
    // menu stays anchored to the click position even inside scrollable
    // layouts.
    document.addEventListener('scroll', sync, { capture: true, passive: true });
    // On resize the page layout reflows — the original pageX/pageY no
    // longer points at whatever the user right-clicked. Dismiss the menu
    // rather than dragging it across a now-stale coordinate (matches
    // PrimeNG / native behavior).
    const onResize = (): void => this.closeOverlay();
    window.addEventListener('resize', onResize, { passive: true });
    this.overlayRef.detachments().subscribe(() => {
      document.removeEventListener('scroll', sync, { capture: true });
      window.removeEventListener('resize', onResize);
    });

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
