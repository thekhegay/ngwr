/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

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

import { WR_OVERLAY } from 'ngwr/overlay';

import type { WrDropdownMenuComponent } from './dropdown-menu.component';
import { WR_DROPDOWN_POSITIONS, type WrDropdownPosition, type WrDropdownTrigger } from './types';

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
 * @see https://ngwr.dev/docs/components/dropdown
 */
@Directive({
  selector: '[wrDropdown]',
  host: {
    class: 'wr-dropdown-trigger',
    '(click)': 'onClick($event)',
    '(mouseenter)': 'onMouseEnter()',
    '(mouseleave)': 'onMouseLeave($event)',
  },
})
export class WrDropdownDirective {
  /** Menu to open. Pass a `<wr-dropdown-menu>` template reference. */
  readonly menu = input.required<WrDropdownMenuComponent>({ alias: 'wrDropdown' });

  /** How the menu opens. @default 'click' */
  readonly trigger = input<WrDropdownTrigger>('click');

  /** Where the menu anchors relative to the trigger. @default 'bottom-start' */
  readonly position = input<WrDropdownPosition>('bottom-start');

  /** Fires after the menu opens. */
  readonly opened = output<void>();

  /** Fires after the menu closes. */
  readonly closed = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlay = inject(WR_OVERLAY);
  private readonly vcr = inject(ViewContainerRef);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly destroyRef = inject(DestroyRef);

  private readonly isOpen = signal(false);
  private overlayRef: OverlayRef | null = null;

  constructor() {
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

  // ──────── Host listeners ────────

  /** @internal */
  protected onClick(event: MouseEvent): void {
    if (this.trigger() !== 'click') return;
    event.stopPropagation();
    this.toggle();
  }

  /** @internal */
  protected onMouseEnter(): void {
    if (this.trigger() !== 'hover') return;
    this.isOpen.set(true);
  }

  /** @internal */
  protected onMouseLeave(event: MouseEvent): void {
    if (this.trigger() !== 'hover') return;
    const related = event.relatedTarget as Node | null;
    if (related && this.overlayRef?.overlayElement.contains(related)) return;
    this.isOpen.set(false);
  }

  // ──────── Overlay management ────────

  private openOverlay(): void {
    if (this.overlayRef) return;

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.host)
      .withPositions(WR_DROPDOWN_POSITIONS[this.position()])
      .withPush(true);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.scrollStrategies.reposition(),
      panelClass: ['wr-dropdown-overlay', `wr-dropdown-overlay--${this.position()}`],
    });

    const portal = new TemplatePortal(this.menu().contentTpl(), this.vcr);
    this.overlayRef.attach(portal);

    this.overlayRef
      .outsidePointerEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (this.host.nativeElement.contains(event.target as Node)) return;
        this.isOpen.set(false);
      });

    this.overlayRef
      .keydownEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          this.isOpen.set(false);
        }
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
    this.overlayRef.dispose();
    this.overlayRef = null;
    this.closed.emit();
  }

  private readonly onOverlayMouseLeave = (event: MouseEvent): void => {
    const related = event.relatedTarget as Node | null;
    if (related && this.host.nativeElement.contains(related)) return;
    this.isOpen.set(false);
  };
}
