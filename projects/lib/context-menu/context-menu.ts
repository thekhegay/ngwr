/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  type ConnectedPosition,
  type FlexibleConnectedPositionStrategyOrigin,
  type OverlayRef,
  ScrollStrategyOptions,
} from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { DestroyRef, Directive, ElementRef, ViewContainerRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import type { Subscription } from 'rxjs';

import { WR_OVERLAY, WrOutsideClick } from 'ngwr/overlay';
import { randomId } from 'ngwr/utils';

import { WrContextMenuItem } from './context-menu-item';
import type { WrContextMenuPanel } from './context-menu-panel';
import { wrFocusMenuItemAt, wrHandleMenuNavigation } from './menu-focus';

/**
 * Where the menu may hang off the pointer, best first: down-and-inline-start of
 * the cursor (what a native context menu does), then flipped up, then across,
 * then both.
 *
 * The origin is a zero-size POINT, so every `originX` / `originY` resolves to
 * the same coordinate and only the overlay's own corner varies. `overlayX:
 * 'start'` is the logical corner: CDK resolves it against the ambient reading
 * direction, so an RTL page opens the menu to the LEFT of the cursor without a
 * second table.
 */
const POINTER_POSITIONS: ConnectedPosition[] = [
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'top' },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
  { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top' },
  { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'bottom' },
];

/**
 * The pointer as a CDK origin: a zero-size rect at the click, in VIEWPORT
 * coordinates.
 *
 * Live getters rather than a snapshot, and that is the whole trick. The menu is
 * anchored to the DOCUMENT — as the page scrolls it travels with the content it
 * was opened over (native + PrimeNG behaviour) — while CDK positions against
 * the viewport. Reading the scroll offset at `apply()` time is what converts one
 * into the other, so a re-anchor is nothing but a request to re-apply.
 */
function pointerOrigin(pageX: number, pageY: number): FlexibleConnectedPositionStrategyOrigin {
  return {
    width: 0,
    height: 0,
    get x(): number {
      return pageX - window.scrollX;
    },
    get y(): number {
      return pageY - window.scrollY;
    },
  };
}

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
 * @see https://ngwr.dev/reference/components/context-menu
 */
@Directive({
  selector: '[wrContextMenu]',
  // `wrContextMenuTrigger`, not `wrContextMenu`: the PANEL component already
  // exports itself under the plain name, which is what `<wr-context-menu #menu>`
  // hands to `[wrContextMenu]="menu"`. Two directives may share an `exportAs`
  // without a compile error — the reference resolves per element — so the clash
  // would only surface as the wrong instance on an element carrying both.
  exportAs: 'wrContextMenuTrigger',
  host: {
    class: 'wr-context-menu-host',
    '[attr.aria-controls]': 'openMenuId()',
    '(contextmenu)': 'onContextMenu($event)',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp()',
    '(pointercancel)': 'onPointerUp()',
  },
})
export class WrContextMenu {
  /** Menu to open. Pass a `<wr-context-menu>` template reference. */
  readonly menu = input.required<WrContextMenuPanel>({ alias: 'wrContextMenu' });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlay = inject(WR_OVERLAY);
  private readonly outsideClick = inject(WrOutsideClick);
  private readonly vcr = inject(ViewContainerRef);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * Id of the menu element while this trigger's menu is open, published on the
   * host as `aria-controls`. The pane is portalled into the overlay container, a
   * sibling of the whole app, so this reference is the ONLY link between a
   * trigger and the menu it opened — for a screen reader, and for anything else
   * that has to find it. Cleared on close, which is also what tells an open
   * trigger from a closing one: the pane itself lingers for the exit animation.
   *
   * A signal, not a plain field: host bindings re-run only when something they
   * READ has changed, and this one flips outside change detection (from a
   * pointer handler, and from `onDestroy`). Held as a plain string it published
   * the id on open — the overlay attach happens to dirty the host view — and
   * then kept it forever, so the trigger still pointed at a menu that was gone.
   *
   * @internal
   */
  protected readonly openMenuId = signal<string | null>(null);

  private overlayRef: OverlayRef | null = null;
  /**
   * The open menu's subscription to CDK's keyboard dispatcher, held so that
   * `closeOverlay()` can drop it — see the unsubscribe there for why the pane's
   * own disposal is 220 ms too late.
   */
  private rootKeys: Subscription | null = null;
  /**
   * Where the keyboard was at the moment this menu took it, so a close can put
   * it back there. Null when it was nowhere in particular (`<body>`) or already
   * inside a menu pane, neither of which is a place to return to.
   */
  private restoreFocusTo: HTMLElement | null = null;
  /**
   * Panes waiting out their exit animation, keyed by the timer that disposes
   * them.
   *
   * A SET, because one handle cannot hold two closings. It used to be a single
   * `closingTimer`, and the second close inside the 220ms window cleared the
   * first one's timer instead of its own — so the previous pane's `dispose()`
   * never ran. `onContextMenu` closes and immediately re-opens, so right-clicking
   * one target faster than the animation orphaned a pane per click: an
   * `opacity: 0` box with `pointer-events: auto` eating clicks, a never-destroyed
   * embedded view, a capture-phase document scroll listener still moving it, and
   * an undetached ref still registered with CDK's keyboard dispatcher — which
   * swallowed Escape for the whole page.
   */
  private readonly closingPanes = new Map<ReturnType<typeof setTimeout>, OverlayRef>();
  private leaveTimer: ReturnType<typeof setTimeout> | null = null;

  // Touch long-press → open. Right-click keeps using `(contextmenu)`.
  private pressTimer: ReturnType<typeof setTimeout> | null = null;
  private pressX = 0;
  private pressY = 0;
  private pressPageX = 0;
  private pressPageY = 0;
  private lastLongPressAt = 0;
  private cancelPressScroll: (() => void) | null = null;

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

  /** Hold duration before a touch long-press opens the menu. */
  private static readonly LONG_PRESS_MS = 500;
  /** Finger travel (px) that turns a pending long-press into a scroll/drag. */
  private static readonly PRESS_MOVE_TOLERANCE = 10;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.cancelPress();
      this.closeOverlay();
      // Whatever is still fading out goes now: the timers that would have
      // disposed those panes belong to a directive that no longer exists.
      for (const [timer, ref] of this.closingPanes) {
        clearTimeout(timer);
        ref.dispose();
      }
      this.closingPanes.clear();
    });
  }

  /** @internal Right-click handler — opens at the pointer (or re-positions if already open). */
  protected onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    // Some touch browsers (Android Chrome) fire a synthetic `contextmenu`
    // right after a long-press has already opened the menu — swallow it so it
    // doesn't re-open / restart the animation.
    if (Date.now() - this.lastLongPressAt < 700) return;
    event.stopPropagation();
    // Re-open at the new position even if it was already open.
    // Use page coords (document-relative) so the menu anchors to the
    // zone it was opened over — scrolling the page carries the menu
    // along with the content, matching native + PrimeNG behavior.
    this.closeOverlay();
    this.openOverlay(event.pageX, event.pageY);
  }

  /**
   * @internal Touch/pen long-press → open the menu at the press point. Desktop
   * right-click stays on `(contextmenu)`; this path is filtered to non-mouse
   * pointers. Deliberately does NOT `preventDefault`/`setPointerCapture` or set
   * `touch-action` — a press that turns into a scroll must still scroll, so the
   * open is cancelled on movement (> tolerance), on scroll, and on early lift.
   */
  protected onPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' || !event.isPrimary || this.pressTimer !== null) return;
    this.pressX = event.clientX;
    this.pressY = event.clientY;
    this.pressPageX = event.pageX;
    this.pressPageY = event.pageY;
    this.pressTimer = setTimeout(() => {
      this.pressTimer = null;
      this.cancelPress();
      this.lastLongPressAt = Date.now();
      this.closeOverlay();
      this.openOverlay(this.pressPageX, this.pressPageY);
    }, WrContextMenu.LONG_PRESS_MS);
    const onScroll = (): void => this.cancelPress();
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    this.cancelPressScroll = (): void => document.removeEventListener('scroll', onScroll, { capture: true });
  }

  /** @internal Finger moved too far before the hold fired — it's a scroll/drag. */
  protected onPointerMove(event: PointerEvent): void {
    if (this.pressTimer === null) return;
    if (Math.hypot(event.clientX - this.pressX, event.clientY - this.pressY) > WrContextMenu.PRESS_MOVE_TOLERANCE) {
      this.cancelPress();
    }
  }

  /** @internal Lifted (or the browser claimed the gesture) before the hold fired. */
  protected onPointerUp(): void {
    this.cancelPress();
  }

  private cancelPress(): void {
    if (this.pressTimer !== null) {
      clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }
    this.cancelPressScroll?.();
    this.cancelPressScroll = null;
  }

  /** Close the menu. */
  close(): void {
    this.closeOverlay();
  }

  // Overlay

  private openOverlay(x: number, y: number): void {
    // Read before `wrFocusMenuItemAt` below takes the keyboard: this is the
    // element the close hands it back to. A pane row is not a candidate — a
    // previous menu may still be fading out — and neither is `<body>`, which is
    // where focus already is when nobody has it.
    const active = document.activeElement;
    this.restoreFocusTo =
      active instanceof HTMLElement && active !== document.body && !active.closest('.wr-context-menu-overlay')
        ? active
        : null;

    // Anchored to the POINTER, which is not an element — CDK takes a virtual
    // origin for exactly that, and a FLEXIBLE strategy is what makes the menu
    // flip up (or across) instead of hanging off the edge of the screen. It used
    // to be a bare `GlobalPositionStrategy` with the raw coordinates written
    // onto the pane, which never measured the menu against the viewport: a
    // right-click 6px above the bottom of the window put two of the three rows
    // below the fold and clipped the third, since the pane is `position: fixed`
    // and cannot be scrolled to. Submenus have used the flexible strategy from
    // the start (`context-menu-item.ts`); only the root skipped it.
    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(pointerOrigin(x, y))
      // The menu sizes itself; the fallbacks below are the whole answer to a
      // cramped viewport, and `withPush` clamps whatever is left over.
      .withFlexibleDimensions(false)
      .withPush(true)
      .withPositions(POINTER_POSITIONS);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      // `noop` so scroll doesn't dismiss the menu — `sync()` below re-anchors it
      // instead.
      scrollStrategy: this.scrollStrategies.noop(),
      panelClass: ['wr-context-menu-overlay'],
    });

    const portal = new TemplatePortal(this.menu().contentTpl(), this.vcr);
    this.overlayRef.attach(portal);
    // `attach()` defers CDK's first placement into `afterNextRender`. Place it
    // now: until then the pane sits at the container's top-left corner, and the
    // rows are already in the DOM (see `wrFocusMenuItemAt` below), so the
    // measurement the flip depends on is available.
    this.overlayRef.updatePosition();

    const pane = this.overlayRef.overlayElement;

    // Name the menu we just opened so the host can point at it. The id is
    // minted per OPEN rather than living on the panel: `closeOverlay()` keeps
    // the previous pane in the DOM for its exit animation, so a re-open would
    // otherwise leave two elements answering to the same id — with the dying
    // one first in document order.
    const menuEl = pane.querySelector<HTMLElement>('.wr-context-menu');
    if (menuEl) {
      menuEl.id = randomId('wr-context-menu');
      this.openMenuId.set(menuEl.id);
    }

    // Re-anchor. `pointerOrigin` reads the scroll offset afresh, so this is all
    // it takes for the menu to travel with the content it was opened over.
    //
    // `reapplyLastPosition()` rather than `updatePosition()`: the flip is
    // decided once, when the menu opens. Re-running the fallback list on every
    // scroll event would let the menu hop from above the cursor to below it and
    // back while the page moves under it, which is a worse reading of "the menu
    // stays where you put it" than a menu that simply slides with the page.
    const sync = (): void => positionStrategy.reapplyLastPosition();

    // Move the keyboard INTO the menu. Without this the pane painted a
    // `role="menu"` that could be seen and never entered: rows are
    // `tabindex="-1"` (the roving-focus contract) and the pane is not a tab
    // stop, so ArrowDown / Enter / ArrowRight all went to whatever still held
    // focus behind the menu and only Escape worked — the dispatcher routes that
    // one regardless of focus.
    //
    // Unconditional, unlike `wr-dropdown`'s `openedByPointer` gate: there is no
    // hover open here. Every path into this method is a deliberate request for
    // the menu (right-click, Shift+F10, the Menu key, a long-press), which is
    // also when a native context menu takes the keyboard.
    //
    // Synchronous, and it can be: `attach()` above runs the embedded view's
    // first change detection itself (CDK's `attachTemplatePortal`), so the rows
    // and their `[class]` host binding are already in the DOM.
    wrFocusMenuItemAt(pane, 0);

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
    // events pending, and the outside-click source fires on `auxclick` — which
    // would close the menu the instant the user lifts their finger. Two-part
    // guard:
    //   1. Track the open timestamp.
    //   2. Ignore any outside events that arrive within a short window
    //      after the open (long enough to cover the original mouseup +
    //      auxclick, short enough that a deliberate second click is
    //      still respected).
    const openedAt = performance.now();
    this.outsideClick
      .outsidePointerEvents(this.overlayRef)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (performance.now() - openedAt < 200) return;
        this.closeOverlay();
      });

    this.rootKeys = this.overlayRef
      .keydownEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          this.closeOverlay();
          return;
        }
        if (event.key === 'Tab') {
          // Let focus leave naturally — `closeOverlay()` hands it back to the
          // trigger first, so Tab continues from there instead of from a pane
          // that is about to be removed.
          this.closeOverlay();
          return;
        }
        // A row's own handler already acted on this key (ArrowRight into a
        // submenu, Enter on an item): `preventDefault()` is how it says so, and
        // moving the cursor on top of that would undo it.
        if (event.defaultPrevented) return;
        wrHandleMenuNavigation(pane, event);
      });
  }

  private closeOverlay(): void {
    if (!this.overlayRef) return;
    // Read up front, before the teardown below starts on the panes: the answer
    // wanted is where the keyboard was at the moment of dismissal.
    const active = document.activeElement;
    const focusWasInside = active instanceof Element && active.closest('.wr-context-menu-overlay') !== null;
    const restoreTo = this.restoreFocusTo;
    this.restoreFocusTo = null;
    this.cancelLeaveTimer();
    // Drop the reference immediately: the pane below stays in the DOM until the
    // exit animation has played, and a trigger still pointing at a menu on its
    // way out reads as open.
    this.openMenuId.set(null);
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
    // …and stop it hit-testing on the way out. Fading to `opacity: 0` does not
    // stop a pane receiving pointer events — `.cdk-overlay-pane` sets
    // `pointer-events: auto` — so for the whole 220 ms an invisible menu kept
    // swallowing clicks meant for the page underneath, and a second click on
    // the item just picked (a double-click, or Escape then click) re-ran the
    // consumer's action. Written inline rather than in `styles/_index.scss`
    // because the closing state has no class of its own, and inline beats the
    // CDK's own sheet without an `!important`.
    pane.style.pointerEvents = 'none';
    // …and stop it taking the page's KEYS on the way out, for the same reason
    // and with the same timing. An overlay with a keydown subscriber is where
    // CDK's dispatcher stops looking, and it is removed from the dispatcher only
    // by `detach()` / `dispose()` — which is 220 ms away — so a dismissed menu
    // went on swallowing every keydown on the page: ArrowDown pulled real focus
    // back onto a row of the invisible pane, and a second Escape meant for the
    // dialog underneath was `preventDefault`ed and did nothing.
    // `WrContextMenuItem.disposeSubmenu()` does exactly this; the root had not.
    this.rootKeys?.unsubscribe();
    this.rootKeys = null;
    const timer = setTimeout(() => {
      this.closingPanes.delete(timer);
      ref.dispose();
    }, WrContextMenu.TRANSITION_MS);
    this.closingPanes.set(timer, ref);
    // Mark immediately so a subsequent right-click opens a fresh menu
    // rather than landing on the disposing one.
    this.overlayRef = null;
    // Hand the keyboard back. The menu takes focus on open, so a dismissal that
    // left it in the pane would strand it on `<body>` once the pane is disposed
    // and the next Tab would restart at the top of the document. Only when the
    // caret was actually in the chain: Escape reaches this overlay from anywhere
    // on the page (CDK's dispatcher routes it by stacking order, not by focus),
    // and a menu nobody was in must not steal the caret from a field they are.
    if (focusWasInside) this.handBackFocus(restoreTo);
  }

  /**
   * Put the keyboard back where it came from.
   *
   * The element that had it when the menu opened comes first: a context menu
   * hangs on a REGION — a card, a table row — and Shift+F10 / the Menu key fires
   * `contextmenu` at whatever control inside it the user was actually on, which
   * is their place in the page.
   *
   * The trigger is the fallback, and it needs help to be one. `[wrContextMenu]`
   * adds no `tabindex` and every shape the docs ship is a plain `<div>`, so
   * `focus()` on it does nothing at all — the handback silently missed, leaving
   * the caret in the disposing pane and then on `<body>`, which is the outcome
   * the call is there to prevent. Lending it `tabindex="-1"` for the call and
   * taking that back on blur keeps the consumer's DOM as they wrote it; a
   * permanent `tabindex="0"` would make every right-clickable region a tab stop,
   * which is their decision and not the library's.
   */
  private handBackFocus(previous: HTMLElement | null): void {
    const target =
      previous?.isConnected && !previous.closest('.wr-context-menu-overlay') ? previous : this.host.nativeElement;
    target.focus();
    // Asking whether it took, rather than deciding up front whether it can: the
    // focusability rules are wide (an `<a>` needs an href, a `<div>` needs a
    // tabindex, `inert`/`disabled` opt out) and `document.activeElement` answers
    // all of them at once.
    if (document.activeElement === target) return;
    target.setAttribute('tabindex', '-1');
    target.focus();
    target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
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
