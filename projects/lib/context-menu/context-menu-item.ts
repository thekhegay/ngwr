/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directionality } from '@angular/cdk/bidi';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { type ConnectedPosition, type OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import {
  Component,
  DestroyRef,
  ElementRef,
  ViewContainerRef,
  ViewEncapsulation,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

import { WrIcon, type WrIconName } from 'ngwr/icon';
import { WR_OVERLAY, wrMirrorOffsets } from 'ngwr/overlay';
import { randomId } from 'ngwr/utils';

import { WrContextMenu } from './context-menu';
import type { WrContextMenuPanel } from './context-menu-panel';

/** Hover delay (ms) before a submenu opens. */
const SUBMENU_OPEN_DELAY = 120;
/** Grace window (ms) before a submenu closes when the cursor leaves it. */
const SUBMENU_CLOSE_DELAY = 240;
/** Animation duration of the submenu — mirrors the root menu CSS. */
const SUBMENU_TRANSITION_MS = 220;

/**
 * Single row inside a `<wr-context-menu>`. Mirrors `<wr-dropdown-item>` —
 * rendered as a menu item with an optional leading icon and an optional
 * nested `[submenu]` that opens to the right on hover.
 *
 * @example
 * ```html
 * <wr-context-menu #menu>
 *   <wr-context-menu-item icon="copy" (click)="copy()">Copy</wr-context-menu-item>
 *   <wr-context-menu-item icon="more" [submenu]="extras">More…</wr-context-menu-item>
 * </wr-context-menu>
 *
 * <wr-context-menu #extras>
 *   <wr-context-menu-item (click)="duplicate()">Duplicate</wr-context-menu-item>
 *   <wr-context-menu-item (click)="archive()">Archive</wr-context-menu-item>
 * </wr-context-menu>
 * ```
 */
@Component({
  selector: 'wr-context-menu-item',
  templateUrl: './context-menu-item.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    role: 'menuitem',
    '[class]': 'classes()',
    '[attr.tabindex]': '-1',
    '[attr.aria-disabled]': 'disabled() ? true : null',
    '[attr.aria-haspopup]': 'submenu() ? "menu" : null',
    '[attr.aria-expanded]': 'submenu() ? (submenuOpen ? "true" : "false") : null',
    '[attr.aria-controls]': 'submenuId()',
    '(mouseenter)': 'onMouseEnter()',
    '(mouseleave)': 'onMouseLeave($event)',
    '(click)': 'onClick()',
    '(keydown.enter)': 'activate($event)',
    '(keydown.space)': 'activate($event)',
    '(keydown.arrowRight)': 'onArrowRight($event)',
    '(keydown.arrowLeft)': 'onArrowLeft($event)',
  },
  imports: [WrIcon],
})
export class WrContextMenuItem {
  /** Optional leading icon name. @default null */
  readonly icon = input<WrIconName | null>(null);

  /** Disable interaction (suppresses pointer + keyboard). @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /**
   * Optional nested `<wr-context-menu>`. When set, hovering the item
   * (or pressing →) opens it to the right with a chevron indicator.
   */
  readonly submenu = input<WrContextMenuPanel | null>(null);

  protected readonly classes = computed(() => {
    const parts = ['wr-context-menu-item'];
    if (this.disabled()) parts.push('wr-context-menu-item--disabled');
    if (this.submenu()) parts.push('wr-context-menu-item--has-submenu');
    return parts.join(' ');
  });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlay = inject(WR_OVERLAY);
  private readonly dir = inject(Directionality, { optional: true });
  private readonly vcr = inject(ViewContainerRef);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly destroyRef = inject(DestroyRef);

  private submenuRef: OverlayRef | null = null;
  private openTimer: ReturnType<typeof setTimeout> | null = null;
  private closeTimer: ReturnType<typeof setTimeout> | null = null;
  protected submenuOpen = false;

  /**
   * Id of the submenu's menu element while it is open, published on the item as
   * `aria-controls` — the same contract the root trigger keeps (see
   * {@link WrContextMenu}). Each submenu pane is its own overlay in the shared
   * container, so `aria-haspopup` / `aria-expanded` say that a submenu EXISTS
   * and is showing, and this says WHICH one.
   *
   * A signal, not a plain field like `submenuOpen`: host bindings re-run only
   * when something they read has changed, and this flips outside change
   * detection. Writing it is also what now refreshes `aria-expanded` next to
   * it, which used to depend on some unrelated work dirtying the view.
   *
   * @internal
   */
  protected readonly submenuId = signal<string | null>(null);

  /**
   * Global registry of open submenus keyed by the host element of the
   * item that owns them. Used to cascade-close descendants when a
   * parent submenu is disposed — Angular's onDestroy on detached
   * portals doesn't always tear down the deepest grand-children's
   * overlays in the right order, leaving orphaned floating panes.
   */
  private static readonly openSubmenus = new Map<HTMLElement, WrContextMenuItem>();

  /**
   * Dispose every open submenu pane on the page. Called by the root
   * `WrContextMenu` when its own overlay closes — destroyRef cascade
   * isn't reliable across separate overlay panes (each pane lives in
   * the CDK overlay container, not inside the parent pane's view).
   */
  static disposeAll(immediate: boolean): void {
    for (const [, owner] of [...WrContextMenuItem.openSubmenus]) {
      owner.disposeSubmenu(immediate);
    }
  }

  constructor() {
    this.destroyRef.onDestroy(() => this.disposeSubmenu(true));
  }

  /**
   * @internal Pointer activation — selecting a leaf item dismisses the
   * whole menu chain. The consumer's own `(click)` binding on the host
   * runs in the same event; we defer the close to a microtask so that
   * handler (the actual "select") always completes before the overlay
   * tears down, regardless of listener registration order. Items that
   * own a submenu (or are disabled) don't dismiss — clicking them just
   * drills into / ignores the row.
   */
  protected onClick(): void {
    if (this.disabled() || this.submenu()) return;
    queueMicrotask(() => WrContextMenu.closeActive());
  }

  /** @internal Keyboard activation — Enter / Space. */
  protected activate(event: Event): void {
    if (this.disabled()) return;
    if (this.submenu()) {
      event.preventDefault();
      this.scheduleOpen(0);
      return;
    }
    event.preventDefault();
    this.host.nativeElement.click();
  }

  /**
   * @internal The arrow that walks INTO a submenu, which is the one pointing the
   * way the menu cascades: right in LTR, left in RTL. The panes mirror with the
   * reading direction (the CDK flips their placement), so a fixed ArrowRight
   * would ask an RTL user to press toward the parent to open the child.
   */
  protected onArrowRight(event: Event): void {
    if (this.isRtl()) return this.closeFromKey(event);
    this.openFromKey(event);
  }

  /** @internal The arrow that walks back OUT — the mirror of {@link onArrowRight}. */
  protected onArrowLeft(event: Event): void {
    if (this.isRtl()) return this.openFromKey(event);
    this.closeFromKey(event);
  }

  private openFromKey(event: Event): void {
    if (this.disabled() || !this.submenu()) return;
    event.preventDefault();
    this.scheduleOpen(0);
  }

  private closeFromKey(event: Event): void {
    if (!this.submenu() || !this.submenuOpen) return;
    event.preventDefault();
    this.scheduleClose(0);
  }

  /** @internal Hover schedules a submenu open after a small delay. */
  protected onMouseEnter(): void {
    if (this.disabled() || !this.submenu()) return;
    this.cancelClose();
    this.scheduleOpen(SUBMENU_OPEN_DELAY);
  }

  /** @internal Hover-out schedules a close with a grace window. */
  protected onMouseLeave(event: MouseEvent): void {
    if (!this.submenu()) return;
    this.cancelOpen();
    // Only skip the close when the cursor is moving into MY OWN submenu
    // (the user is drilling further down). Moving elsewhere — sibling
    // item, ancestor menu, or completely off the chain — should close
    // this item's submenu and let the cascade-on-dispose tear down any
    // descendants.
    if (this.relatedTargetIsInsideOwnSubmenu(event)) return;
    this.scheduleClose(SUBMENU_CLOSE_DELAY);
  }

  // Submenu lifecycle

  private scheduleOpen(delay: number): void {
    if (this.submenuRef) return;
    this.cancelOpen();
    if (delay === 0) {
      this.openSubmenu();
      return;
    }
    this.openTimer = setTimeout(() => {
      this.openTimer = null;
      this.openSubmenu();
    }, delay);
  }

  private scheduleClose(delay: number): void {
    this.cancelClose();
    if (delay === 0) {
      this.disposeSubmenu(false);
      return;
    }
    this.closeTimer = setTimeout(() => {
      this.closeTimer = null;
      this.disposeSubmenu(false);
    }, delay);
  }

  private cancelOpen(): void {
    if (this.openTimer !== null) {
      clearTimeout(this.openTimer);
      this.openTimer = null;
    }
  }

  private cancelClose(): void {
    if (this.closeTimer !== null) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }

  private openSubmenu(): void {
    const panel = this.submenu();
    if (!panel || this.submenuRef) return;

    // Position to the right of the item, vertically aligned with the
    // item's top. Falls back to opening to the LEFT if there's no room.
    const positions: ConnectedPosition[] = [
      { originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top', offsetX: 4 },
      { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top', offsetX: -4 },
    ];

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.host)
      .withPositions(wrMirrorOffsets(positions, this.isRtl()))
      .withPush(true);

    this.submenuRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.scrollStrategies.reposition(),
      panelClass: ['wr-context-menu-overlay', 'wr-context-menu-overlay--submenu'],
    });

    const portal = new TemplatePortal(panel.contentTpl(), this.vcr);
    this.submenuRef.attach(portal);

    // Mirror the open animation pattern from the root menu directive.
    const pane = this.submenuRef.overlayElement;
    requestAnimationFrame(() => pane.classList.add('wr-context-menu-overlay--open'));

    // Name the pane's menu so the item can point at it — minted per open for
    // the same reason the root does it (a closing pane outlives its close).
    const menuEl = pane.querySelector<HTMLElement>('.wr-context-menu');
    if (menuEl) {
      menuEl.id = randomId('wr-context-menu');
      this.submenuId.set(menuEl.id);
    }

    // Track mouse entering / leaving the submenu so we don't auto-close
    // when the cursor crosses the gap between item and submenu pane.
    pane.addEventListener('mouseenter', this.onSubmenuEnter);
    pane.addEventListener('mouseleave', this.onSubmenuLeave);

    this.submenuOpen = true;
    WrContextMenuItem.openSubmenus.set(this.host.nativeElement, this);
  }

  /** Bound handlers (= preserves identity for removeEventListener). */
  private readonly onSubmenuEnter = (): void => {
    this.cancelClose();
    // Cursor is inside our pane — keep the whole chain (root + every
    // ancestor submenu) alive.
    WrContextMenu.keepChainAlive();
  };
  private readonly onSubmenuLeave = (event: MouseEvent): void => {
    // Only stay open if the cursor is moving into a DESCENDANT submenu
    // of ours (an item inside our pane opening its own submenu). Moving
    // back up to an ancestor menu, sideways to a sibling, or completely
    // off-chain should dismiss this submenu (cascade-on-dispose then
    // tears down any deeper levels we own).
    if (this.relatedTargetIsInsideDescendantSubmenu(event)) return;
    this.scheduleClose(SUBMENU_CLOSE_DELAY);
    // If the cursor left ALL menu panes (root + every submenu), tear
    // down the whole chain. Otherwise just close this pane and let the
    // user continue navigating ancestors.
    if (!this.relatedTargetIsInsideAnyMenu(event)) {
      WrContextMenu.scheduleChainClose();
    }
  };

  private relatedTargetIsInsideAnyMenu(event: MouseEvent): boolean {
    const related = event.relatedTarget;
    if (!(related instanceof Element)) return false;
    return !!related.closest('.wr-context-menu-overlay');
  }

  /**
   * `true` when the cursor moved from this item directly into the pane
   * of its own (just-opening) submenu — drilling down. Sibling items
   * and ancestor menus do NOT count.
   */
  private relatedTargetIsInsideOwnSubmenu(event: MouseEvent): boolean {
    const related = event.relatedTarget;
    if (!(related instanceof Element) || !this.submenuRef) return false;
    return this.submenuRef.overlayElement.contains(related);
  }

  /**
   * `true` when the cursor moved from our submenu pane into another
   * submenu pane whose owner-item lives INSIDE ours — the user is
   * drilling further down the chain (e.g., from the Share submenu into
   * the Export-as submenu). Moving back up the chain returns false so
   * we close.
   */
  private relatedTargetIsInsideDescendantSubmenu(event: MouseEvent): boolean {
    const related = event.relatedTarget;
    if (!(related instanceof Element) || !this.submenuRef) return false;
    const targetPane = related.closest('.wr-context-menu-overlay');
    if (!targetPane) return false;
    const myPane = this.submenuRef.overlayElement;
    if (targetPane === myPane) return true;
    // Find the owner-item of the pane the cursor is heading into. If
    // that owner-item is inside our own pane, the destination is a
    // descendant submenu.
    for (const [ownerEl, owner] of WrContextMenuItem.openSubmenus) {
      if (owner.submenuRef?.overlayElement === targetPane) {
        return myPane.contains(ownerEl);
      }
    }
    return false;
  }

  private disposeSubmenu(immediate: boolean): void {
    this.cancelOpen();
    this.cancelClose();
    const ref = this.submenuRef;
    if (!ref) return;
    this.submenuRef = null;
    this.submenuOpen = false;
    this.submenuId.set(null);
    WrContextMenuItem.openSubmenus.delete(this.host.nativeElement);

    const pane = ref.overlayElement;
    pane.removeEventListener('mouseenter', this.onSubmenuEnter);
    pane.removeEventListener('mouseleave', this.onSubmenuLeave);

    // Cascade-close any descendant submenus whose owner-item lives inside
    // the pane we're about to dispose. Without this, when a parent submenu
    // closes (via hover-out grace timer), a grandchild submenu whose owner
    // is rendered inside the parent's portal is orphaned — its OverlayRef
    // stays alive in the DOM with no parent to reach it from.
    for (const [ownerEl, owner] of WrContextMenuItem.openSubmenus) {
      if (pane.contains(ownerEl)) owner.disposeSubmenu(immediate);
    }

    if (immediate) {
      ref.dispose();
      return;
    }
    pane.classList.remove('wr-context-menu-overlay--open');
    setTimeout(() => ref.dispose(), SUBMENU_TRANSITION_MS);
  }

  /**
   * Whether the app reads right-to-left.
   *
   * Optional inject: `Directionality` is root-provided, so this is never null in
   * an app — but a bare `TestBed` that provides nothing should still get a
   * component that works, and defaulting to LTR is the honest fallback.
   */
  private isRtl(): boolean {
    return this.dir?.value === 'rtl';
  }
}
