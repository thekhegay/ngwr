/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

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
} from '@angular/core';

import { WrIcon, type WrIconName } from 'ngwr/icon';
import { WR_OVERLAY } from 'ngwr/overlay';

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
    '(mouseenter)': 'onMouseEnter()',
    '(mouseleave)': 'onMouseLeave($event)',
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
  private readonly vcr = inject(ViewContainerRef);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly destroyRef = inject(DestroyRef);

  private submenuRef: OverlayRef | null = null;
  private openTimer: ReturnType<typeof setTimeout> | null = null;
  private closeTimer: ReturnType<typeof setTimeout> | null = null;
  protected submenuOpen = false;

  /**
   * Global registry of open submenus keyed by the host element of the
   * item that owns them. Used to cascade-close descendants when a
   * parent submenu is disposed — Angular's onDestroy on detached
   * portals doesn't always tear down the deepest grand-children's
   * overlays in the right order, leaving orphaned floating panes.
   */
  private static readonly openSubmenus = new Map<HTMLElement, WrContextMenuItem>();

  constructor() {
    this.destroyRef.onDestroy(() => this.disposeSubmenu(true));
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

  /** @internal Right-arrow opens the submenu. */
  protected onArrowRight(event: Event): void {
    if (this.disabled() || !this.submenu()) return;
    event.preventDefault();
    this.scheduleOpen(0);
  }

  /** @internal Left-arrow closes the submenu (if open). */
  protected onArrowLeft(event: Event): void {
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
    // Don't close if the cursor is moving into the submenu pane itself —
    // the gap between the item and the submenu often clips through one
    // or two pixels of "outside", and we'd dismiss prematurely.
    if (this.relatedTargetIsInsideMenuOverlay(event)) return;
    this.scheduleClose(SUBMENU_CLOSE_DELAY);
  }

  // ──────── Submenu lifecycle ────────

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
      .withPositions(positions)
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
  };
  private readonly onSubmenuLeave = (event: MouseEvent): void => {
    // The mouse exits this submenu pane to enter a DEEPER submenu pane
    // (the user is drilling further down). Stay open — the deeper menu
    // is "inside" us from a UX standpoint.
    if (this.relatedTargetIsInsideMenuOverlay(event)) return;
    this.scheduleClose(SUBMENU_CLOSE_DELAY);
  };

  /**
   * `true` when the mouse moved into another `.wr-context-menu-overlay`
   * (root menu, sibling submenu, grandchild submenu). Used to keep
   * parent menus open while the user navigates into nested submenus.
   */
  private relatedTargetIsInsideMenuOverlay(event: MouseEvent): boolean {
    const related = event.relatedTarget;
    if (!(related instanceof Element)) return false;
    return !!related.closest('.wr-context-menu-overlay');
  }

  private disposeSubmenu(immediate: boolean): void {
    this.cancelOpen();
    this.cancelClose();
    const ref = this.submenuRef;
    if (!ref) return;
    this.submenuRef = null;
    this.submenuOpen = false;
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
}
