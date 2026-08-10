/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceNumberProperty } from '@angular/cdk/coercion';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  TemplateRef,
  type TrackByFunction,
  ViewEncapsulation,
  computed,
  contentChild,
  input,
  viewChild,
} from '@angular/core';

/**
 * Fixed-size virtual scroll viewport.
 *
 * Thin wrapper around CDK's `cdk-virtual-scroll-viewport` with ngwr
 * theming and sensible buffer defaults. Project a single template — it's
 * called per item with `let-item let-index="index"`.
 *
 * @example
 * ```html
 * <wr-virtual-scroll [items]="rows" [itemSize]="32" [height]="320">
 *   <ng-template let-row let-i="index">
 *     <div class="row">{{ i }}. {{ row.name }}</div>
 *   </ng-template>
 * </wr-virtual-scroll>
 * ```
 *
 * @see https://ngwr.dev/reference/components/virtual-scroll
 */
@Component({
  selector: 'wr-virtual-scroll',
  templateUrl: './virtual-scroll.html',
  styleUrl: './virtual-scroll.scss',
  encapsulation: ViewEncapsulation.None,
  imports: [ScrollingModule, NgTemplateOutlet],
  host: { class: 'wr-virtual-scroll' },
})
export class WrVirtualScroll<T = unknown> {
  /** Items to render. */
  readonly items = input.required<readonly T[]>();

  /** Per-item pixel height. All rows must be the same height. @default 32 */
  readonly itemSize = input(32, {
    transform: (v: unknown): number => Math.max(1, coerceNumberProperty(v, 32)),
  });

  /**
   * Viewport height. Pass a number (`px`) or any CSS length string
   * (`'80vh'`, `'40rem'`). @default 256
   */
  readonly height = input<number | string>(256);

  /**
   * Pixels of rendered content kept above + below the viewport. CDK
   * keeps adding rows until at least this many pixels are buffered.
   * @default itemSize * 4
   */
  readonly minBufferPx = input<number | undefined>(undefined);

  /**
   * Maximum pixels of buffered content before CDK starts recycling rows.
   * Must be ≥ `minBufferPx`. @default itemSize * 8
   */
  readonly maxBufferPx = input<number | undefined>(undefined);

  /**
   * `trackBy` function for the inner `*cdkVirtualFor`. Defaults to
   * identity (recreates rows when the item reference changes).
   */
  readonly trackBy = input<TrackByFunction<T>>((_, item) => item);

  protected readonly rowTemplate = contentChild.required(TemplateRef<{ $implicit: T; index: number }>);

  protected readonly viewport = viewChild.required(CdkVirtualScrollViewport);

  protected readonly resolvedHeight = computed(() => {
    const h = this.height();
    return typeof h === 'number' ? `${h}px` : h;
  });

  /**
   * The two buffers, resolved as a PAIR. CDK requires `maxBufferPx >= minBufferPx` and
   * throws `CDK virtual scroll: maxBufferPx must be greater than or equal to minBufferPx`
   * outright otherwise — so resolving them independently meant that setting just one of
   * them, the obvious thing to do, crashed the viewport on construction. Whichever a
   * consumer gave is honoured and the other follows it.
   */
  private readonly buffers = computed<{ readonly min: number; readonly max: number }>(() => {
    const size = this.itemSize();
    const min = this.minBufferPx();
    const max = this.maxBufferPx();
    // Ordered so each branch narrows: a given minimum pushes the maximum up, a given
    // maximum pulls the minimum down, and both given are simply sorted.
    if (min !== undefined && max !== undefined) return { min: Math.min(min, max), max: Math.max(min, max) };
    if (min !== undefined) return { min, max: Math.max(min, size * 8) };
    if (max !== undefined) return { min: Math.min(size * 4, max), max };
    return { min: size * 4, max: size * 8 };
  });

  protected readonly resolvedMinBuffer = computed(() => this.buffers().min);
  protected readonly resolvedMaxBuffer = computed(() => this.buffers().max);

  /** Scroll a specific index into view. Mirrors the CDK API. */
  scrollToIndex(index: number, behavior: ScrollBehavior = 'auto'): void {
    this.viewport().scrollToIndex(index, behavior);
  }

  /** Scroll to a pixel offset. */
  scrollToOffset(offset: number, behavior: ScrollBehavior = 'auto'): void {
    this.viewport().scrollToOffset(offset, behavior);
  }

  /**
   * Re-measure the viewport. CDK already watches the window with its `ViewportRuler`, so
   * this is for a size change it cannot see — the host being resized by a layout the
   * window never noticed, or a parent that was display:none until now.
   */
  checkViewportSize(): void {
    this.viewport().checkViewportSize();
  }
}
