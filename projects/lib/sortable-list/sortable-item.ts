/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { CdkDrag } from '@angular/cdk/drag-drop';
import { Component, ElementRef, ViewEncapsulation, computed, effect, inject } from '@angular/core';

import { WR_SORTABLE_LIST } from './tokens';

/**
 * One row of a {@link WrSortableList}. Write the loop yourself and put whatever
 * the row shows inside it.
 *
 * It replaced a single unnamed `<ng-template let-row let-i="index">` that the
 * list rendered per item. Two things were wrong with that. The template had no
 * name, so nothing in the markup said what the context variables were or where
 * they came from — a reader had to open the component to learn that `let-row`
 * is the item and `let-i` the index. And a row could not carry anything of its
 * own: every per-row decision had to be an input on the LIST, or a branch
 * inside one template.
 *
 * The row is the tab stop, so the keyboard contract lives here: Space or Enter
 * picks it up, the arrows move it, Space or Enter drops it, Escape puts it
 * back. The list owns the array and the announcements, and this delegates to
 * it — an item knows its own position and nothing else.
 *
 * @example
 * ```html
 * <wr-sortable-list [(items)]="rows">
 *   @for (row of rows(); track row.id) {
 *     <wr-sortable-item>
 *       <span wrDragHandle>≡</span>
 *       {{ row.label }}
 *     </wr-sortable-item>
 *   }
 * </wr-sortable-list>
 * ```
 *
 * @see https://ngwr.dev/reference/components/sortable-list
 */
@Component({
  selector: 'wr-sortable-item',
  template: '<ng-content />',
  encapsulation: ViewEncapsulation.None,
  hostDirectives: [CdkDrag],
  host: {
    class: 'wr-sortable-list__item',
    role: 'listitem',
    '[class.wr-sortable-list__item--grabbed]': 'grabbed()',
    '[attr.tabindex]': 'list.disabled() ? null : 0',
    '[attr.aria-describedby]': 'list.disabled() ? null : list.keyHelpId',
    '(keydown)': 'list.onRowKeydown($event, index())',
    '(focusout)': 'list.onRowFocusout()',
  },
})
export class WrSortableItem {
  /** @internal The list this row belongs to. Read by the host bindings above. */
  protected readonly list = inject(WR_SORTABLE_LIST);

  private readonly drag = inject(CdkDrag);

  /** @internal */
  readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Position among the list's rows, which IS the index into `items()`: the
   * consumer's own loop renders them in that order.
   *
   * It reads `items()` to have a producer at all. `indexOf` resolves by
   * DOCUMENT ORDER over a plain array, so it touches no signal — and a
   * `computed` whose body reads none runs once and is cached forever, since
   * nothing can ever mark it dirty. Every row's index was therefore frozen at
   * whatever it was during the first change detection, while the consumer's
   * own `@for` kept moving the rows: a grabbed row reported a position it no
   * longer held, and the keyboard move went to the wrong slot.
   *
   * `rowCount` is that producer: the list derives it from `items`, which it
   * owns as a `model`, so every reorder, insertion and removal the consumer
   * makes goes through it — exactly when a position can change.
   */
  protected readonly index = computed(() => {
    this.list.rowCount();
    return this.list.indexOf(this);
  });

  protected readonly grabbed = computed(() => this.list.grabbedIndex() === this.index());

  constructor() {
    this.list.register(this);

    // Assigned rather than bound, because these belong to the LIST and a host
    // binding cannot reach another directive's input. `CdkDrag` reads all
    // three as plain properties on every gesture, so writing them from an
    // effect is enough and a runtime change takes effect on the next drag.
    effect(() => {
      this.drag.disabled = this.list.disabled();
      this.drag.lockAxis = this.list.lockAxis() ?? null;
      this.drag.dragStartDelay = this.list.dragStartDelay();
    });
  }
}
