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

import { WrContextMenuItem } from './context-menu-item';
import type { WrContextMenuPanel } from './context-menu-panel';

/**
 * Attach to any element to show a `<wr-context-menu>` at the pointer
 * position when the user right-clicks or otherwise sends a `contextmenu`
 * event (Shift+F10, etc.). The native browser menu is suppressed for the
 * host element.
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
 * @see https://ngwr.dev/components/context-menu
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
  private closingTimer: ReturnType<typeof setTimeout> | null = null;
  private leaveTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Single open root menu at a time. Submenu items use this to signal
   * chain-level hover state: when the cursor enters ANY pane in the
   * chain (root or submenu) `keepChainAlive()` cancels the close timer;
   * when the cursor leaves ALL panes `scheduleChainClose()` starts it.
   * The whole chain (root → submenus) tears down through the root's
   * close (submenus react to their owner-item destroyRef + the static
   * registry in `WrContextMenuItem`).
   */
  private static activeRoot: WrContextMenu | null = null;

  /** Called from a submenu pane's mouseenter — keep the whole chain alive. */
  static keepChainAlive(): void {
    WrContextMenu.activeRoot?.cancelLeaveTimer();
  }

  /** Called from a submenu pane's mouseleave when the cursor left ALL menus. */
  static scheduleChainClose(): void {
    WrContextMenu.activeRoot?.scheduleLeave();
  }

  /**
   * Called from a `<wr-context-menu-item>` click — selecting an item
   * dismisses the whole chain (root + any open submenus). Items live in
   * a detached overlay portal, so they reach their owning root through
   * this static handle rather than DI.
   */
  static closeActive(): void {
    WrContextMenu.activeRoot?.closeOverlay();
  }

  /**
   * Open/close animation duration in ms. Matches the longest SCSS
   * transition on `.wr-context-menu-overlay` (the spring-scale curve).
   * The directive holds the overlay alive for this long during close
   * so the exit animation can play before the pane is removed from
   * the DOM.
   */
  private static readonly TRANSITION_MS = 220;
  /**
   * Grace window after the cursor leaves the root pane. Long enough
   * for the user to dip momentarily into the gap between the root and
   * a submenu (or back from a submenu), short enough to feel snappy
   * on a deliberate hover-out.
   */
  private static readonly LEAVE_DELAY = 240;

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

  // Overlay

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

    // Trigger the open transition on the next frame — adding the class
    // synchronously with attach would skip the initial 0→1 frame and
    // the menu would just appear without animating.
    requestAnimationFrame(() => pane.classList.add('wr-context-menu-overlay--open'));

    // Hover-out closes the menu after a grace window, unless the
    // cursor moved INTO a descendant submenu (any other
    // `.wr-context-menu-overlay`). Re-entering the root cancels the
    // scheduled close so the user can dip out and back without losing
    // the menu.
    const onPaneLeave = (event: MouseEvent): void => {
      const related = event.relatedTarget;
      // Moving into ANY other menu pane (a submenu) keeps the chain
      // alive — the submenu's own mouseenter will cancel any pending
      // chain-close. Only schedule when the cursor genuinely left the
      // chain.
      if (related instanceof Element && related.closest('.wr-context-menu-overlay')) return;
      this.scheduleLeave();
    };
    const onPaneEnter = (): void => this.cancelLeaveTimer();
    pane.addEventListener('mouseleave', onPaneLeave);
    pane.addEventListener('mouseenter', onPaneEnter);
    WrContextMenu.activeRoot = this;
    this.overlayRef.detachments().subscribe(() => {
      pane.removeEventListener('mouseleave', onPaneLeave);
      pane.removeEventListener('mouseenter', onPaneEnter);
    });
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
    this.cancelLeaveTimer();
    if (WrContextMenu.activeRoot === this) WrContextMenu.activeRoot = null;
    // Submenu panes live in the CDK overlay container, not inside the
    // root pane's view — destroyRef cascade through portal detach
    // doesn't reach them. Close them all explicitly first so they
    // don't float when the root is dismissed (outside-click, Esc, etc).
    WrContextMenuItem.disposeAll(false);
    const ref = this.overlayRef;
    const pane = ref.overlayElement;
    // Detach immediately would skip the exit animation. Remove the open
    // class first so the SCSS transition runs back to the default
    // (faded + scaled-down) state, then dispose after the transition.
    pane.classList.remove('wr-context-menu-overlay--open');
    if (this.closingTimer !== null) clearTimeout(this.closingTimer);
    this.closingTimer = setTimeout(() => {
      ref.dispose();
      this.closingTimer = null;
    }, WrContextMenu.TRANSITION_MS);
    // Mark immediately so a subsequent right-click opens a fresh menu
    // rather than landing on the disposing one.
    this.overlayRef = null;
  }

  private cancelLeaveTimer(): void {
    if (this.leaveTimer !== null) {
      clearTimeout(this.leaveTimer);
      this.leaveTimer = null;
    }
  }

  private scheduleLeave(): void {
    this.cancelLeaveTimer();
    this.leaveTimer = setTimeout(() => {
      this.leaveTimer = null;
      this.closeOverlay();
    }, WrContextMenu.LEAVE_DELAY);
  }
}
