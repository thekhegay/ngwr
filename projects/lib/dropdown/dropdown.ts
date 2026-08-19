/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type BooleanInput, coerceBooleanProperty } from '@angular/cdk/coercion';
import { type OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import {
  DestroyRef,
  Directive,
  ElementRef,
  ViewContainerRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { WR_OVERLAY, WR_RESPONSIVE_OVERLAYS, WrOutsideClick, wrPresentAsSheet } from 'ngwr/overlay';

import type { WrDropdownMenu } from './dropdown-menu';
import { WR_DROPDOWN_POSITIONS, type WrDropdownPosition, type WrDropdownTrigger } from './interfaces';

/**
 * Attach to any element to open a `<wr-dropdown-menu>` as a CDK overlay.
 *
 * @example
 * ```html
 * <button [wrDropdown]="menu" position="bottom-start" trigger="click">
 *   Actions
 * </button>
 *
 * <wr-dropdown-menu #menu>
 *   <wr-dropdown-item icon="copy" (click)="copy()">Copy</wr-dropdown-item>
 *   <wr-dropdown-item icon="trash" (click)="remove()">Delete</wr-dropdown-item>
 * </wr-dropdown-menu>
 * ```
 *
 * @see https://ngwr.dev/reference/components/dropdown
 */
let triggerUid = 0;

@Directive({
  selector: '[wrDropdown]',
  host: {
    class: 'wr-dropdown-trigger',
    '[attr.id]': 'triggerId',
    '[attr.aria-haspopup]': '"menu"',
    '[attr.aria-expanded]': 'isOpen()',
    '[attr.aria-controls]': 'isOpen() ? menu().menuId() : null',
    '(click)': 'onClick($event)',
    '(keydown)': 'onKeydown($event)',
    '(mouseenter)': 'onMouseEnter()',
    '(mouseleave)': 'onMouseLeave($event)',
  },
})
export class WrDropdown {
  /** Menu to open. Pass a `<wr-dropdown-menu>` template reference. */
  readonly menu = input.required<WrDropdownMenu>({ alias: 'wrDropdown' });

  /** How the menu opens. @default 'click' */
  readonly trigger = input<WrDropdownTrigger>('click');

  /** Where the menu anchors relative to the trigger. @default 'bottom-start' */
  readonly position = input<WrDropdownPosition>('bottom-start');

  /**
   * Present the menu as a full-width bottom-sheet on small viewports instead
   * of an anchored panel. `undefined` follows the app-wide
   * `provideWrResponsiveOverlays()` setting; `true`/`false` overrides it.
   * @default undefined
   */
  readonly responsive = input<boolean | undefined, BooleanInput>(undefined, {
    transform: (v: BooleanInput): boolean | undefined => (v == null ? undefined : coerceBooleanProperty(v)),
  });

  /** Fires after the menu opens. */
  readonly opened = output<void>();

  /** Fires after the menu closes. */
  readonly closed = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlay = inject(WR_OVERLAY);
  private readonly outsideClick = inject(WrOutsideClick);
  private readonly responsiveConfig = inject(WR_RESPONSIVE_OVERLAYS);
  private readonly vcr = inject(ViewContainerRef);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly destroyRef = inject(DestroyRef);

  /** @internal Public so host bindings can read it. */
  readonly isOpen = signal(false);

  /**
   * Id the menu names itself after. The trigger is the CONSUMER's own element, so
   * an `id` they already put there wins: overwriting it broke `<label for>`,
   * `document.getElementById` and any `aria-labelledby` aimed at that button from
   * elsewhere in their app. The generated one is only a fallback so the menu has
   * something to reference.
   */
  // `.id` rather than `getAttribute`: it is always a string, and an empty one is no
  // id at all, so it falls through to the generated fallback.
  protected readonly triggerId = this.host.nativeElement.id || `wr-dropdown-trigger-${++triggerUid}`;

  private overlayRef: OverlayRef | null = null;

  constructor() {
    // The host view carrying `[wrDropdown]` can be destroyed while the menu is
    // open — a route change, or an `@if` around the trigger. The overlay lives
    // in the CDK container, not in that view, so nothing removes it unless we do.
    this.destroyRef.onDestroy(() => this.closeOverlay());

    effect(() => {
      if (this.isOpen()) {
        this.openOverlay();
      } else {
        this.closeOverlay();
      }
    });
  }

  /** Open the menu. */
  open(): void {
    this.isOpen.set(true);
  }

  /** Close the menu. */
  close(): void {
    this.isOpen.set(false);
  }

  /** Toggle the menu. */
  toggle(): void {
    this.isOpen.update(v => !v);
  }

  // Host listeners

  /** @internal */
  /**
   * Whether the pointer, rather than the keyboard, opened the current menu.
   *
   * A hover-opened menu must not take focus — the APG shows a menu on hover and
   * leaves the caret where it was — while a keyboard-opened one must. The
   * trigger MODE cannot answer that on its own: a `trigger="hover"` menu is
   * still openable with Enter, and that open should focus the first item.
   */
  private openedByPointer = false;

  protected onClick(event: MouseEvent): void {
    if (this.trigger() !== 'click') return;
    event.stopPropagation();
    this.openedByPointer = false;
    this.toggle();
  }

  /** @internal */
  protected onMouseEnter(): void {
    if (this.trigger() !== 'hover') return;
    // A POINTER opened this, so the menu must not take the keyboard with it —
    // see `openedByPointer`.
    this.openedByPointer = true;
    this.isOpen.set(true);
  }

  /** @internal */
  protected onMouseLeave(event: MouseEvent): void {
    if (this.trigger() !== 'hover') return;
    const related = event.relatedTarget as Node | null;
    if (related && this.overlayRef?.overlayElement.contains(related)) return;
    this.isOpen.set(false);
  }

  // Overlay management

  private openOverlay(): void {
    if (this.overlayRef) return;

    // On small viewports (when opted in) detach from the trigger and present
    // the menu as a full-width slide-up sheet pinned to the bottom edge.
    const asSheet = wrPresentAsSheet(this.responsive(), this.responsiveConfig);

    const positionStrategy = asSheet
      ? this.overlay.position().global().centerHorizontally().bottom('0')
      : this.overlay
          .position()
          .flexibleConnectedTo(this.host)
          .withPositions(WR_DROPDOWN_POSITIONS[this.position()])
          .withPush(true);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: asSheet ? this.scrollStrategies.block() : this.scrollStrategies.reposition(),
      width: asSheet ? '100%' : undefined,
      hasBackdrop: asSheet,
      backdropClass: asSheet ? 'wr-overlay-backdrop' : undefined,
      panelClass: asSheet
        ? ['wr-dropdown-overlay', 'wr-overlay-sheet']
        : ['wr-dropdown-overlay', `wr-dropdown-overlay--${this.position()}`],
    });

    if (asSheet) {
      this.overlayRef
        .backdropClick()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.isOpen.set(false));
    }

    // Wire trigger id into menu so it can render aria-labelledby.
    this.menu().triggerId.set(this.triggerId);

    const portal = new TemplatePortal(this.menu().contentTpl(), this.vcr);
    this.overlayRef.attach(portal);

    // Focus the first menu item after the menu renders — unless a POINTER
    // opened it. This used to be unconditional, so merely sweeping the cursor
    // over a `trigger="hover"` menu yanked the caret out of whatever the user
    // was typing; the APG's own rule is that hover shows a menu and does not
    // move focus into it. A keyboard open (Enter / Space / ArrowDown) still
    // focuses the first item, on a hover trigger too.
    if (!this.openedByPointer) queueMicrotask(() => this.focusItemAt(0));

    this.outsideClick
      .outsidePointerEvents(this.overlayRef)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (this.host.nativeElement.contains(event.target as Node)) return;
        this.isOpen.set(false);
      });

    this.overlayRef
      .keydownEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        this.handleMenuKeydown(event);
      });

    if (this.trigger() === 'hover') {
      this.overlayRef.overlayElement.addEventListener('mouseleave', this.onOverlayMouseLeave);
    }

    this.opened.emit();
  }

  private closeOverlay(): void {
    if (!this.overlayRef) return;
    if (this.trigger() === 'hover') {
      this.overlayRef.overlayElement.removeEventListener('mouseleave', this.onOverlayMouseLeave);
    }
    // Take the focus back before the pane goes, or it lands on `<body>` and the
    // next Tab starts from the top of the document. Only when focus is actually
    // inside the menu: closing a menu nobody was in must not steal the caret
    // from wherever the user has since moved.
    const active = document.activeElement;
    const focusWasInside = active instanceof Node && this.overlayRef.overlayElement.contains(active);
    this.overlayRef.dispose();
    this.overlayRef = null;
    if (focusWasInside) this.host.nativeElement.focus();
    this.closed.emit();
  }

  // Keyboard handling

  /** @internal Trigger keydown — ArrowDown/Up/Enter/Space open the menu. */
  protected onKeydown(event: KeyboardEvent): void {
    if (this.isOpen()) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      // Opened from the keyboard — including on a `hover` trigger, which stays
      // keyboard-operable — so the first item SHOULD take focus.
      this.openedByPointer = false;
      this.open();
    }
  }

  private handleMenuKeydown(event: KeyboardEvent): void {
    const items = this.getItems();
    if (items.length === 0 && event.key !== 'Escape' && event.key !== 'Tab') return;
    const current = document.activeElement as HTMLElement | null;
    const idx = current ? items.indexOf(current) : -1;

    // CDK's keyboard dispatcher feeds this overlay EVERY document keydown, not
    // just the ones typed into it — and a `trigger="hover"` menu is open with
    // the caret deliberately left wherever the user was (see `openedByPointer`).
    // So ownership is checked here rather than assumed: without it, ArrowDown /
    // ArrowUp / Home / End pressed in an unrelated field were `preventDefault`ed
    // and yanked focus into the menu. The trigger counts as ours — a hover menu
    // that the user has tabbed back to should still open to the keyboard.
    const typedIn = event.target;
    const ours =
      typedIn instanceof Node &&
      (this.host.nativeElement.contains(typedIn) || (this.overlayRef?.overlayElement.contains(typedIn) ?? false));
    // Escape (and Tab) still close from anywhere — routing to the topmost
    // overlay regardless of focus is the dispatcher's whole job. Escape just
    // must not drag the caret onto the trigger from a field the user is in.
    if (!ours && event.key !== 'Escape' && event.key !== 'Tab') return;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.isOpen.set(false);
        if (ours) this.host.nativeElement.focus();
        break;
      case 'Tab':
        // Let focus leave naturally; close the menu.
        this.isOpen.set(false);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusItemAt(idx < items.length - 1 ? idx + 1 : 0);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusItemAt(idx > 0 ? idx - 1 : items.length - 1);
        break;
      case 'Home':
        event.preventDefault();
        this.focusItemAt(0);
        break;
      case 'End':
        event.preventDefault();
        this.focusItemAt(items.length - 1);
        break;
      default:
        break;
    }
  }

  private getItems(): readonly HTMLElement[] {
    if (!this.overlayRef) return [];
    return Array.from(
      this.overlayRef.overlayElement.querySelectorAll<HTMLElement>('.wr-dropdown-item:not(.wr-dropdown-item--disabled)')
    );
  }

  private focusItemAt(index: number): void {
    const items = this.getItems();
    if (items.length === 0) return;
    const clamped = ((index % items.length) + items.length) % items.length;
    items[clamped]?.focus();
  }

  private readonly onOverlayMouseLeave = (event: MouseEvent): void => {
    const related = event.relatedTarget as Node | null;
    if (related && this.host.nativeElement.contains(related)) return;
    this.isOpen.set(false);
  };
}
