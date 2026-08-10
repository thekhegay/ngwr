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
 * @see https://ngwr.dev/reference/components/splitter
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

  /**
   * Accessible name of the divider. A focusable `role="separator"` is an
   * interactive widget, so it needs one — without it a screen reader reaching the
   * divider announces nothing but "separator" and its number. Falls back to
   * `splitter.divider`.
   */
  readonly dividerLabel = input<string | null>(null);

  protected readonly resolvedDividerLabel = useI18nText(this.dividerLabel, 'splitter.divider', 'Resize panes');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private dragging = false;

  constructor() {
    // `position` is a `model`, so `[(position)]` and a restored layout write into it
    // directly; only the drag and the arrows clamped. Left alone, an out-of-range
    // write reached the DOM as `aria-valuenow="150"` against a `valuemax` of 100 and
    // sized a pane at `150%`.
    effect(() => {
      const clamped = clamp(this.position(), this.minPosition(), this.maxPosition());
      if (clamped !== this.position()) this.position.set(clamped);
    });
  }

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
    // Any pointerdown used to start a drag, so holding the RIGHT button over the
    // divider and moving resized the panes; the same guard keeps a second finger
    // from taking over a drag already in progress.
    if (event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    this.dragging = true;
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture(event.pointerId);
    // `preventDefault` above also suppresses the click's default focus, so without
    // this the arrows did nothing after a mouse drag until the user found the
    // divider again with Tab. `wr-slider` focuses its thumb for the same reason.
    handle.focus();
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
