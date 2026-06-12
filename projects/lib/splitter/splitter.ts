/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { Component, ElementRef, ViewEncapsulation, computed, inject, input, model } from '@angular/core';

import { clamp } from 'ngwr/utils';

/**
 * Resizable two-pane splitter. Project two pieces of content via
 * `[wrSplitterStart]` and `[wrSplitterEnd]`; the user drags the divider
 * to reallocate space between them.
 *
 * @example
 * ```html
 * <wr-splitter [(position)]="pos">
 *   <div wrSplitterStart>Files</div>
 *   <div wrSplitterEnd>Editor</div>
 * </wr-splitter>
 *
 * <wr-splitter orientation="vertical" [minPosition]="20" [maxPosition]="80">
 *   <div wrSplitterStart>Preview</div>
 *   <div wrSplitterEnd>Logs</div>
 * </wr-splitter>
 * ```
 *
 * @see https://ngwr.dev/docs/components/splitter
 */
@Component({
  selector: 'wr-splitter',
  templateUrl: './splitter.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
})
export class WrSplitter {
  /** Position of the divider as a percentage (0–100). Two-way bindable. @default 50 */
  readonly position = model(50);

  /**
   * Divider direction:
   * - `'horizontal'` — vertical divider, drags L/R (panes side by side).
   * - `'vertical'`   — horizontal divider, drags U/D (panes stacked).
   * @default 'horizontal'
   */
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');

  /** Minimum allowed position. @default 0 */
  readonly minPosition = input(0, { transform: (v: unknown): number => coerceNumberProperty(v, 0) });

  /** Maximum allowed position. @default 100 */
  readonly maxPosition = input(100, { transform: (v: unknown): number => coerceNumberProperty(v, 100) });

  /** Disable dragging. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private dragging = false;

  protected readonly classes = computed(() => {
    const parts = ['wr-splitter', `wr-splitter--${this.orientation()}`];
    if (this.disabled()) parts.push('wr-splitter--disabled');
    return parts.join(' ');
  });

  protected readonly startStyle = computed(() => `${this.position()}%`);
  protected readonly endStyle = computed(() => `${100 - this.position()}%`);

  // Drag

  protected onPointerDown(event: PointerEvent): void {
    if (this.disabled()) return;
    event.preventDefault();
    this.dragging = true;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.dragging) return;
    const rect = this.host.nativeElement.getBoundingClientRect();
    const raw =
      this.orientation() === 'horizontal'
        ? ((event.clientX - rect.left) / rect.width) * 100
        : ((event.clientY - rect.top) / rect.height) * 100;
    this.position.set(clamp(raw, this.minPosition(), this.maxPosition()));
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
}
