/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { NgTemplateOutlet } from '@angular/common';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  CdkDrag,
  type CdkDragDrop,
  CdkDragHandle,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  ViewEncapsulation,
  contentChild,
  input,
  model,
  output,
} from '@angular/core';

/** Payload emitted whenever the user finishes a reorder. */
export interface WrSortableReorderEvent<T> {
  /** The new items array after the move. */
  readonly items: readonly T[];
  /** Index the item was dragged from. */
  readonly previousIndex: number;
  /** Index the item was dropped at. */
  readonly currentIndex: number;
  /** Convenience handle for the dropped item. */
  readonly item: T;
}

/**
 * Drag-to-reorder list. Wraps CDK's `cdkDropList` + `cdkDrag` with a
 * signal-based items binding — the source array is updated in place and
 * emitted via 2-way `[(items)]`.
 *
 * Drop a single template — it's rendered per item with `let-item
 * let-index="index"`. Add `[handle]="true"` (or `[wrDragHandle]` inside
 * your template) to restrict drag start to a handle element.
 *
 * @example
 * ```html
 * <wr-sortable-list [(items)]="rows" (reorder)="onReorder($event)">
 *   <ng-template let-row let-i="index">
 *     <div class="row">
 *       <span wrDragHandle>≡</span>
 *       {{ i + 1 }}. {{ row.label }}
 *     </div>
 *   </ng-template>
 * </wr-sortable-list>
 * ```
 *
 * @see https://ngwr.dev/components/drag-drop
 */
@Component({
  selector: 'wr-sortable-list',
  templateUrl: './sortable-list.html',
  styleUrl: './sortable-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [CdkDropList, CdkDrag, NgTemplateOutlet],
  host: { class: 'wr-sortable-list' },
})
export class WrSortableList<T = unknown> {
  /** Items to render. Two-way — emits the reordered array on drop. */
  readonly items = model.required<T[]>();

  /** Layout direction. Drives CDK's `cdkDropListOrientation`. @default 'vertical' */
  readonly orientation = input<'vertical' | 'horizontal'>('vertical');

  /** Disable all dragging. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Locked axis — restrict drag movement to one axis even diagonally. */
  readonly lockAxis = input<'x' | 'y' | undefined>(undefined);

  /** `trackBy` for the inner `@for`. Defaults to identity. */
  readonly trackBy = input<(index: number, item: T) => unknown>((_, item) => item as unknown as object);

  /** Fired after a successful reorder with the new array + indices. */
  readonly reorder = output<WrSortableReorderEvent<T>>();

  protected readonly rowTemplate = contentChild.required(TemplateRef<{ $implicit: T; index: number }>);

  protected onDrop(event: CdkDragDrop<T[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const next = this.items().slice();
    moveItemInArray(next, event.previousIndex, event.currentIndex);
    this.items.set(next);
    this.reorder.emit({
      items: next,
      previousIndex: event.previousIndex,
      currentIndex: event.currentIndex,
      item: next[event.currentIndex],
    });
  }
}

