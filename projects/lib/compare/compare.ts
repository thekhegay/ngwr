/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { Component, ElementRef, ViewEncapsulation, computed, inject, input, model } from '@angular/core';

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

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
 * @see https://ngwr.dev/docs/components/compare
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
    event.preventDefault();
    this.dragging = true;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
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
    const raw =
      this.orientation() === 'horizontal'
        ? ((event.clientX - rect.left) / rect.width) * 100
        : ((event.clientY - rect.top) / rect.height) * 100;
    this.position.set(clamp(raw, this.minPosition(), this.maxPosition()));
  }
}
