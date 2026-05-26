/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import type { TemplateRef } from '@angular/core';
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

import { WR_POPOVER_POSITIONS, type WrPopoverPosition } from './types';

/**
 * Anchored content panel. Pass an `<ng-template>` to render anything —
 * forms, menus, summaries. Opens on click or hover. Built on CDK Overlay
 * so it auto-flips, closes on outside-click and Escape.
 *
 * @example
 * ```html
 * <button wr-btn [wrPopover]="info">Details</button>
 *
 * <ng-template #info>
 *   <div style="padding: 1rem; max-width: 18rem">
 *     Anything you can render in a template.
 *   </div>
 * </ng-template>
 * ```
 *
 * @see https://ngwr.dev/docs/components/popover
 */
let popoverUid = 0;

@Directive({
  selector: '[wrPopover]',
  host: {
    '[attr.aria-haspopup]': '"dialog"',
    '[attr.aria-expanded]': 'isOpen()',
    '[attr.aria-controls]': 'isOpen() ? panelId : null',
    '(click)': 'onClick($event)',
    '(mouseenter)': 'onMouseEnter()',
    '(mouseleave)': 'onMouseLeave($event)',
  },
})
export class WrPopover {
  /** Content template to render inside the popover. */
  readonly content = input.required<TemplateRef<unknown>>({ alias: 'wrPopover' });

  /** How the popover opens. @default 'click' */
  readonly trigger = input<'click' | 'hover'>('click');

  /** Anchor side. @default 'bottom' */
  readonly position = input<WrPopoverPosition>('bottom');

  /** Fires after the popover opens. */
  readonly opened = output<void>();

  /** Fires after the popover closes. */
  readonly closed = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlay = inject(WR_OVERLAY);
  private readonly vcr = inject(ViewContainerRef);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly destroyRef = inject(DestroyRef);

  /** @internal */
  readonly isOpen = signal(false);

  /** Auto-generated id for `aria-controls`. */
  protected readonly panelId = `wr-popover-${++popoverUid}`;

  private overlayRef: OverlayRef | null = null;

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.openOverlay();
      } else {
        this.closeOverlay();
      }
    });
    this.destroyRef.onDestroy(() => this.closeOverlay());
  }

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

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

  // ──────── Overlay ────────

  private openOverlay(): void {
    if (this.overlayRef) return;

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.host)
      .withPositions(WR_POPOVER_POSITIONS[this.position()])
      .withPush(true);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.scrollStrategies.reposition(),
      panelClass: ['wr-popover-overlay', `wr-popover-overlay--${this.position()}`],
    });

    const portal = new TemplatePortal(this.content(), this.vcr);
    this.overlayRef.attach(portal);
    this.overlayRef.overlayElement.id = this.panelId;

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
      this.overlayRef.overlayElement.addEventListener('mouseleave', this.onOverlayLeave);
    }

    this.opened.emit();
  }

  private closeOverlay(): void {
    if (!this.overlayRef) return;
    if (this.trigger() === 'hover') {
      this.overlayRef.overlayElement.removeEventListener('mouseleave', this.onOverlayLeave);
    }
    this.overlayRef.dispose();
    this.overlayRef = null;
    this.closed.emit();
  }

  private readonly onOverlayLeave = (event: MouseEvent): void => {
    const related = event.relatedTarget as Node | null;
    if (related && this.host.nativeElement.contains(related)) return;
    this.isOpen.set(false);
  };
}
