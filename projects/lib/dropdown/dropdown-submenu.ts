/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { FocusMonitor } from '@angular/cdk/a11y';
import { Directionality } from '@angular/cdk/bidi';
import { type ConnectedPosition, type OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { DestroyRef, Directive, ElementRef, Injector, ViewContainerRef, inject, input, signal } from '@angular/core';

import type { Subscription } from 'rxjs';

import { WR_OVERLAY, WrOutsideClick, wrFollowDirection } from 'ngwr/overlay';
import { wrCheckStyles, wrNumAttr, wrRestoreFocus } from 'ngwr/utils';

import {
  type WrDropdownLevel,
  wrDropdownItems,
  wrDropdownLevelAround,
  wrDropdownLevelOf,
  wrDropdownRegisterLevel,
  wrDropdownReleaseLevel,
} from './dropdown-chain';
import type { WrDropdownMenu } from './dropdown-menu';

/**
 * Beside the item at the inline end, then at the inline start, each first with
 * the tops aligned and then the bottoms. `start` / `end` and no offsets, so the
 * CDK mirrors the list under RTL by itself.
 */
const POSITIONS: ConnectedPosition[] = [
  { originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top' },
  { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top' },
  { originX: 'end', originY: 'bottom', overlayX: 'start', overlayY: 'bottom' },
  { originX: 'start', originY: 'bottom', overlayX: 'end', overlayY: 'bottom' },
];

let itemUid = 0;

/**
 * Put on a `<wr-dropdown-item>` to open another `<wr-dropdown-menu>` beside it.
 * The submenu's own items can carry it too, to any depth.
 *
 * @example
 * ```html
 * <button [wrDropdown]="file">File</button>
 *
 * <wr-dropdown-menu #file>
 *   <wr-dropdown-item>New</wr-dropdown-item>
 *   <wr-dropdown-item [wrDropdownSubmenu]="exportAs">Export</wr-dropdown-item>
 * </wr-dropdown-menu>
 *
 * <wr-dropdown-menu #exportAs>
 *   <wr-dropdown-item (click)="export('csv')">CSV</wr-dropdown-item>
 *   <wr-dropdown-item (click)="export('pdf')">PDF</wr-dropdown-item>
 * </wr-dropdown-menu>
 * ```
 *
 * @see https://ngwr.dev/reference/components/dropdown
 */
@Directive({
  selector: '[wrDropdownSubmenu]',
  exportAs: 'wrDropdownSubmenu',
  host: {
    class: 'wr-dropdown-submenu-trigger',
    '[attr.id]': 'itemId',
    'aria-haspopup': 'menu',
    '[attr.aria-expanded]': 'isOpen()',
    '[attr.aria-controls]': 'isOpen() ? menu().menuId() : null',
    '(click)': 'onClick($event)',
    '(keydown)': 'onKeydown($event)',
    '(mouseenter)': 'onMouseEnter()',
    '(mouseleave)': 'onMouseLeave($event)',
  },
})
export class WrDropdownSubmenu {
  /** Menu to open beside the item. Pass a `<wr-dropdown-menu>` template reference. */
  readonly menu = input.required<WrDropdownMenu>({ alias: 'wrDropdownSubmenu' });

  /** How long the pointer rests on the item before the submenu opens, in ms. @default 150 */
  readonly showDelay = input(150, { transform: wrNumAttr(150) });

  /**
   * How long the submenu stays once the pointer has left both the item and the
   * submenu, in ms. Long enough to cross a neighbouring item on the way in.
   * @default 150
   */
  readonly hideDelay = input(150, { transform: wrNumAttr(150) });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly focusMonitor = inject(FocusMonitor);
  private readonly overlay = inject(WR_OVERLAY);
  private readonly dir = inject(Directionality, { optional: true });
  private readonly outsideClick = inject(WrOutsideClick);
  private readonly vcr = inject(ViewContainerRef);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly injector = inject(Injector);

  private readonly openState = signal(false);

  /** Whether the submenu is open. Read-only: `open()` and `close()` change it. */
  readonly isOpen = this.openState.asReadonly();

  private readonly fallbackId = `wr-dropdown-submenu-trigger-${++itemUid}`;

  /** The consumer's own `id` wins, read fresh for the reason `WrDropdown` gives. */
  protected get itemId(): string {
    return this.host.nativeElement.id || this.fallbackId;
  }

  private overlayRef: OverlayRef | null = null;
  private level: WrDropdownLevel | null = null;
  private outside: Subscription | null = null;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('dropdown');
    // The item is projected content: it outlives the pane it was rendered in,
    // and goes only with the consumer's own view.
    inject(DestroyRef).onDestroy(() => this.dispose(false));
  }

  /** Open the submenu and move focus to its first item. The item has to be in an open menu. */
  open(): void {
    this.show(true);
  }

  /** Close the submenu and every submenu below it. */
  close(): void {
    this.dispose(true);
  }

  /** @internal A real click opens; Enter and Space arrive as a click with no pointer behind it. */
  protected onClick(event: MouseEvent): void {
    this.show(event.detail === 0);
  }

  /** @internal The arrow pointing the way the menus cascade walks into the submenu. */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== (this.dir?.value === 'rtl' ? 'ArrowLeft' : 'ArrowRight') || this.disabled) return;
    event.preventDefault();
    this.show(true);
  }

  /** @internal */
  protected onMouseEnter(): void {
    this.clearTimers();
    if (this.overlayRef || this.disabled) return;
    this.showTimer = setTimeout(() => this.show(false), this.showDelay());
  }

  /** @internal */
  protected onMouseLeave(event: MouseEvent): void {
    this.clearTimers();
    if (!this.level || wrDropdownLevelOf(this.level, event.relatedTarget)) return;
    this.hideLater();
  }

  private get disabled(): boolean {
    return this.host.nativeElement.getAttribute('aria-disabled') === 'true';
  }

  /** A pointer shows the submenu and leaves the caret alone; the keyboard walks in. */
  private show(focus: boolean): void {
    this.clearTimers();
    if (!this.overlayRef) this.attach();
    if (focus && this.overlayRef) wrDropdownItems(this.overlayRef.overlayElement)[0]?.focus();
  }

  private attach(): void {
    const parent = wrDropdownLevelAround(this.host.nativeElement);
    if (!parent || this.disabled) return;
    parent.child?.close();

    const ref = this.overlay.create({
      positionStrategy: this.overlay
        .position()
        .flexibleConnectedTo(this.host)
        .withPositions(POSITIONS)
        .withPush(true)
        .withGrowAfterOpen(true),
      scrollStrategy: this.scrollStrategies.reposition(),
      panelClass: ['wr-dropdown-overlay', 'wr-dropdown-overlay--submenu'],
    });
    wrFollowDirection(ref, this.dir, this.injector);

    this.menu().triggerId.set(this.itemId);
    ref.attach(new TemplatePortal(this.menu().contentTpl(), this.vcr));

    const pane = ref.overlayElement;
    pane.addEventListener('mouseenter', this.clearTimers);
    pane.addEventListener('mouseleave', this.onPaneLeave);
    pane.addEventListener('click', this.onPaneClick);

    // Listening is also what keeps a click INSIDE this pane from reading as a
    // click outside the menus under it: the registry stops at the first pane
    // that holds the target.
    this.outside = this.outsideClick.outsidePointerEvents(ref).subscribe(event => {
      if (!this.host.nativeElement.contains(event.target as Node)) this.close();
    });

    // No `keydownEvents()` subscription: the CDK routes keys to the topmost
    // overlay that listens, and the root menu answers for every level.
    this.overlayRef = ref;
    this.level = { pane, parent, child: null, close: () => this.close() };
    wrDropdownRegisterLevel(this.level);
    this.openState.set(true);
  }

  private dispose(restoreFocus: boolean): void {
    this.clearTimers();
    const ref = this.overlayRef;
    const level = this.level;
    if (!ref || !level) return;

    // Read before the levels below go, since each hands focus up to its own item.
    const focusWasInside = wrDropdownLevelOf(level, document.activeElement) !== null;
    level.child?.close();
    wrDropdownReleaseLevel(level);

    const pane = ref.overlayElement;
    pane.removeEventListener('mouseenter', this.clearTimers);
    pane.removeEventListener('mouseleave', this.onPaneLeave);
    pane.removeEventListener('click', this.onPaneClick);
    this.outside?.unsubscribe();
    this.outside = null;

    ref.dispose();
    this.overlayRef = null;
    this.level = null;
    this.openState.set(false);
    if (restoreFocus && focusWasInside) wrRestoreFocus(this.host.nativeElement, this.focusMonitor);
  }

  private hideLater(): void {
    this.hideTimer = setTimeout(() => this.close(), this.hideDelay());
  }

  private readonly clearTimers = (): void => {
    if (this.showTimer !== null) clearTimeout(this.showTimer);
    if (this.hideTimer !== null) clearTimeout(this.hideTimer);
    this.showTimer = this.hideTimer = null;
  };

  private readonly onPaneLeave = (event: MouseEvent): void => {
    const level = this.level;
    const related = event.relatedTarget;
    if (!level) return;
    if (related instanceof Node && this.host.nativeElement.contains(related)) return;
    if (wrDropdownLevelOf(level, related)) return;
    this.clearTimers();
    this.hideLater();

    let root = level;
    while (root.parent) root = root.parent;
    root.pointerLeft?.(related);
  };

  /** Choosing a leaf closes every submenu, up to the root menu's own item. */
  private readonly onPaneClick = (event: MouseEvent): void => {
    const item = event.target instanceof Element ? event.target.closest('.wr-dropdown-item') : null;
    if (!item || item.matches('.wr-dropdown-item--disabled, .wr-dropdown-submenu-trigger')) return;

    let top = this.level;
    while (top?.parent?.parent) top = top.parent;
    top?.close();
  };
}
