/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceNumberProperty } from '@angular/cdk/coercion';
import { Overlay, type OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { DestroyRef, Directive, ElementRef, ViewContainerRef, inject, input } from '@angular/core';

import { WrTooltipComponent } from './tooltip.component';
import { WR_TOOLTIP_POSITIONS, type WrTooltipPosition } from './types';

const numAttr =
  (fallback: number) =>
  (v: unknown): number =>
    coerceNumberProperty(v, fallback);

/**
 * Attach a small text tooltip to any element. Shown on hover and focus,
 * dismissed on blur and pointer-leave.
 *
 * @example
 * ```html
 * <button wr-btn [wrTooltip]="'Save changes'" position="top">Save</button>
 * ```
 *
 * @see https://ngwr.dev/docs/components/tooltip
 */
@Directive({
  selector: '[wrTooltip]',
  host: {
    '(mouseenter)': 'show()',
    '(mouseleave)': 'hide()',
    '(focus)': 'show()',
    '(blur)': 'hide()',
  },
})
export class WrTooltipDirective {
  /** Tooltip text. Empty string disables the tooltip. */
  readonly text = input.required<string>({ alias: 'wrTooltip' });

  /** Anchor side. @default 'top' */
  readonly position = input<WrTooltipPosition>('top');

  /** Delay before showing, in milliseconds. @default 300 */
  readonly showDelay = input(300, { transform: numAttr(300) });

  /** Delay before hiding, in milliseconds. @default 150 */
  readonly hideDelay = input(150, { transform: numAttr(150) });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlay = inject(Overlay);
  private readonly vcr = inject(ViewContainerRef);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);

  private overlayRef: OverlayRef | null = null;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.dispose());
  }

  /** @internal */
  show(): void {
    if (!this.text()) return;
    this.clearTimers();
    this.showTimer = setTimeout(() => this.openOverlay(), this.showDelay());
  }

  /** @internal */
  hide(): void {
    this.clearTimers();
    this.hideTimer = setTimeout(() => this.dispose(), this.hideDelay());
  }

  private openOverlay(): void {
    if (this.overlayRef) return;

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.host)
      .withPositions(WR_TOOLTIP_POSITIONS[this.position()])
      .withPush(true);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.scrollStrategies.reposition(),
      panelClass: ['wr-tooltip-overlay', `wr-tooltip-overlay--${this.position()}`],
    });

    const portal = new ComponentPortal(WrTooltipComponent, this.vcr);
    const ref = this.overlayRef.attach(portal);
    ref.setInput('text', this.text());
  }

  private dispose(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
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
}
