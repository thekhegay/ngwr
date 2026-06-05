/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceNumberProperty } from '@angular/cdk/coercion';
import { type OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { ComponentPortal, TemplatePortal } from '@angular/cdk/portal';
import type { TemplateRef } from '@angular/core';
import {
  DestroyRef,
  Directive,
  ElementRef,
  ViewContainerRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { WR_OVERLAY } from 'ngwr/overlay';

import { WrPopoverTextPanel } from './internal/text-panel';
import { WR_POPOVER_POSITIONS, type WrPopoverPosition } from './types';

const numAttr =
  (fallback: number) =>
  (v: unknown): number =>
    coerceNumberProperty(v, fallback);

/**
 * Anchored content panel. The same directive covers two shapes:
 *
 * - **Popover** (default, `mode="popover"`) — `[wrPopover]` takes a
 *   `TemplateRef`. Opens on click or hover. Use for rich anchored content:
 *   forms, summaries, menus.
 *
 * - **Tooltip** (`mode="tooltip"`) — `[wrPopover]` takes a plain string.
 *   Shown on hover and focus, dismissed on blur / pointer-leave / Escape.
 *   Uses `aria-describedby` instead of `aria-haspopup` and is rendered into
 *   a small dark text panel.
 *
 * Built on CDK Overlay so it auto-flips, closes on outside-click and Escape.
 *
 * @example
 * ```html
 * <!-- Popover with template content -->
 * <button wr-btn [wrPopover]="info">Details</button>
 * <ng-template #info>
 *   <div style="padding: 1rem; max-width: 18rem">Anything you can render.</div>
 * </ng-template>
 *
 * <!-- Tooltip with plain text -->
 * <button wr-btn [wrPopover]="'Save changes'" mode="tooltip" position="top">
 *   Save
 * </button>
 * ```
 *
 * @see https://ngwr.dev/components/popover
 */
let popoverUid = 0;

@Directive({
  selector: '[wrPopover]',
  host: {
    '[attr.aria-haspopup]': 'isTooltip() ? null : "dialog"',
    '[attr.aria-expanded]': 'isTooltip() ? null : isOpen()',
    '[attr.aria-controls]': '!isTooltip() && isOpen() ? panelId : null',
    '[attr.aria-describedby]': 'isTooltip() && isOpen() ? panelId : null',
    '(click)': 'onClick($event)',
    '(mouseenter)': 'onMouseEnter()',
    '(mouseleave)': 'onMouseLeave($event)',
    '(focus)': 'onFocus()',
    '(blur)': 'onBlur()',
    '(keydown.escape)': 'onEscape()',
  },
})
export class WrPopover {
  /**
   * Content to render inside the panel.
   * - In **popover** mode (default): pass a `TemplateRef`.
   * - In **tooltip** mode: pass a plain string.
   */
  readonly content = input.required<TemplateRef<unknown> | string>({ alias: 'wrPopover' });

  /**
   * Shape preset.
   *
   * - `'popover'` (default) — template content, click trigger, dialog
   *   semantics.
   * - `'tooltip'` — text content, hover+focus trigger, `role="tooltip"`,
   *   `aria-describedby` on the host.
   */
  readonly mode = input<'popover' | 'tooltip'>('popover');

  /**
   * How the popover opens. Ignored in tooltip mode — tooltips are always
   * hover+focus. @default 'click'
   */
  readonly trigger = input<'click' | 'hover'>('click');

  /** Anchor side. @default 'bottom' for popover, 'top' for tooltip */
  readonly position = input<WrPopoverPosition | null>(null);

  /** Tooltip only — delay before showing, in ms. @default 120 */
  readonly showDelay = input(120, { transform: numAttr(120) });

  /** Tooltip only — delay before hiding, in ms. @default 60 */
  readonly hideDelay = input(60, { transform: numAttr(60) });

  /** Fires after the panel opens. */
  readonly opened = output<void>();

  /** Fires after the panel closes. */
  readonly closed = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlay = inject(WR_OVERLAY);
  private readonly vcr = inject(ViewContainerRef);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly destroyRef = inject(DestroyRef);

  /** @internal */
  readonly isOpen = signal(false);

  /** @internal */
  protected readonly isTooltip = computed(() => this.mode() === 'tooltip');

  /** Auto-generated id for `aria-controls` / `aria-describedby`. */
  protected readonly panelId = `wr-popover-${++popoverUid}`;

  private readonly resolvedPosition = computed<WrPopoverPosition>(
    () => this.position() ?? (this.isTooltip() ? 'top' : 'bottom')
  );

  private overlayRef: OverlayRef | null = null;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.openOverlay();
      } else {
        this.closeOverlay();
      }
    });
    this.destroyRef.onDestroy(() => {
      this.clearTimers();
      this.closeOverlay();
    });
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
    if (this.isTooltip() || this.trigger() !== 'click') return;
    event.stopPropagation();
    this.toggle();
  }

  /** @internal */
  protected onMouseEnter(): void {
    if (this.isTooltip()) {
      this.scheduleShow();
      return;
    }
    if (this.trigger() !== 'hover') return;
    this.isOpen.set(true);
  }

  /** @internal */
  protected onMouseLeave(event: MouseEvent): void {
    if (this.isTooltip()) {
      this.scheduleHide();
      return;
    }
    if (this.trigger() !== 'hover') return;
    const related = event.relatedTarget as Node | null;
    if (related && this.overlayRef?.overlayElement.contains(related)) return;
    this.isOpen.set(false);
  }

  /** @internal */
  protected onFocus(): void {
    if (!this.isTooltip()) return;
    this.scheduleShow();
  }

  /** @internal */
  protected onBlur(): void {
    if (!this.isTooltip()) return;
    this.scheduleHide();
  }

  /** @internal */
  protected onEscape(): void {
    if (!this.isTooltip()) return;
    this.clearTimers();
    this.isOpen.set(false);
  }

  // ──────── Tooltip timers ────────

  private scheduleShow(): void {
    if (this.isOpen()) {
      this.clearTimers();
      return;
    }
    const text = this.content();
    if (typeof text === 'string' && !text) return;
    this.clearTimers();
    this.showTimer = setTimeout(() => this.isOpen.set(true), this.showDelay());
  }

  private scheduleHide(): void {
    this.clearTimers();
    this.hideTimer = setTimeout(() => this.isOpen.set(false), this.hideDelay());
  }

  private clearTimers(): void {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  // ──────── Overlay ────────

  private openOverlay(): void {
    if (this.overlayRef) return;

    const tooltip = this.isTooltip();
    const position = this.resolvedPosition();

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.host)
      .withPositions(WR_POPOVER_POSITIONS[position])
      .withPush(true);

    const overlayClass = tooltip
      ? ['wr-tooltip-overlay', `wr-tooltip-overlay--${position}`]
      : ['wr-popover-overlay', `wr-popover-overlay--${position}`];

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.scrollStrategies.reposition(),
      panelClass: overlayClass,
    });

    const content = this.content();

    if (tooltip) {
      // Text content rendered via the internal text panel — accepts a
      // string and wraps it in the `.wr-tooltip` shell.
      const text = typeof content === 'string' ? content : '';
      const ref = this.overlayRef.attach(new ComponentPortal(WrPopoverTextPanel, this.vcr));
      ref.setInput('text', text);
      this.overlayRef.overlayElement.setAttribute('role', 'tooltip');
    } else if (typeof content !== 'string') {
      this.overlayRef.attach(new TemplatePortal(content, this.vcr));
    }
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

    if (!tooltip && this.trigger() === 'hover') {
      this.overlayRef.overlayElement.addEventListener('mouseleave', this.onOverlayLeave);
    }

    this.opened.emit();
  }

  private closeOverlay(): void {
    if (!this.overlayRef) return;
    if (!this.isTooltip() && this.trigger() === 'hover') {
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
