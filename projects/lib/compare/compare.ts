/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { Component, ElementRef, ViewEncapsulation, computed, effect, inject, input, model } from '@angular/core';

import { useI18nText } from 'ngwr/i18n';
import { clamp } from 'ngwr/utils';

/**
 * Before/after comparison slider. Works with any content — project two
 * pieces of markup with `wrCompareBefore` and `wrCompareAfter` attributes;
 * the component stacks them in the same cell and clips the "after" side
 * with a draggable divider.
 *
 * @example
 * ```html
 * <wr-compare [(position)]="pos">
 *   <img wrCompareBefore src="before.jpg" alt="" />
 *   <img wrCompareAfter src="after.jpg" alt="" />
 * </wr-compare>
 *
 * <wr-compare orientation="vertical">
 *   <pre wrCompareBefore>{{ oldCode }}</pre>
 *   <pre wrCompareAfter>{{ newCode }}</pre>
 * </wr-compare>
 * ```
 *
 * @see https://ngwr.dev/reference/components/compare
 */
@Component({
  selector: 'wr-compare',
  templateUrl: './compare.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
})
export class WrCompare {
  /** Divider position as a percentage (0–100). Two-way bindable. @default 50 */
  readonly position = model(50);

  /** Accessible name of the divider. Falls back to `compare.label`. */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'compare.label', 'Comparison divider');

  /**
   * Divider direction:
   * - `'horizontal'` — divider line is vertical, drags left/right.
   * - `'vertical'`   — divider line is horizontal, drags up/down.
   * @default 'horizontal'
   */
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');

  /** Show the round drag handle on the divider. @default true */
  readonly showHandle = input(true, { transform: coerceBooleanProperty });

  /** Disable interaction (divider stays put). @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Initial position transform — accepts any number / numeric string. */
  readonly minPosition = input(0, { transform: (v: unknown): number => coerceNumberProperty(v, 0) });
  readonly maxPosition = input(100, { transform: (v: unknown): number => coerceNumberProperty(v, 100) });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private dragging = false;

  constructor() {
    // `position` is a `model`, so `[(position)]` and a restored layout write into it
    // directly while only the handlers clamped — an out-of-range write reached the DOM
    // as `aria-valuenow="150"` against a `valuemax` of 100.
    effect(() => {
      const clamped = clamp(this.position(), this.minPosition(), this.maxPosition());
      if (clamped !== this.position()) this.position.set(clamped);
    });
  }

  protected readonly classes = computed(() => {
    const parts = ['wr-compare', `wr-compare--${this.orientation()}`];
    if (this.disabled()) parts.push('wr-compare--disabled');
    return parts.join(' ');
  });

  /** Clip path applied to the "after" layer so the divider reveals it. */
  protected readonly clipPath = computed(() => {
    const p = clamp(this.position(), 0, 100);
    if (this.orientation() === 'horizontal') {
      // Show from `p%` to the right edge.
      return `inset(0 0 0 ${p}%)`;
    }
    return `inset(${p}% 0 0 0)`;
  });

  // Pointer handlers

  protected onPointerDown(event: PointerEvent): void {
    if (this.disabled()) return;
    // Any pointerdown used to start a drag, so the right button moved the divider; the
    // same guard keeps a second finger out of a drag already in progress.
    if (event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    this.dragging = true;
    const surface = event.currentTarget as HTMLElement;
    surface.setPointerCapture(event.pointerId);
    // `preventDefault` above also suppresses the click's default focus, so the arrows
    // did nothing after a mouse drag until the divider was found again with Tab.
    surface.focus();
    this.updateFromPointer(event);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.dragging) return;
    this.updateFromPointer(event);
  }

  protected onPointerUp(event: PointerEvent): void {
    if (!this.dragging) return;
    this.dragging = false;
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.disabled()) return;
    const step = event.shiftKey ? 10 : 1;
    let next: number | null = null;
    if (this.orientation() === 'horizontal') {
      if (event.key === 'ArrowLeft') next = this.position() - step;
      else if (event.key === 'ArrowRight') next = this.position() + step;
    } else {
      if (event.key === 'ArrowUp') next = this.position() - step;
      else if (event.key === 'ArrowDown') next = this.position() + step;
    }
    if (event.key === 'Home') next = this.minPosition();
    else if (event.key === 'End') next = this.maxPosition();
    if (next === null) return;
    event.preventDefault();
    this.position.set(clamp(next, this.minPosition(), this.maxPosition()));
  }

  private updateFromPointer(event: PointerEvent): void {
    const rect = this.host.nativeElement.getBoundingClientRect();
    const horizontal = this.orientation() === 'horizontal';
    const extent = horizontal ? rect.width : rect.height;
    // A host that has not been laid out — hidden, detached, or a pane the browser has
    // throttled — measures 0, and dividing by it puts `Infinity` or `NaN` straight into
    // `aria-valuenow`. There is no meaningful position to compute, so keep the current one.
    if (extent <= 0) return;
    const raw = horizontal ? ((event.clientX - rect.left) / extent) * 100 : ((event.clientY - rect.top) / extent) * 100;
    this.position.set(clamp(raw, this.minPosition(), this.maxPosition()));
  }
}
